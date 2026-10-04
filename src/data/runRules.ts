// Picks the values the strategic-map simulation needs out of the data files.

import type { BiomeSettings, PlaceSettings, UndergroundGeneratorSettings } from '../sim/map';
import type { PlaceAction, RunRules } from '../sim/turn';
import type { GameData } from './index';
import type { Balance } from './schemas';

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
  for (const g of enemies.encounterGroups) (groupsByTier[g.tier] ??= []).push({ id: g.id, weight: g.weight });
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
    // Run modifiers are picked per run (for now with ?modifiers=); see createRun.
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
    thresholds: Object.fromEntries(
      Object.entries(world.thresholds).map(([id, t]) => [id, { hidden: t.hidden === true, dug: t.dig !== undefined, headClass: t.open?.headClass ?? null }]),
    ),
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
  };
}
