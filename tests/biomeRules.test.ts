// Each biome's own rule on the map (GAME_DESIGN.md §9.2): salt glare, roots that hide the hydra, crypts that carry
// sound, spore clouds nobody sees through.

import { describe, expect, it } from 'vitest';
import { hex, hexKey, hexesInRange } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { emptyLayout } from '../src/sim/map';
import type { HexMap, Tile } from '../src/sim/map';
import { biomeRuleHere, endTurn, finishBattle, hiddenUnlessWithin, look, lookAround, pendingBattleSetup, sightNow, sporeCloudOver } from '../src/sim/turn';
import type { OrderUnit, RunEvent, RunState } from '../src/sim/turn';
import { flatMap, rules, runOn } from './runHelpers';

/** A flat map all of one biome and ground, the lair in the middle, chambers far off for patrols to wander to. */
function biomeMap(biome: string, ground: Tile['terrain'], radius = 8): HexMap {
  const map = flatMap(radius, (tiles) => {
    for (const tile of tiles.values()) Object.assign(tile, { biome, terrain: ground });
  });
  const chamber = (hexes: Hex[]) => ({ ring: 1, biome, patch: false, hexes, exits: 2 });
  return { ...map, layout: { ...emptyLayout(), chambers: [chamber([hex(-6, 3), hex(-6, 4)]), chamber([hex(6, -6), hex(5, -6)])] } };
}

/** A quiet run on a map (no new patrol comes down unless a test puts one there). */
function quietRun(map: HexMap): RunState {
  const state = runOn(map, 6);
  state.order.nextPatrolTurn = 999;
  return state;
}

function place(state: RunState, at: Hex): OrderUnit {
  const unit: OrderUnit = { id: `o${state.order.nextUnitId++}`, kind: 'patrol', at, groupId: 'patrol', tier: 1, goal: null, chase: 0, trail: null, layer: 'underground' };
  state.order.units.push(unit);
  return unit;
}

/** Did a patrol 3 hexes away see the hydra in the world turn (it set off after her, or reached her)? */
function patrolSeesHer(state: RunState): boolean {
  const unit = place(state, hex(3, 0));
  endTurn(state, rules);
  return state.pendingBattle !== null || (unit.trail !== null && unit.chase > 0);
}

