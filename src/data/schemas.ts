// Shapes of the data files in src/data/. If a JSON file doesn't match,
// the game stops at startup with a readable message instead of failing silently.
// `.strict()` means unknown fields are errors too, so typos in field names get caught.

import { z } from 'zod';
import { DECORATION_KINDS } from '../assets/mapArt';
import { DEAD_END_CONTENTS, PATCH_FINDS } from '../sim/map';
import { effectSchema, rummageFindSchema, skillSchema, statusesIn } from './battleSchemas';

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'expected a color like "#1a2b3c"');

/**
 * A strict object that may also hold a `"//"` note. JSON has no comments,
 * so `"//": "TODO(design): ..."` is how data files carry them.
 */
function section<T extends z.ZodRawShape>(shape: T) {
  return z.object({ ...shape, '//': z.string().optional() }).strict();
}

/**
 * Entries by id (`{ "rubbleChoke": {...}, "rootWall": {...} }`), which may also hold a `"//"` note.
 * The note is dropped before checking, so it never counts as an entry.
 */
function entries<T extends z.ZodType>(value: T) {
  return z.preprocess(
    (raw) => (raw !== null && typeof raw === 'object' && !Array.isArray(raw) ? Object.fromEntries(Object.entries(raw).filter(([key]) => key !== '//')) : raw),
    z.record(z.string(), value),
  );
}

const share = z.number().min(0).max(1);
/** A range [from, to]: each world (or each thing) gets a whole number from `from` to `to`. */
const intRange = (min = 0) =>
  z.tuple([z.number().int().min(min), z.number().int().min(min)]).refine(([from, to]) => from <= to, 'the first number must not be bigger than the second');
/** A range [from, to] of shares (0–1). */
const shareRange = z.tuple([share, share]).refine(([from, to]) => from <= to, 'the first number must not be bigger than the second');
/** Weights by id, e.g. { "remains": 40, "shrine": 20 }: bigger comes up more often. */
const weights = z.record(z.string(), z.number().min(0)).refine((w) => Object.values(w).some((v) => v > 0), 'needs at least one weight above 0');
/** Resources a find gives. */
const lootSchema = section({ muck: z.number().int().min(0).optional(), moisture: z.number().int().min(0).optional(), bones: z.number().int().min(0).optional() });
/** Board sizes must be odd, so the board has a middle hex for the hydra's body. */
const oddBoardSize = z.number().int().min(5).refine((n) => n % 2 === 1, 'must be an odd number (5, 7, 9, …) so the board has a middle hex');
/** Distances on the battle board, in hexes. */
const hexes = z.number().int().min(1);

const terrainRulesSchema = section({
  // null = impassable
  moveCost: z.number().int().positive().nullable(),
  blocksSight: z.boolean(),
});

export const balanceSchema = section({
  map: section({
    movementPointsPerTurn: z.number().int().positive(),
    sightRangeHexes: z.number().int().positive(),
    undergroundRadius: z.number().int().min(8),
    landmarkSightRange: z.number().int().min(0),
    echoRange: z.number().int().min(0),
  }),
  terrain: section({
    water: terrainRulesSchema,
    mud: terrainRulesSchema,
    roots: terrainRulesSchema,
    salt: terrainRulesSchema,
    rock: terrainRulesSchema,
  }),
  undergroundGenerator: section({
    lairRadius: z.number().int().min(1),
    lairExits: intRange(1),
    ringCenterOffset: z.number().min(0),
    edgeWobble: z.number().min(0),
    minRingWidth: z.number().int().min(2),
    bandThickness: z.tuple([z.number().min(1), z.number().min(1)]).refine(([from, to]) => from <= to, 'the first number must not be bigger than the second'),
    chamberSpacing: z.number().int().min(2),
    corridors: section({ narrowShare: share, extraLinkShare: z.number().min(0), winding: z.number().min(0) }),
    deadEndSpur: intRange(1),
    deadEndPocket: intRange(1),
    thresholdSpacing: z.number().min(0).max(0.5),
    encounterSpacing: z.number().int().min(1),
    encounterMinDistanceFromLair: z.number().int().min(1),
    passages: section({ firstRing: z.number().int().min(1), secondRings: z.array(z.number().int().min(1)).min(1) }),
    locationsPerBiome: intRange(0),
    maxRarePlaces: z.number().int().min(0),
    seenRarePlaceChance: share,
    undertowLength: intRange(2),
    rings: z
      .array(
        section({
          outerEdge: z.number().positive(),
          mainBiomes: z.array(z.string().min(1)).min(1),
          mainBiomeShare: shareRange,
          patches: intRange(0),
          patchBiomes: weights,
          chambers: intRange(1),
          chamberSize: intRange(1),
          deadEnds: intRange(0),
          deadEndContents: z.partialRecord(z.enum(DEAD_END_CONTENTS), z.number().min(0)).refine((w) => Object.values(w).some((v) => (v ?? 0) > 0), 'needs at least one weight above 0'),
          minShrines: z.number().int().min(0),
          encounters: z.number().int().min(0),
          encounterTier: z.number().int().min(1),
          muckDeposits: z.number().int().min(0),
          moistureSources: z.number().int().min(0),
          eventSites: z.number().int().min(0),
          thresholds: section({ count: intRange(1), kinds: weights }).nullable(),
        }),
      )
      .min(1)
      .superRefine((rings, ctx) => {
        rings.forEach((ring, k) => {
          const last = k === rings.length - 1;
          if (last && ring.thresholds !== null) ctx.addIssue({ code: 'custom', path: [k, 'thresholds'], message: 'the last ring has nothing further out, so its thresholds must be null' });
          if (!last && ring.thresholds === null) ctx.addIssue({ code: 'custom', path: [k, 'thresholds'], message: 'every ring but the last needs thresholds to the next ring' });
          // One dead end of a ring with thresholds holds its Draught Crack.
          const freeDeadEnds = ring.deadEnds[0] - (last ? 0 : 1);
          if (ring.minShrines > freeDeadEnds) ctx.addIssue({ code: 'custom', path: [k, 'minShrines'], message: `more than the dead ends can hold (at least ${freeDeadEnds} besides the Draught Crack's)` });
          if (k > 0 && ring.outerEdge <= rings[k - 1]!.outerEdge) ctx.addIssue({ code: 'custom', path: [k, 'outerEdge'], message: 'must be further out than the ring before' });
        });
      }),
  }),
  resources: section({
    muckPerDeposit: z.number().int().positive(),
    moisturePerSource: z.number().int().positive(),
    // A Rich Deposit holds this many times a normal one.
    richDepositMultiplier: z.number().int().min(1),
    bonesPerEnemy: z.number().int().min(0),
  }),
  alert: section({
    min: z.number(),
    max: z.number(),
    perHexDiscovered: z.number().min(0),
    perBattle: z.number().min(0),
  }),
  battle: section({
    ticksPerSecond: z.number().int().positive(),
    boardColumns: oddBoardSize,
    boardRows: oddBoardSize,
    bodyMaxHp: z.number().positive(),
    bodyStepSeconds: z.number().positive(),
  }),
  healing: section({
    bodyHpPerTurn: z.number().min(0),
    headHpPerTurn: z.number().min(0),
  }),
});

