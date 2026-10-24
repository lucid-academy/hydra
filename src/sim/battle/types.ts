// Battle simulation types. The battlefield is a board of hexes (axial coordinates, as on the strategic map)
// with the hydra's body in the middle. Time is counted in ticks (fixed steps).

import type { Hex } from '../hex';

// ---------------------------------------------------------------- effects (shared by attacks, skills and combos)

/**
 * One thing an attack, a skill or a combo does. Effects are described in data (heads.json, combos.json),
 * and `actions.ts` carries them out. Durations are already in ticks.
 * "The target" is the enemy the effect is applied to (skills with an area apply it to every enemy in the area).
 */
export type Effect =
  /** Extra damage that ignores armor. `ofHit`: a share of the damage the hit just dealt (1 = the same again). */
  | { type: 'damage'; amount: number; ofHit: number }
  /** Puts a status on the target. `ticks` overrides the status's own duration; null = its own. */
  | { type: 'status'; status: string; ticks: number | null }
  /** The status already on the target lasts this much longer. */
  | { type: 'extendStatus'; status: string; ticks: number }
  | { type: 'removeStatus'; status: string }
  /** The target's armor is gone for the rest of the battle. */
  | { type: 'breakArmor' }
  /** The Mist cloud the target stands in hurts everyone inside it for a while (Acid Fog). */
  | { type: 'acidifyMist'; damagePerSecond: number; ticks: number }
  /** The target can't cauterize stumps for a while. */
  | { type: 'putOutTorch'; ticks: number }
  /** The target is eaten on the spot (and heals the body like a meal). */
  | { type: 'devour'; healMultiplier: number }
  /** The body gets back this many HP. */
  | { type: 'healBody'; amount: number }
  /** Damage (ignoring armor) to every other human within `radius` hexes of the target. */
  | { type: 'splash'; amount: number; radius: number }
  /** Everyone within `radius` of the target (target included) gets the status. */
  | { type: 'statusAround'; status: string; radius: number; ticks: number | null }
  /** Everyone in the Mist cloud the target stands in gets the status. */
  | { type: 'statusInCloud'; status: string; ticks: number | null }
  /** When the status ends on the target, it gets `then` (Wrung Out: stunned after the coil lets go). */
  | { type: 'afterStatus'; status: string; then: string; ticks: number | null }
  /** The target is pushed `hexes` away from the body; a human it runs into and the target both get `collisionStatus`. */
  | { type: 'knockback'; hexes: number; collisionStatus: string | null; collisionTicks: number | null }
  /** The target is pulled `hexes` towards the body. */
  | { type: 'pull'; hexes: number }
  /** The target stays Entranced although this hit hurt it (Anointing). */
  | { type: 'keepEntranced' }
  /** The target's censer cracks: no more swinging it in this battle (Banshee Wail). */
  | { type: 'crackCenser' };

/**
 * Who a skill is aimed at. `enemy`: a human in reach. `hex`: a hex in reach. `head`: one of the hydra's heads.
 * `stump`: a stump. `none`: no aiming, it happens at once.
 */
export type SkillTarget = 'enemy' | 'hex' | 'head' | 'stump' | 'none';

/**
 * Which enemies a skill's `effects` land on.
 * single: the aimed enemy. around: all within `radius` of the aimed enemy or hex. aroundBody: all within `radius` of the body's edge. cone: all within reach in a wedge
 * from the body towards the aim. nearest: the aimed enemy and up to `count - 1` others nearest to it (within `radius`).
 * all: everyone on the board. none: no enemies (the skill only does its special things).
 */
export type SkillArea =
  | { shape: 'single' }
  | { shape: 'around'; radius: number }
  | { shape: 'aroundBody'; radius: number }
  | { shape: 'cone'; degrees: number }
  | { shape: 'nearest'; count: number; radius: number }
  | { shape: 'all' }
  | { shape: 'none' };