describe('biome rules on the map', () => {
  it('every rule has a text for the new land card, and the biomes of the rings have one each', () => {
    for (const biome of ['floodedCaves', 'rootTangle', 'oldCrypts', 'saltMines', 'fungalDeeps']) expect(rules.biomeRules[biome]?.text, biome).toBeTruthy();
    expect(rules.biomeRules.lairSwamp).toBeUndefined();
    expect(rules.biomeRules.surface).toBeUndefined();
  });

  it('Salt Mines: she sees a hex further, and the Order sees her from a hex further', () => {
    const salt = quietRun(biomeMap('saltMines', 'salt'));
    const swamp = quietRun(biomeMap('lairSwamp', 'mud'));
    expect(sightNow(salt, rules)).toBe(sightNow(swamp, rules) + 1);
    // A patrol 4 hexes away: beyond its sight of 3, except in the salt glare.
    const far = (state: RunState) => {
      const unit = place(state, hex(4, 0));
      endTurn(state, rules);
      return state.pendingBattle !== null || unit.trail !== null;
    };
    expect(far(quietRun(biomeMap('lairSwamp', 'mud')))).toBe(false);
    expect(far(quietRun(biomeMap('saltMines', 'salt')))).toBe(true);
  });

  it('Root Tangle: on roots a patrol notices her only from next to her; on its mud as usual', () => {
    const roots = quietRun(biomeMap('rootTangle', 'roots'));
    expect(hiddenUnlessWithin(roots, rules)).toBe(1);
    expect(patrolSeesHer(roots)).toBe(false);
    const mud = quietRun(biomeMap('rootTangle', 'mud'));
    expect(hiddenUnlessWithin(mud, rules)).toBe(Infinity);
    expect(patrolSeesHer(mud)).toBe(true);
    // Next to her, the roots don't help.
    const close = quietRun(biomeMap('rootTangle', 'roots'));
    const unit = place(close, hex(1, 0));
    endTurn(close, rules);
    expect(close.pendingBattle !== null || unit.trail !== null).toBe(true);
  });

  it('Old Crypts: echoes are heard twice as far', () => {
    const source = hex(0, -8);
    const withEcho = (biome: string): RunEvent[] => {
      const map = biomeMap(biome, 'mud', 9);
      const state = quietRun({ ...map, layout: { ...map.layout, echoSources: [{ at: source, placeId: null, biome }] } });
      // Unseen, 8 hexes off: beyond the usual echo range of 6, within twice that.
      state.visibility.delete(hexKey(source));
      const events: RunEvent[] = [];
      state.hydra.sightRange = 1;
      lookAround(state, rules, events);
      return events.filter((e) => e.type === 'echoHeard');
    };
    expect(rules.echoRange).toBeLessThan(8);
    expect(withEcho('lairSwamp')).toEqual([]);
    expect(withEcho('oldCrypts')).toHaveLength(1);
  });

  it('Old Crypts: a battle there raises the Alert half as much again', () => {
    const alertAfterBattle = (biome: string): number => {
      const state = quietRun(biomeMap(biome, 'mud'));
      state.alert = 10;
      state.hydra.position = hex(2, 0);
      state.pendingBattle = { at: hex(2, 0), layer: 'underground', groupId: 'patrol' };
      finishBattle(state, { outcome: 'won', bodyHp: state.hydra.bodyHp, heads: [...pendingBattleSetup(state, rules)!.heads], newScars: 0, nextId: state.nextId }, rules);
      return state.alert - 10;
    };
    const usual = alertAfterBattle('lairSwamp');
    expect(usual).toBeGreaterThan(0);
    expect(alertAfterBattle('oldCrypts')).toBeCloseTo(usual * 1.5);
  });

  it('Fungal Deeps: spore clouds cover some of its ground, the same for the same seed and turn, and drift with the turns', () => {
    const state = quietRun(biomeMap('fungalDeeps', 'mud', 20));
    const covered = (s: RunState) => [...s.map.tiles.values()].filter((t) => sporeCloudOver(s, t, rules)).map((t) => hexKey(t.hex));
    const now = covered(state);
    expect(now.length).toBeGreaterThan(state.map.tiles.size * 0.05);
    expect(now.length).toBeLessThan(state.map.tiles.size * 0.6);
    expect(covered(state)).toEqual(now);
    state.turn += 4;
    expect(covered(state)).not.toEqual(now);
    // Not over rock, and not in another biome.
    const swamp = quietRun(biomeMap('lairSwamp', 'mud', 20));
    expect(covered(swamp)).toEqual([]);
  });

  it('Fungal Deeps: nobody sees through a cloud, and under one the Order notices her only from next to her', () => {
    // Find a turn when the hydra stands under a cloud and one when she does not.
    const state = quietRun(biomeMap('fungalDeeps', 'mud', 20));
    const here = () => state.map.tiles.get(hexKey(state.hydra.position));
    let turn = 1;
    while (!sporeCloudOver(state, here(), rules) && turn < 400) state.turn = ++turn;
    expect(sporeCloudOver(state, here(), rules)).toBe(true);
    expect(hiddenUnlessWithin(state, rules)).toBe(1);
    // From inside, the cloud hides what lies beyond it: she sees less than on clear ground.
    state.visibility = new Map();
    look(state, rules);
    const underCloud = [...state.visibility.values()].filter((v) => v === 'visible').length;
    const clear = quietRun(biomeMap('lairSwamp', 'mud', 20));
    clear.visibility = new Map();
    look(clear, rules);
    expect(underCloud).toBeLessThan([...clear.visibility.values()].filter((v) => v === 'visible').length);
    expect(biomeRuleHere(state, rules)?.sporeClouds).toBeDefined();
  });

  it('Fungal Deeps: standing still, she sees the clouds drift (what she sees changes with the turns)', () => {
    const state = quietRun(biomeMap('fungalDeeps', 'mud', 20));
    state.hydra.position = hex(2, 0);
    look(state, rules);
    const seen = () => [...state.visibility].flatMap(([key, v]) => (v === 'visible' ? [key] : [])).sort();
    const before = seen();
    let changed = false;
    for (let turn = 0; turn < 8 && !changed; turn++) {
      endTurn(state, rules);
      changed = seen().join() !== before.join();
    }
    expect(changed).toBe(true);
  });

  it('no rule holds on the surface or in the lair swamp', () => {
    const state = quietRun(biomeMap('lairSwamp', 'mud'));
    expect(biomeRuleHere(state, rules)).toBeNull();
    expect(hiddenUnlessWithin(state, rules)).toBe(Infinity);
    for (const h of hexesInRange(hex(0, 0), 2)) expect(sporeCloudOver(state, state.map.tiles.get(hexKey(h)), rules)).toBe(false);
  });
});