const attackSchema = section({
  damage: z.number().min(0),
  cooldownSeconds: z.number().positive(),
  // For heads: hexes from the body. For humans: hexes from where they stand (1 = next hex).
  range: hexes,
});

export const headsSchema = section({
  maxHeads: z.number().int().min(1),
  regrowSeconds: z.number().positive(),
  startingHeads: z.array(z.string()).min(1),
  hatchlingClassPool: z.array(z.string()).min(1),
  experience: section({
    perBattleWon: z.number().min(0),
    perKill: z.number().min(0),
    // Experience needed for level 2, 3, 4…, counted from the start: each more than the one before.
    experienceForLevel: z
      .array(z.number().positive())
      .min(1)
      .refine((list) => list.every((n, i) => i === 0 || n > list[i - 1]!), 'each level must need more experience than the one before'),
    maxHpPercentPerLevel: z.number().min(0),
    damagePercentPerLevel: z.number().min(0),
  }),
  classes: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      color: hexColor,
      maxHp: z.number().positive(),
      attack: attackSchema.extend({
        // The attack's name, shown on the head card.
        name: z.string().min(1).optional(),
        // true = the head goes out to bite its target, and can be hit back there.
        melee: z.boolean().optional(),
        tags: z.array(z.string()),
        // Status (from combos.json) put on the enemy this attack hits, and for how long (leave out for the status's own duration).
        appliesStatus: z.string().min(1).optional(),
        statusSeconds: z.number().positive().optional(),
        // The attack leaves a Mist cloud where it lands.
        createsMistCloud: z.boolean().optional(),
        // Killing a human with this attack eats it and heals the body by this much (Glutton).
        devourHeal: z.number().min(0).optional(),
        // The head licks the most wounded head first and heals it by this much (Tender).
        healsHeads: z.number().min(0).optional(),
        // Chance that a hit also does one of randomEffects (The Spare).
        randomEffectChance: z.number().min(0).max(1).optional(),
        randomEffects: z.array(effectSchema).optional(),
      }),
      // Three skill ids from "skills" below: a head takes two of them into battle (keys Q and W).
      skills: z.array(z.string().min(1)).length(3),
      // The ultimate skill (key E).
      ultimate: z.string().min(1).optional(),
      // Once per battle the head takes over for a while (The Spare's Bad Idea).
      badIdea: section({ seconds: z.number().positive(), earliestSecond: z.number().min(0), latestSecond: z.number().min(0) }).optional(),
    }),
  ),
  skills: z.record(z.string(), skillSchema),
  rummage: z.array(rummageFindSchema),
  names: z.array(z.string().min(1)).min(9),
}).superRefine((data, ctx) => {
  // Class names used in lists must exist in "classes".
  for (const listName of ['startingHeads', 'hatchlingClassPool'] as const) {
    data[listName].forEach((id, i) => {
      if (!(id in data.classes)) {
        ctx.addIssue({ code: 'custom', path: [listName, i], message: `unknown head class "${id}"; known: ${Object.keys(data.classes).join(', ')}` });
      }
    });
  }
  for (const [classId, cls] of Object.entries(data.classes)) {
    const used = [...cls.skills, ...(cls.ultimate ? [cls.ultimate] : [])];
    used.forEach((skillId, i) => {
      if (!(skillId in data.skills)) {
        const path = i < cls.skills.length ? ['classes', classId, 'skills', i] : ['classes', classId, 'ultimate'];
        ctx.addIssue({ code: 'custom', path, message: `unknown skill "${skillId}"; known: ${Object.keys(data.skills).join(', ')}` });
      }
    });
    if (new Set(cls.skills).size !== cls.skills.length) ctx.addIssue({ code: 'custom', path: ['classes', classId, 'skills'], message: 'the same skill is listed twice' });
    if (cls.badIdea && cls.badIdea.earliestSecond > cls.badIdea.latestSecond) {
      ctx.addIssue({ code: 'custom', path: ['classes', classId, 'badIdea'], message: 'earliestSecond must not be after latestSecond' });
    }
  }
  for (const [skillId, skill] of Object.entries(data.skills)) {
    const aimed = skill.target === 'enemy' || skill.target === 'hex';
    if (aimed && skill.range === undefined) ctx.addIssue({ code: 'custom', path: ['skills', skillId, 'range'], message: `a skill aimed at a${skill.target === 'enemy' ? 'n enemy' : ' hex'} needs a range` });
    if (skill.hitMultiplier && skill.target !== 'enemy') ctx.addIssue({ code: 'custom', path: ['skills', skillId, 'hitMultiplier'], message: 'only skills aimed at an enemy can hit' });
    const area = skill.area?.shape ?? 'single';
    if ((area === 'single' || area === 'nearest') && skill.target !== 'enemy' && (skill.effects ?? []).length > 0) {
      ctx.addIssue({ code: 'custom', path: ['skills', skillId, 'area'], message: `area "${area}" needs a skill aimed at an enemy` });
    }
  }
  data.rummage.forEach((find, i) => {
    if (find.type === 'healClass' && !(find.classId in data.classes)) {
      ctx.addIssue({ code: 'custom', path: ['rummage', i, 'classId'], message: `unknown head class "${find.classId}"` });
    }
  });
});

export const ENEMY_BEHAVIORS = ['fighter', 'headhunter', 'torchbearer', 'collector'] as const;