/** Things a skill does that are not effects on enemies. Each is carried out once per use. */
export type SkillSpecial =
  /** A Mist cloud centred on the aim (or, with `wholeBoard`, over the whole board). */
  | { type: 'mistCloud'; radius: number; ticks: number; wholeBoard: boolean }
  /** A puddle on the hexes around the aim; humans standing in it get the status. */
  | { type: 'pool'; radius: number; ticks: number; status: string }
  /** A false light on the aimed hex: humans within `radius` walk to it and kneel (Entranced). `radius` null = everyone. */
  | { type: 'beacon'; radius: number | null; ticks: number; kneel: boolean; skipsTypes: readonly string[] }
  /** Moves every cloud this head breathed `hexes` towards the aim. */
  | { type: 'driftClouds'; hexes: number }
  /** The skill's head attacks faster for a while. */
  | { type: 'selfAttackSpeed'; multiplier: number; ticks: number }
  /** The skill's head heals by `amount` for every human it kills for a while. */
  | { type: 'healOnKill'; amount: number; ticks: number }
  /** Every other head attacks faster for a while. */
  | { type: 'headsAttackSpeed'; multiplier: number; ticks: number }
  /** The aimed head heals by a share of its max HP and loses its bad moods. */
  | { type: 'healHead'; share: number; cleanse: boolean }
  /** The aimed stump can't be cauterized for a while, and the burning done so far is undone. */
  | { type: 'protectStump'; ticks: number; resetBurning: boolean }
  /** The aimed stump regrows this many times faster. */
  | { type: 'hurryStump'; multiplier: number }
  /** The next regrowth gives this many heads instead of two (the head limit still holds). */
  | { type: 'moreHeadsNextRegrowth'; heads: number }
  /** The skill's head loses this many HP (Eat Fire's heartburn). */
  | { type: 'hurtSelf'; amount: number }
  /** Throws the human this head holds (Seized) onto the aimed hex; anyone it lands on and it get the status. `knocksOverBraziers`: a brazier where it lands, or next to it, goes out. */
  | { type: 'toss'; hexes: number; collisionStatus: string; collisionTicks: number; knocksOverBraziers: boolean }
  /** Braziers within `radius` of the aim go out (null: every brazier on the board). */
  | { type: 'putOutBraziers'; radius: number | null }
  /** Seizes up to `count` humans in reach at once, held by this head. */
  | { type: 'seizeMany'; count: number; ticks: number; breakArmor: boolean }
  /** Eats every human in reach under `hpShare` of their HP for a while, then sleeps. */
  | { type: 'bottomless'; ticks: number; hpShare: number; sleepTicks: number }
  /** Repeats the last skill another head used, at `power` strength. */
  | { type: 'copycat'; power: number }
  /** Pulls one random thing out of the swamp (see `rummage` in BattleRules). */
  | { type: 'rummage' }
  /** Works with `chance`: damage to every human, and those under `killBelowShare` of their HP are torn apart. */
  | { type: 'multiverse'; chance: number; damage: number; killBelowShare: number };

export interface SkillRules {
  id: string;
  target: SkillTarget;
  /** Hexes from the body (like attacks). Ignored for heads, stumps and `none`. */
  range: number;
  cooldownTicks: number;
  tags: readonly string[];
  /** The aimed human is hit for this many times the head's attack damage (armor applies). 0 = no hit. */
  hitMultiplier: number;
  /** Only humans under this share of their HP can be aimed at (Gulp). Null = anyone. */
  targetHpBelow: number | null;
  /** Only a head holding a human can use it (Toss). */
  needsHeld: boolean;
  /** Only a head with a meal inside can use it, and it uses one up (Regurgitate). */
  usesMeal: boolean;
  area: SkillArea;
  effects: readonly Effect[];
  specials: readonly SkillSpecial[];
  /** The ultimate skill (key E): usable only if the hydra has unlocked ultimates. */
  ultimate: boolean;
}

// ---------------------------------------------------------------- rules

export interface HeadAttackRules {
  damage: number;
  cooldownTicks: number;
  /** How far from the body the head can attack, in hexes (1 = only enemies standing next to the body). */
  range: number;
  /** A head with a melee attack goes out to its target, and can be hit back there. */
  melee: boolean;
  tags: readonly string[];
  /** Status put on the enemy this attack hits. */
  appliesStatus: string | null;
  /** How long that status lasts from this attack; null = the status's own duration. */
  statusTicks: number | null;
  /** The attack leaves a Mist cloud where it lands. */
  createsMistCloud: boolean;
  /** Killing a human with this attack eats it and heals the body by this many HP (Glutton). 0 = no eating. */
  devourHeal: number;
  /** The head first licks the most wounded head, healing it this much (Tender). 0 = it never heals. */
  healsHeads: number;
  /** Chance that a hit also does one of `randomEffects` (The Spare's Nibble). */
  randomEffectChance: number;
  randomEffects: readonly Effect[];
}

