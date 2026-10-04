// Shapes of the data files in src/data/. If a JSON file doesn't match,
// the game stops at startup with a readable message instead of failing silently.
// `.strict()` means unknown fields are errors too, so typos in field names get caught.

import { z } from 'zod';
import { DECORATION_KINDS } from '../assets/mapArt';
import { DEAD_END_CONTENTS, PATCH_FINDS } from '../sim/map';

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
  classes: z.record(
    z.string(),
    section({
      displayName: z.string().min(1),
      color: hexColor,
      maxHp: z.number().positive(),
      attack: attackSchema.extend({
        // true = the head goes out to bite its target, and can be hit back there.
        melee: z.boolean().optional(),
        tags: z.array(z.string()),
        // Status (from combos.json) put on the enemy this attack hits.
        appliesStatus: z.string().min(1).optional(),
        // The attack leaves a Mist cloud where it lands.
        createsMistCloud: z.boolean().optional(),
      }),
    }),
  ),
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
});

export const ENEMY_BEHAVIORS = ['fighter', 'headhunter', 'torchbearer'] as const;

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
}).superRefine((data, ctx) => {
  const ids = new Set<string>();
  data.blessings.forEach((b, i) => {
    if (ids.has(b.id)) ctx.addIssue({ code: 'custom', path: ['blessings', i, 'id'], message: `blessing id "${b.id}" is used twice` });
    ids.add(b.id);
  });
});

export const COMBO_TRIGGERS = ['headHitsEnemy', 'enemyInMist'] as const;

const comboEffectSchema = z.discriminatedUnion('type', [
  // Extra damage that ignores armor.
  section({ type: z.literal('damage'), amount: z.number().positive() }),
  // The enemy's armor is gone for the rest of the battle.
  section({ type: z.literal('breakArmor') }),
  section({ type: z.literal('removeStatus'), status: z.string().min(1) }),
  // The Mist cloud the enemy stands in hurts everyone inside it for a while.
  section({ type: z.literal('acidifyMist'), damagePerSecond: z.number().positive(), seconds: z.number().positive() }),
  // The enemy can't cauterize stumps for a while.
  section({ type: z.literal('putOutTorch'), seconds: z.number().positive() }),
]);

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
    }),
  ),
  mistCloud: section({
    // In hexes: 1 = the hex where the breath lands and its six neighbours.
    radius: z.number().int().min(0),
    durationSeconds: z.number().positive(),
    appliesStatus: z.string().min(1).optional(),
  }),
  combos: z.array(
    section({
      id: z.string().min(1),
      displayName: z.string().min(1),
      // What sets the combo off: a head's attack landing, or an enemy standing in a Mist cloud.
      when: z.enum(COMBO_TRIGGERS),
      // All listed conditions must hold. Leave one out to not care about it.
      conditions: section({
        attackTag: z.string().min(1).optional(),
        enemyHasStatus: z.string().min(1).optional(),
        enemyInMist: z.boolean().optional(),
        enemyCarriesFire: z.boolean().optional(),
        // false = only while the enemy's armor is still whole (so an armor-breaking combo lands once per enemy).
        enemyArmorBroken: z.boolean().optional(),
      }),
      effects: z.array(comboEffectSchema).min(1),
    }),
  ),
}).superRefine((data, ctx) => {
  const known = Object.keys(data.statuses);
  const check = (id: string | undefined, path: Array<string | number>) => {
    if (id !== undefined && !known.includes(id)) ctx.addIssue({ code: 'custom', path, message: `unknown status "${id}"; known: ${known.join(', ')}` });
  };
  check(data.mistCloud.appliesStatus, ['mistCloud', 'appliesStatus']);
  const ids = new Set<string>();
  data.combos.forEach((combo, c) => {
    if (ids.has(combo.id)) ctx.addIssue({ code: 'custom', path: ['combos', c, 'id'], message: `combo id "${combo.id}" is used twice` });
    ids.add(combo.id);
    check(combo.conditions.enemyHasStatus, ['combos', c, 'conditions', 'enemyHasStatus']);
    if (combo.when === 'enemyInMist' && combo.conditions.attackTag !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['combos', c, 'conditions', 'attackTag'], message: 'attackTag only works with "when": "headHitsEnemy"' });
    }
    combo.effects.forEach((effect, e) => {
      if (effect.type === 'removeStatus') check(effect.status, ['combos', c, 'effects', e, 'status']);
    });
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
  alwaysOpen: z.boolean().optional(),
  // A rare place: a world has it with this chance (0–1).
  rareChance: share.optional(),
}).superRefine((t, ctx) => {
  const ways = [t.hidden === true, t.dig !== undefined, t.open !== undefined, t.alwaysOpen === true].filter(Boolean).length;
  if (ways !== 1) ctx.addIssue({ code: 'custom', path: [], message: 'a threshold needs exactly one of: "hidden": true, "dig", "open", "alwaysOpen": true' });
  if (t.hidden && t.hint === undefined) ctx.addIssue({ code: 'custom', path: ['hint'], message: 'a hidden threshold needs a hint (what gives it away)' });
});

const named = { name: z.string().min(1), text: z.string().min(1) };

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
    wetYear: section({ ...named, waterShareBonus: share, moistureMultiplier: z.number().positive() }),
    myceliumBloom: section({ ...named, extraFungalPatches: intRange(0), fungalBiome: z.string().min(1) }),
    oldWorkings: section({ ...named, extraEncounters: z.number().int().min(0) }),
  }),
}).superRefine((world, ctx) => {
  // The generator relies on these.
  const needed = { draughtCrack: 'hidden', cinderScar: 'alwaysOpen', oldWorkings: 'alwaysOpen' } as const;
  for (const [id, way] of Object.entries(needed)) {
    const t = world.thresholds[id];
    if (!t) ctx.addIssue({ code: 'custom', path: ['thresholds'], message: `needs the threshold "${id}" (the generator places it)` });
    else if (t[way] !== true) ctx.addIssue({ code: 'custom', path: ['thresholds', id], message: `must have "${way}": true` });
  }
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
        pressToStart: z.string().min(1),
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
    }),
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
    }),
    gameOver: section({
      title: z.string().min(1),
      body: z.string(),
      newRunButton: z.string().min(1),
    }),
  })
  .strict();

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
