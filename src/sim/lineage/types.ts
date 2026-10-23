// Shapes of a lineage (GAME_DESIGN.md §12): hydras one after another, each the heiress of the one before, and what the
// whole account keeps whatever happens to them (world knowledge, unlocks, the Book of Lineages).

/** How long a story flag is remembered (flags.json): her life, her lineage, or for good (world knowledge). */
export type FlagScope = 'life' | 'lineage' | 'world';

/** A challenge that unlocks something for the account (world.json runModifiers unlock). Exactly one field is set. */
export interface Challenge {
  /** A hydra stands in this ring. */
  reachRing?: number;
  /** One hydra wins this many battles. */
  battlesWon?: number;
  /** A lineage gets this far. */
  generation?: number;
  /** This story flag is known. */
  flag?: string;
  /** One hydra lives this many turns. */
  turns?: number;
}

export interface LineageRules {
  names: readonly string[];
  /** The chance that an heiress is named after one of her ancestresses. */
  takeAncestorName: number;
  /** The share of her mother's mutations an heiress inherits (rounded up). */
  inheritedShare: number;
  epitaphs: { byEnemy: Readonly<Record<string, readonly string[]>>; any: readonly string[]; ended: readonly string[] };
  flagScopes: Readonly<Record<string, FlagScope>>;
  /** For {biome} in epitaphs. */
  biomeNames: Readonly<Record<string, string>>;
  /** Dialogues (by id): a lineage remembers which of them it has heard (events are once per life). */
  dialogueIds: ReadonlySet<string>;
  /** Run modifiers the account can unlock, and how. */
  unlocks: ReadonlyArray<{ id: string; challenge: Challenge }>;
  /** How often a generation gets a normal year, against weight 1 for each unlocked run modifier (world.json modifierDraw). */
  normalYearWeight: number;
}

/** One hydra in the Book of Lineages. */
export interface ChronicleEntry {
  generation: number;
  /** With her number (Morwenna II). */
  name: string;
  turns: number;
  /** The mutations she carried at the end. */
  mutations: string[];
  /** Slain, or the last of a lineage the player ended. */
  end: 'slain' | 'ended';
  /** The kind of enemy credited with her death (enemies.json), or null. */
  killedBy: string | null;
  epitaph: string;
}

export interface Lineage {
  /** 1 for the account's first lineage, and so on. */
  number: number;
  seed: number;
  /** Its first hydra's name: the Line of Morwenna. */
  name: string;
  /** The living hydra (or the heiress about to hatch): her generation (1 = the first) and name with its number. */
  generation: number;
  hydraName: string;
  /** Names of every hydra so far without numbers, the living one last. */
  names: string[];
  /** Mutations the living hydra was born with. */
  inherited: string[];
  /** Her mother (null for the first hydra). */
  mother: { name: string; killedBy: string | null } | null;
  /** Flags of scope 'lineage' the lineage knows; dialogues it has heard; enemy types it has met. */
  flags: string[];
  seen: string[];
  enemyTypesMet: string[];
  /** The hydras that came before, first first. */
  chronicle: ChronicleEntry[];
  /** The player ended it (New Lineage): nobody hatches any more. */
  ended: boolean;
  /** Random numbers for names, inheritance and epitaphs. */
  rngState: number;
}

/** What the account keeps whatever happens to its lineages. */
export interface Profile {
  /** Every lineage, first first; the last one is played unless it has ended. */
  lineages: Lineage[];
  /** World knowledge: flags of scope 'world', and places (world.json ids) any hydra has seen. */
  knowledge: { flags: string[]; placesSeen: string[] };
  /** Run modifiers unlocked (world.json runModifiers). */
  unlocked: string[];
}