export const enemiesSchema = section({
  types: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      maxHp: z.number().positive(),
      armor: z.number().min(0),
      // Seconds one step from a hex to the next takes.
      stepSeconds: z.number().positive(),
      attack: attackSchema,
      bonusDamageVsHeads: z.number().positive().optional(),
      cauterizeSeconds: z.number().positive().optional(),
      behavior: z.enum(ENEMY_BEHAVIORS),
      // Statuses (combos.json) that never take hold on this type, e.g. knights and "terrified".
      immuneTo: z.array(z.string().min(1)).optional(),
      // A ranged attacker that sees nothing through Mist but what is right next to it (crossbowmen).
      blindInMist: z.boolean().optional(),
      // Attacks from afar before it runs out (crossbow bolts); after that it fights up close, at range 1.
      shots: z.number().int().min(0).optional(),
      // Walks faster (step time multiplied by stepMultiplier) until its first blow, which hits firstHitMultiplier times harder.
      charge: section({ stepMultiplier: z.number().positive(), firstHitMultiplier: z.number().positive() }).optional(),
      // collector behavior: seconds it spends counting next to the body before it runs for the edge.
      collectSeconds: z.number().positive().optional(),
      // A boss: named over the board with a big HP bar.
      boss: z.boolean().optional(),
    }),
  ),
  encounterGroups: z
    .array(
      section({
        id: z.string().min(1),
        // 1 = met near the lair; higher tiers further out (undergroundGenerator.encounters in balance.json).
        tier: z.number().int().min(1),
        weight: z.number().positive(),
        members: z.array(z.string()).min(1),
        // Only the Order brings this group (order.json): it never waits on the map as an encounter.
        orderOnly: z.boolean().optional(),
      }),
    )
    .min(1),
}).superRefine((data, ctx) => {
  data.encounterGroups.forEach((group, g) => {
    group.members.forEach((id, m) => {
      if (!(id in data.types)) {
        ctx.addIssue({ code: 'custom', path: ['encounterGroups', g, 'members', m], message: `unknown enemy type "${id}"; known: ${Object.keys(data.types).join(', ')}` });
      }
    });
  });
  for (const [id, type] of Object.entries(data.types)) {
    if (type.behavior === 'torchbearer' && type.cauterizeSeconds === undefined) {
      ctx.addIssue({ code: 'custom', path: ['types', id, 'cauterizeSeconds'], message: 'torchbearer behavior needs cauterizeSeconds' });
    }
    if (type.behavior === 'collector' && type.collectSeconds === undefined) {
      ctx.addIssue({ code: 'custom', path: ['types', id, 'collectSeconds'], message: 'collector behavior needs collectSeconds' });
    }
  }
});

/** Kinds of open ground a biome can have (rock is wherever the caves are not). */
export const GROUND_TYPES = ['water', 'mud', 'roots', 'salt'] as const;

export const biomesSchema = section({
  lairBiome: z.string().min(1),
  biomes: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      decorations: z.array(z.enum(DECORATION_KINDS)),
      ground: z.partialRecord(z.enum(GROUND_TYPES), share),
      // How likely encounters are here compared with other biomes (1 = normal, 1.5 = half as many again).
      encounterDensity: z.number().positive().optional(),
      colors: section({ ground: hexColor, detail: hexColor, water: hexColor, rock: hexColor, glow: hexColor }),
    }),
  ),
}).superRefine((data, ctx) => {
  if (!(data.lairBiome in data.biomes)) {
    ctx.addIssue({ code: 'custom', path: ['lairBiome'], message: `unknown biome "${data.lairBiome}"; known: ${Object.keys(data.biomes).join(', ')}` });
  }
  if (Object.keys(data.biomes).length < 2) ctx.addIssue({ code: 'custom', path: ['biomes'], message: 'needs the lair biome and at least one other' });
  for (const [id, biome] of Object.entries(data.biomes)) {
    const sum = Object.values(biome.ground).reduce((a, b) => a + (b ?? 0), 0);
    if (Math.abs(sum - 1) > 0.001) ctx.addIssue({ code: 'custom', path: ['biomes', id, 'ground'], message: `shares must add up to 1 (now ${sum})` });
  }
});

/** What a blessing can change (see shrines.json). */
export const BLESSING_EFFECTS = ['movement', 'sight', 'bodyMaxHp', 'regeneration', 'alert', 'muck', 'moisture'] as const;
/** What a mutation can change (see mutations.json). */
export const MUTATION_EFFECTS = ['movement', 'sight', 'bodyMaxHp', 'regeneration', 'headMaxHpPercent', 'startingHeads', 'alertPercent', 'findsPercent', 'echoRange', 'cauterizePercent'] as const;

export const shrinesSchema = section({
  blessings: z
    .array(
      section({
        id: z.string().min(1),
        name: z.string().min(1),
        text: z.string().min(1),
        effects: z.partialRecord(z.enum(BLESSING_EFFECTS), z.number().int()),
      }),
    )
    .min(1),
  // A marking shrine (GAME_DESIGN.md §12): with this chance a world has one, in one of these rings. It offers a mutation
  // (mutations.json) the hydra doesn't carry yet, for her and her heiresses, instead of a blessing.
  marks: section({ chance: share, rings: z.array(z.number().int().min(1)).min(1) }),
}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  data.blessings.forEach((b, i) => {
    if (ids.has(b.id)) ctx.addIssue({ code: 'custom', path: ['blessings', i, 'id'], message: `blessing id "${b.id}" is used twice` });
    ids.add(b.id);
  });
});

export const COMBO_TRIGGERS = ['headHitsEnemy', 'enemyInMist', 'enemyDevoured', 'beaconLit'] as const;

