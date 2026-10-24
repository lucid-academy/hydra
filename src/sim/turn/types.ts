// Shapes of a run on the strategic map: the rules it is played by (from the data files), its state, and its events.

import type { HeadExperienceRules, HeadRecord } from '../battle';
import type { Hex } from '../hex';
import type { HexMap, Layer, Loot, MapObject, SurfaceGeneratorSettings, SurfaceMap, TerrainTable, UndergroundGeneratorSettings, Visibility } from '../map';


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

/**
 * What a mutation changes (mutations.json, GAME_DESIGN.md §12). Missing = no change. A hydra born with it has it from
 * the start; one that gains it in her life feels the lasting part at once (all but startingHeads).
 */
export interface MutationEffects {
  movement?: number;
  sight?: number;
  bodyMaxHp?: number;
  regeneration?: number;
  /** Every head's max HP, in percent. */
  headMaxHpPercent?: number;
  /** Heads she hatches with (from the next generation on; never fewer than 1). */
  startingHeads?: number;
  /** The Alert rises this many percent faster (negative: slower). */
  alertPercent?: number;
  /** More Muck and Moisture from deposits and springs, in percent. */
  findsPercent?: number;
  /** Echoes are heard this many hexes further. */
  echoRange?: number;
  /** Burning a stump shut in battle takes this many percent longer. */
  cauterizePercent?: number;
  /** Exposed on the surface, she loses this many percent more body HP (negative: less). */
  exposedDamagePercent?: number;
}

/** What a hydra hatches with (GAME_DESIGN.md §12), given by her lineage (sim/lineage). */
export interface Heritage {
  /** 1 for the first hydra of a lineage. */
  generation: number;
  /** Her name, with its number (Morwenna II). */
  name: string;
  /** Her lineage is named after its first hydra. */
  lineageName: string;
  /** Mutations she is born with (mutations.json ids). */
  mutations: readonly string[];
  /** Story flags her lineage and the world remember, dialogues her lineage has heard, enemy types it has met. */
  flags: readonly string[];
  seen: readonly string[];
  enemyTypesMet: readonly string[];
  /** Places (world.json ids) the world remembers: the generator prefers the others. */
  placesSeen: readonly string[];
  /** Her mother, for the dialogues of a new generation (null for the first hydra of a lineage). */
  mother: { name: string; killedBy: string | null } | null;
  /** Old Mother Toad already keeps an egg of the lineage hidden (then no other can be hidden). */
  hiddenEgg?: boolean;
}

/** How a kind of threshold opens (world.json thresholds). */
export interface ThresholdRules {
  /** Looks like rock until the hydra stands next to it; then it is open. */
  hidden: boolean;
  /** Opened by digging, one dig per turn (how many digs: the threshold's own `digsNeeded`). */
  dug: boolean;
  /** Opened at once by a head of this class. */
  headClass: string | null;
  /**
   * Opened by a step of a mini quest (the Sealed Door): any one of `ways`, each needing a story flag. Opening it
   * sets `setFlags` and says `dialogue` (an id from dialogues.json). Null: not sealed.
   */
  sealed: { ways: ReadonlyArray<{ flag: string }>; setFlags: readonly string[]; dialogue: string | null } | null;
}

/**
 * The Cinderkin melt a tunnel when an event's outcome says `bore` (GAME_DESIGN.md §9.3): through one of the thinnest
 * spots of a rock band near the hydra, no farther than `within` hexes, at most `longest` hexes of rock long. The tunnel
 * burns for `hotTurns` turns (the one it is made in included): every hot hex the hydra steps on costs `burn` body HP.
 * Its middle is a threshold of kind `thresholdId`.
 */
