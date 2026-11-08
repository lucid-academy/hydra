// The Big World's scenery on the underground map (GAME_DESIGN.md §13, "Mapa bliżej Songs of Conquest"), drawn from
// each biome's own pictures once they exist (docs/ART_PROMPTS.md, "Wielki świat"): props scattered in clusters, flat
// patches on the ground, and big clumps standing against the back walls of chambers, like the woods on a Heroes map.
// A biome without its pictures keeps the older decorations (map_deco_*); nothing here needs the art to exist.

import type * as Phaser from 'phaser';
import type { GameData } from '../data';
import { hex, hexDistance, hexKey, hexNeighbors } from '../sim/hex';
import type { Hex } from '../sim/hex';
import type { HexMap } from '../sim/map';
import { Rng } from '../sim/rng';

/** What a biome has pictures for. Frame numbers count from 0 (the prompts count from 1). */
export interface BiomeScenery {
  /** Frames of map_props_<biome>; 0 while it has no picture. */
  props: number;
  propsInWater: number[];
  propsOnGround: number[];
  glowingProps: number[];
  /** Frames of map_patches_<biome>; 0 while it has no picture. */
  patches: number;
  /** Image keys of the clumps that have pictures: any of them on dry ground, these in water. */
  clumps: string[];
  clumpsInWater: string[];
}

/** Big clumps: one in a chamber this big, two in one this big; never this close to the lair. */
const BIG_CLUMPS = { oneFrom: 12, twoFrom: 22, awayFromLair: 3 } as const;

/** Whether an image in the manifest has a picture (not only a placeholder drawn in code). */
export function hasPicture(scene: Phaser.Scene, data: GameData, key: string): boolean {
  return (data.manifest.images[key]?.file ?? null) !== null && scene.textures.exists(key);
}

/** The frames of a sheet with a picture (a set may have more or fewer than the prompt asked for), else 0. */
function framesOf(scene: Phaser.Scene, data: GameData, key: string): number {
  if (!hasPicture(scene, data, key)) return 0;
  // Phaser counts the whole picture as one more frame.
  return Math.max(1, scene.textures.get(key).frameTotal - 1);
}

export function biomeScenery(scene: Phaser.Scene, data: GameData, biome: string): BiomeScenery {
  const def = data.biomes.biomes[biome]?.scenery;
  const props = framesOf(scene, data, `map_props_${biome}`);
  const frames = (numbers: readonly number[] | undefined) => (numbers ?? []).map((n) => n - 1).filter((f) => f < props);
  const propsInWater = frames(def?.propsInWater);
  const clumps = (def?.clumps ?? []).map((name) => `map_clump_${biome}_${name}`).filter((key) => hasPicture(scene, data, key));
  return {
    props,
    propsInWater,
    propsOnGround: Array.from({ length: props }, (_, i) => i).filter((f) => !propsInWater.includes(f)),
    glowingProps: frames(def?.glowingProps),
    patches: framesOf(scene, data, `map_patches_${biome}`),
    clumps,
    clumpsInWater: (def?.clumpsInWater ?? []).map((name) => `map_clump_${biome}_${name}`).filter((key) => clumps.includes(key)),
  };
}

export interface BigClump {
  anchor: Hex;
  key: string;
  /** Hexes it stands over (its anchor and the hexes beside it): no small decorations there. */
  covers: Hex[];
}

/**
 * Where the big clumps stand: against the back wall of a chamber (rock behind them, so nothing walks behind and gets
 * hidden), on a hex with nothing on it or next to it, away from the lair. The same map always gets the same ones.
 */
export function planBigClumps(map: HexMap, seed: number, sceneryOf: (biome: string) => BiomeScenery): BigClump[] {
  const rng = new Rng((seed ^ 0xc1a4b) >>> 0);
  const tileAt = (h: Hex) => map.tiles.get(hexKey(h));
  const open = (h: Hex) => {
    const t = tileAt(h);
    return t !== undefined && t.terrain !== 'rock';
  };
  const covered = new Set<string>();
  const clumps: BigClump[] = [];
  // The chambers of the rings, and the swamp round the lair.
  const lairSwamp = [...map.tiles.values()].filter((t) => t.region === 'lair' && t.terrain !== 'rock').map((t) => t.hex);
  for (const chamber of [...map.layout.chambers, { hexes: lairSwamp }]) {
    const size = chamber.hexes.length;
    const count = size >= BIG_CLUMPS.twoFrom ? 2 : size >= BIG_CLUMPS.oneFrom ? 1 : 0;
    for (let n = 0; n < count; n++) {
      const spots = chamber.hexes.filter((h) => {
        const tile = tileAt(h);
        if (!tile || tile.terrain === 'rock' || tile.object || covered.has(hexKey(h))) return false;
        if (hexDistance(h, map.lair) < BIG_CLUMPS.awayFromLair) return false;
        const scenery = sceneryOf(tile.biome);
        if ((tile.terrain === 'water' ? scenery.clumpsInWater : scenery.clumps).length === 0) return false;
        // Rock behind it (up the screen), and nothing on the hexes around it.
        const behind = [hex(h.q, h.r - 1), hex(h.q + 1, h.r - 1)];
        if (!behind.some((b) => !open(b))) return false;
        return hexNeighbors(h).every((m) => !tileAt(m)?.object && !covered.has(hexKey(m)));
      });
      if (spots.length === 0) break;
      const anchor = rng.pick(spots);
      const tile = tileAt(anchor)!;
      const scenery = sceneryOf(tile.biome);
      const key = rng.pick(tile.terrain === 'water' ? scenery.clumpsInWater : scenery.clumps);
      const covers = [anchor, hex(anchor.q - 1, anchor.r), hex(anchor.q + 1, anchor.r)].filter(open);
      for (const h of [...covers, ...hexNeighbors(anchor)]) covered.add(hexKey(h));
      clumps.push({ anchor, key, covers });
    }
  }
  return clumps;
}