export const combosSchema = section({
  statuses: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      color: hexColor,
      durationSeconds: z.number().positive(),
      // Added to the enemy's armor while the status lasts (negative = weaker armor).
      armorChange: z.number(),
      damagePerSecond: z.number().min(0),
      // 1 = normal speed, 0.5 = half speed.
      speedMultiplier: z.number().positive(),
      // false = the enemy can't (leave out for true).
      canWalk: z.boolean().optional(),
      canAttack: z.boolean().optional(),
      // Cauterizing stumps, praying.
      canChannel: z.boolean().optional(),
      // The enemy runs away from the body.
      flees: z.boolean().optional(),
      // 1.25 = the enemy takes 25% more damage.
      damageTakenMultiplier: z.number().positive().optional(),
      // Any damage ends the status.
      endsOnDamage: z.boolean().optional(),
      // For holds: the hold breaks when the holding head takes this much damage.
      breaksWhenHolderTakes: z.number().positive().optional(),
    }),
  ),
  mistCloud: section({
    // In hexes: 1 = the hex where the breath lands and its six neighbours.
    radius: z.number().int().min(0),
    durationSeconds: z.number().positive(),
    appliesStatus: z.string().min(1).optional(),
  }),
  // How long a head's hit is remembered on a human, for combos that need several heads.
  hitMemorySeconds: z.number().positive(),
  twinLoss: section({ seconds: z.number().positive(), rageAttackSpeed: z.number().positive(), griefAttackSpeed: z.number().positive() }),
  spareMischief: section({ classId: z.string().min(1), chance: share, effects: z.array(effectSchema) }),
  combos: z.array(
    section({
      id: z.string().min(1),
      displayName: z.string().min(1),
      // How to set it off and what it does, in one or two short sentences (shown in the codex once discovered).
      description: z.string().min(1),
      // What sets the combo off: a head's attack landing, an enemy standing in a Mist cloud, a head eating someone, or a Beacon being lit.
      when: z.enum(COMBO_TRIGGERS),
      // All listed conditions must hold. Leave one out to not care about it.
      conditions: section({
        attackTag: z.string().min(1).optional(),
        // The class of the head that hit.
        headClass: z.string().min(1).optional(),
        enemyHasStatus: z.string().min(1).optional(),
        enemyInMist: z.boolean().optional(),
        enemyCarriesFire: z.boolean().optional(),
        // false = only while the enemy's armor is still whole (so an armor-breaking combo lands once per enemy).
        enemyArmorBroken: z.boolean().optional(),
        // The enemy has less than this share of its HP left (0.5 = under half).
        enemyHpBelow: z.number().positive().max(1).optional(),
        // Other heads that hit the same enemy shortly before: how many, how shortly, and which ones count.
        otherHeads: section({
          count: z.number().int().min(1),
          withinSeconds: z.number().positive(),
          sameClass: z.boolean().optional(),
          sameStump: z.boolean().optional(),
          oppositeSide: z.boolean().optional(),
          tag: z.string().min(1).optional(),
        }).optional(),
        // beaconLit only.
        beaconInMist: z.boolean().optional(),
        terrifiedOnBoard: z.boolean().optional(),
      }),
      effects: z.array(effectSchema).optional(),
      // beaconLit only: how the beacon changes.
      beacon: section({ extraRadius: z.number().int().min(0).optional(), takesTorches: z.boolean().optional(), callsTerrified: z.boolean().optional() }).optional(),
      // The same combo can't go off on the same human again for this long.
      cooldownSeconds: z.number().positive().optional(),
      // What the heads say when it goes off, in order. speaker: a head class id, "any" (any head) or "enemy" (the human).
      lines: z.array(section({ speaker: z.string().min(1), text: z.string().min(1) })).optional(),
    }),
  ),
}).superRefine((data, ctx) => {
  const known = Object.keys(data.statuses);
  const check = (id: string | undefined, path: Array<string | number>) => {
    if (id !== undefined && !known.includes(id)) ctx.addIssue({ code: 'custom', path, message: `unknown status "${id}"; known: ${known.join(', ')}` });
  };
  check(data.mistCloud.appliesStatus, ['mistCloud', 'appliesStatus']);
  statusesIn(data.spareMischief.effects).forEach((id) => check(id, ['spareMischief', 'effects']));
  const ids = new Set<string>();
  data.combos.forEach((combo, c) => {
    if (ids.has(combo.id)) ctx.addIssue({ code: 'custom', path: ['combos', c, 'id'], message: `combo id "${combo.id}" is used twice` });
    ids.add(combo.id);
    check(combo.conditions.enemyHasStatus, ['combos', c, 'conditions', 'enemyHasStatus']);
    if (combo.when !== 'headHitsEnemy' && (combo.conditions.attackTag !== undefined || combo.conditions.otherHeads !== undefined)) {
      ctx.addIssue({ code: 'custom', path: ['combos', c, 'conditions'], message: 'attackTag and otherHeads only work with "when": "headHitsEnemy"' });
    }
    if ((combo.when === 'beaconLit') !== (combo.beacon !== undefined)) {
      ctx.addIssue({ code: 'custom', path: ['combos', c, 'beacon'], message: '"beacon" goes with "when": "beaconLit", and only there' });
    }
    if (combo.when !== 'beaconLit' && (combo.effects ?? []).length === 0) ctx.addIssue({ code: 'custom', path: ['combos', c, 'effects'], message: 'needs at least one effect' });
    statusesIn(combo.effects).forEach((id) => check(id, ['combos', c, 'effects']));
  });
});

/** A thing the hydra can do at a place (world.json places). */
const placeActionSchema = section({
  id: z.string().min(1),
  label: z.string().min(1),
  // Said after the action.
  result: z.string().min(1).optional(),
  // Only a hydra with a head of this class (heads.json) can do it.
  headClass: z.string().min(1).optional(),
  movementCost: z.number().int().min(0).optional(),
  // Once per run.
  once: z.boolean().optional(),
  // Can be done again after this many turns.
  cooldownTurns: z.number().int().min(1).optional(),
  gain: lootSchema.optional(),
  // A condition (world.json conditions) put on the hydra for a number of turns.
  condition: section({ id: z.string().min(1), turns: z.number().int().min(1) }).optional(),
  // The hydra is carried along the place's current.
  carry: z.boolean().optional(),
  // One hidden threshold is shown on the map.
  revealHiddenThreshold: z.boolean().optional(),
});

const PLACE_TYPES = ['landmark', 'location', 'rare'] as const;

const placeSchema = section({
  type: z.enum(PLACE_TYPES),
  // Landmarks and locations: the biome they belong to.
  biome: z.string().min(1).optional(),
  // Rare places: the chance (0–1) a world has it, and where it goes (a chamber of ring `ring`, or any; or a dead end).
  chance: share.optional(),
  where: z.enum(['chamber', 'deadEnd']).optional(),
  ring: z.number().int().min(1).optional(),
  name: z.string().min(1),
  text: z.string().min(1),
  // Heard before the place is seen.
  echo: z.string().min(1).optional(),
  actions: z.array(placeActionSchema).optional(),
  // Battles this many hexes away or closer don't raise the Alert.
  silencesBattlesWithin: z.number().int().min(0).optional(),
}).superRefine((place, ctx) => {
  if (place.type !== 'rare' && place.biome === undefined) ctx.addIssue({ code: 'custom', path: ['biome'], message: `a ${place.type} needs the biome it belongs to` });
  if (place.type === 'rare' && (place.chance === undefined || place.where === undefined)) {
    ctx.addIssue({ code: 'custom', path: ['type'], message: 'a rare place needs "chance" and "where"' });
  }
  const ids = new Set<string>();
  (place.actions ?? []).forEach((action, a) => {
    if (ids.has(action.id)) ctx.addIssue({ code: 'custom', path: ['actions', a, 'id'], message: `action id "${action.id}" is used twice` });
    ids.add(action.id);
  });
});

