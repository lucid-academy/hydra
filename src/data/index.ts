// All data files, validated once at startup. Import game data from here, not from the JSON files directly.

import balanceJson from './balance.json';
import paletteJson from './palette.json';
import textJson from './text.json';
import headsJson from './heads.json';
import enemiesJson from './enemies.json';
import combosJson from './combos.json';
import biomesJson from './biomes.json';
import shrinesJson from './shrines.json';
import worldJson from './world.json';
import dialoguesJson from './dialogues.json';
import eventsJson from './events.json';
import mutationsJson from './mutations.json';
import lineageJson from './lineage.json';
import flagsJson from './flags.json';
import orderJson from './order.json';
import broodJson from './brood.json';
import surfaceJson from './surface.json';
import manifestJson from '../assets/manifest.json';
import { battleProblems } from './battleChecks';
import { balanceSchema, biomesSchema, broodSchema, combosSchema, dialoguesSchema, eventsSchema, flagsSchema, lineageSchema, mutationsSchema, orderSchema, shrinesSchema, enemiesSchema, headsSchema, manifestSchema, paletteSchema, surfaceSchema, textSchema, worldSchema } from './schemas';
import type {
  AssetManifest,
  Balance,
  StoryConditionsData,
  BiomesData,
  BroodData,
  CombosData,
  DialoguesData,
  EventsData,
  FlagsData,
  LineageData,
  MutationsData,
  OrderData,
  ShrinesData,
  SurfaceData,
  EnemiesData,
  GameText,
  HeadsData,
  Palette,
  WorldData,
} from './schemas';
import { DataError, validateData } from './validate';

export interface GameData {
  balance: Balance;
  palette: Palette;
  text: GameText;
  manifest: AssetManifest;
  heads: HeadsData;
  enemies: EnemiesData;
  combos: CombosData;
  biomes: BiomesData;
  shrines: ShrinesData;
  world: WorldData;
  dialogues: DialoguesData;
  events: EventsData;
  mutations: MutationsData;
  lineage: LineageData;
  flags: FlagsData;
  order: OrderData;
  brood: BroodData;
  surface: SurfaceData;
}

export function loadGameData(): GameData {
  const data: GameData = {
    balance: validateData('src/data/balance.json', balanceSchema, balanceJson),
    palette: validateData('src/data/palette.json', paletteSchema, paletteJson),
    text: validateData('src/data/text.json', textSchema, textJson),
    manifest: validateData('src/assets/manifest.json', manifestSchema, manifestJson),
    heads: validateData('src/data/heads.json', headsSchema, headsJson),
    enemies: validateData('src/data/enemies.json', enemiesSchema, enemiesJson),
    combos: validateData('src/data/combos.json', combosSchema, combosJson),
    biomes: validateData('src/data/biomes.json', biomesSchema, biomesJson),
    shrines: validateData('src/data/shrines.json', shrinesSchema, shrinesJson),
    world: validateData('src/data/world.json', worldSchema, worldJson),
    dialogues: validateData('src/data/dialogues.json', dialoguesSchema, dialoguesJson),
    events: validateData('src/data/events.json', eventsSchema, eventsJson),
    mutations: validateData('src/data/mutations.json', mutationsSchema, mutationsJson),
    lineage: validateData('src/data/lineage.json', lineageSchema, lineageJson),
    flags: validateData('src/data/flags.json', flagsSchema, flagsJson),
    order: validateData('src/data/order.json', orderSchema, orderJson),
    brood: validateData('src/data/brood.json', broodSchema, broodJson),
    surface: validateData('src/data/surface.json', surfaceSchema, surfaceJson),
  };
  checkCrossReferences(data);
  return data;
}

