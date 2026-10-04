// Step 6 of the world: biomes and ground.
// Each ring is split into sectors of its main biomes (their shares differ from world to world, and the borders
// between them wander in tongues). A few chambers of each ring belong to a biome from another ring: patches.
// Then each biome lays its own ground: Flooded Caves more water, Root Tangle roots, Salt Mines salt.

import type { Rng } from '../../rng';
import type { GroundType, TerrainType } from '../types';
import { between, betweenReal, shuffled, smoothNoise } from './grid';
import type { HexGrid } from './grid';
import type { Caves } from './caves';
import type { BiomeSettings, UndergroundGeneratorSettings } from './settings';
import { ZONE_BAND, ZONE_LAIR, ZONE_OUTSIDE } from './shape';
import type { WorldShape } from './shape';

/** Open ground is laid from the wettest hexes up: water first, then mud, then roots, then dry salt. */
const GROUND_ORDER: readonly GroundType[] = ['water', 'mud', 'roots', 'salt'];
/** How far (radians) the borders between biome sectors wander. */
const SECTOR_RAGGEDNESS = 0.7;

export interface Painted {
  biomeOf: string[];
  terrainOf: TerrainType[];
  /** Per chamber: its biome, and whether it is a patch. */
  chamberBiome: string[];
  patch: boolean[];
}