const thresholdSchema = section({
  name: z.string().min(1),
  text: z.string().min(1),
  // Looks like rock until the hydra stands next to it; `hint` is what gives it away.
  hidden: z.boolean().optional(),
  hint: z.string().min(1).optional(),
  // Opened by digging: one dig per turn, `turns` digs (each threshold gets its own number from the range).
  dig: section({ label: z.string().min(1), turns: intRange(1), progress: z.string().min(1) }).optional(),
  // Opened at once by a head of this class (heads.json).
  open: section({ headClass: z.string().min(1), label: z.string().min(1) }).optional(),
  // Opened by a step of a mini quest: any one of `ways`, each needing a story flag (set by events or dialogues).
  // `missing`: what the panel says while the flag isn't set. Opening it sets `setFlags` and says `dialogue` (dialogues.json).
  sealed: section({
    ways: z.array(section({ flag: z.string().min(1), label: z.string().min(1), missing: z.string().min(1) })).min(1),
    setFlags: z.array(z.string().min(1)).optional(),
    dialogue: z.string().min(1).optional(),
  }).optional(),
  // Melted open by the Cinderkin when an event's outcome says "bore": true (one such threshold at most).
  bore: section({
    // Through one of the thinnest spots of a rock band no farther than this from the hydra (hexes),
    within: z.number().int().min(1),
    // at most this many hexes of rock long.
    longest: z.number().int().min(1),
    // It burns for this many turns (the one it is made in included), and every hot hex stepped on costs `burn` body HP.
    hotTurns: z.number().int().min(1),
    burn: z.number().int().min(0),
  }).optional(),
  alwaysOpen: z.boolean().optional(),
  // A rare place: a world has it with this chance (0–1).
  rareChance: share.optional(),
  // An extra threshold, on top of a border's own: one on this border (1 = between rings 1 and 2) in a world, with `chance` (0–1).
  oneOnBorder: z.number().int().min(1).optional(),
  chance: share.optional(),
}).superRefine((t, ctx) => {
  const ways = [t.hidden === true, t.dig !== undefined, t.open !== undefined, t.sealed !== undefined, t.bore !== undefined, t.alwaysOpen === true].filter(Boolean).length;
  if (ways !== 1) ctx.addIssue({ code: 'custom', path: [], message: 'a threshold needs exactly one of: "hidden": true, "dig", "open", "sealed", "bore", "alwaysOpen": true' });
  if (t.hidden && t.hint === undefined) ctx.addIssue({ code: 'custom', path: ['hint'], message: 'a hidden threshold needs a hint (what gives it away)' });
  if (t.oneOnBorder !== undefined && !(t.dig || t.open || t.sealed)) ctx.addIssue({ code: 'custom', path: ['oneOnBorder'], message: 'only a threshold that is dug or opened ("dig", "open", "sealed") can be added to a border' });
  if (t.chance !== undefined && t.oneOnBorder === undefined) ctx.addIssue({ code: 'custom', path: ['chance'], message: '"chance" goes with "oneOnBorder"' });
});

const named = { name: z.string().min(1), text: z.string().min(1) };

/**
 * How the account unlocks a run modifier (M6, GAME_DESIGN.md §9.6, §12): one simple challenge, and how it is told.
 * reachRing: a hydra stands in this ring; battlesWon: one hydra wins this many battles; generation: a lineage gets this
 * far; flag: a story flag (flags.json) is known; turns: one hydra lives this many turns.
 */
const unlockSchema = section({
  text: z.string().min(1),
  reachRing: z.number().int().min(1).optional(),
  battlesWon: z.number().int().min(1).optional(),
  generation: z.number().int().min(2).optional(),
  flag: z.string().min(1).optional(),
  turns: z.number().int().min(1).optional(),
}).refine(
  (u) => [u.reachRing, u.battlesWon, u.generation, u.flag, u.turns].filter((v) => v !== undefined).length === 1,
  'needs exactly one challenge: reachRing, battlesWon, generation, flag or turns',
);

export const worldSchema = section({
  thresholds: entries(thresholdSchema),
  places: entries(placeSchema),
  remains: section({
    loot: section({ muck: intRange(0), moisture: intRange(0), bones: intRange(0) }),
    // "any", or a biome id.
    lines: entries(z.array(z.string().min(1)).min(1)),
  }),
  guardedHoard: section({ ...named, loot: lootSchema }),
  patchFinds: entries(z.enum(PATCH_FINDS)),
  echoes: entries(z.string().min(1)),
  conditions: entries(section({ ...named, movement: z.number().int().optional(), revealsEncounters: z.boolean().optional() })),
  runModifiers: section({
    wetYear: section({ ...named, unlock: unlockSchema, waterShareBonus: share, moistureMultiplier: z.number().positive() }),
    myceliumBloom: section({ ...named, unlock: unlockSchema, extraFungalPatches: intRange(0), fungalBiome: z.string().min(1) }),
    oldWorkings: section({ ...named, unlock: unlockSchema, extraEncounters: z.number().int().min(0) }),
  }),
  modifierDraw: section({ normalYearWeight: z.number().min(0) }),
}).superRefine((world, ctx) => {
  // The generator relies on these.
  const needed = { draughtCrack: 'hidden', cinderScar: 'alwaysOpen', oldWorkings: 'alwaysOpen' } as const;
  for (const [id, way] of Object.entries(needed)) {
    const t = world.thresholds[id];
    if (!t) ctx.addIssue({ code: 'custom', path: ['thresholds'], message: `needs the threshold "${id}" (the generator places it)` });
    else if (t[way] !== true) ctx.addIssue({ code: 'custom', path: ['thresholds', id], message: `must have "${way}": true` });
  }
  const bored = Object.keys(world.thresholds).filter((id) => world.thresholds[id]!.bore !== undefined);
  if (bored.length > 1) ctx.addIssue({ code: 'custom', path: ['thresholds'], message: `only one threshold can have "bore" (now: ${bored.join(', ')})` });
  if (!world.remains.lines['any']) ctx.addIssue({ code: 'custom', path: ['remains', 'lines'], message: 'needs the pool "any"' });
  for (const [id, place] of Object.entries(world.places)) {
    for (const [a, action] of (place.actions ?? []).entries()) {
      if (action.condition && !world.conditions[action.condition.id]) {
        ctx.addIssue({ code: 'custom', path: ['places', id, 'actions', a, 'condition', 'id'], message: `unknown condition "${action.condition.id}"; known: ${Object.keys(world.conditions).join(', ')}` });
      }
    }
  }
});

export const paletteSchema = z
  .object({
    underground: z
      .object({
        black: hexColor,
        deepTeal: hexColor,
        swampGreen: hexColor,
        bioluminescence: hexColor,
      })
      .strict(),
    order: z
      .object({
        gold: hexColor,
        orange: hexColor,
        bannerRed: hexColor,
        fire: hexColor,
      })
      .strict(),
    mist: hexColor,
  })
  .strict();

