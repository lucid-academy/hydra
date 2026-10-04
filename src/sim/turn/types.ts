// Shapes of a run on the strategic map: the rules it is played by (from the data files), its state, and its events.

import type { HeadRecord } from '../battle';
import type { Hex } from '../hex';
import type { HexMap, Loot, TerrainTable, UndergroundGeneratorSettings, Visibility } from '../map';


/** What a blessing of the Great Serpent changes (shrines.json). Missing = no change. */
export interface BlessingEffects {
  /** Movement points per turn. */
  movement?: number;
  /** Sight range in hexes. */
  sight?: number;
  bodyMaxHp?: number;
  /** Body HP healed at the end of every turn. */
  regeneration?: number;
  /** Paid at once: */
  alert?: number;
  muck?: number;
  moisture?: number;
}

/** How a kind of threshold opens (world.json thresholds). */
export interface ThresholdRules {
  /** Looks like rock until the hydra stands next to it; then it is open. */
  hidden: boolean;
  /** Opened by digging, one dig per turn (how many digs: the threshold's own `digsNeeded`). */
  dug: boolean;
  /** Opened at once by a head of this class. */
  headClass: string | null;
}

/** Something the hydra can do at a place (world.json places). */
export interface PlaceAction {
  id: string;
  movementCost: number;
  /** Needs a head of this class. */
  headClass: string | null;
  /** Once per run. */
  once: boolean;
  /** Turns to wait before doing it again (0 = no wait). */
  cooldownTurns: number;
  gain: Loot;
  /** A condition put on the hydra for a number of turns. */
  condition: { id: string; turns: number } | null;
  /** Carries the hydra along the place's current. */
  carry: boolean;
  /** Shows the nearest hidden threshold. */
  revealHiddenThreshold: boolean;
}

export interface PlaceRules {
  /** Landmarks are seen from afar. */
  landmark: boolean;
  actions: readonly PlaceAction[];
  /** Battles this many hexes away or closer don't raise the Alert (null = no such effect). */
  silencesBattlesWithin: number | null;
}

/** A condition on the hydra that lasts a few turns (world.json conditions). */
export interface ConditionRules {
  /** Change of movement points per turn. */
  movement: number;
  /** Every encounter on the map is shown. */
  revealsEncounters: boolean;
}

export interface RunRules {
  movementPointsPerTurn: number;
  sightRangeHexes: number;
  /** Landmarks this many hexes away or closer are seen, even through rock. */
  landmarkSightRange: number;
  /** An echo is heard when a place or patch not yet seen is this many hexes away or closer. */
  echoRange: number;
  terrain: TerrainTable;
  alertMin: number;
  alertMax: number;
  alertPerHexDiscovered: number;
  alertPerBattle: number;
  generator: UndergroundGeneratorSettings;
  bodyMaxHp: number;
  startingHeads: ReadonlyArray<{ classId: string; maxHp: number }>;
  /** Classes a new head can have, when a healed scar grows heads in the lair. */
  hatchlingClasses: ReadonlyArray<{ classId: string; maxHp: number }>;
  maxHeads: number;
  headNames: readonly string[];
  healing: { bodyHpPerTurn: number; headHpPerTurn: number };
  /** Bones taken from every human of a group beaten in battle. */
  bonesPerEnemy: number;
  /** Enemy type ids for each encounter group id. */
  encounterGroupMembers: Readonly<Record<string, readonly string[]>>;
  /** What each blessing (by id) does. */
  blessings: Readonly<Record<string, BlessingEffects>>;
  thresholds: Readonly<Record<string, ThresholdRules>>;
  places: Readonly<Record<string, PlaceRules>>;
  conditions: Readonly<Record<string, ConditionRules>>;
}

