// Picks the values the strategic-map simulation needs out of the data files.

import type { BiomeSettings, PlaceSettings, UndergroundGeneratorSettings } from '../sim/map';
import type { LineageRules } from '../sim/lineage';
import type { EventOutcome, OrderGroupRules, OrderRules, PlaceAction, RunRules, StoryRules } from '../sim/turn';
import { experienceRulesFrom } from './battleRules';
import type { GameData } from './index';
import type { Balance, EventsData, OrderData } from './schemas';

type OutcomeData = NonNullable<EventsData['events'][number]['choices'][number]['outcome']>;

/** `{ "remains": 40, "shrine": 20 }` → `[{ id: "remains", weight: 40 }, ...]`, leaving out weights of 0. */
function weighted<T extends string>(weights: Partial<Record<T, number>>): Array<{ id: T; weight: number }> {
  return (Object.entries(weights) as Array<[T, number | undefined]>).filter(([, w]) => (w ?? 0) > 0).map(([id, weight]) => ({ id, weight: weight! }));
}

export function generatorSettingsFrom(data: GameData): UndergroundGeneratorSettings {
  const { balance, enemies, biomes, world } = data;
  const gen = balance.undergroundGenerator;
  const biome = (id: string): BiomeSettings => {
    const b = biomes.biomes[id]!;
    return { id, ground: b.ground, encounterDensity: b.encounterDensity ?? 1 };
  };
  const groupsByTier: Record<number, Array<{ id: string; weight: number }>> = {};
  // Groups only the Order brings (orderOnly) never wait on the map.
  for (const g of enemies.encounterGroups) if (!g.orderOnly) (groupsByTier[g.tier] ??= []).push({ id: g.id, weight: g.weight });
  const places: PlaceSettings[] = [
    ...Object.entries(world.places).map(([id, p]) => ({
      id,
      type: p.type,
      biome: p.biome ?? null,
      chance: p.chance ?? 0,
      where: p.where ?? 'chamber',
      ring: p.ring ?? null,
      carries: (p.actions ?? []).some((a) => a.carry === true),
    })),
    // A threshold that is also a rare place (the Cinder Scar).
    ...Object.entries(world.thresholds)
      .filter(([, t]) => t.rareChance !== undefined)
      .map(([id, t]) => ({ id, type: 'rare' as const, biome: null, chance: t.rareChance!, where: 'threshold' as const, ring: null, carries: false })),
  ];
  const { wetYear, myceliumBloom, oldWorkings } = world.runModifiers;
  return {
    radius: balance.map.undergroundRadius,
    lairBiome: biome(biomes.lairBiome),
    biomes: Object.fromEntries(Object.keys(biomes.biomes).map((id) => [id, biome(id)])),
    lairRadius: gen.lairRadius,
    lairExits: gen.lairExits,
    ringCenterOffset: gen.ringCenterOffset,
    edgeWobble: gen.edgeWobble,
    minRingWidth: gen.minRingWidth,
    bandThickness: gen.bandThickness,
    chamberSpacing: gen.chamberSpacing,
    corridors: { narrowShare: gen.corridors.narrowShare, extraLinkShare: gen.corridors.extraLinkShare, winding: gen.corridors.winding },
    deadEndSpur: gen.deadEndSpur,
    deadEndPocket: gen.deadEndPocket,
    thresholdSpacing: gen.thresholdSpacing,
    extraThresholds: Object.entries(world.thresholds).flatMap(([id, t]) => (t.oneOnBorder !== undefined ? [{ kind: id, border: t.oneOnBorder, chance: t.chance ?? 1 }] : [])),
    digTurns: Object.fromEntries(Object.entries(world.thresholds).flatMap(([id, t]) => (t.dig ? [[id, t.dig.turns]] : []))),
    encounterSpacing: gen.encounterSpacing,
    encounterMinDistanceFromLair: gen.encounterMinDistanceFromLair,
    passages: { firstRing: gen.passages.firstRing, secondRings: gen.passages.secondRings },
    rings: gen.rings.map((r) => ({
      outerEdge: r.outerEdge,
      mainBiomes: r.mainBiomes,
      mainBiomeShare: r.mainBiomeShare,
      patches: r.patches,
      patchBiomes: weighted(r.patchBiomes),
      chambers: r.chambers,
      chamberSize: r.chamberSize,
      deadEnds: r.deadEnds,
      deadEndContents: weighted(r.deadEndContents),
      minShrines: r.minShrines,
      encounters: r.encounters,
      encounterTier: r.encounterTier,
      muckDeposits: r.muckDeposits,
      moistureSources: r.moistureSources,
      eventSites: r.eventSites,
      thresholds: r.thresholds && { count: r.thresholds.count, kinds: weighted(r.thresholds.kinds) },
    })),
    shrineBlessingIds: data.shrines.blessings.map((b) => b.id),
    groupsByTier,
    resources: {
      muckPerDeposit: balance.resources.muckPerDeposit,
      moisturePerSource: balance.resources.moisturePerSource,
      richMultiplier: balance.resources.richDepositMultiplier,
    },
    places,
    locationsPerBiome: gen.locationsPerBiome,
    maxRarePlaces: gen.maxRarePlaces,
    undertowLength: gen.undertowLength,
    patchFinds: world.patchFinds,
    remainsLines: Object.fromEntries(Object.entries(world.remains.lines).map(([pool, lines]) => [pool, lines.length])),
    remainsLoot: world.remains.loot,
    hoardLoot: world.guardedHoard.loot,
    // Places the world remembers and run modifiers are given per run; see createRun.
    placesSeen: [],
    seenRarePlaceChance: gen.seenRarePlaceChance,
    modifiers: [],
    modifierRules: {
      wetYear: { waterShareBonus: wetYear.waterShareBonus, moistureMultiplier: wetYear.moistureMultiplier },
      myceliumBloom: { extraFungalPatches: myceliumBloom.extraFungalPatches, fungalBiome: myceliumBloom.fungalBiome },
      oldWorkings: { extraEncounters: oldWorkings.extraEncounters },
    },
  };
}

