// Rules every generated world keeps (GAME_DESIGN.md §9). The generator checks them before it hands a world over,
// and the tests check them again on a thousand seeds.

import { hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import type { HexMap, MapObject, TerrainTable, Tile } from './types';

export type ThresholdObject = Extract<MapObject, { kind: 'threshold' }>;

/** Threshold kinds the generator itself relies on (world.json thresholds must have them). */
export const DRAUGHT_CRACK = 'draughtCrack';
export const CINDER_SCAR = 'cinderScar';
export const OLD_WORKINGS = 'oldWorkings';

/** A threshold any hydra gets through, with no particular head: a Draught Crack (found by walking up to it), or one open already. */
export function isKeyless(t: ThresholdObject): boolean {
  return t.state === 'open' || t.thresholdId === DRAUGHT_CRACK;
}

/** Keys of all passable hexes connected to `start`, counting a threshold as open where `opens` says so. */
export function floodFill(tiles: Map<string, Tile>, start: Hex, terrain: TerrainTable, opens: (t: ThresholdObject) => boolean = () => false): Set<string> {
  const passable = (tile: Tile) => terrain[tile.terrain].moveCost !== null || (tile.object?.kind === 'threshold' && opens(tile.object));
  const seen = new Set([hexKey(start)]);
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    for (const n of hexNeighbors(queue[head]!)) {
      const key = hexKey(n);
      const tile = tiles.get(key);
      if (!tile || seen.has(key) || !passable(tile)) continue;
      seen.add(key);
      queue.push(n);
    }
  }
  return seen;
}

/** Which rings (0 = the lair's swamp) have at least one hex among `keys`. */
export function ringsAmong(map: HexMap, keys: Iterable<string>): Set<number> {
  const rings = new Set<number>();
  for (const key of keys) {
    const tile = map.tiles.get(key);
    if (tile && (tile.region === 'ring' || tile.region === 'lair')) rings.add(tile.ring);
  }
  return rings;
}

/**
 * The connection rules of the rings:
 * - with every threshold shut (except those open from the start), the hydra can only get around ring 1;
 * - through keyless thresholds alone, every ring can be reached;
 * - with every threshold open, every open hex can be reached.
 * Returns what is wrong, or an empty list.
 */
export function ringConnectionProblems(map: HexMap, terrain: TerrainTable): string[] {
  const problems: string[] = [];
  const all = [...Array(map.layout.rings + 1).keys()];
  const shut = ringsAmong(map, floodFill(map.tiles, map.lair, terrain));
  if ([...shut].some((r) => r > 1)) problems.push(`rings ${[...shut].join(', ')} reached with every threshold shut`);
  const keyless = ringsAmong(map, floodFill(map.tiles, map.lair, terrain, isKeyless));
  if (all.some((r) => !keyless.has(r))) problems.push(`only rings ${[...keyless].join(', ')} reached through keyless thresholds`);
  const open = floodFill(map.tiles, map.lair, terrain, () => true);
  const stranded = [...map.tiles.values()].filter((t) => terrain[t.terrain].moveCost !== null && !open.has(hexKey(t.hex)));
  if (stranded.length > 0) problems.push(`${stranded.length} open hexes can't be reached even with every threshold open`);
  return problems;
}