/** Names that one data file borrows from another must exist there. */
export function checkCrossReferences(
  data: Pick<GameData, 'heads' | 'combos'> &
    Partial<Pick<GameData, 'balance' | 'enemies' | 'biomes' | 'manifest' | 'world' | 'dialogues' | 'events' | 'mutations' | 'lineage' | 'flags' | 'shrines' | 'order' | 'surface'>>,
): void {
  const statuses = Object.keys(data.combos.statuses);
  const problems: string[] = [];
  for (const [id, cls] of Object.entries(data.heads.classes)) {
    const status = cls.attack.appliesStatus;
    if (status !== undefined && !statuses.includes(status)) {
      problems.push(`  - src/data/heads.json, classes.${id}.attack.appliesStatus: unknown status "${status}"; known (from combos.json): ${statuses.join(', ')}`);
    }
  }
  problems.push(...battleProblems(data.heads, data.combos, data.enemies));
  const tags = new Set([...Object.values(data.heads.classes).flatMap((cls) => cls.attack.tags), ...Object.values(data.heads.skills).flatMap((s) => s.tags ?? [])]);
  data.combos.combos.forEach((combo, c) => {
    const tag = combo.conditions.attackTag;
    if (tag !== undefined && !tags.has(tag)) {
      problems.push(`  - src/data/combos.json, combos.${c}.conditions.attackTag: no head attack or skill has the tag "${tag}"; known (from heads.json): ${[...tags].join(', ')}`);
    }
  });
  if (data.balance && data.enemies) {
    // Every ring's tier of encounters needs groups of enemies, and every group should be met somewhere.
    const tiers = new Set(data.balance.undergroundGenerator.rings.map((r) => r.encounterTier));
    data.balance.undergroundGenerator.rings.forEach((ring, k) => {
      if (!data.enemies!.encounterGroups.some((g) => g.tier === ring.encounterTier)) {
        problems.push(`  - src/data/balance.json, undergroundGenerator.rings.${k}.encounterTier: no group in enemies.json has tier ${ring.encounterTier}`);
      }
    });
    for (const group of data.enemies.encounterGroups) {
      if (!tiers.has(group.tier)) problems.push(`  - src/data/enemies.json, encounterGroups ${group.id}: tier ${group.tier} is in no ring (balance.json undergroundGenerator.rings)`);
    }
  }
  if (data.balance && data.biomes && data.world) problems.push(...worldProblems(data.balance, data.biomes, data.world, data.heads));
  if (data.order && data.enemies && data.balance && data.mutations) problems.push(...orderProblems(data.order, data.enemies, data.balance, data.mutations));
  if (data.surface && data.order && data.enemies && data.mutations) problems.push(...surfaceProblems(data.surface, data.order, data.enemies, data.mutations, data.heads));
  if (data.surface && data.manifest) {
    // The surface's buildings and finds need their map images.
    const keys = ['map_castle', 'map_flame_shrine', 'map_flame_shrine_out', 'map_find', 'map_relight', ...['camp', ...data.surface.generator.settlements.map((p) => p.id)].map((id) => `map_settlement_${id}`)];
    const missing = keys.filter((key) => !(key in data.manifest!.images));
    if (missing.length > 0) problems.push(`  - src/assets/manifest.json: surface.json needs these images (use "file": null for a placeholder): ${missing.join(', ')}`);
  }
  if (data.biomes && data.manifest) {
    // Every biome needs its map images (with "file": null the game draws a placeholder from the biome's colours).
    for (const [id, biome] of Object.entries(data.biomes.biomes)) {
      const keys = [
        `map_rock_${id}`,
        ...Object.keys(biome.ground).map((g) => `map_ground_${id}_${g}`),
        ...biome.decorations.map((k) => `map_deco_${k}`),
        `battle_tile_${id}_ground`,
        `battle_tile_${id}_water`,
      ];
      const missing = keys.filter((key) => !(key in data.manifest!.images));
      if (missing.length > 0) problems.push(`  - src/assets/manifest.json: biome ${id} needs these images (use "file": null for a placeholder): ${missing.join(', ')}`);
    }
  }
  if (data.world && data.manifest) {
    // Every threshold and place needs its map image.
    const keys = [
      // A threshold that is closed until opened shows map_threshold_<id>, and every threshold once open map_threshold_<id>_open.
      ...Object.entries(data.world.thresholds).flatMap(([id, t]) => [...(t.dig || t.open || t.sealed ? [`map_threshold_${id}`] : []), `map_threshold_${id}_open`]),
      ...Object.keys(data.world.places).map((id) => `map_place_${id}`),
      'map_remains',
      'map_hoard',
      'map_muck_rich',
      'map_moisture_rich',
      'map_draught',
      'map_echo',
    ];
    const missing = keys.filter((key) => !(key in data.manifest!.images));
    if (missing.length > 0) problems.push(`  - src/assets/manifest.json: world.json needs these images (use "file": null for a placeholder): ${missing.join(', ')}`);
  }
  if (data.dialogues && data.events && data.biomes && data.enemies && data.world) problems.push(...storyProblems(data as GameData));
  if (data.dialogues && data.events && data.world && data.mutations && data.lineage && data.flags && data.enemies && data.shrines && data.balance) {
    problems.push(...generationProblems(data as GameData));
  }
  if (problems.length > 0) throw new DataError(`Data files don't match each other:\n${problems.join('\n')}`);
}