export const textSchema = z
  .object({
    title: z
      .object({
        gameTitle: z.string().min(1),
        subtitle: z.string(),
      })
      .strict(),
    hud: section({
      turn: z.string().min(1),
      moves: z.string().min(1),
      muck: z.string().min(1),
      alert: z.string().min(1),
      endTurn: z.string().min(1),
      moisture: z.string().min(1),
      bones: z.string().min(1),
      rested: z.string().min(1),
      outOfReach: z.string().min(1),
      noWayThere: z.string().min(1),
      journeyWaits: z.string().min(1),
      // {name}: the landmark's name.
      landmarkSighted: z.string().min(1),
      richDeposit: z.string().min(1),
      silenced: z.string().min(1),
      // {name}: the threshold's name.
      thresholdOpened: z.string().min(1),
      // {name}: the condition's name.
      conditionEnded: z.string().min(1),
      // {direction}: one of `directions`.
      tunnelBored: z.string().min(1),
      boreFailed: z.string().min(1),
      // {n}: body HP lost, e.g. "-8".
      burned: z.string().min(1),
      tunnelCooled: z.string().min(1),
      // Under the Order's people out of sight, where they were last seen: {n} turns ago (lastSeenOne: one, lastSeenNow: this turn).
      lastSeen: z.string().min(1),
      lastSeenOne: z.string().min(1),
      lastSeenNow: z.string().min(1),
      // After a messenger is eaten (order.json eatenLines): {bones} gained, {alert} the change, e.g. "-3".
      messengerEaten: z.string().min(1),
      // After a messenger got away (order.json escaped): {n} the Alert gained.
      messengerEscaped: z.string().min(1),
      // A head went up a level: {name}, {level}.
      headLevelled: z.string().min(1),
      // Which way something lies from the hydra, as on the screen (north is up).
      directions: section({
        north: z.string().min(1),
        northEast: z.string().min(1),
        east: z.string().min(1),
        southEast: z.string().min(1),
        south: z.string().min(1),
        southWest: z.string().min(1),
        west: z.string().min(1),
        northWest: z.string().min(1),
      }),
    }),
    place: section({
      kinds: section({ landmark: z.string().min(1), location: z.string().min(1), rare: z.string().min(1), threshold: z.string().min(1) }),
      leaveButton: z.string().min(1),
      // {dug} and {needed}: digs done so far, and how many it takes.
      digProgress: z.string().min(1),
      why: section({
        // {class}: the head class's name.
        needsHead: z.string().min(1),
        // {condition}: the condition's name (world.json conditions).
        needsCondition: z.string().min(1),
        noMovement: z.string().min(1),
        // {turn}: the turn when it can be done again.
        notYet: z.string().min(1),
        done: z.string().min(1),
      }),
    }),
    event: section({
      kind: z.string().min(1),
      // {quest}: the name of the mini quest the event is a step of.
      questKind: z.string().min(1),
      continueButton: z.string().min(1),
      // {cost}: e.g. "6 Muck".
      cost: z.string().min(1),
      gamble: z.string().min(1),
      cantAfford: z.string().min(1),
      // {n}: the amount, with its sign. {name}: the head class.
      effects: section({ alert: z.string().min(1), bodyHp: z.string().min(1), headsHp: z.string().min(1), reveal: z.string().min(1), battle: z.string().min(1), newHead: z.string().min(1), mutation: z.string().min(1) }),
    }),
    dialogue: section({ tapToContinue: z.string().min(1) }),
    shrine: section({
      title: z.string().min(1),
      acceptButton: z.string().min(1),
      refuseButton: z.string().min(1),
      // How each effect is written; {n} becomes the number with its sign, e.g. "+1 movement".
      effects: section(Object.fromEntries(BLESSING_EFFECTS.map((e) => [e, z.string().min(1)])) as Record<(typeof BLESSING_EFFECTS)[number], z.ZodString>),
    }),
    battle: section({
      paused: z.string().min(1),
      pauseButton: z.string().min(1),
      resumeButton: z.string().min(1),
      speed: z.string().min(1),
      body: z.string().min(1),
      hintSelectHead: z.string(),
      selectAllButton: z.string().min(1),
      severed: z.string().min(1),
      regrown: z.string().min(1),
      cauterized: z.string().min(1),
      victoryTitle: z.string().min(1),
      defeatTitle: z.string().min(1),
      continueButton: z.string().min(1),
      '//skills': z.string().optional(),
      hintSkills: z.string(),
      aimEnemy: z.string().min(1),
      aimHex: z.string().min(1),
      aimHead: z.string().min(1),
      aimStump: z.string().min(1),
      // {name}: the head.
      rage: z.string().min(1),
      grief: z.string().min(1),
      badIdea: z.string().min(1),
      eaten: z.string().min(1),
      '//m3': z.string().optional(),
      collected: z.string().min(1),
      escaped: z.string().min(1),
      allyKilled: z.string().min(1),
      // A head's level on its card, above level 1: {n}.
      level: z.string().min(1),
      skillFizzled: z.string().min(1),
      // The combo codex: {n} combos found of {total}.
      codexButton: z.string().min(1),
      codexTitle: z.string().min(1),
      codexCount: z.string().min(1),
      codexUnknown: z.string().min(1),
      codexClose: z.string().min(1),
      codexNew: z.string().min(1),
      // What The Spare finds with Rummage, by the find's id in heads.json.
      rummage: z.record(z.string(), z.string().min(1)),
    }),
    lineages: section({
      beginButton: z.string().min(1),
      continueButton: z.string().min(1),
      newLineageButton: z.string().min(1),
      bookButton: z.string().min(1),
      living: z.string().min(1),
      awaiting: z.string().min(1),
      confirmTitle: z.string().min(1),
      confirmBody: z.string().min(1),
      confirmYes: z.string().min(1),
      confirmNo: z.string().min(1),
      lineageName: z.string().min(1),
      deathHeading: z.string().min(1),
      lived: z.string().min(1),
      inheritsHeading: z.string().min(1),
      inheritsNothing: z.string().min(1),
      lostWithHer: z.string().min(1),
      unlocked: z.string().min(1),
      heiress: z.string().min(1),
      hatchButton: z.string().min(1),
      // The eggs she left (M3). eggTitle: {n}, the egg's number; extinctText: {lineage}; hiddenEggText: {name}, the
      // hydra in whose time the egg was hidden.
      eggsHeading: z.string().min(1),
      eggsHint: z.string().min(1),
      eggTitle: z.string().min(1),
      eggNothing: z.string().min(1),
      eggButton: z.string().min(1),
      extinctHeading: z.string().min(1),
      extinctText: z.string().min(1),
      hiddenEggText: z.string().min(1),
      hiddenEggTitle: z.string().min(1),
      interventionButton: z.string().min(1),
      endLineageButton: z.string().min(1),
      bookTitle: z.string().min(1),
      bookEmpty: z.string().min(1),
      bookEnded: z.string().min(1),
      bookLiving: z.string().min(1),
      bookStillAlive: z.string().min(1),
      bookTurns: z.string().min(1),
      bookUnlocks: z.string().min(1),
      bookUnlocked: z.string().min(1),
      backButton: z.string().min(1),
      hudName: z.string().min(1),
      mutationGained: z.string().min(1),
      markTitle: z.string().min(1),
      markWords: z.string().min(1),
      ancestorRole: z.string().min(1),
      // How each effect of a mutation is written (mutations.json); {n} becomes the number with its sign.
      effects: section(Object.fromEntries(MUTATION_EFFECTS.map((e) => [e, z.string().min(1)])) as Record<(typeof MUTATION_EFFECTS)[number], z.ZodString>),
    }),
  })
  .strict();