export interface EnemyAttackRules {
  damage: number;
  cooldownTicks: number;
  /** How far the enemy reaches from the hex it stands on, in hexes (1 = the neighbouring hex). */
  range: number;
}

export interface StatusRules {
  durationTicks: number;
  /** Added to the enemy's armor while the status lasts. */
  armorChange: number;
  damagePerSecond: number;
  speedMultiplier: number;
  /** False: the enemy stands where it is. */
  canWalk: boolean;
  /** False: the enemy doesn't hit anyone. */
  canAttack: boolean;
  /** False: the enemy can't cauterize (or pray); a burning in progress stops. */
  canChannel: boolean;
  /** The enemy runs away from the body (Terrified). */
  flees: boolean;
  /** Damage the enemy takes is multiplied by this (Seized: 1.25). */
  damageTakenMultiplier: number;
  /** Any damage ends the status (Entranced). */
  endsOnDamage: boolean;
  /** For statuses put on by a head that holds the enemy (Seized): the hold breaks when that head takes this much damage. Null = never. */
  breaksWhenHolderTakes: number | null;
}

export type ComboTrigger = 'headHitsEnemy' | 'enemyInMist' | 'enemyDevoured' | 'beaconLit';

/** For combos that need several heads: other heads that hit the same enemy shortly before. */
export interface OtherHeadsCondition {
  /** How many other heads (at least). */
  count: number;
  windowTicks: number;
  /** Only heads of the attacker's class count (Pincer, Echo Scream). */
  sameClass: boolean;
  /** Only heads from the attacker's stump count (Twin Bond). */
  sameStump: boolean;
  /** Only heads attacking from the other side of the body count (Pincer). */
  oppositeSide: boolean;
  /** Only hits with this tag count; null = any. */
  tag: string | null;
}

export interface ComboRules {
  id: string;
  when: ComboTrigger;
  /** All conditions that are not null must hold. */
  conditions: {
    attackTag: string | null;
    headClass: string | null;
    enemyHasStatus: string | null;
    enemyInMist: boolean | null;
    enemyCarriesFire: boolean | null;
    enemyArmorBroken: boolean | null;
    /** The enemy has less than this share of its HP left. */
    enemyHpBelow: number | null;
    otherHeads: OtherHeadsCondition | null;
    /** beaconLit: the beacon was lit in a Mist cloud. */
    beaconInMist: boolean | null;
    /** beaconLit: there is a Terrified human on the board. */
    terrifiedOnBoard: boolean | null;
  };
  effects: readonly Effect[];
  /** beaconLit only: what changes about the beacon. */
  beacon: { extraRadius: number; takesTorches: boolean; callsTerrified: boolean } | null;
  /** The same combo can't fire on the same enemy again for this long (so a bonus on every hit is not announced every hit). */
  cooldownTicks: number;
}

export interface HeadClassRules {
  maxHp: number;
  attack: HeadAttackRules;
  /** The three skills a head of this class can take into a battle (two of them), in order. */
  skills: readonly string[];
  /** The ultimate skill (key E). */
  ultimate: string | null;
  /** Once per battle, at a random moment, the head takes over for a while and gives a random order (The Spare). */
  badIdea: { ticks: number; earliestTick: number; latestTick: number } | null;
}

/**
 * fighter: walks up and hits what is in reach. headhunter: goes for the heads. torchbearer: burns stumps shut first.
 * collector (Tithe Collector): walks up to the body, counts what the hydra has, then runs for the edge of the board.
 */
export type EnemyBehavior = 'fighter' | 'headhunter' | 'torchbearer' | 'collector';

export interface EnemyTypeRules {
  maxHp: number;
  armor: number;
  /** Ticks one step from a hex to the next takes. */
  stepTicks: number;
  attack: EnemyAttackRules;
  bonusDamageVsHeads: number;
  cauterizeTicks: number | null;
  behavior: EnemyBehavior;
  /** Statuses that never take hold on this type (knights are not afraid). */
  immuneTo: readonly string[];
  /** A ranged attacker that can't see through Mist: what stands in a cloud, or anything when it stands in one, is hidden unless next to it. */
  blindInMist: boolean;
  /** Shots from afar before it runs out (crossbowmen), then it fights up close (range 1); null = never runs out. */
  shots: number | null;
  /** Charges (knights): walks faster until its first blow, which hits harder. */
  charge: { stepMultiplier: number; firstHitMultiplier: number } | null;
  /** Collector: how long it counts next to the body before it runs. */
  collectTicks: number | null;
  /** A boss: shown by name with a big HP bar. */
  boss: boolean;
  /** Censer Priest: swings his censer now and then (see CenserRules); null = has none. */
  censer: CenserRules | null;
  /** Brazier Bearer: sets braziers down near the body (see BrazierRules); null = carries none. */
  braziers: BrazierRules | null;
}