export interface Hydra {
  position: Hex;
  movementLeft: number;
  /** Movement points at the start of each turn (blessings can change it; conditions change it for a while). */
  movementPerTurn: number;
  /** How far the hydra sees, in hexes. */
  sightRange: number;
  bodyHp: number;
  bodyMaxHp: number;
  /** Body HP healed at the end of every turn. */
  regeneration: number;
  heads: HeadRecord[];
  /** Stumps burnt shut. Resting in the lair heals them, and they grow heads again. */
  scars: number;
  /** Blessings accepted so far (ids from shrines.json). */
  blessings: string[];
  /** Conditions for a few turns (world.json conditions), with the turns left. */
  conditions: Array<{ id: string; turnsLeft: number }>;
}

export interface Resources {
  muck: number;
  moisture: number;
  bones: number;
}

/** An echo the hydra heard: from where, and the known hex where it is marked on the map. */
export interface HeardEcho {
  source: Hex;
  mark: Hex;
  placeId: string | null;
  biome: string;
}

export interface RunState {
  readonly seed: number;
  turn: number;
  map: HexMap;
  hydra: Hydra;
  visibility: Visibility;
  /** 0–100. Stored with fractions; show it rounded down. */
  alert: number;
  resources: Resources;
  /** The encounter the hydra stepped on, until its battle is resolved. */
  pendingBattle: { at: Hex; groupId: string } | null;
  /** The shrine the hydra stands at, until its blessing is accepted or refused. */
  pendingShrine: Hex | null;
  /** The place the hydra stands at, or the threshold it stands next to, while its panel is open. */
  pendingPlace: Hex | null;
  /** Echoes heard so far. */
  echoes: HeardEcho[];
  /** Hidden thresholds whose draught the hydra has felt (hex keys). */
  draughtsFelt: string[];
  battlesFought: number;
  /** Next free number for ids of heads grown in battles. */
  nextId: number;
  /** Random numbers for things that happen on the map (e.g. which heads grow from a healed scar). */
  rngState: number;
  /** The hydra died: this run is over. */
  over: boolean;
}

export type RunEvent =
  | { type: 'moved'; path: Hex[] }
  | { type: 'carried'; path: Hex[] }
  | { type: 'discovered'; count: number }
  | { type: 'collected'; resource: 'muck' | 'moisture'; amount: number; rich: boolean; at: Hex }
  | { type: 'remainsFound'; at: Hex; pool: string; line: number; loot: Loot }
  | { type: 'hoardTaken'; at: Hex; loot: Loot }
  | { type: 'battleStarted'; at: Hex }
  | { type: 'battleWon'; at: Hex; bones: number; silenced: boolean }
  | { type: 'shrineReached'; at: Hex; blessingId: string }
  | { type: 'blessingAccepted'; blessingId: string }
  | { type: 'blessingRefused'; blessingId: string }
  | { type: 'placeReached'; at: Hex; placeId: string; firstVisit: boolean }
  | { type: 'placeAction'; at: Hex; placeId: string; actionId: string; gain: Loot }
  | { type: 'landmarkSighted'; at: Hex; placeId: string }
  | { type: 'echoHeard'; echo: HeardEcho }
  | { type: 'draughtFelt'; at: Hex; thresholdId: string }
  | { type: 'thresholdFound'; at: Hex; thresholdId: string }
  | { type: 'thresholdReached'; at: Hex; thresholdId: string }
  | { type: 'thresholdDug'; at: Hex; thresholdId: string; dug: number; needed: number }
  | { type: 'thresholdOpened'; at: Hex; thresholdId: string }
  | { type: 'thresholdRevealed'; at: Hex; thresholdId: string }
  | { type: 'conditionStarted'; id: string; turns: number }
  | { type: 'conditionEnded'; id: string }
  | { type: 'rested'; healedScars: number; newHeadIds: string[] }
  | { type: 'hydraDied' }
  | { type: 'turnEnded'; turn: number };

export interface Reachable {
  cost: number;
  /** Steps from the hydra's position (excluded) to the target (included). */
  path: Hex[];
}