export interface BoreRules {
  thresholdId: string;
  within: number;
  longest: number;
  hotTurns: number;
  burn: number;
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

// ---------------------------------------------------------------- story (GAME_DESIGN.md §10, §11)

/**
 * When a dialogue can start. eventOnly: only when an event's choice asks for it by id.
 * serpentInBattle: a short line of the Serpent over a battle, which goes on (no pause).
 */
export type StoryTrigger =
  | 'afterBattle'
  | 'newBiome'
  | 'enemyAhead'
  | 'restInLair'
  | 'serpentOnTheWay'
  | 'serpentInBattle'
  | 'eventOnly'
  /** A new generation hatches (Old Mother Toad greets the heiress), and an ancestress may speak through her sleep. */
  | 'newGeneration'
  | 'ancestorInSleep'
  /** On the surface (GAME_DESIGN.md §5.6, §5.7): a Flame Shrine put out, one lit again, the hydra left without mist. */
  | 'shrineOut'
  | 'shrineRelit'
  | 'exposed';

/** What must be true for a dialogue or an event. Missing = anything goes. */
export interface StoryConditions {
  rings?: readonly number[];
  biomes?: readonly string[];
  /** All of these flags are set. */
  flags?: readonly string[];
  /** None of these flags are set. */
  notFlags?: readonly string[];
  minAlert?: number;
  maxAlert?: number;
  minTurn?: number;
  /** The hydra has a head of each of these classes. */
  headClasses?: readonly string[];
  minHeads?: number;
  maxHeads?: number;
  /** Facts of the moment, from what started it: */
  won?: boolean;
  severedAtLeast?: number;
  grownAtLeast?: number;
  cauterizedAtLeast?: number;
  /** One of these enemy types is met for the first time. */
  newEnemyTypes?: readonly string[];
  /** The hydra's generation (1 = the first of her lineage). */
  minGeneration?: number;
  maxGeneration?: number;
  /** The hydra carries all of these mutations. */
  mutations?: readonly string[];
  /** A new generation: she inherited at least this many mutations, and one of these enemy types killed her mother. */
  inheritedAtLeast?: number;
  motherKilledBy?: readonly string[];
}

/**
 * Who says a line: toad (Old Mother Toad), serpent (the Great Serpent's voice), ancestor (the hydra's mother, through
 * her sleep), or a head: head:any (one of the heads), head:other (another one than head:any), head:new (one that just
 * grew), head:<class id>.
 */
export type SpeakerRef = string;

export interface DialogueLineRules {
  speaker: SpeakerRef;
  text: string;
}

export interface DialogueRules {
  id: string;
  trigger: StoryTrigger;
  /** The highest priority among the dialogues that fit is said. */
  priority: number;
  /** Said once per lineage (else it can come again). */
  once: boolean;
  conditions: StoryConditions;
  lines: readonly DialogueLineRules[];
  setFlags: readonly string[];
  choices: ReadonlyArray<{ text: string; setFlags: readonly string[]; reply: readonly DialogueLineRules[] }>;
}

/** What an event's choice does. */
export interface EventOutcome {
  text: string;
  /** Resources gained (or lost, when negative). */
  loot: { muck: number; moisture: number; bones: number };
  alert: number;
  /** Change of the body's HP, and of every head's HP. */
  bodyHp: number;
  headsHp: number;
  condition: { id: string; turns: number } | null;
  /** Hexes this far around the hydra become known. */
  reveal: number;
  /** A battle against this enemy group, right here. */
  battle: string | null;
  setFlags: readonly string[];
  /** A dialogue (by id) said after the event. */
  dialogue: string | null;
  /** A new head of this class grows. */
  newHead: string | null;
  /** The Cinderkin melt a tunnel through the rock nearby (RunRules.bore). */
  bore: boolean;
  /** The hydra gains this mutation (mutations.json), for herself and her heiresses. */
  mutation: string | null;
}

export interface EventChoiceRules {
  text: string;
  /** Needs a head of this class. */
  needsHead: string | null;
  /** Needs this condition on the hydra (world.json conditions), e.g. Warm. */
  needsCondition: string | null;
  /** Paid when chosen; can't be chosen without it. */
  cost: { muck: number; moisture: number; bones: number };
  /** A gamble: `success` with this chance, else `failure`. Null: always `success`. */
  chance: number | null;
  success: EventOutcome;
  failure: EventOutcome | null;
}

export interface EventRules {
  id: string;
  title: string;
  /** The mini quest this event is a step of (its name), or null. */
  quest: string | null;
  text: string;
  priority: number;
  weight: number;
  once: boolean;
  conditions: StoryConditions;
  choices: readonly EventChoiceRules[];
}

export interface StoryRules {
  /** Names of the speakers who are not heads. */
  speakerNames: Readonly<Record<string, string>>;
  dialogues: readonly DialogueRules[];
  events: readonly EventRules[];
  /** The Serpent speaks on the way at most every so many turns, with this chance at the end of a turn. */
  serpentVoice: { minTurnsBetween: number; chancePerTurn: number; battleChance: number };
  /** The chance that an ancestress speaks through sleep when a new generation hatches. */
  ancestorVoiceChance: number;
  /** Dialogues (by id): a lineage remembers which of them it has heard; events are once per life. */
  dialogueIds: ReadonlySet<string>;
  mutationNames: Readonly<Record<string, string>>;
  biomeNames: Readonly<Record<string, string>>;
  headClassNames: Readonly<Record<string, string>>;
}

/** A line as shown: who says it (name; class for heads) and what. */
export interface ShownLine {
  speaker: 'toad' | 'serpent' | 'ancestor' | 'head';
  name: string;
  classId: string | null;
  text: string;
}

export interface ShownDialogue {
  id: string;
  lines: ShownLine[];
  choices: Array<{ text: string; reply: ShownLine[] }>;
}

export interface StoryState {
  flags: string[];
  /** Dialogues and events that happened (ids), for `once`: dialogues of the whole lineage, events of this life. */
  seen: string[];
  enemyTypesMet: string[];
  biomesEntered: string[];
  lastSerpentTurn: number;
  /** Dialogues waiting to be shown, first first. */
  dialogues: ShownDialogue[];
  rngState: number;
}

// ---------------------------------------------------------------- the Order on the map (GAME_DESIGN.md §5.5, §8)

/** An encounter group the Order can send, by weight. */
export interface OrderGroupRules {
  groupId: string;
  weight: number;
  /** Only from an entrance in this ring or deeper (0: any). */
  minRing: number;
  /** Only once this Alert stage is reached, or in act 2 and later (null: always). */
  fromStage: string | null;
}

/** How the Order reacts to the Alert and walks the underground (order.json). */
export interface OrderRules {
  /** Alert stages, lowest first: from `at` on, the Order does more. */
  stages: ReadonlyArray<{ id: string; at: number }>;
  /** The Alert rises this much every world turn. */
  alertPerTurn: number;
  patrols: {
    firstOnTurn: number;
    /** By the number of stages reached (index 0: none yet). */
    maxByStage: readonly number[];
    everyTurnsByStage: readonly number[];
    actMaxBonus: number;
    movement: number;
    sight: number;
    chaseTurns: number;
    groups: readonly OrderGroupRules[];
  };
  messengers: { headStart: number; movement: number; alertOnArrival: number; alertWhenEaten: number; bones: number; eatenLines: number };
  expeditions: { fromStage: string; firstAfterTurns: number; everyTurns: number; movement: number; groups: readonly OrderGroupRules[] };
  /** mutations: what eating the beaten Master can give (one she doesn't carry, at random). */
  greatBurning: { atStage: string; movement: number; groupId: string; mutations: readonly string[] };
  /** A Tithe Collector who gets away takes this many percent of each resource. */
  tithePercent: number;
  siege: { perTurn: number };
}

/** relight: Torchbearers going to light a Flame Shrine again (GAME_DESIGN.md §5.7). */
export type OrderUnitKind = 'patrol' | 'messenger' | 'expedition' | 'greatBurning' | 'relight';

/** People of the Order walking the underground or the surface. */
export interface OrderUnit {
  id: string;
  kind: OrderUnitKind;
  layer: Layer;
  at: Hex;
  /** Its people: an encounter group (enemies.json), and the group's tier (how it is drawn). Empty for a messenger. */
  groupId: string;
  tier: number;
  /** Where it is walking to (a chamber, a Passage, the lair), or null to pick somewhere new. */
  goal: Hex | null;
  /** World turns it keeps following the hydra after losing sight of her (0: not following her). */
  chase: number;
  /** Where it last saw the hydra. */
  trail: Hex | null;
}

/** Where the hydra last saw one of the Order's units, and on which turn (GAME_DESIGN.md §5.3). */
export interface OrderSighting {
  unitId: string;
  kind: OrderUnitKind;
  layer: Layer;
  tier: number;
  at: Hex;
  turn: number;
}

export interface OrderState {
  /** 1 until the first Great Burning is survived (GAME_DESIGN.md §4). */
  act: number;
  /** Alert stages (ids) reached in this act. They stay reached when the Alert falls. */
  stagesReached: string[];
  units: OrderUnit[];
  nextUnitId: number;
  /** The world turn on which the next patrol may come down. */
  nextPatrolTurn: number;
  /** The world turn on which the next expedition sets out for the lair (null: none planned). */
  nextExpeditionTurn: number | null;
  /** The Great Burning of this act has been declared. */
  greatBurningSent: boolean;
  /** Units the hydra has seen, where she saw them last (a unit in sight now is there too). */
  sightings: OrderSighting[];
  /** Random numbers for the Order's moves, apart from the hydra's. */
  rngState: number;
}

// ---------------------------------------------------------------- the lair: eggs and Broodlings (GAME_DESIGN.md §7)

export type BroodlingRole = 'defender' | 'scout';

/** An egg in the lair: a candidate for the next generation, with the mutations it carries. */
export interface Egg {
  id: string;
  mutations: string[];
  /** Told to hatch: as what, and the turn it hatches on (null: it waits). */
  hatching: { role: BroodlingRole; onTurn: number } | null;
}

/** A Broodling out scouting the underground. */
export interface Scout {
  id: string;
  at: Hex;
}

export interface LairState {
  eggs: Egg[];
  /** Broodlings guarding the lair. */
  defenders: number;
  scouts: Scout[];
  /** Next free number for ids of eggs and scouts. */
  nextId: number;
  /** Old Mother Toad keeps an egg of the lineage hidden: no other can be hidden. */
  eggHidden: boolean;
}

/** Eggs and Broodlings (brood.json). */
export interface BroodRules {
  startingEggs: number;
  maxEggs: number;
  eggCost: { bones: number; muck: number; moisture: number };
  hatchTurns: number;
  /** The share of the mother's mutations an egg carries (rounded up). */
  inheritedShare: number;
  scouts: { movement: number; sight: number };
  /** A lost battle for the lair breaks this share of the eggs (rounded up). */
  lostDefenseBreaksShare: number;
}

// ---------------------------------------------------------------- the surface (GAME_DESIGN.md §5.6, §5.7; M4)

/** Something lying on the surface (surface.json finds). */
export interface FindRules {
  loot: Loot;
  /** Shows the nearest hidden threshold of the underground (GAME_DESIGN.md §9.3). */
  revealsHiddenThreshold: boolean;
}

/** Mist, day and night, being Exposed, the Flame Shrines and the Order on the surface (surface.json). */
export interface SurfaceRules {
  generator: SurfaceGeneratorSettings;
  /** Movement points it takes to climb up or go down a Passage. */
  passageMovement: number;
  /** Alert for each surface hex seen for the first time. */
  alertPerHexDiscovered: number;
  /** Kinds of things up there she knows of from the start: their hexes are remembered before she sees them. */
  seenFromAfar: readonly MapObject['kind'][];
  mist: {
    /**
     * Exhale Mist: costs `moisture`, covers the hydra's hex and those within `radius` (more with a head of a class in
     * `radiusByClass`) with mist for `turns` turns of daylight.
     */
    exhale: { moisture: number; radius: number; radiusByClass: Readonly<Record<string, number>>; turns: number };
    /** A step onto a hex without mist breathes mist onto it first, for `moisture`; null: she can't step there. */
    breatheAhead: { moisture: number; turns: number } | null;
    /** Mist lasts at most this many turns of daylight. */
    maxTurns: number;
    /** How much mist fades every world turn, by day and by night; a windy day fades it `windExtra` more. */
    fade: { day: number; night: number; windExtra: number };
    /** The chance that a day is windy (rolled at dawn). */
    windChance: number;
    /** Over water, mist fades this many times as fast; in a year of Drought (world.json runModifiers), `droughtFade` times. */
    waterFade: number;
    droughtFade: number;
    /** A unit of the Order with a Censer Priest clears the mist this many hexes round it in the world turn (0: only its own hex). */
    censerClears: number;
    censerType: string;
    /** At the start, mist lies this far round every Passage, for this many turns; the Passage's own hex never loses it. */
    start: { radius: number; turns: number };
  };
  /** A day of `dayTurns` turns, then a night of `nightTurns`; at night sight is shorter by `nightSight`. */
  dayNight: { dayTurns: number; nightTurns: number; nightSight: number };
  /**
   * No mist under the hydra at the end of a world turn: she is Exposed. She loses `bodyHp` (never below 1), the Alert
   * rises by `alert`, she doesn't heal, and in battle her heads deal `battleDamagePercent` more (negative: less).
   * With `crawl`, an Exposed hydra may still crawl one step a turn onto bare ground.
   */
  exposed: { bodyHp: number; alert: number; crawl: boolean; battleDamagePercent: number };
  flameShrines: {
    /** Putting one out changes the Alert by this much, and leaves mist that never fades this far round it. */
    alertWhenPutOut: number;
    lastingMistRadius: number;
    /** The first shrine put out in a hydra's life gives one of `mutations` with `firstMutationChance`, every later one with `mutationChance`. */
    mutations: readonly string[];
    firstMutationChance: number;
    mutationChance: number;
    /** Flags set when one goes out (putOutFlame unlocks the Drought). */
    setFlags: readonly string[];
    /** Turns after a shrine goes out until Torchbearers set out to light it again; how fast they walk; who they are; the Alert when it burns again. */
    relight: { afterTurns: number; movement: number; groupId: string; alert: number };
  };
  order: {
    /** How far the Order sees the hydra: in mist, and Exposed (shorter at night). */
    sightInMist: number;
    sight: number;
    patrols: { firstOnTurn: number; maxByStage: readonly number[]; everyTurns: number; movement: number; chaseTurns: number; groups: readonly OrderGroupRules[] };
  };
  finds: Readonly<Record<string, FindRules>>;
}

/** The surface as this run has it: the map, what the hydra knows of it, the mist on it. */
export interface SurfaceState {
  map: SurfaceMap;
  visibility: Visibility;
  /** Mist on the surface: hex key → turns of daylight it has left (fractions too). Missing: none. */
  mist: Record<string, number>;
  /** Hexes whose mist never fades: hex key → what holds it there ('passage', or the hex key of a shrine put out). */
  lastingMist: Record<string, string>;
  /** The hydra was left without mist at the end of the last world turn (and hasn't found mist since). */
  exposed: boolean;
  /** Today is windy: mist fades faster (rolled at dawn). */
  windy: boolean;
  /** Flame Shrines put out (hex key) → the world turn on which Torchbearers set out to light it again. */
  relights: Record<string, number>;
  /** The world turn on which the next patrol may set out on the surface; null until the hydra first climbs up. */
  nextPatrolTurn: number | null;
  /** Shrines this hydra has put out. */
  shrinesPutOut: number;
  /** Random numbers for the surface's weather and the flames' mutations, apart from the rest. */
  rngState: number;
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
  /** Max HP of a head of each class. */
  headMaxHp: Readonly<Record<string, number>>;
  headNames: readonly string[];
  healing: { bodyHpPerTurn: number; headHpPerTurn: number };
  /** Bones taken from every human of a group beaten in battle. */
  bonesPerEnemy: number;
  /** Enemy type ids for each encounter group id. */
  encounterGroupMembers: Readonly<Record<string, readonly string[]>>;
  /** How strong each encounter group is (1–3), by id. */
  encounterGroupTiers: Readonly<Record<string, number>>;
  /** What each blessing (by id) does. */
  blessings: Readonly<Record<string, BlessingEffects>>;
  thresholds: Readonly<Record<string, ThresholdRules>>;
  /** What each mutation (by id) does. */
  mutations: Readonly<Record<string, MutationEffects>>;
  /** Mutations only a boss eaten gives: marking shrines never offer them. */
  bossMutations: readonly string[];
  /** Marking shrines: with this chance a world has one, in one of these rings, offering a mutation instead of a blessing. */
  marks: { chance: number; rings: readonly number[] };
  /** How the Cinderkin melt a tunnel (null: no threshold in world.json can be bored). */
  bore: BoreRules | null;
  places: Readonly<Record<string, PlaceRules>>;
  conditions: Readonly<Record<string, ConditionRules>>;
  story: StoryRules;
  order: OrderRules;
  brood: BroodRules;
  experience: HeadExperienceRules;
  surface: SurfaceRules;
}

export interface Hydra {
  /** With her number (Morwenna II). */
  name: string;
  /** Mutations she carries (mutations.json ids): those she was born with first, then those gained in her life. */
  mutations: string[];
  /** Of those, the ones she was born with. */
  inherited: string[];
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
  /** Which map she is on: the underground or the surface. `position` is a hex of that map. */
  layer: Layer;
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
  /** The hydra's generation in her lineage (1 = the first), and her lineage's name. */
  generation: number;
  lineageName: string;
  turn: number;
  map: HexMap;
  hydra: Hydra;
  visibility: Visibility;
  /** 0–100. Stored with fractions; show it rounded down. */
  alert: number;
  resources: Resources;
  /**
   * The encounter the hydra stepped on (or the Order's unit she met: `unitId`, or the guard of a Flame Shrine), on the
   * map she is on (`layer`), until its battle is resolved.
   */
  pendingBattle: { at: Hex; layer: Layer; groupId: string; unitId?: string; defense?: boolean } | null;
  /** The shrine the hydra stands at, until its blessing is accepted or refused. */
  pendingShrine: Hex | null;
  /** The place the hydra stands at, or the threshold it stands next to, while its panel is open. */
  pendingPlace: Hex | null;
  /** Echoes heard so far. */
  echoes: HeardEcho[];
  /** Hidden thresholds whose draught the hydra has felt (hex keys). */
  draughtsFelt: string[];
  battlesFought: number;
  /** The deepest ring the hydra has stood in (0 = only the lair's swamp). */
  deepestRing: number;
  /** Next free number for ids of heads grown in battles. */
  nextId: number;
  /** Random numbers for things that happen on the map (e.g. which heads grow from a healed scar). */
  rngState: number;
  /** The hydra died: this run is over. */
  over: boolean;
  /** Where she fell and to whom (an encounter group and its enemy types), once she has died. */
  deathCause: { at: Hex; groupId: string; enemyTypes: string[] } | null;
  story: StoryState;
  /** The event the hydra stands at, until its panel is closed; `result` once a choice is made. */
  pendingEvent: { at: Hex; eventId: string; result: { text: string; choice: number; success: boolean } | null } | null;
  /** Hexes of a fresh Cinder Bore that still burn: hex key → the last turn they burn. */
  hotUntil: Record<string, number>;
  /** The Order of the Eternal Flame: how alarmed it is, and who it has sent down. */
  order: OrderState;
  lair: LairState;
  surface: SurfaceState;
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
  /** A marking shrine: its mark (a mutation) was taken. */
  | { type: 'markAccepted'; mutationId: string }
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
  /** The Cinderkin melted a tunnel: `path` from one ring to the other, its threshold at `at`. */
  | { type: 'tunnelBored'; at: Hex; path: Hex[] }
  /** The Cinderkin found no rock thin enough nearby, and wandered off. */
  | { type: 'boreFailed' }
  | { type: 'burned'; at: Hex; amount: number }
  | { type: 'tunnelCooled' }
  | { type: 'mutationGained'; id: string }
  | { type: 'conditionStarted'; id: string; turns: number }
  | { type: 'conditionEnded'; id: string }
  | { type: 'rested'; healedScars: number; newHeadIds: string[] }
  | { type: 'hydraDied' }
  | { type: 'eventReached'; at: Hex; eventId: string }
  | { type: 'eventResolved'; at: Hex; eventId: string; choice: number; success: boolean }
  | { type: 'dialogueQueued'; id: string }
  /** The Alert reached a stage (order.json alertStages): the Order does more from now on. */
  | { type: 'alertStage'; stageId: string }
  /** People of the Order came down a Passage (or the Old Workings shaft); `seen`: in the hydra's sight. */
  | { type: 'orderArrived'; unitId: string; kind: OrderUnitKind; at: Hex; seen: boolean }
  /** One of the Order's units walked `path` (its old hex not included) in the world turn. */
  | { type: 'orderMoved'; unitId: string; path: Hex[] }
  /** A patrol (or another unit) walked onto the hydra: a battle. */
  | { type: 'orderAttacked'; unitId: string; at: Hex }
  /** After a battle, a messenger runs for the nearest Passage. */
  | { type: 'messengerSent'; unitId: string; at: Hex }
  /** He got there: the Alert rises. */
  | { type: 'messengerEscaped'; unitId: string; alert: number }
  /** The hydra caught him: `line` is which of order.json messengers.eatenLines is said. */
  | { type: 'messengerEaten'; at: Hex; bones: number; alert: number; line: number }
  /** An expedition (or the Great Burning) sets out for the lair. */
  | { type: 'expeditionSent'; unitId: string; kind: OrderUnitKind; at: Hex }
  /** It found the lair empty and camps in it: it killed a Broodling guarding it, or broke an egg. */
  | { type: 'lairRaided'; unitId: string; killed: 'defender' | 'egg' }
  /** The Great Burning is beaten: a new act begins, the Alert starts again, and the Order is stronger. */
  | { type: 'actBegins'; act: number }
  /** The lair's panel opened (the hydra came home, or tapped the lair). */
  | { type: 'lairOpened' }
  | { type: 'eggLaid'; eggId: string }
  | { type: 'hatchingStarted'; eggId: string; role: BroodlingRole }
  /** Old Mother Toad hid an egg for the lineage (GAME_DESIGN.md §12), with the mutations it carries. */
  | { type: 'eggHidden'; eggId: string; mutations: string[] }
  /** A Tithe Collector got away from the battle with this much. */
  | { type: 'titheTaken'; muck: number; moisture: number; bones: number }
  | { type: 'headLevelled'; headId: string; name: string; level: number }
  | { type: 'hatched'; eggId: string; role: BroodlingRole; scoutId: string | null }
  /** A scout walked `path` in the world turn. */
  | { type: 'scoutMoved'; scoutId: string; path: Hex[] }
  | { type: 'scoutKilled'; scoutId: string; at: Hex }
  /** A lost battle for the lair: eggs the Order broke. */
  | { type: 'eggsBroken'; count: number }
  | { type: 'turnEnded'; turn: number }
  /** She stood on a Passage: its panel opened. */
  | { type: 'passageReached'; at: Hex; layer: Layer }
  /** She went up or down a Passage: now on `layer`. */
  | { type: 'climbed'; layer: Layer; at: Hex }
  /** Exhale Mist: mist now lies on these hexes (or was breathed ahead of her on the way: in `moved`). */
  | { type: 'mistExhaled'; hexes: Hex[]; moisture: number }
  /** Mist breathed ahead of her, step by step, on the way she walked. */
  | { type: 'mistBreathed'; hexes: Hex[]; moisture: number }
  /** No mist under her: Exposed, losing `bodyHp`. */
  | { type: 'exposed'; bodyHp: number; alert: number }
  /** In mist again. */
  | { type: 'covered' }
  | { type: 'nightFalls' }
  /** Dawn of a new day; `windy`: mist fades faster today. */
  | { type: 'dayBreaks'; windy: boolean }
  /** Something picked up on the surface; `revealed`: the hidden threshold it showed, if any. */
  | { type: 'findTaken'; at: Hex; findId: string; loot: Loot; revealed: Hex | null }
  /** A Flame Shrine put out: the Alert changed by `alert`, and mist lies round it for good. */
  | { type: 'shrineOut'; at: Hex; alert: number; left: number }
  /** Torchbearers set out to light a Flame Shrine again. */
  | { type: 'relightSent'; unitId: string; at: Hex; shrine: Hex }
  /** They lit it: it burns again, guarded by them, and its mist fades from now on. */
  | { type: 'shrineRelit'; at: Hex; alert: number }
  /** The castle, shut. */
  | { type: 'castleReached'; at: Hex };

export interface Reachable {
  cost: number;
  /** Steps from the hydra's position (excluded) to the target (included). */
  path: Hex[];
  /** On the surface: Moisture it takes to breathe mist ahead on the way. */
  moisture?: number;
}

/** A travel plan: the way to a hex further than one turn, and the turn each step is taken in (0 = this turn). */
export interface Journey extends Reachable {
  turns: number[];
}