/**
 * A Censer Priest's censer (GAME_DESIGN.md §6.6). Every `everyTicks` he stops and swings it for `swingTicks`
 * (a channel: whatever stops channelling stops the swing). When the swing is done, everything within `radius` of him:
 * Mist clouds lying wholly inside are gone and the rest has a hole for `smokeTicks`; his brothers lose their statuses
 * (except `keepsStatuses`) and hit `boostMultiplier` times harder for `boostTicks`.
 */
export interface CenserRules {
  everyTicks: number;
  swingTicks: number;
  radius: number;
  smokeTicks: number;
  boostMultiplier: number;
  boostTicks: number;
  keepsStatuses: readonly string[];
}

/**
 * A Brazier Bearer's braziers (§6.6). He carries `count`; within `fromBody` hexes of the body's edge he stops and sets
 * one down for `setDownTicks` (a channel), then waits `everyTicks` before the next. A lit brazier dries the hexes within
 * `dryRadius` (the body steps `bodySlowMultiplier` times slower on them) and keeps Mist off within `mistRadius`.
 */
export interface BrazierRules {
  count: number;
  fromBody: number;
  setDownTicks: number;
  everyTicks: number;
  dryRadius: number;
  mistRadius: number;
  bodySlowMultiplier: number;
}

/** A battle on the surface (surface.json battle): fought in mist, it starts with clouds round the body. */
export interface SurfaceBattleRules {
  startClouds: { count: number; radius: number; ticks: number; fromBody: number };
}

/** Broodlings fighting for the lair (brood.json battle). */
export interface AllyRules {
  maxHp: number;
  stepTicks: number;
  attack: EnemyAttackRules;
}

export interface BoardSize {
  /** Hexes across and down, as seen on screen. Both odd, so there is a middle hex for the body. */
  boardColumns: number;
  boardRows: number;
}

/** One thing The Spare can pull out of the swamp with Rummage. */
export type RummageFind =
  | { id: string; weight: number; type: 'healHead'; amount: number }
  | { id: string; weight: number; type: 'statusAroundNearest'; status: string; radius: number; ticks: number | null }
  | { id: string; weight: number; type: 'healClass'; classId: string; amount: number }
  | { id: string; weight: number; type: 'nothing' };

export interface BattleRules extends BoardSize {
  ticksPerSecond: number;
  /** Ticks one step of the body takes. */
  bodyStepTicks: number;
  maxHeads: number;
  regrowTicks: number;
  headClasses: Readonly<Record<string, HeadClassRules>>;
  skills: Readonly<Record<string, SkillRules>>;
  hatchlingClassPool: readonly string[];
  headNames: readonly string[];
  enemyTypes: Readonly<Record<string, EnemyTypeRules>>;
  statuses: Readonly<Record<string, StatusRules>>;
  /** `radius` in hexes: 1 = the hex where the breath lands and its six neighbours. */
  mistCloud: { radius: number; durationTicks: number; appliesStatus: string | null };
  combos: readonly ComboRules[];
  /** When a head from a stump dies, its twins fall into a rage or into grief for a while (random). */
  twinLoss: { ticks: number; rageAttackSpeed: number; griefAttackSpeed: number };
  /** The Spare in a combo: with this chance it adds one random effect on the combo's target. */
  spareMischief: { classId: string; chance: number; effects: readonly Effect[] };
  rummage: readonly RummageFind[];
  /** How long a hit is remembered on an enemy, for combos that need several heads. */
  hitMemoryTicks: number;
  broodling: AllyRules;
  experience: HeadExperienceRules;
  surface: SurfaceBattleRules;
}