// ---------------------------------------------------------------- story: dialogues.json and events.json

const STORY_TRIGGERS = ['afterBattle', 'newBiome', 'enemyAhead', 'restInLair', 'serpentOnTheWay', 'serpentInBattle', 'eventOnly', 'newGeneration', 'ancestorInSleep'] as const;
const flagList = z.array(z.string().min(1));
const storyConditionsSchema = section({
  rings: z.array(z.number().int().min(0)).optional(),
  biomes: z.array(z.string().min(1)).optional(),
  flags: flagList.optional(),
  notFlags: flagList.optional(),
  minAlert: z.number().optional(),
  maxAlert: z.number().optional(),
  minTurn: z.number().int().optional(),
  headClasses: z.array(z.string().min(1)).optional(),
  minHeads: z.number().int().min(0).optional(),
  maxHeads: z.number().int().min(0).optional(),
  won: z.boolean().optional(),
  severedAtLeast: z.number().int().min(0).optional(),
  grownAtLeast: z.number().int().min(0).optional(),
  cauterizedAtLeast: z.number().int().min(0).optional(),
  newEnemyTypes: z.array(z.string().min(1)).optional(),
  minGeneration: z.number().int().min(1).optional(),
  maxGeneration: z.number().int().min(1).optional(),
  mutations: z.array(z.string().min(1)).optional(),
  inheritedAtLeast: z.number().int().min(0).optional(),
  motherKilledBy: z.array(z.string().min(1)).optional(),
});
const speakerSchema = z
  .string()
  .regex(/^(toad|serpent|ancestor|head:[A-Za-z]+)$/, 'expected "toad", "serpent", "ancestor", "head:any", "head:other", "head:new" or "head:<class id>"');
const dialogueLineSchema = section({ speaker: speakerSchema, text: z.string().min(1) });

export const dialoguesSchema = section({
  speakers: section({ toad: z.string().min(1), serpent: z.string().min(1), ancestor: z.string().min(1) }),
  serpentVoice: section({ minTurnsBetween: z.number().int().min(0), chancePerTurn: share, battleChance: share }),
  dialogues: z.array(
    section({
      id: z.string().min(1),
      trigger: z.enum(STORY_TRIGGERS),
      priority: z.number().optional(),
      once: z.boolean().optional(),
      conditions: storyConditionsSchema.optional(),
      lines: z.array(dialogueLineSchema).min(1),
      setFlags: flagList.optional(),
      choices: z.array(section({ text: z.string().min(1), setFlags: flagList.optional(), reply: z.array(dialogueLineSchema).optional() })).optional(),
    }),
  ),
});

const eventOutcomeSchema = section({
  text: z.string().min(1),
  muck: z.number().int().optional(),
  moisture: z.number().int().optional(),
  bones: z.number().int().optional(),
  alert: z.number().optional(),
  bodyHp: z.number().int().optional(),
  headsHp: z.number().int().optional(),
  condition: section({ id: z.string().min(1), turns: z.number().int().min(1) }).optional(),
  reveal: z.number().int().min(0).optional(),
  battle: z.string().min(1).optional(),
  setFlags: flagList.optional(),
  dialogue: z.string().min(1).optional(),
  newHead: z.string().min(1).optional(),
  bore: z.boolean().optional(),
  mutation: z.string().min(1).optional(),
});
const costSchema = section({ muck: z.number().int().min(0).optional(), moisture: z.number().int().min(0).optional(), bones: z.number().int().min(0).optional() });

export const eventsSchema = section({
  events: z.array(
    section({
      id: z.string().min(1),
      title: z.string().min(1),
      quest: z.string().min(1).optional(),
      text: z.string().min(1),
      priority: z.number().optional(),
      weight: z.number().positive().optional(),
      once: z.boolean().optional(),
      conditions: storyConditionsSchema.optional(),
      choices: z
        .array(
          section({
            text: z.string().min(1),
            needsHead: z.string().min(1).optional(),
            needsCondition: z.string().min(1).optional(),
            cost: costSchema.optional(),
            outcome: eventOutcomeSchema.optional(),
            chance: share.optional(),
            success: eventOutcomeSchema.optional(),
            failure: eventOutcomeSchema.optional(),
          }).superRefine((c, ctx) => {
            const gamble = c.chance !== undefined;
            if (gamble && (!c.success || !c.failure || c.outcome)) ctx.addIssue({ code: 'custom', message: 'a gamble ("chance") needs "success" and "failure", and no "outcome"' });
            if (!gamble && (!c.outcome || c.success || c.failure)) ctx.addIssue({ code: 'custom', message: 'needs an "outcome" (or "chance" with "success" and "failure")' });
          }),
        )
        .min(1),
    }),
  ),
});

// ---------------------------------------------------------------- generations: mutations.json, lineage.json, flags.json

export const mutationsSchema = section({
  mutations: z
    .array(
      section({
        id: z.string().min(1),
        name: z.string().min(1),
        text: z.string().min(1),
        effects: z.partialRecord(z.enum(MUTATION_EFFECTS), z.number().int()),
        // Only a boss eaten gives it: marking shrines never offer it.
        bossOnly: z.boolean().optional(),
      }),
    )
    .min(1),
}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  data.mutations.forEach((m, i) => {
    if (ids.has(m.id)) ctx.addIssue({ code: 'custom', path: ['mutations', i, 'id'], message: `mutation id "${m.id}" is used twice` });
    ids.add(m.id);
  });
});

