// Fast lanes (GAME_DESIGN.md §5.2), laid on a finished world like roads on a Heroes map: currents along the water of
// some biomes (the Flooded Caves), which carry the hydra for free the way they flow, and old corridors, the narrow
// tunnels between the chambers of others (the Old Crypts, the Salt Mines), where a step costs half. They change only
// what steps cost, never where she can go, so the world's rules (rules.ts) hold whatever lanes it gets.

import { HEX_DIRECTIONS, hexAdd, hexKey, hexNeighbors } from '../../hex';
import type { Hex } from '../../hex';
import { Rng } from '../../rng';
import type { HexMap, Lane, Tile } from '../types';
import type { UndergroundGeneratorSettings } from './settings';

/** Starting hexes tried for each current before giving up on it. */
const CURRENT_TRIES = 40;

export function layFastLanes(map: HexMap, seed: number, s: UndergroundGeneratorSettings['fastLanes']): void {
  // Its own random numbers: lanes never change the rest of a world made from the same seed.
  const rng = new Rng((seed ^ 0x1a4e5) >>> 0);
  layCorridors(map, s.corridorBiomes);
  layCurrents(map, rng, s);
}

/** The open hexes of those biomes that lie outside every chamber: the tunnels between them. */
function layCorridors(map: HexMap, biomes: readonly string[]): void {
  const inChambers = new Set(map.layout.chambers.flatMap((c) => c.hexes.map(hexKey)));
  for (const tile of map.tiles.values()) {
    if (tile.region !== 'ring' || tile.terrain === 'rock' || !biomes.includes(tile.biome)) continue;
    if (!inChambers.has(hexKey(tile.hex))) tile.lane = 'corridor';
  }
}

/**
 * Each current runs along water, mostly straight on, turning a little now and then, never touching another current.
 * Every hex of it but the last flows towards the next.
 */
function layCurrents(map: HexMap, rng: Rng, s: UndergroundGeneratorSettings['fastLanes']): void {
  const water = (h: Hex): Tile | undefined => {
    const tile = map.tiles.get(hexKey(h));
    return tile && tile.terrain === 'water' && tile.region === 'ring' && s.currentBiomes.includes(tile.biome) ? tile : undefined;
  };
  const starts = [...map.tiles.values()].filter((t) => water(t.hex)).map((t) => t.hex);
  if (starts.length === 0) return;
  const taken = new Set<string>();
  const free = (h: Hex, from: Hex | null): boolean =>
    water(h) !== undefined && !taken.has(hexKey(h)) && hexNeighbors(h).every((n) => !taken.has(hexKey(n)) || (from !== null && hexKey(n) === hexKey(from)));
  const wanted = rng.int(s.currents[0], s.currents[1]);
  for (let made = 0, tries = 0; made < wanted && tries < wanted * CURRENT_TRIES; tries++) {
    const start = rng.pick(starts);
    if (!free(start, null)) continue;
    const length = rng.int(s.currentLength[0], s.currentLength[1]);
    const path: Hex[] = [start];
    const dirs: number[] = [];
    let dir = rng.int(0, 5);
    while (path.length < length) {
      const here = path[path.length - 1]!;
      // Straight on if it can, else a slight turn either way.
      const turns = rng.chance(0.25) ? [dir, (dir + 1) % 6, (dir + 5) % 6] : [dir, (dir + 5) % 6, (dir + 1) % 6];
      const way = turns.find((d) => {
        const next = hexAdd(here, HEX_DIRECTIONS[d]!);
        return !path.some((p) => hexKey(p) === hexKey(next)) && free(next, here) && path.slice(0, -1).every((p) => !hexNeighbors(p).some((n) => hexKey(n) === hexKey(next)));
      });
      if (way === undefined) break;
      dir = way;
      dirs.push(way);
      path.push(hexAdd(here, HEX_DIRECTIONS[way]!));
    }
    if (path.length < s.currentLength[0]) continue;
    path.forEach((h, i) => {
      taken.add(hexKey(h));
      if (i < dirs.length) map.tiles.get(hexKey(h))!.lane = `flow${dirs[i]!}` as Lane;
    });
    made++;
  }
}