/** Biomes and ground, or why they didn't fit (then the world is tried again). */
export function paintBiomes(rng: Rng, grid: HexGrid, shape: WorldShape, caves: Caves, s: UndergroundGeneratorSettings): Painted | string {
  const n = grid.size;
  const rings = s.rings.length;
  const { zone } = shape;
  const ragged = smoothNoise(rng, grid, 3);

  // The ring each open hex belongs to (a tunnel through a band belongs to the ring it leads into).
  const ringOf = new Int8Array(n);
  for (let i = 0; i < n; i++) ringOf[i] = zone[i]! >= 1 && zone[i]! <= rings ? zone[i]! : zone[i] === ZONE_LAIR ? 0 : zone[i] === ZONE_OUTSIDE ? rings : zone[i]! - ZONE_BAND;
  for (const t of caves.thresholds) for (const i of t.tunnel) ringOf[i] = t.border + 1;

  // Main biome sectors of each ring.
  const sectorBiome = s.rings.map((ring) => {
    const start = rng.next() * Math.PI * 2;
    const share = betweenReal(rng, ring.mainBiomeShare);
    const main = ring.mainBiomes;
    return (angle: number): string => {
      if (main.length === 1) return main[0]!;
      const turn = ((((angle - start) / (Math.PI * 2)) % 1) + 1) % 1;
      if (main.length === 2) return turn < share ? main[0]! : main[1]!;
      return main[Math.min(main.length - 1, Math.floor(turn * main.length))]!;
    };
  });
  const biomeAt = (i: number): string => {
    const ring = ringOf[i]!;
    if (ring === 0) return s.lairBiome.id;
    return sectorBiome[ring - 1]!(shape.angle[i]! + (ragged[i]! - 0.5) * SECTOR_RAGGEDNESS * 2);
  };

  const chamberBiome = caves.chambers.map((c) => biomeAt(c.center));
  const patch = caves.chambers.map(() => false);
  const bloom = s.modifiers.includes('myceliumBloom') ? s.modifierRules.myceliumBloom : null;
  for (let k = 1; k <= rings; k++) {
    const ring = s.rings[k - 1]!;
    const inRing = caves.chambers.map((c, index) => ({ c, index })).filter(({ c }) => c.ring === k);
    const own = (biome: string) => inRing.filter(({ index }) => chamberBiome[index] === biome && !patch[index]);
    // Every main biome keeps at least one chamber of its own (its landmark stands there): if its sector got none,
    // it takes the chamber nearest to its sector from the biome with the most.
    for (const biome of ring.mainBiomes) {
      if (own(biome).length > 0) continue;
      const donor = ring.mainBiomes.filter((b) => b !== biome).sort((a, b) => own(b).length - own(a).length)[0];
      const options = donor ? own(donor) : [];
      if (options.length < 2) return 'biomes: a main biome has no chamber';
      const nearest = options.reduce((best, x) => (turnsToSector(k, shape.angle[x.c.center]!, biome) < turnsToSector(k, shape.angle[best.c.center]!, biome) ? x : best));
      chamberBiome[nearest.index] = biome;
    }
    // Patches: chambers of another ring's biome. A main biome never gives up its last chamber.
    const wanted = between(rng, ring.patches);
    const extraFungal = bloom && !ring.mainBiomes.includes(bloom.fungalBiome) ? between(rng, bloom.extraFungalPatches) : 0;
    let made = 0;
    for (const { index } of shuffled(rng, inRing)) {
      if (made >= wanted + extraFungal) break;
      if (own(chamberBiome[index]!).length < 2) continue;
      chamberBiome[index] = made < wanted ? rng.weightedPick(ring.patchBiomes).id : bloom!.fungalBiome;
      patch[index] = true;
      made++;
    }
    if (made < ring.patches[0] + extraFungal) return `biomes: only ${made} patches fit in ring ${k}`;
  }

  /** How far (radians) from this angle the ring's sector of `biome` begins. */
  function turnsToSector(k: number, angle: number, biome: string): number {
    for (let d = 0; d <= Math.PI; d += 0.05) if (sectorBiome[k - 1]!(angle + d) === biome || sectorBiome[k - 1]!(angle - d) === biome) return d;
    return Math.PI;
  }

  // Every open hex gets its chamber's biome, or its sector's; rock gets the biome of the nearest open hex.
  const biomeOf: string[] = new Array<string>(n).fill(s.lairBiome.id);
  const openHexes: number[] = [];
  for (let i = 0; i < n; i++) {
    if (!caves.open[i]) continue;
    openHexes.push(i);
    const chamber = caves.chamberOf[i]!;
    biomeOf[i] = zone[i] === ZONE_LAIR ? s.lairBiome.id : chamber >= 0 ? chamberBiome[chamber]! : biomeAt(i);
  }
  const nearestOpen = new Int32Array(n).fill(-1);
  for (const i of openHexes) nearestOpen[i] = i;
  stepsFromWithOwner(grid, openHexes, nearestOpen);
  for (let i = 0; i < n; i++) if (!caves.open[i] && nearestOpen[i]! >= 0) biomeOf[i] = biomeOf[nearestOpen[i]!]!;
  // A threshold's gate looks like the side it is entered from.
  for (const t of caves.thresholds) biomeOf[t.gate] = biomeOf[t.innerLanding]!;

  // Ground: within each biome, the wettest-ranked hexes get water, then mud, roots, salt, by the biome's shares.
  const wetness = smoothNoise(rng, grid, 2);
  const terrainOf: TerrainType[] = new Array<TerrainType>(n).fill('rock');
  const wetYear = s.modifiers.includes('wetYear') ? s.modifierRules.wetYear.waterShareBonus : 0;
  const byBiome = new Map<string, number[]>();
  for (const i of openHexes) {
    const list = byBiome.get(biomeOf[i]!) ?? [];
    list.push(i);
    byBiome.set(biomeOf[i]!, list);
  }
  for (const [id, members] of byBiome) {
    const biome = s.biomes[id];
    if (!biome) throw new Error(`Unknown biome "${id}" in the generator settings`);
    const shares = groundShares(biome, wetYear);
    const ordered = members.sort((a, b) => wetness[a]! - wetness[b]!);
    const kinds = GROUND_ORDER.filter((g) => (shares[g] ?? 0) > 0);
    let shareSoFar = 0;
    let from = 0;
    kinds.forEach((kind, k) => {
      shareSoFar += shares[kind] ?? 0;
      const to = k === kinds.length - 1 ? ordered.length : Math.round(ordered.length * shareSoFar);
      for (const i of ordered.slice(from, to)) terrainOf[i] = kind;
      from = to;
    });
  }
  return { biomeOf, terrainOf, chamberBiome, patch };
}

/** A biome's ground shares; in a Wet Year, biomes with water get more of it. */
function groundShares(biome: BiomeSettings, waterBonus: number): Partial<Record<GroundType, number>> {
  const water = biome.ground.water ?? 0;
  if (waterBonus <= 0 || water <= 0) return biome.ground;
  const wetter = Math.min(0.9, water + waterBonus);
  const scale = (1 - wetter) / (1 - water);
  const shares: Partial<Record<GroundType, number>> = {};
  for (const g of GROUND_ORDER) if (biome.ground[g] !== undefined) shares[g] = g === 'water' ? wetter : biome.ground[g]! * scale;
  return shares;
}

/** Steps out from the sources, remembering for each hex which source is nearest (owner must hold each source's own index). */
function stepsFromWithOwner(grid: HexGrid, sources: readonly number[], owner: Int32Array): void {
  const steps = new Int32Array(grid.size).fill(-1);
  const queue = [...sources];
  for (const s of sources) steps[s] = 0;
  for (let head = 0; head < queue.length; head++) {
    const current = queue[head]!;
    for (const next of grid.neighbors[current]!) {
      if (steps[next] !== -1) continue;
      steps[next] = steps[current]! + 1;
      owner[next] = owner[current]!;
      queue.push(next);
    }
  }
}
