// The lair (GAME_DESIGN.md §7): eggs, hatching on command, Broodlings guarding the lair or scouting.

import { describe, expect, it } from 'vitest';
import { hex, hexDistance, hexKey } from '../src/sim/hex';
import { Rng } from '../src/sim/rng';
import { canLayEgg, createRun, eggMutations, endTurn, hatchEgg, layEgg } from '../src/sim/turn';
import type { Egg, OrderUnit, RunState } from '../src/sim/turn';
import { flatMap, rules, runOn } from './runHelpers';

function lairRun(): RunState {
  const state = runOn(flatMap(8), 6);
  state.order.nextPatrolTurn = 999;
  state.resources = { muck: 100, moisture: 0, bones: 100 };
  return state;
}

describe('eggs', () => {
  it('a hydra hatches with her mother\'s eggs in the lair, each with a share of what she was born with', () => {
    const state = createRun(5, rules, { heritage: { generation: 2, name: 'Ysolde', lineageName: 'Morwenna', mutations: ['thickNecked', 'bogScented'], flags: [], seen: [], enemyTypesMet: [], placesSeen: [], mother: null } });
    expect(state.lair.eggs).toHaveLength(rules.brood.startingEggs);
    for (const egg of state.lair.eggs) expect(egg.mutations).toHaveLength(1);
  });

  it('are laid in the lair for Bones and Muck, up to the most it holds', () => {
    const state = lairRun();
    const before = state.lair.eggs.length;
    expect(layEgg(state, rules)).toEqual([{ type: 'eggLaid', eggId: expect.any(String) }]);
    expect(state.lair.eggs).toHaveLength(before + 1);
    expect(state.resources).toMatchObject({ bones: 100 - rules.brood.eggCost.bones, muck: 100 - rules.brood.eggCost.muck });
    while (canLayEgg(state, rules).can) layEgg(state, rules);
    expect(state.lair.eggs).toHaveLength(rules.brood.maxEggs);
    expect(canLayEgg(state, rules)).toEqual({ can: false, why: 'full' });
  });

  it('can\'t be laid away from the lair, or without the price', () => {
    const state = lairRun();
    state.resources.bones = 0;
    expect(canLayEgg(state, rules)).toEqual({ can: false, why: 'cost' });
    state.hydra.position = hex(2, 0);
    expect(canLayEgg(state, rules)).toEqual({ can: false, why: 'notInLair' });
  });

  it('each carry a different half of the mutations when they can', () => {
    const rng = new Rng(3);
    const mother = ['a', 'b', 'c', 'd'];
    const eggs: Egg[] = [];
    for (let i = 0; i < 4; i++) eggs.push({ id: `e${i}`, mutations: eggMutations(mother, eggs, 0.5, rng), hatching: null });
    expect(new Set(eggs.map((e) => e.mutations.join(','))).size).toBe(4);
    for (const egg of eggs) expect(egg.mutations).toHaveLength(2);
  });
});

describe('Broodlings', () => {
  it('hatch on command after a few world turns, to guard the lair', () => {
    const state = lairRun();
    const egg = state.lair.eggs[0]!;
    hatchEgg(state, egg.id, 'defender', rules);
    expect(hatchEgg(state, egg.id, 'scout', rules)).toEqual([]);
    for (let i = 1; i < rules.brood.hatchTurns; i++) endTurn(state, rules);
    expect(state.lair.defenders).toBe(0);
    const events = endTurn(state, rules);
    expect(events).toContainEqual({ type: 'hatched', eggId: egg.id, role: 'defender', scoutId: null });
    expect(state.lair.defenders).toBe(1);
    expect(state.lair.eggs.find((e) => e.id === egg.id)).toBeUndefined();
  });

  it('scouts go out on their own and show ground nobody has seen', () => {
    const state = lairRun();
    state.visibility = new Map([[hexKey(hex(0, 0)), 'visible']]);
    hatchEgg(state, state.lair.eggs[0]!.id, 'scout', rules);
    for (let i = 0; i < rules.brood.hatchTurns; i++) endTurn(state, rules);
    const known = state.visibility.size;
    endTurn(state, rules);
    expect(state.lair.scouts).toHaveLength(1);
    expect(hexDistance(state.lair.scouts[0]!.at, hex(0, 0))).toBeGreaterThan(0);
    expect(state.visibility.size).toBeGreaterThan(known);
  });

  it('a scout next to the Order\'s people is caught', () => {
    const state = lairRun();
    state.lair.scouts = [{ id: 's9', at: hex(5, 0) }];
    const unit: OrderUnit = { id: 'o1', kind: 'patrol', at: hex(5, -1), groupId: 'patrol', tier: 1, goal: hex(5, -1), chase: 0, trail: null };
    state.order.units.push(unit);
    // The scout is surrounded by ground already known, so it stays put.
    for (const key of state.map.tiles.keys()) state.visibility.set(key, 'remembered');
    const events = endTurn(state, rules);
    expect(events.some((e) => e.type === 'scoutKilled')).toBe(true);
    expect(state.lair.scouts).toEqual([]);
  });
});
