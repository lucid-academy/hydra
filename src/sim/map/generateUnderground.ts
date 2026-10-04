// The underground of act 1 (GAME_DESIGN.md §9): the lair in the middle, rings around it, rock bands between them.
// Built in steps, like Terraria's world: a fixed skeleton, and everything in it random. Deterministic: the same seed
// and the same run modifiers give the same world. A world that breaks a rule is thrown away and built again,
// with the random numbers going on from where they stopped.
//
// The steps live in ./generator: shape (rings and bands), caves (thresholds, chambers, corridors, dead ends),
// biomes (sectors, patches, ground) and contents (everything placed on the hexes).

import type { Hex } from '../hex';
import { hexKey } from '../hex';
import { Rng } from '../rng';
import { paintBiomes } from './generator/biomes';
import { carveCaves } from './generator/caves';
import { placeContents } from './generator/contents';
import { HexGrid, shuffled } from './generator/grid';
import type { UndergroundGeneratorSettings } from './generator/settings';
import { ZONE_BAND, ZONE_LAIR, ZONE_OUTSIDE, makeShape, ringWidths } from './generator/shape';
import { CINDER_SCAR, ringConnectionProblems } from './rules';
import type { HexMap, Region, TerrainTable, Tile, WorldLayout } from './types';

export type { BiomeSettings, PlaceSettings, Range, RingSettings, UndergroundGeneratorSettings, Weighted } from './generator/settings';
export { DEAD_END_CONTENTS, PATCH_FINDS } from './generator/settings';

const MAX_ATTEMPTS = 200;

export function generateUnderground(seed: number, settings: UndergroundGeneratorSettings, terrain: TerrainTable): HexMap {
  return generateUndergroundWithReport(seed, settings, terrain).map;
}

/** The world, and why the attempts before it were thrown away (for tests and tuning). */
export function generateUndergroundWithReport(seed: number, settings: UndergroundGeneratorSettings, terrain: TerrainTable): { map: HexMap; rejected: string[] } {
  const rng = new Rng(seed);
  const grid = new HexGrid(settings.radius);
  const rejected: string[] = [];
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const result = tryGenerate(rng, grid, settings, terrain);
    if (typeof result !== 'string') return { map: result, rejected };
    rejected.push(result);
  }
  throw new Error(`Underground generator failed ${MAX_ATTEMPTS} times for seed ${seed} (last: ${rejected[rejected.length - 1]}); check undergroundGenerator in balance.json.`);
}

/** A world, or the step that failed. */
function tryGenerate(rng: Rng, grid: HexGrid, s: UndergroundGeneratorSettings, terrain: TerrainTable): HexMap | string {
  const rings = s.rings.length;
  // Rare places are rolled first: the Cinder Scar changes the caves.
  const rare = shuffled(
    rng,
    s.places.filter((p) => p.type === 'rare' && rng.chance(p.chance)).map((p) => p.id),
  ).slice(0, s.maxRarePlaces);

  const shape = makeShape(rng, grid, s);
  if (!shape) return 'shape: no room for the rings';
  if (ringWidths(grid, shape.zone, rings).some((w, k) => k > 0 && w < s.minRingWidth)) return 'shape: a ring too narrow';
  const caves = carveCaves(rng, grid, shape, s, { cinderScar: rare.includes(CINDER_SCAR), oldWorkings: s.modifiers.includes('oldWorkings') });
  if (typeof caves === 'string') return caves;
  const painted = paintBiomes(rng, grid, shape, caves, s);
  if (typeof painted === 'string') return painted;
  const contents = placeContents(rng, grid, shape, caves, painted, s, { rare });
  if (typeof contents === 'string') return contents;

  const hexOf = (i: number): Hex => grid.hexes[i]!;
  const tiles = new Map<string, Tile>();
  grid.hexes.forEach((h, i) => {
    const z = shape.zone[i]!;
    const region: Region = z === ZONE_LAIR ? 'lair' : z === ZONE_OUTSIDE ? 'outside' : z >= ZONE_BAND ? 'band' : 'ring';
    const ring = region === 'lair' ? 0 : region === 'outside' ? rings : region === 'band' ? z - ZONE_BAND : z;
    tiles.set(hexKey(h), { hex: h, biome: painted.biomeOf[i]!, ring, region, terrain: painted.terrainOf[i]!, object: contents.objects[i] ?? null });
  });
  const layout: WorldLayout = {
    rings,
    modifiers: [...s.modifiers],
    rarePlaces: rare,
    ringCenter: { x: shape.cx, y: shape.cy },
    chambers: caves.chambers.map((c, index) => ({
      ring: c.ring,
      biome: painted.chamberBiome[index]!,
      patch: painted.patch[index]!,
      hexes: c.hexes.map(hexOf),
      exits: c.exits,
    })),
    deadEnds: caves.deadEnds.map((d) => ({ ring: d.ring, spur: d.spur.map(hexOf), pocket: d.pocket.map(hexOf), content: hexOf(d.content) })),
    echoSources: contents.echoSources.map((e) => ({ at: hexOf(e.at), placeId: e.placeId, biome: e.biome })),
  };
  const map: HexMap = { radius: s.radius, tiles, lair: { q: 0, r: 0 }, layout };
  const problems = ringConnectionProblems(map, terrain);
  if (problems.length > 0) return `connections: ${problems.join('; ')}`;
  return map;
}
