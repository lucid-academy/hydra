// Fast lanes (GAME_DESIGN.md §5.2): currents along the water of the Flooded Caves carry the hydra for free the way
// they flow, old corridors between the chambers of the Old Crypts and the Salt Mines halve a step's cost. And the
// mutations that change how she moves.

import { describe, expect, it } from 'vitest';
import { HEX_DIRECTIONS, hex, hexAdd, hexKey } from '../src/sim/hex';
import { generateUnderground, laneFlow } from '../src/sim/map';
import { createRun, endTurn, hydraStepCost, moveHydra, movementForTurn } from '../src/sim/turn';
import type { RunRules } from '../src/sim/turn';
import { flatMap, rules, runOn, terrain } from './runHelpers';

const settings = rules.generator;

describe('laying fast lanes', () => {
  it('puts currents only on water of the current biomes, flowing to the next hex of the same current', () => {
    let currents = 0;
    let corridors = 0;
    for (let seed = 0; seed < 60; seed++) {
      const map = generateUnderground(seed, settings, rules.terrain);
      const inChambers = new Set(map.layout.chambers.flatMap((c) => c.hexes.map(hexKey)));
      for (const tile of map.tiles.values()) {
        if (!tile.lane) continue;
        expect(tile.region).toBe('ring');
        const flow = laneFlow(tile);
        if (flow === null) {
          corridors++;
          expect(settings.fastLanes.corridorBiomes).toContain(tile.biome);
          expect(tile.terrain).not.toBe('rock');
          expect(inChambers.has(hexKey(tile.hex))).toBe(false);
          continue;
        }
        currents++;
        expect(tile.terrain).toBe('water');
        expect(settings.fastLanes.currentBiomes).toContain(tile.biome);
        // It flows onto water of a current (the last hex of a current has no flow of its own).
        const next = map.tiles.get(hexKey(hexAdd(tile.hex, HEX_DIRECTIONS[flow]!)));
        expect(next?.terrain).toBe('water');
        expect(next?.lane === undefined || next.lane.startsWith('flow')).toBe(true);
      }
    }
    expect(currents).toBeGreaterThan(0);
    expect(corridors).toBeGreaterThan(0);
  });

  it('the same seed gives the same lanes', () => {
    const lanes = (seed: number) => [...generateUnderground(seed, settings, rules.terrain).tiles.values()].map((t) => t.lane ?? '-').join('');
    expect(lanes(7)).toBe(lanes(7));
  });

  it('without lane biomes a world has no lanes', () => {
    const none = { ...settings, fastLanes: { ...settings.fastLanes, currentBiomes: [], corridorBiomes: [] } };
    const map = generateUnderground(3, none, rules.terrain);
    expect([...map.tiles.values()].some((t) => t.lane)).toBe(false);
  });
});

describe('a step on a fast lane', () => {
  it('costs nothing down a current, the usual cost across or against it', () => {
    // A current flowing east (direction 0) from the lair.
    const state = runOn(
      flatMap(4, (tiles) => {
        for (const q of [0, 1, 2, 3]) {
          const tile = tiles.get(hexKey(hex(q, 0)))!;
          tile.terrain = 'water';
          if (q < 3) tile.lane = 'flow0';
        }
      }),
    );
    const r = { ...rules, terrain };
    expect(hydraStepCost(state, hex(0, 0), hex(1, 0), r)).toBe(r.fastLanes.currentCost);
    expect(hydraStepCost(state, hex(1, 0), hex(0, 0), r)).toBe(1);
    expect(hydraStepCost(state, hex(0, 0), hex(0, 1), r)).toBe(1);
    // She swims three hexes down the current for free.
    moveHydra(state, hex(3, 0), r);
    expect(state.hydra.position).toEqual(hex(3, 0));
    expect(state.hydra.movementLeft).toBe(5 - 3 * r.fastLanes.currentCost);
  });

  it('costs half in an old corridor', () => {
    const state = runOn(
      flatMap(4, (tiles) => {
        tiles.get(hexKey(hex(1, 0)))!.lane = 'corridor';
        tiles.get(hexKey(hex(2, 0)))!.terrain = 'salt';
        tiles.get(hexKey(hex(2, 0)))!.lane = 'corridor';
      }),
    );
    const r = { ...rules, terrain };
    expect(hydraStepCost(state, hex(0, 0), hex(1, 0), r)).toBe(r.fastLanes.corridorCostShare);
    expect(hydraStepCost(state, hex(1, 0), hex(2, 0), r)).toBe(3 * r.fastLanes.corridorCostShare);
    expect(hydraStepCost(state, hex(0, 0), hex(-1, 0), r)).toBe(1);
  });
});

describe('mutations of movement', () => {
  const withMutations = (mutations: string[]) => {
    const state = runOn(
      flatMap(4, (tiles) => {
        tiles.get(hexKey(hex(1, 0)))!.terrain = 'roots';
        tiles.get(hexKey(hex(2, 0)))!.terrain = 'salt';
        tiles.get(hexKey(hex(0, 0)))!.terrain = 'water';
      }),
    );
    state.hydra.mutations = mutations;
    return state;
  };
  const r: RunRules = { ...rules, terrain };

  it('Root-Slither and Salt-Crusted Belly make roots and salt cheaper, never below one', () => {
    const plain = withMutations([]);
    expect(hydraStepCost(plain, hex(0, 0), hex(1, 0), r)).toBe(2);
    expect(hydraStepCost(plain, hex(1, 0), hex(2, 0), r)).toBe(3);
    const both = withMutations(['rootSlither', 'saltCrustedBelly']);
    expect(hydraStepCost(both, hex(0, 0), hex(1, 0), r)).toBe(Math.max(1, 2 + r.mutations.rootSlither!.rootsCost!));
    expect(hydraStepCost(both, hex(1, 0), hex(2, 0), r)).toBe(Math.max(1, 3 + r.mutations.saltCrustedBelly!.saltCost!));
    const sharp: RunRules = { ...r, mutations: { ...r.mutations, rootSlither: { rootsCost: -9 } } };
    expect(hydraStepCost(both, hex(0, 0), hex(1, 0), sharp)).toBe(1);
    // Mud stays mud.
    expect(hydraStepCost(both, hex(0, 0), hex(0, 1), r)).toBe(1);
  });

  it('Eel-Spined: more movement in a turn begun in water', () => {
    const plain = withMutations([]);
    const eel = withMutations(['eelSpined']);
    expect(movementForTurn(eel, r)).toBe(movementForTurn(plain, r) + r.mutations.eelSpined!.movementInWater!);
    eel.hydra.position = hex(-1, 0);
    expect(movementForTurn(eel, r)).toBe(movementForTurn(plain, r));
  });

  it('Restless: the Alert rises every turn', () => {
    const calm = createRun(5, rules);
    const restless = createRun(5, rules);
    restless.hydra.mutations = ['restless'];
    endTurn(calm, rules);
    endTurn(restless, rules);
    expect(restless.alert).toBeGreaterThan(calm.alert);
  });

  it('every new mutation is in the data', () => {
    for (const id of ['eelSpined', 'rootSlither', 'saltCrustedBelly', 'restless']) expect(rules.mutations[id]).toBeDefined();
  });
});