/** Dialogues and events (dialogues.json, events.json) must name heads, biomes, groups, conditions and dialogues that exist. */
function storyProblems(data: GameData): string[] {
  const problems: string[] = [];
  const where = (file: string, path: string, message: string) => problems.push(`  - src/data/${file}, ${path}: ${message}`);
  const classes = Object.keys(data.heads.classes);
  const biomes = Object.keys(data.biomes.biomes);
  const enemyTypes = Object.keys(data.enemies.types);
  const groups = data.enemies.encounterGroups.map((g) => g.id);
  const dialogueIds = data.dialogues.dialogues.map((d) => d.id);
  const known = (list: readonly string[]) => `known: ${list.join(', ')}`;
  const checkConditions = (file: string, path: string, c: StoryConditionsData | undefined) => {
    for (const id of c?.biomes ?? []) if (!biomes.includes(id)) where(file, `${path}.biomes`, `unknown biome "${id}"; ${known(biomes)}`);
    for (const id of c?.headClasses ?? []) if (!classes.includes(id)) where(file, `${path}.headClasses`, `unknown head class "${id}"; ${known(classes)}`);
    for (const id of c?.newEnemyTypes ?? []) if (!enemyTypes.includes(id)) where(file, `${path}.newEnemyTypes`, `unknown enemy type "${id}"; ${known(enemyTypes)}`);
  };
  const checkSpeaker = (path: string, speaker: string) => {
    const role = speaker.replace(/^head:/, '');
    if (speaker.startsWith('head:') && !['any', 'other', 'new', ...classes].includes(role)) where('dialogues.json', path, `unknown speaker "${speaker}"; heads are head:any, head:other, head:new or head:<class> (${known(classes)})`);
  };
  data.dialogues.dialogues.forEach((d, i) => {
    const path = `dialogues.${i} (${d.id})`;
    if (dialogueIds.indexOf(d.id) !== i) where('dialogues.json', path, `the id "${d.id}" is used twice`);
    checkConditions('dialogues.json', `${path}.conditions`, d.conditions);
    d.lines.forEach((l, j) => checkSpeaker(`${path}.lines.${j}`, l.speaker));
    (d.choices ?? []).forEach((c, j) => (c.reply ?? []).forEach((l, k) => checkSpeaker(`${path}.choices.${j}.reply.${k}`, l.speaker)));
  });
  const eventIds = data.events.events.map((e) => e.id);
  data.events.events.forEach((e, i) => {
    const path = `events.${i} (${e.id})`;
    if (eventIds.indexOf(e.id) !== i) where('events.json', path, `the id "${e.id}" is used twice`);
    checkConditions('events.json', `${path}.conditions`, e.conditions);
    e.choices.forEach((c, j) => {
      if (c.needsHead && !classes.includes(c.needsHead)) where('events.json', `${path}.choices.${j}.needsHead`, `unknown head class "${c.needsHead}"; ${known(classes)}`);
      if (c.needsCondition && !data.world.conditions[c.needsCondition]) where('events.json', `${path}.choices.${j}.needsCondition`, `unknown condition "${c.needsCondition}"; ${known(Object.keys(data.world.conditions))}`);
      for (const [name, o] of [['outcome', c.outcome], ['success', c.success], ['failure', c.failure]] as const) {
        if (!o) continue;
        const at = `${path}.choices.${j}.${name}`;
        if (o.battle && !groups.includes(o.battle)) where('events.json', `${at}.battle`, `unknown enemy group "${o.battle}"; ${known(groups)}`);
        if (o.dialogue && !dialogueIds.includes(o.dialogue)) where('events.json', `${at}.dialogue`, `unknown dialogue "${o.dialogue}" (dialogues.json)`);
        if (o.condition && !data.world.conditions[o.condition.id]) where('events.json', `${at}.condition`, `unknown condition "${o.condition.id}"; ${known(Object.keys(data.world.conditions))}`);
        if (o.newHead && !classes.includes(o.newHead)) where('events.json', `${at}.newHead`, `unknown head class "${o.newHead}"; ${known(classes)}`);
        if (o.bore && !Object.values(data.world.thresholds).some((t) => t.bore)) where('events.json', `${at}.bore`, 'no threshold in world.json has "bore" (how the tunnel is melted)');
      }
    });
  });
  for (const [id, t] of Object.entries(data.world.thresholds)) {
    const said = t.sealed?.dialogue;
    if (said && !dialogueIds.includes(said)) where('world.json', `thresholds.${id}.sealed.dialogue`, `unknown dialogue "${said}" (dialogues.json)`);
  }
  return problems;
}