export function runRulesFrom(data: GameData): RunRules {
  const { balance, heads, enemies, world } = data;
  const { map, terrain, resources, alert } = balance;
  const terrainRule = (t: Balance['terrain']['water']) => ({ moveCost: t.moveCost, blocksSight: t.blocksSight });
  return {
    movementPointsPerTurn: map.movementPointsPerTurn,
    sightRangeHexes: map.sightRangeHexes,
    landmarkSightRange: map.landmarkSightRange,
    echoRange: map.echoRange,
    terrain: { water: terrainRule(terrain.water), mud: terrainRule(terrain.mud), roots: terrainRule(terrain.roots), salt: terrainRule(terrain.salt), rock: terrainRule(terrain.rock) },
    alertMin: alert.min,
    alertMax: alert.max,
    alertPerHexDiscovered: alert.perHexDiscovered,
    alertPerBattle: alert.perBattle,
    generator: generatorSettingsFrom(data),
    bodyMaxHp: balance.battle.bodyMaxHp,
    startingHeads: heads.startingHeads.map((classId) => ({ classId, maxHp: heads.classes[classId]!.maxHp })),
    hatchlingClasses: heads.hatchlingClassPool.map((classId) => ({ classId, maxHp: heads.classes[classId]!.maxHp })),
    maxHeads: heads.maxHeads,
    bonesPerEnemy: resources.bonesPerEnemy,
    blessings: Object.fromEntries(data.shrines.blessings.map((b) => [b.id, b.effects])),
    headNames: heads.names,
    healing: { bodyHpPerTurn: balance.healing.bodyHpPerTurn, headHpPerTurn: balance.healing.headHpPerTurn },
    encounterGroupMembers: Object.fromEntries(enemies.encounterGroups.map((g) => [g.id, g.members])),
    encounterGroupTiers: Object.fromEntries(enemies.encounterGroups.map((g) => [g.id, g.tier])),
    thresholds: Object.fromEntries(
      Object.entries(world.thresholds).map(([id, t]) => [
        id,
        {
          hidden: t.hidden === true,
          dug: t.dig !== undefined,
          headClass: t.open?.headClass ?? null,
          sealed: t.sealed ? { ways: t.sealed.ways.map((w) => ({ flag: w.flag })), setFlags: t.sealed.setFlags ?? [], dialogue: t.sealed.dialogue ?? null } : null,
        },
      ]),
    ),
    mutations: Object.fromEntries(data.mutations.mutations.map((m) => [m.id, m.effects])),
    bossMutations: data.mutations.mutations.filter((m) => m.bossOnly).map((m) => m.id),
    marks: { chance: data.shrines.marks.chance, rings: data.shrines.marks.rings },
    bore: Object.entries(world.thresholds)
      .filter(([, t]) => t.bore !== undefined)
      .map(([id, t]) => ({ thresholdId: id, ...t.bore! }))[0] ?? null,
    places: Object.fromEntries(
      Object.entries(world.places).map(([id, p]) => [
        id,
        {
          landmark: p.type === 'landmark',
          actions: (p.actions ?? []).map(
            (a): PlaceAction => ({
              id: a.id,
              movementCost: a.movementCost ?? 0,
              headClass: a.headClass ?? null,
              once: a.once === true,
              cooldownTurns: a.cooldownTurns ?? 0,
              gain: a.gain ?? {},
              condition: a.condition ?? null,
              carry: a.carry === true,
              revealHiddenThreshold: a.revealHiddenThreshold === true,
            }),
          ),
          silencesBattlesWithin: p.silencesBattlesWithin ?? null,
        },
      ]),
    ),
    conditions: Object.fromEntries(Object.entries(world.conditions).map(([id, c]) => [id, { movement: c.movement ?? 0, revealsEncounters: c.revealsEncounters === true }])),
    headMaxHp: Object.fromEntries(Object.entries(heads.classes).map(([id, c]) => [id, c.maxHp])),
    story: storyRulesFrom(data),
    order: orderRulesFrom(data.order),
    brood: {
      startingEggs: data.brood.startingEggs,
      maxEggs: data.brood.maxEggs,
      eggCost: { bones: data.brood.eggCost.bones, muck: data.brood.eggCost.muck, moisture: data.brood.eggCost.moisture ?? 0 },
      hatchTurns: data.brood.hatchTurns,
      inheritedShare: data.lineage.inheritedShare,
      scouts: { movement: data.brood.scouts.movement, sight: data.brood.scouts.sight },
      lostDefenseBreaksShare: data.brood.lostDefense.eggsBrokenShare,
    },
    experience: experienceRulesFrom(data),
  };
}

