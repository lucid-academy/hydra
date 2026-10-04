import type { Hex } from '../hex';

export const TERRAIN_TYPES = ['water', 'mud', 'roots', 'salt', 'rock'] as const;
export type TerrainType = (typeof TERRAIN_TYPES)[number];
export type GroundType = Exclude<TerrainType, 'rock'>;

export interface TerrainRules {
  /** Movement points to enter this hex; null = impassable. */
  moveCost: number | null;
  blocksSight: boolean;
}

export type TerrainTable = Readonly<Record<TerrainType, TerrainRules>>;

/** Resources a find gives. */
export type Loot = Readonly<Partial<Record<'muck' | 'moisture' | 'bones', number>>>;

/** A Threshold is hidden (looks like rock), closed (seen, but rock until opened) or open (a way through). */
export type ThresholdState = 'hidden' | 'closed' | 'open';

export type MapObject =
  | { kind: 'lair' }
  | { kind: 'encounter'; groupId: string; tier: number }
  /** A Muck deposit; rich = a Rich Deposit at the end of a dead end. */
  | { kind: 'muck'; amount: number; rich: boolean }
  /** A Moisture source; rich = a Rich Deposit at the end of a dead end. */
  | { kind: 'moisture'; amount: number; rich: boolean }
  /** A shrine of the Great Serpent, offering one blessing (shrines.json) until it is accepted. */
  | { kind: 'shrine'; blessingId: string; used: boolean }
  /** A way up to the surface (sealed until the surface exists). */
  | { kind: 'passage' }
  /**
   * A crossing between two rings, on a hex of the rock band between them (thresholds in world.json).
   * The hex is rock until the threshold opens; then its ground is `floor`.
   * border: 1 = between rings 1 and 2, 2 = between rings 2 and 3.
   */
  | { kind: 'threshold'; thresholdId: string; state: ThresholdState; border: number; floor: GroundType; dug: number; digsNeeded: number }
  /** Remains at the end of a dead end: a little loot, and one line (world.json remains, `pool` and `line`) about who died here. */
  | { kind: 'remains'; pool: string; line: number; loot: Loot; looted: boolean }
  /** Resources piled at the end of a dead end, with an encounter guarding the way in. */
  | { kind: 'hoard'; loot: Loot }
  /**
   * A landmark, a location or a rare place (world.json).
   * visited: the hydra has been here. used: actions done that can be done only once.
   * readyOnTurn: turn when an action with a wait between uses can be done again.
   * carryPath: for a current, the hexes it carries the hydra along (the last one is where it lets go).
   */
  | { kind: 'place'; placeId: string; visited: boolean; used: string[]; readyOnTurn: Record<string, number>; carryPath: Hex[] | null };

export type ObjectKind = MapObject['kind'];

/** Which part of the underground a hex lies in. */
export type Region = 'lair' | 'ring' | 'band' | 'outside';

export interface Tile {
  readonly hex: Hex;
  /** Which biome (from biomes.json) this hex belongs to. */
  readonly biome: string;
  /** 0 = the lair's swamp, 1–3 = the rings. A band of rock counts to the ring inside it, the rock outside the world to the last ring. */
  readonly ring: number;
  readonly region: Region;
  terrain: TerrainType;
  object: MapObject | null;
}

/** A cave chamber, as the generator made it. */
export interface Chamber {
  readonly ring: number;
  readonly biome: string;
  /** In another ring's biome: a patch, which always holds one thing from its biome. */
  readonly patch: boolean;
  readonly hexes: readonly Hex[];
  /** Corridors leading out. A chamber with one way out is a dead end too, so it always holds something. */
  readonly exits: number;
}

/** A dead end: a side passage (spur) ending in a small pocket, where exactly one thing lies (`content`). */
export interface DeadEnd {
  readonly ring: number;
  readonly spur: readonly Hex[];
  readonly pocket: readonly Hex[];
  /** Where its one thing is: in the pocket, or for a Draught Crack the crack itself, next to the pocket. */
  readonly content: Hex;
}

/** Something the hydra can hear before it sees it (an echo): a place, or a chamber of another biome. */
export interface EchoSource {
  readonly at: Hex;
  readonly placeId: string | null;
  readonly biome: string;
}

/** How this world was built: for the rules that check it, and for hints on the map. */
export interface WorldLayout {
  readonly rings: number;
  /** Run modifiers that shaped this world (world.json runModifiers). */
  readonly modifiers: readonly string[];
  /** Rare places this world has (world.json places). */
  readonly rarePlaces: readonly string[];
  /** Middle of the rings, which can sit off the lair (flat coordinates: neighbouring hexes 1 apart, the lair at 0, 0). */
  readonly ringCenter: { readonly x: number; readonly y: number };
  readonly chambers: readonly Chamber[];
  readonly deadEnds: readonly DeadEnd[];
  readonly echoSources: readonly EchoSource[];
}

export interface HexMap {
  readonly radius: number;
  /** Every hex of the map, keyed by hexKey(). */
  readonly tiles: Map<string, Tile>;
  readonly lair: Hex;
  readonly layout: WorldLayout;
}

/** A layout with nothing in it, for maps made by hand (tests). */
export function emptyLayout(): WorldLayout {
  return { rings: 0, modifiers: [], rarePlaces: [], ringCenter: { x: 0, y: 0 }, chambers: [], deadEnds: [], echoSources: [] };
}
