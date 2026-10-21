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
import manifestJson from '../assets/manifest.json';
import { balanceSchema, biomesSchema, combosSchema, dialoguesSchema, eventsSchema, shrinesSchema, enemiesSchema, headsSchema, manifestSchema, paletteSchema, textSchema, worldSchema } from './schemas';
import type { AssetManifest, Balance, StoryConditionsData, BiomesData, CombosData, DialoguesData, EventsData, ShrinesData, EnemiesData, GameText, HeadsData, Palette, WorldData } from './schemas';
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
  };
  checkCrossReferences(data);
  return data;
}

/** Names that one data file borrows from another must exist there. */
export function checkCrossReferences(
  data: Pick<GameData, 'heads' | 'combos'> & Partial<Pick<GameData, 'balance' | 'enemies' | 'biomes' | 'manifest' | 'world' | 'dialogues' | 'events'>>,
): void {
  const statuses = Object.keys(data.combos.statuses);
  const problems: string[] = [];
  for (const [id, cls] of Object.entries(data.heads.classes)) {
    const status = cls.attack.appliesStatus;
    if (status !== undefined && !statuses.includes(status)) {
      problems.push(`  - src/data/heads.json, classes.${id}.attack.appliesStatus: unknown status "${status}"; known (from combos.json): ${statuses.join(', ')}`);
    }
  }
  const tags = new Set(Object.values(data.heads.classes).flatMap((cls) => cls.attack.tags));
  data.combos.combos.forEach((combo, c) => {
    const tag = combo.conditions.attackTag;
    if (tag !== undefined && !tags.has(tag)) {
      problems.push(`  - src/data/combos.json, combos.${c}.conditions.attackTag: no head attack has the tag "${tag}"; known (from heads.json): ${[...tags].join(', ')}`);
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

/** The rings (balance.json) and the world's places and thresholds (world.json) must use biomes, kinds and head classes that exist. */
function worldProblems(balance: Balance, biomes: BiomesData, world: WorldData, heads: HeadsData): string[] {
  const problems: string[] = [];
  const gen = balance.undergroundGenerator;
  const ringBiomes = Object.keys(biomes.biomes).filter((id) => id !== biomes.lairBiome);
  const where = (file: string, path: string, message: string) => problems.push(`  - src/data/${file}, ${path}: ${message}`);
  const checkBiome = (file: string, path: string, id: string) => {
    if (!ringBiomes.includes(id)) where(file, path, `unknown biome "${id}"; known (from biomes.json, the lair's swamp aside): ${ringBiomes.join(', ')}`);
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