/**
 * Generations (M6): every flag must be listed in flags.json, mutations and enemy types must exist, a step of a mini quest
 * must not come again once its flags are known, and dialogue and event ids must differ (a lineage remembers dialogues).
 */
function generationProblems(data: GameData): string[] {
  const problems: string[] = [];
  const where = (file: string, path: string, message: string) => problems.push(`  - src/data/${file}, ${path}: ${message}`);
  const flags = Object.keys(data.flags.flags);
  const mutations = data.mutations.mutations.map((m) => m.id);
  const enemyTypes = Object.keys(data.enemies.types);
  const checkFlags = (file: string, path: string, list: readonly string[] | undefined) => {
    for (const flag of list ?? []) if (!flags.includes(flag)) where(file, path, `the flag "${flag}" is not listed in flags.json (add it there, with its scope)`);
  };
  const checkConditions = (file: string, path: string, c: StoryConditionsData | undefined) => {
    checkFlags(file, `${path}.flags`, c?.flags);
    checkFlags(file, `${path}.notFlags`, c?.notFlags);
    for (const id of c?.mutations ?? []) if (!mutations.includes(id)) where(file, `${path}.mutations`, `unknown mutation "${id}" (mutations.json)`);
    for (const id of c?.motherKilledBy ?? []) if (!enemyTypes.includes(id)) where(file, `${path}.motherKilledBy`, `unknown enemy type "${id}" (enemies.json)`);
  };
  data.dialogues.dialogues.forEach((d, i) => {
    const path = `dialogues.${i} (${d.id})`;
    checkConditions('dialogues.json', `${path}.conditions`, d.conditions);
    checkFlags('dialogues.json', `${path}.setFlags`, d.setFlags);
    (d.choices ?? []).forEach((c, j) => checkFlags('dialogues.json', `${path}.choices.${j}.setFlags`, c.setFlags));
  });
  const dialogueIds = new Set(data.dialogues.dialogues.map((d) => d.id));
  data.events.events.forEach((e, i) => {
    const path = `events.${i} (${e.id})`;
    if (dialogueIds.has(e.id)) where('events.json', path, `"${e.id}" is also the id of a dialogue; give one of them another id`);
    checkConditions('events.json', `${path}.conditions`, e.conditions);
    e.choices.forEach((c, j) => {
      for (const [name, o] of [['outcome', c.outcome], ['success', c.success], ['failure', c.failure]] as const) {
        if (!o) continue;
        checkFlags('events.json', `${path}.choices.${j}.${name}.setFlags`, o.setFlags);
        if (o.mutation && !mutations.includes(o.mutation)) where('events.json', `${path}.choices.${j}.${name}.mutation`, `unknown mutation "${o.mutation}" (mutations.json)`);
        // A quest's flags are remembered by the next generations: a step done once must not come again.
        const set = o.setFlags ?? [];
        if (e.quest && set.length > 0 && !set.some((f) => e.conditions?.notFlags?.includes(f))) {
          where('events.json', `${path}.conditions.notFlags`, `a step of a mini quest needs one of the flags it sets (${set.join(', ')}) in notFlags, or it comes again in the next generation`);
        }
      }
    });
  });
  for (const [id, t] of Object.entries(data.world.thresholds)) {
    if (!t.sealed) continue;
    t.sealed.ways.forEach((w, j) => checkFlags('world.json', `thresholds.${id}.sealed.ways.${j}.flag`, [w.flag]));
    checkFlags('world.json', `thresholds.${id}.sealed.setFlags`, t.sealed.setFlags);
  }
  for (const id of Object.keys(data.lineage.epitaphs.byEnemy)) if (!enemyTypes.includes(id)) where('lineage.json', `epitaphs.byEnemy.${id}`, `unknown enemy type "${id}" (enemies.json)`);
  const rings = data.balance.undergroundGenerator.rings.length;
  for (const k of data.shrines.marks.rings) if (k > rings) where('shrines.json', 'marks.rings', `there is no ring ${k} (rings: ${rings})`);
  for (const [id, m] of Object.entries(data.world.runModifiers)) {
    if (typeof m === 'string') continue;
    if (m.unlock.flag !== undefined) checkFlags('world.json', `runModifiers.${id}.unlock.flag`, [m.unlock.flag]);
    if (m.unlock.reachRing !== undefined && m.unlock.reachRing > rings) where('world.json', `runModifiers.${id}.unlock.reachRing`, `there is no ring ${m.unlock.reachRing} (rings: ${rings})`);
  }
  return problems;
}

