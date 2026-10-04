// What the world generator needs to know. The game fills this in from the data files
// (src/data/runRules.ts); tests can build their own.

import type { GroundType, Loot } from '../types';

export type Range = readonly [number, number];
export type Weighted<T extends string = string> = ReadonlyArray<{ id: T; weight: number }>;

export interface BiomeSettings {
  id: string;
  /** Share of each kind of open ground in the biome (they add up to 1). */
  ground: Readonly<Partial<Record<GroundType, number>>>;
  /** How likely encounters are here compared with other biomes of the same ring (1 = normal). */
  encounterDensity: number;
}

/** What can lie at the end of a dead end (a Draught Crack is placed separately: one per border). */
export const DEAD_END_CONTENTS = ['remains', 'shrine', 'richDeposit', 'guardedHoard'] as const;
export type DeadEndContent = (typeof DEAD_END_CONTENTS)[number];

/** What a patch (a chamber of another ring's biome) holds when its biome has no location left to give. */
export const PATCH_FINDS = ['remains', 'richDeposit', 'shrine'] as const;
export type PatchFind = (typeof PATCH_FINDS)[number];

export interface RingSettings {
  /** Straight-line distance from the rings' middle to this ring's outer edge (before it wobbles). */
  outerEdge: number;
  /** The ring's own biomes, sharing it in sectors (one or two). */
  mainBiomes: readonly string[];
  /** With two main biomes: the first one's share of the ring, between these. */
  mainBiomeShare: Range;
  /** How many chambers of other biomes (patches), and which biomes, by weight. */
  patches: Range;
  patchBiomes: Weighted;
  chambers: Range;
  chamberSize: Range;
  /** Dead ends, counting the one with this ring's Draught Crack. */
  deadEnds: Range;
  deadEndContents: Weighted<DeadEndContent>;
  /** At least this many of the dead ends hold a shrine. */
  minShrines: number;
  encounters: number;
  /** Strength of the encounters in this ring (enemy groups of this tier, enemies.json). */
  encounterTier: number;
  muckDeposits: number;
  moistureSources: number;
  /** Thresholds on the border outward (to the next ring): how many, and their kinds by weight. One is always a Draught Crack. */
  thresholds: { count: Range; kinds: Weighted } | null;
}

export interface PlaceSettings {
  id: string;
  /** landmark: one per main biome, always. location: a few per biome. rare: a small chance per world. */
  type: 'landmark' | 'location' | 'rare';
  /** For landmarks and locations: the biome they belong to. */
  biome: string | null;
  /** For rare places: the chance (0–1) that a world has it. */
  chance: number;
  /**
   * For rare places, where they go: a chamber (of ring `ring`, or any), a dead end, or a threshold
   * (a threshold kind of the same id, e.g. the Cinder Scar).
   */
  where: 'chamber' | 'deadEnd' | 'threshold';
  ring: number | null;
  /** The place moves the hydra along a current (the Undertow): the generator lays out where it carries. */
  carries: boolean;
}

export interface UndergroundGeneratorSettings {
  /** Size of the map in hexes from the lair to its edge. */
  radius: number;
  lairBiome: BiomeSettings;
  /** Every biome by id, the lair's included. */
  biomes: Readonly<Record<string, BiomeSettings>>;
  /** Radius of the lair's swamp. */
  lairRadius: number;
  /** Wide ways out of the lair into ring 1. */
  lairExits: Range;
  /** The rings' middle can be this far from the lair, so a ring is narrow on one side and wide on the other. */
  ringCenterOffset: number;
  /** Ring borders and the world's edge wander this far in and out. */
  edgeWobble: number;
  minRingWidth: number;
  /** Thickness of the rock bands between rings, thinnest to thickest. */
  bandThickness: Range;
  /** Chambers lie at least this many hexes apart (centre to centre). */
  chamberSpacing: number;
  corridors: {
    /** Share of corridors one hex wide (the others are two). */
    narrowShare: number;
    /** Links beyond the minimum, as a share of it: they make loops. */
    extraLinkShare: number;
    /** How much corridors wander (0 = straight). */
    winding: number;
  };
  deadEndSpur: Range;
  deadEndPocket: Range;
  /** Thresholds of one border lie at least this share of the circle apart. */
  thresholdSpacing: number;
  /** Thresholds that are dug through, and how many turns of digging each takes (a range: each one gets its own). */
  digTurns: Readonly<Record<string, Range>>;
  encounterSpacing: number;
  encounterMinDistanceFromLair: number;
  /** Where the passages to the surface are: one in ring `firstRing`, one in one of `secondRings`. */
  passages: { firstRing: number; secondRings: readonly number[] };
  rings: readonly RingSettings[];
  shrineBlessingIds: readonly string[];
  /** Enemy groups of each tier, picked by weight. */
  groupsByTier: Readonly<Record<number, Weighted>>;
  resources: { muckPerDeposit: number; moisturePerSource: number; richMultiplier: number };
  places: readonly PlaceSettings[];
  /** Locations per biome (as many as its pool allows). */
  locationsPerBiome: Range;
  maxRarePlaces: number;
  /** Hexes the Undertow carries the hydra. */
  undertowLength: Range;
  /** What a patch of each biome holds when the biome has no location left. */
  patchFinds: Readonly<Record<string, PatchFind>>;
  /** Number of remains lines in each pool: "any", or a biome id for remains found in that biome. */
  remainsLines: Readonly<Record<string, number>>;
  /** What remains give: one of these resources, picked at random among those with more than 0, in this range. */
  remainsLoot: Readonly<Record<'muck' | 'moisture' | 'bones', Range>>;
  /** What a Guarded Hoard gives. */
  hoardLoot: Loot;
  /** Run modifiers in play (ids from world.json runModifiers), and what the generator does with each. */
  modifiers: readonly string[];
  modifierRules: {
    wetYear: { waterShareBonus: number; moistureMultiplier: number };
    myceliumBloom: { extraFungalPatches: Range; fungalBiome: string };
    oldWorkings: { extraEncounters: number };
  };
}
