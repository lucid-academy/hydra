// Each biome's own rule on the map (GAME_DESIGN.md §9.2, the Big World): salt glare, roots that hide the hydra, crypts
// that carry sound, spore clouds nobody sees through. The numbers live in biomes.json (mapRule); the currents of the
// Flooded Caves are fast lanes (lanes.ts). Rules hold on the underground only.

import { hexKey } from '../hex';
import type { Hex } from '../hex';
import type { Layer, Tile } from '../map';
import { hash2, smoothNoise2 } from '../noise';
import type { BiomeMapRule, RunRules, RunState } from './types';

/** The rule of the biome a hex of a layer lies in, or null (the surface, the lair's swamp, a biome without one). */
export function biomeRuleAt(state: RunState, layer: Layer, h: Hex, rules: RunRules): BiomeMapRule | null {
  if (layer !== 'underground') return null;
  const tile = state.map.tiles.get(hexKey(h));
  return (tile && rules.biomeRules[tile.biome]) ?? null;
}

/** The rule of the biome where the hydra stands now. */
export function biomeRuleHere(state: RunState, rules: RunRules): BiomeMapRule | null {
  return biomeRuleAt(state, state.hydra.layer, state.hydra.position, rules);
}

/**
 * Is there a spore cloud over this underground tile this turn? Clouds lie over open ground of a biome with sporeClouds,
 * where smooth noise over the hexes is thick enough; the noise moves `driftPerTurn` hexes a turn, one way per world.
 */
export function sporeCloudOver(state: RunState, tile: Tile | undefined, rules: RunRules): boolean {
  if (!tile || tile.terrain === 'rock') return false;
  const clouds = rules.biomeRules[tile.biome]?.sporeClouds;
  if (!clouds) return false;
  // Where the hex is on a square grid (axial columns lean), so the clouds come out round.
  const x = tile.hex.q + tile.hex.r / 2;
  const y = tile.hex.r * 0.866;
  const angle = hash2(1, 2, state.seed ^ 0x5b0e5) * Math.PI * 2;
  const moved = clouds.driftPerTurn * state.turn;
  const n = smoothNoise2((x - Math.cos(angle) * moved) / clouds.size, (y - Math.sin(angle) * moved) / clouds.size, state.seed ^ 0x5b0e5);
  return n > clouds.thickerThan;
}

/** Keys of the underground hexes under a spore cloud this turn, among those given (for drawing them). */
export function sporeCloudKeys(state: RunState, keys: Iterable<string>, rules: RunRules): Set<string> {
  const covered = new Set<string>();
  for (const key of keys) if (sporeCloudOver(state, state.map.tiles.get(key), rules)) covered.add(key);
  return covered;
}

/** What blocks sight on a layer besides rock: spore clouds, underground. */
export function sightBlockedBy(state: RunState, layer: Layer, rules: RunRules): ((h: Hex) => boolean) | undefined {
  if (layer !== 'underground' || !Object.values(rules.biomeRules).some((r) => r.sporeClouds)) return undefined;
  return (h) => sporeCloudOver(state, state.map.tiles.get(hexKey(h)), rules);
}

/**
 * How close the Order must be to notice the hydra where she stands, at most (Infinity when nothing hides her): roots
 * of the Root Tangle, a spore cloud of the Fungal Deeps.
 */
export function hiddenUnlessWithin(state: RunState, rules: RunRules): number {
  const rule = biomeRuleHere(state, rules);
  if (!rule) return Infinity;
  const tile = state.map.tiles.get(hexKey(state.hydra.position));
  let within = Infinity;
  if (rule.hiding && tile && rule.hiding.grounds.includes(tile.terrain)) within = Math.min(within, rule.hiding.seenWithin);
  if (rule.sporeClouds && sporeCloudOver(state, tile, rules)) within = Math.min(within, rule.sporeClouds.seenWithin);
  return within;
}