/** The Order (order.json) sends groups that exist in enemies.json, at Alert stages it names. */
function orderProblems(order: OrderData, enemies: EnemiesData, balance: Balance, mutations: MutationsData): string[] {
  const problems: string[] = [];
  const where = (path: string, message: string) => problems.push(`  - src/data/order.json, ${path}: ${message}`);
  const groups = enemies.encounterGroups.map((g) => g.id);
  const stages = order.alertStages.map((s) => s.id);
  const rings = balance.undergroundGenerator.rings.length;
  const checkGroup = (path: string, id: string) => {
    if (!groups.includes(id)) where(path, `unknown encounter group "${id}"; known (from enemies.json): ${groups.join(', ')}`);
  };
  const checkStage = (path: string, id: string) => {
    if (!stages.includes(id)) where(path, `unknown Alert stage "${id}"; known: ${stages.join(', ')}`);
  };
  for (const [name, list] of [['patrols.groups', order.patrols.groups], ['expeditions.groups', order.expeditions.groups]] as const) {
    list.forEach((g, i) => {
      checkGroup(`${name}.${i}.group`, g.group);
      if (g.fromStage !== undefined) checkStage(`${name}.${i}.fromStage`, g.fromStage);
      if (g.minRing !== undefined && g.minRing > rings) where(`${name}.${i}.minRing`, `there is no ring ${g.minRing} (rings: ${rings})`);
    });
  }
  if (!order.patrols.groups.some((g) => g.minRing === undefined && g.fromStage === undefined)) where('patrols.groups', 'needs at least one group without minRing and fromStage, so any entrance can send a patrol');
  for (const name of ['maxByStage', 'everyTurnsByStage'] as const) {
    if (order.patrols[name].length !== stages.length + 1) where(`patrols.${name}`, `needs ${stages.length + 1} numbers: one for no stage reached, then one for each of the ${stages.length} Alert stages`);
  }
  checkStage('expeditions.fromStage', order.expeditions.fromStage);
  checkStage('greatBurning.atStage', order.greatBurning.atStage);
  checkGroup('greatBurning.group', order.greatBurning.group);
  const mutationIds = mutations.mutations.map((m) => m.id);
  order.greatBurning.mutations.forEach((id, i) => {
    if (!mutationIds.includes(id)) where(`greatBurning.mutations.${i}`, `unknown mutation "${id}"; known (from mutations.json): ${mutationIds.join(', ')}`);
  });
  return problems;
}