/** Head experience and levels (GAME_DESIGN.md §6.3): the battle uses the damage, the map the rest. */
export interface HeadExperienceRules {
  /** Every head alive after a won battle gets this much. */
  perBattleWon: number;
  /** And this much more for each human it killed or ate. */
  perKill: number;
  /** Experience needed for level 2, 3, 4…, counted from the start; the list's length + 1 is the top level. */
  experienceForLevel: readonly number[];
  /** Every level above 1: this many percent more max HP… */
  maxHpPercentPerLevel: number;
  /** …and damage. */
  damagePercentPerLevel: number;
}

// ---------------------------------------------------------------- state

/** A head as it lives on the strategic map, between battles. */
export interface HeadRecord {
  id: string;
  name: string;
  classId: string;
  level: number;
  /** Experience gathered so far (missing: none yet). */
  xp?: number;
  hp: number;
  maxHp: number;
  /** The two skills (of its class's three) this head takes into battle, for keys Q and W. Missing = the first two. */
  skills?: string[];
}

/** A temporary change to a head. */
export type HeadBuff =
  | { kind: 'attackSpeed'; multiplier: number; untilTick: number; mood: 'rage' | 'grief' | null }
  | { kind: 'healOnKill'; amount: number; untilTick: number }
  | { kind: 'bottomless'; hpShare: number; untilTick: number; sleepTicks: number };

export interface BattleHead extends HeadRecord {
  skills: string[];
  /** Direction where the neck leaves the body, in radians: 0 = east, π/2 = south (down the screen). */
  anchorAngle: number;
  cooldown: number;
  /** Ticks left before each skill can be used again, by skill id. */
  skillCooldowns: Record<string, number>;
  /** Enemy this head was ordered to attack; null = pick targets by itself. */
  orderTargetId: number | null;
  /** Enemy this head is fighting right now (ordered or picked by itself); null = nobody in reach. */
  targetId: number | null;
  /** Stump this head grew from, if it is a hatchling from this battle. */
  twinGroup: number | null;
  /** Enemy this head is holding (Seized by it), or null. */
  holdingId: number | null;
  /** Damage taken since it started holding (the hold breaks after enough). */
  hurtWhileHolding: number;
  /** Humans eaten and not yet spat out as armor (Glutton's Regurgitate). */
  meals: number;
  buffs: HeadBuff[];
  /** The head sleeps (does nothing) until this tick. */
  asleepUntilTick: number;
  /** A skill ordered but not used yet: it waits until its target is in reach and the skill is ready. */
  pendingSkill: { slot: number; aim: SkillAim } | null;
}

export interface Stump {
  id: number;
  anchorAngle: number;
  /** Tick when two new heads grow, unless cauterized first. */
  regrowAtTick: number;
  /** Ticks of cauterizing done so far. */
  cauterizeProgress: number;
  cauterized: boolean;
  /** No one can cauterize it before this tick (Tender's Kiss It Better). */
  protectedUntilTick?: number;
}

/** A status currently on an enemy. */
export interface ActiveStatus {
  id: string;
  untilTick: number;
  /** Next tick when the status deals its per-second damage. */
  nextDamageTick: number;
  /** Head that put it on, for holds (Seized). */
  sourceHeadId: string | null;
  /** Status the enemy gets when this one ends (Wrung Out). */
  then: { status: string; ticks: number | null } | null;
}

/** A Mist cloud lying on the board: all hexes within `radius` of `center`. */
export interface MistCloud {
  id: number;
  center: Hex;
  radius: number;
  untilTick: number;
  /** While the tick is below this, the cloud is acid and hurts enemies inside (Acid Fog). */
  acidUntilTick: number;
  acidDamagePerSecond: number;
  nextAcidTick: number;
  /** Head that breathed it (Drift moves only its own clouds). */
  ownerHeadId?: string | null;
}

/** Censer smoke: no Mist within `radius` of `center` until `untilTick`. */
export interface Smoke {
  id: number;
  center: Hex;
  radius: number;
  untilTick: number;
}

/** A lit brazier a Brazier Bearer set down: the ground round it is dry, and Mist won't lie near it. */
export interface Brazier {
  id: number;
  at: Hex;
  /** The Brazier Bearer who set it down. */
  ownerId: number;
  dryRadius: number;
  mistRadius: number;
  bodySlowMultiplier: number;
}

/** A puddle on the board (Acid Pool): humans in it get the status. */
export interface Pool {
  id: number;
  center: Hex;
  radius: number;
  untilTick: number;
  status: string;
}