/** How the Order reacts to the Alert and walks the underground, with every field filled in. */
export function orderRulesFrom(order: OrderData): OrderRules {
  const groups = (list: OrderData['patrols']['groups']): OrderGroupRules[] =>
    list.map((g) => ({ groupId: g.group, weight: g.weight, minRing: g.minRing ?? 0, fromStage: g.fromStage ?? null }));
  const { patrols, messengers, expeditions, greatBurning } = order;
  return {
    stages: order.alertStages.map((s) => ({ id: s.id, at: s.at })),
    alertPerTurn: order.alertPerTurn,
    patrols: {
      firstOnTurn: patrols.firstOnTurn,
      maxByStage: patrols.maxByStage,
      everyTurnsByStage: patrols.everyTurnsByStage,
      actMaxBonus: patrols.actMaxBonus,
      movement: patrols.movement,
      sight: patrols.sight,
      chaseTurns: patrols.chaseTurns,
      groups: groups(patrols.groups),
    },
    messengers: { headStart: messengers.headStart, movement: messengers.movement, alertOnArrival: messengers.alertOnArrival, alertWhenEaten: messengers.alertWhenEaten, bones: messengers.bones, eatenLines: messengers.eatenLines.length },
    expeditions: { fromStage: expeditions.fromStage, firstAfterTurns: expeditions.firstAfterTurns, everyTurns: expeditions.everyTurns, movement: expeditions.movement, groups: groups(expeditions.groups) },
    greatBurning: { atStage: greatBurning.atStage, movement: greatBurning.movement, groupId: greatBurning.group, mutations: greatBurning.mutations },
    tithePercent: order.tithe.percent,
    siege: { perTurn: order.siege.perTurn },
  };
}