/** The surface (surface.json) names groups, enemy types, Alert stages, mutations and head classes that exist. */
function surfaceProblems(surface: SurfaceData, order: OrderData, enemies: EnemiesData, mutations: MutationsData, heads: HeadsData): string[] {
  const problems: string[] = [];
  const where = (path: string, message: string) => problems.push(`  - src/data/surface.json, ${path}: ${message}`);
  const groups = enemies.encounterGroups.map((g) => g.id);
  const stages = order.alertStages.map((s) => s.id);
  const checkGroup = (path: string, id: string) => {
    if (!groups.includes(id)) where(path, `unknown encounter group "${id}"; known (from enemies.json): ${groups.join(', ')}`);
  };
  for (const [tier, list] of Object.entries(surface.generator.flameShrines.groupsByTier)) for (const id of Object.keys(list)) checkGroup(`generator.flameShrines.groupsByTier.${tier}`, id);
  checkGroup('flameShrines.relight.group', surface.flameShrines.relight.group);
  surface.order.patrols.groups.forEach((g, i) => {
    checkGroup(`order.patrols.groups.${i}.group`, g.group);
    if (g.fromStage !== undefined && !stages.includes(g.fromStage)) where(`order.patrols.groups.${i}.fromStage`, `unknown Alert stage "${g.fromStage}"; known (from order.json): ${stages.join(', ')}`);
    if (g.minRing !== undefined) where(`order.patrols.groups.${i}.minRing`, 'the surface has no rings');
  });
  if (!surface.order.patrols.groups.some((g) => g.fromStage === undefined)) where('order.patrols.groups', 'needs at least one group without fromStage');
  if (surface.order.patrols.maxByStage.length !== stages.length + 1) where('order.patrols.maxByStage', `needs ${stages.length + 1} numbers: one for no stage reached, then one for each of the ${stages.length} Alert stages`);
  if (!(surface.mist.censerType in enemies.types)) where('mist.censerType', `unknown enemy type "${surface.mist.censerType}" (enemies.json)`);
  const mutationIds = mutations.mutations.map((m) => m.id);
  surface.flameShrines.mutations.forEach((id, i) => {
    if (!mutationIds.includes(id)) where(`flameShrines.mutations.${i}`, `unknown mutation "${id}"; known (from mutations.json): ${mutationIds.join(', ')}`);
  });
  for (const id of Object.keys(surface.mist.exhale.radiusByClass)) if (!(id in heads.classes)) where('mist.exhale.radiusByClass', `unknown head class "${id}"; known: ${Object.keys(heads.classes).join(', ')}`);
  return problems;
}