/** A false light on the board (Lantern's Beacon, Procession). */
export interface Beacon {
  id: number;
  at: Hex;
  /** Null = everyone on the board is drawn to it. */
  radius: number | null;
  untilTick: number;
  /** Humans who arrive kneel (Entranced). */
  kneel: boolean;
  /** Enemy types it doesn't draw. */
  skipsTypes: readonly string[];
  /** A Torchbearer who comes to it loses the torch (Marsh Light). */
  takesTorches: boolean;
  /** Terrified humans anywhere run to it (Sanctuary). */
  callsTerrified: boolean;
}

/** A hit remembered on an enemy, for combos that need several heads. */
export interface RememberedHit {
  headId: string;
  classId: string;
  tick: number;
  anchorAngle: number;
  twinGroup: number | null;
  tags: readonly string[];
}

/**
 * Something that walks from hex to hex. It counts as standing on its new hex from the moment it sets off
 * (so nobody else takes the hex), but it can't act until it arrives at `stepEndTick`.
 * `stepFrom` and the two ticks let the screen draw it on its way.
 */
export interface Walker {
  stepFrom: Hex;
  stepStartTick: number;
  stepEndTick: number;
}

export interface Enemy extends Walker {
  id: number;
  typeId: string;
  hex: Hex;
  hp: number;
  maxHp: number;
  cooldown: number;
  /** Torchbearer currently burning this stump. */
  cauterizingStumpId: number | null;
  statuses: ActiveStatus[];
  /** Armor destroyed for the rest of the battle (Corrode & Crush). */
  armorBroken: boolean;
  /** While the tick is below this, the torch is out and can't cauterize (Smother). */
  torchOutUntilTick: number;
  /** Recent hits by heads, newest last. */
  recentHits?: RememberedHit[];
  /** Tick until which each combo can't fire on this enemy again, by combo id. */
  comboCooldowns?: Record<string, number>;
  /** A charging knight that hasn't struck yet. */
  charging?: boolean;
  /** Shots left (crossbowmen); at 0 it fights up close. */
  shotsLeft?: number;
  /** Collector: ticks of counting done next to the body, and whether it has counted it all and is running. */
  collectProgress?: number;
  collected?: boolean;
  /** Censer Priest or Brazier Bearer: what it is busy doing (swinging, setting a brazier down) and until when; null = nothing. */
  channel?: { kind: 'censer' | 'brazier'; untilTick: number } | null;
  /** It can't start its next swing or brazier before this tick. */
  nextChannelTick?: number;
  /** Censer Priest: his censer cracked (Banshee Wail). */
  censerCracked?: boolean;
  /** Brazier Bearer: braziers he still carries. */
  braziersLeft?: number;
  /** Blessed by a censer: hits `multiplier` times harder until `untilTick`. */
  boost?: { multiplier: number; untilTick: number };
}

/** A Broodling fighting for the lair: it stands on a hex like a human, walks to the nearest one and bites. */
export interface Ally extends Walker {
  id: number;
  hex: Hex;
  hp: number;
  maxHp: number;
  cooldown: number;
}

export interface Body extends Walker {
  /** Middle hex of the body; the body covers it and its six neighbours. */
  center: Hex;
  hp: number;
  maxHp: number;
  /** Where the body was ordered to go (its middle hex), or null. */
  moveTarget: Hex | null;
}

export type BattleOutcome = 'won' | 'lost';

/** What dealt the damage: a head, a human, a status (e.g. Corroded), an acid Mist cloud or a combo. */
export type HitSource = 'head' | 'enemy' | 'status' | 'mist' | 'combo' | 'ally';