const lines = z.array(z.string().min(1));
export const lineageSchema = section({
  names: z.array(z.string().min(1)).min(1),
  takeAncestorName: share,
  inheritedShare: share,
  ancestorVoice: section({ chance: share }),
  epitaphs: section({ byEnemy: entries(lines.min(1)), any: lines.min(1), ended: lines.min(1) }),
});

/** An encounter group (enemies.json) the Order sends, by weight. */
const orderGroupSchema = section({
  group: z.string().min(1),
  weight: z.number().positive(),
  minRing: z.number().int().min(0).optional(),
  fromStage: z.string().min(1).optional(),
});
export const orderSchema = section({
  alertStages: z
    .array(section({ id: z.string().min(1), at: z.number().min(0), text: z.string().min(1) }))
    .min(1)
    .refine((stages) => stages.every((s, i) => i === 0 || s.at > stages[i - 1]!.at), 'stages must go up: each "at" bigger than the one before')
    .refine((stages) => new Set(stages.map((s) => s.id)).size === stages.length, 'each stage needs its own id'),
  alertPerTurn: z.number().min(0),
  patrols: section({
    firstOnTurn: z.number().int().min(1),
    maxByStage: z.array(z.number().int().min(0)).min(1),
    everyTurnsByStage: z.array(z.number().int().min(1)).min(1),
    actMaxBonus: z.number().int().min(0),
    movement: z.number().int().min(1),
    sight: z.number().int().min(0),
    chaseTurns: z.number().int().min(0),
    arrived: z.string().min(1),
    groups: z.array(orderGroupSchema).min(1),
  }),
  messengers: section({
    headStart: z.number().int().min(0),
    movement: z.number().int().min(1),
    alertOnArrival: z.number(),
    alertWhenEaten: z.number(),
    bones: z.number().int().min(0),
    sent: z.string().min(1),
    escaped: z.string().min(1),
    eatenLines: z.array(z.string().min(1)).min(1),
  }),
  expeditions: section({
    fromStage: z.string().min(1),
    firstAfterTurns: z.number().int().min(0),
    everyTurns: z.number().int().min(1),
    movement: z.number().int().min(1),
    sent: z.string().min(1),
    groups: z.array(orderGroupSchema).min(1),
  }),
  // beaten: {act} is the number of the act that begins.
  greatBurning: section({
    atStage: z.string().min(1),
    movement: z.number().int().min(1),
    group: z.string().min(1),
    // Mutation ids (mutations.json): the hydra gets one she doesn't carry for eating the Master.
    mutations: z.array(z.string().min(1)),
    sent: z.string().min(1),
    // {act}: the act that begins.
    beaten: z.string().min(1),
  }),
  // {list}: what the Tithe Collector took.
  tithe: section({ percent: z.number().min(0).max(100), taken: z.string().min(1), nothing: z.string().min(1), receipt: z.string().min(1) }),
  siege: section({ perTurn: z.number().int().min(0), killedDefender: z.string().min(1), brokeEgg: z.string().min(1) }),
});

const text = z.string().min(1);
export const broodSchema = section({
  startingEggs: z.number().int().min(0),
  maxEggs: z.number().int().min(1),
  eggCost: section({ bones: z.number().int().min(0), muck: z.number().int().min(0), moisture: z.number().int().min(0).optional() }),
  hatchTurns: z.number().int().min(0),
  scouts: section({ movement: z.number().int().min(1), sight: z.number().int().min(0) }),
  lostDefense: section({ eggsBrokenShare: z.number().min(0).max(1) }),
  // Broodlings guarding the lair fight beside the hydra in the battle for it.
  battle: section({ maxHp: z.number().positive(), stepSeconds: z.number().positive(), attack: attackSchema }),
  texts: section({
    kind: text,
    name: text,
    text: text,
    // {n}: how many.
    eggs: text,
    noEggs: text,
    // {n}: the egg's number; {mutations}: what it carries; {role}: one of roles; {turns}: until it hatches.
    egg: text,
    eggHatching: text,
    noMutations: text,
    // {defenders}, {scouts}: how many.
    broodlings: text,
    rest: text,
    lay: text,
    nextEgg: text,
    hatchDefender: text,
    hatchScout: text,
    laid: text,
    // {n}: the egg's number; {turns}: until it hatches.
    hatchingStarted: text,
    hatched: text,
    hatchedScout: text,
    scoutKilled: text,
    // {n}: how many.
    eggsBroken: text,
    full: text,
    noEgg: text,
    alreadyHatching: text,
    // The Hidden Egg (GAME_DESIGN.md §12). hide: {n}, the egg's number.
    hide: text,
    hidden: text,
    keptHidden: text,
    alreadyHidden: text,
    roles: section({ defender: text, scout: text }),
  }),
});

export const FLAG_SCOPES = ['life', 'lineage', 'world'] as const;
export const flagsSchema = section({
  flags: entries(section({ scope: z.enum(FLAG_SCOPES), about: z.string().min(1) })),
});

const manifestEntrySchema = z
  .object({
    // Path to the image file inside public/, or null to use the placeholder drawn in code.
    file: z.string().min(1).nullable(),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    // An animation: this many frames side by side in the file; width and height are of one frame.
    frames: z.number().int().min(2).optional(),
  })
  .strict();

export const manifestSchema = z
  .object({
    images: z.record(z.string(), manifestEntrySchema),
  })
  .strict();

export type Balance = z.infer<typeof balanceSchema>;
export type HeadsData = z.infer<typeof headsSchema>;
export type EnemiesData = z.infer<typeof enemiesSchema>;
export type CombosData = z.infer<typeof combosSchema>;
export type BiomesData = z.infer<typeof biomesSchema>;
export type ShrinesData = z.infer<typeof shrinesSchema>;
export type WorldData = z.infer<typeof worldSchema>;
export type Palette = z.infer<typeof paletteSchema>;
export type GameText = z.infer<typeof textSchema>;
export type AssetManifest = z.infer<typeof manifestSchema>;
export type DialoguesData = z.infer<typeof dialoguesSchema>;
export type StoryConditionsData = z.infer<typeof storyConditionsSchema>;
export type EventsData = z.infer<typeof eventsSchema>;
export type MutationsData = z.infer<typeof mutationsSchema>;
export type LineageData = z.infer<typeof lineageSchema>;
export type FlagsData = z.infer<typeof flagsSchema>;
export type OrderData = z.infer<typeof orderSchema>;
export type BroodData = z.infer<typeof broodSchema>;