/** The rings (balance.json) and the world's places and thresholds (world.json) must use biomes, kinds and head classes that exist. */
function worldProblems(balance: Balance, biomes: BiomesData, world: WorldData, heads: HeadsData): string[] {
  const problems: string[] = [];
  const gen = balance.undergroundGenerator;
  const ringBiomes = Object.keys(biomes.biomes).filter((id) => id !== biomes.lairBiome && id !== biomes.surfaceBiome);
  const where = (file: string, path: string, message: string) => problems.push(`  - src/data/${file}, ${path}: ${message}`);
  const checkBiome = (file: string, path: string, id: string) => {
    if (!ringBiomes.includes(id)) where(file, path, `unknown biome "${id}"; known (from biomes.json, the lair's swamp and the surface aside): ${ringBiomes.join(', ')}`);
  };
  gen.rings.forEach((ring, k) => {
    ring.mainBiomes.forEach((id, b) => checkBiome('balance.json', `undergroundGenerator.rings.${k}.mainBiomes.${b}`, id));
    for (const id of Object.keys(ring.patchBiomes)) checkBiome('balance.json', `undergroundGenerator.rings.${k}.patchBiomes`, id);
    for (const id of Object.keys(ring.thresholds?.kinds ?? {})) {
      const t = world.thresholds[id];
      if (!t) where('balance.json', `undergroundGenerator.rings.${k}.thresholds.kinds`, `unknown threshold "${id}"; known (from world.json): ${Object.keys(world.thresholds).join(', ')}`);
      else if (t.hidden || t.alwaysOpen) where('balance.json', `undergroundGenerator.rings.${k}.thresholds.kinds`, `"${id}" is placed by the generator itself; use thresholds that are dug or opened by a head`);
    }
  });
  for (const id of ringBiomes) {
    if (!gen.rings.some((r) => r.mainBiomes.includes(id))) where('balance.json', 'undergroundGenerator.rings', `biome "${id}" is the main biome of no ring`);
  }
  const ringCount = gen.rings.length;
  for (const k of [gen.passages.firstRing, ...gen.passages.secondRings]) {
    if (k > ringCount) where('balance.json', 'undergroundGenerator.passages', `there is no ring ${k} (rings: ${ringCount})`);
  }
  const classes = Object.keys(heads.classes);
  for (const [id, t] of Object.entries(world.thresholds)) {
    if (t.open && !classes.includes(t.open.headClass)) where('world.json', `thresholds.${id}.open.headClass`, `unknown head class "${t.open.headClass}"; known: ${classes.join(', ')}`);
    if (t.oneOnBorder !== undefined && t.oneOnBorder >= ringCount) where('world.json', `thresholds.${id}.oneOnBorder`, `there is no border ${t.oneOnBorder} (borders: 1 to ${ringCount - 1})`);
  }
  for (const [id, place] of Object.entries(world.places)) {
    if (place.biome !== undefined) checkBiome('world.json', `places.${id}.biome`, place.biome);
    if (place.ring !== undefined && place.ring > ringCount) where('world.json', `places.${id}.ring`, `there is no ring ${place.ring} (rings: ${ringCount})`);
    (place.actions ?? []).forEach((action, a) => {
      if (action.headClass && !classes.includes(action.headClass)) where('world.json', `places.${id}.actions.${a}.headClass`, `unknown head class "${action.headClass}"; known: ${classes.join(', ')}`);
    });
  }
  const landmarks = Object.values(world.places).filter((p) => p.type === 'landmark');
  for (const id of new Set(gen.rings.flatMap((r) => r.mainBiomes))) {
    if (landmarks.filter((p) => p.biome === id).length !== 1) where('world.json', 'places', `biome "${id}" is a main biome, so it needs exactly one landmark`);
  }
  for (const pool of Object.keys(world.remains.lines)) if (pool !== 'any') checkBiome('world.json', `remains.lines.${pool}`, pool);
  for (const id of Object.keys(world.patchFinds)) checkBiome('world.json', `patchFinds.${id}`, id);
  for (const id of Object.keys(world.echoes)) checkBiome('world.json', `echoes.${id}`, id);
  checkBiome('world.json', 'runModifiers.myceliumBloom.fungalBiome', world.runModifiers.myceliumBloom.fungalBiome);
  return problems;
}