export type BattleEvent =
  | {
      type: 'hit';
      tick: number;
      attacker: HitSource;
      /** Head id or enemy id of the attacker, when there is one. */
      attackerId: string | number | null;
      targetKind: 'head' | 'enemy' | 'body' | 'ally';
      targetId: number | string;
      damage: number;
      at: Hex;
    }
  | { type: 'heal'; tick: number; targetKind: 'head' | 'body'; targetId: string; amount: number; at: Hex }
  | { type: 'enemyKilled'; tick: number; enemyId: number; at: Hex }
  /** A human left the board (a Tithe Collector with the tithe counted). */
  | { type: 'escaped'; tick: number; enemyId: number; at: Hex }
  /** A Tithe Collector has counted what the hydra has and makes for the edge. */
  | { type: 'collected'; tick: number; enemyId: number; at: Hex }
  /** A Censer Priest starts swinging, finishes a swing (`radius` round `at`), is stopped, or his censer cracks. */
  | { type: 'censer'; tick: number; enemyId: number; what: 'started' | 'swung' | 'interrupted' | 'cracked'; at: Hex; radius: number }
  /** A Brazier Bearer starts setting a brazier down, or one is lit on the board, or one goes out. */
  | { type: 'brazier'; tick: number; what: 'settingDown' | 'lit' | 'out' | 'interrupted'; enemyId: number | null; brazierId: number | null; at: Hex }
  | { type: 'allyKilled'; tick: number; allyId: number; at: Hex }
  | { type: 'devoured'; tick: number; enemyId: number; headId: string | null; at: Hex }
  | { type: 'severed'; tick: number; headId: string; name: string; stumpId: number }
  | { type: 'regrown'; tick: number; stumpId: number; headIds: string[] }
  | { type: 'cauterized'; tick: number; stumpId: number }
  | { type: 'combo'; tick: number; comboId: string; enemyId: number | null; at: Hex; headIds: string[] }
  | { type: 'status'; tick: number; enemyId: number; status: string; at: Hex }
  | { type: 'skill'; tick: number; headId: string; skillId: string; at: Hex | null; worked: boolean }
  | { type: 'mischief'; tick: number; headId: string; effect: string; at: Hex }
  | { type: 'rummage'; tick: number; headId: string; find: string }
  | { type: 'badIdea'; tick: number; headId: string; enemyId: number | null }
  | { type: 'mood'; tick: number; headId: string; mood: 'rage' | 'grief' }
  | { type: 'ended'; tick: number; outcome: BattleOutcome };

/** The last skill a head used, for Copycat. */
export interface LastSkill {
  headId: string;
  skillId: string;
  aim: SkillAim;
}

export interface BattleState {
  tick: number;
  rngState: number;
  body: Body;
  heads: BattleHead[];
  stumps: Stump[];
  enemies: Enemy[];
  /** Broodlings fighting beside the hydra (in the battle for the lair). */
  allies: Ally[];
  /** Tithe Collectors that got away with the tithe. */
  tithesTaken: number;
  /** Humans each head killed or ate in this battle, by head id (for its experience). */
  kills: Record<string, number>;
  /** Burning stumps shut takes this many times as long (the hydra's mutations). */
  cauterizeMultiplier: number;
  clouds: MistCloud[];
  /** Censer smoke keeping Mist off for a while. */
  smokes: Smoke[];
  braziers: Brazier[];
  pools: Pool[];
  beacons: Beacon[];
  /** Heads hit this many times as hard in this battle (on the surface while Exposed: less). */
  headDamageMultiplier: number;
  /** Heads that grew during this battle get ids from this counter. */
  nextId: number;
  /** Ultimate skills can be used (the hydra unlocked them). */
  ultimatesUnlocked: boolean;
  /** The next regrowth gives this many heads (Triplets); null = two. */
  nextRegrowthHeads: number | null;
  lastSkill: LastSkill | null;
  /** The Spare's Bad Idea: when it happens, which head, and until when its random order lasts. */
  badIdea: { headId: string; atTick: number; untilTick: number; done: boolean; savedOrders: Record<string, number | null> } | null;
  outcome: BattleOutcome | null;
  /** Events of the most recent tick only. */
  events: BattleEvent[];
}

/** Where a skill is aimed. */
export type SkillAim =
  | { kind: 'enemy'; enemyId: number }
  | { kind: 'hex'; at: Hex }
  | { kind: 'head'; headId: string }
  | { kind: 'stump'; stumpId: number }
  | { kind: 'none' };

export type BattleCommand =
  | { type: 'moveBody'; to: Hex }
  | { type: 'attack'; headId: string; enemyId: number }
  | { type: 'clearOrder'; headId: string }
  /** Uses one of the head's skills (`slot` 0 = Q, 1 = W, 2 = E, the ultimate). */
  | { type: 'useSkill'; headId: string; slot: number; aim: SkillAim }
  /** Before the battle starts: which two of its class's skills the head takes (keys Q and W). */
  | { type: 'chooseSkills'; headId: string; skills: string[] };
