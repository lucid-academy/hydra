// Hand-made maps and runs for the tests of the strategic map, so they don't depend on the generator.

import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { hex, hexKey, hexesInRange } from '../src/sim/hex';
import { emptyLayout, hexesSeenFrom, updateVisibility } from '../src/sim/map';
import type { HexMap, TerrainTable, Tile } from '../src/sim/map';
import { createRun } from '../src/sim/turn';
import type { RunState } from '../src/sim/turn';

export const rules = runRulesFrom(loadGameData());

export const terrain: TerrainTable = {
  water: { moveCost: 1, blocksSight: false },
  mud: { moveCost: 1, blocksSight: false },
  roots: { moveCost: 2, blocksSight: false },
  salt: { moveCost: 3, blocksSight: false },
  rock: { moveCost: null, blocksSight: true },
};

export const testRules = { ...rules, terrain, movementPointsPerTurn: 5, sightRangeHexes: 2 };

/** An all-mud map in ring 1, the lair in the middle. */
export function flatMap(radius: number, edit: (tiles: Map<string, Tile>) => void = () => {}): HexMap {
  const tiles = new Map<string, Tile>();
  for (const h of hexesInRange(hex(0, 0), radius)) tiles.set(hexKey(h), { hex: h, biome: 'lairSwamp', ring: 1, region: 'ring', terrain: 'mud', object: null });
  tiles.get('0,0')!.object = { kind: 'lair' };
  edit(tiles);
  return { radius, tiles, lair: hex(0, 0), layout: emptyLayout() };
}

/** A run on a hand-made map that the hydra already knows all of (so every hex can be targeted). */
export function runOn(map: HexMap, movement = 5): RunState {
  const state = createRun(1, { ...rules, terrain, movementPointsPerTurn: movement });
  state.map = map;
  state.hydra = { ...state.hydra, position: map.lair, movementLeft: movement, movementPerTurn: movement, conditions: [] };
  state.visibility = new Map();
  state.echoes = [];
  state.draughtsFelt = [];
  for (const key of map.tiles.keys()) state.visibility.set(key, 'remembered');
  updateVisibility(state.visibility, hexesSeenFrom(map, map.lair, 2, terrain));
  return state;
}