/** Dialogues and events with every field filled in (a missing field means "nothing" or "no limit"). */
export function storyRulesFrom(data: GameData): StoryRules {
  const { dialogues, events } = data;
  const lines = (list: ReadonlyArray<{ speaker: string; text: string }> | undefined) => (list ?? []).map((l) => ({ speaker: l.speaker, text: l.text }));
  const outcome = (o: OutcomeData): EventOutcome => ({
    text: o.text,
    loot: { muck: o.muck ?? 0, moisture: o.moisture ?? 0, bones: o.bones ?? 0 },
    alert: o.alert ?? 0,
    bodyHp: o.bodyHp ?? 0,
    headsHp: o.headsHp ?? 0,
    condition: o.condition ?? null,
    reveal: o.reveal ?? 0,
    battle: o.battle ?? null,
    setFlags: o.setFlags ?? [],
    dialogue: o.dialogue ?? null,
    newHead: o.newHead ?? null,
    bore: o.bore === true,
    mutation: o.mutation ?? null,
  });
  return {
    speakerNames: dialogues.speakers,
    serpentVoice: dialogues.serpentVoice,
    ancestorVoiceChance: data.lineage.ancestorVoice.chance,
    dialogueIds: new Set(dialogues.dialogues.map((d) => d.id)),
    mutationNames: Object.fromEntries(data.mutations.mutations.map((m) => [m.id, m.name])),
    dialogues: dialogues.dialogues.map((d) => ({
      id: d.id,
      trigger: d.trigger,
      priority: d.priority ?? 0,
      once: d.once ?? true,
      conditions: d.conditions ?? {},
      lines: lines(d.lines),
      setFlags: d.setFlags ?? [],
      choices: (d.choices ?? []).map((c) => ({ text: c.text, setFlags: c.setFlags ?? [], reply: lines(c.reply) })),
    })),
    events: events.events.map((e) => ({
      id: e.id,
      title: e.title,
      quest: e.quest ?? null,
      text: e.text,
      priority: e.priority ?? 0,
      weight: e.weight ?? 1,
      once: e.once ?? true,
      conditions: e.conditions ?? {},
      choices: e.choices.map((c) => ({
        text: c.text,
        needsHead: c.needsHead ?? null,
        needsCondition: c.needsCondition ?? null,
        cost: { muck: c.cost?.muck ?? 0, moisture: c.cost?.moisture ?? 0, bones: c.cost?.bones ?? 0 },
        chance: c.chance ?? null,
        success: outcome((c.outcome ?? c.success)!),
        failure: c.failure ? outcome(c.failure) : null,
      })),
    })),
    biomeNames: Object.fromEntries(Object.entries(data.biomes.biomes).map(([id, b]) => [id, b.displayName])),
    headClassNames: Object.fromEntries(Object.entries(data.heads.classes).map(([id, c]) => [id, c.displayName])),
  };
}

/** Names, inheritance, epitaphs, how long each flag is remembered and what the account can unlock (GAME_DESIGN.md §12). */
export function lineageRulesFrom(data: GameData): LineageRules {
  const { lineage, world } = data;
  return {
    names: lineage.names,
    takeAncestorName: lineage.takeAncestorName,
    epitaphs: { byEnemy: lineage.epitaphs.byEnemy, any: lineage.epitaphs.any, ended: lineage.epitaphs.ended },
    flagScopes: Object.fromEntries(Object.entries(data.flags.flags).map(([id, f]) => [id, f.scope])),
    biomeNames: Object.fromEntries(Object.entries(data.biomes.biomes).map(([id, b]) => [id, b.displayName])),
    dialogueIds: new Set(data.dialogues.dialogues.map((d) => d.id)),
    unlocks: Object.entries(world.runModifiers).flatMap(([id, m]) => {
      if (typeof m === 'string') return []; // the "//" note
      const { text: _text, '//': _note, ...challenge } = m.unlock;
      return [{ id, challenge }];
    }),
    normalYearWeight: world.modifierDraw.normalYearWeight,
  };
}
