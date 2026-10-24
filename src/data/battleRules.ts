// Converts heads.json, enemies.json and balance.json into the rules the battle simulation uses
// (seconds become ticks; distances are already in hexes), plus statuses and combos from combos.json.

import type { BattleRules, Effect, HeadExperienceRules, RummageFind, SkillArea, SkillRules, SkillSpecial } from '../sim/battle';
import type { EffectData, SkillSpecialData } from './battleSchemas';
import type { GameData } from './index';

/** Head experience and levels, used by both the battle (damage) and the map (experience, HP). */
export function experienceRulesFrom(data: GameData): HeadExperienceRules {
  const xp = data.heads.experience;
  return {
    perBattleWon: xp.perBattleWon,
    perKill: xp.perKill,
    experienceForLevel: xp.experienceForLevel,
    maxHpPercentPerLevel: xp.maxHpPercentPerLevel,
    damagePercentPerLevel: xp.damagePercentPerLevel,
  };
}

export function battleRulesFrom(data: GameData): BattleRules {
  const { balance, heads, enemies, combos, brood } = data;
  const tps = balance.battle.ticksPerSecond;
  const ticks = (seconds: number) => Math.max(1, Math.round(seconds * tps));
  const maybeTicks = (seconds: number | undefined) => (seconds === undefined ? null : ticks(seconds));

  const effect = (e: EffectData): Effect => {
    switch (e.type) {
      case 'damage':
        return { type: 'damage', amount: e.amount ?? 0, ofHit: e.ofHit ?? 0 };
      case 'status':
        return { type: 'status', status: e.status, ticks: maybeTicks(e.seconds) };
      case 'extendStatus':
        return { type: 'extendStatus', status: e.status, ticks: ticks(e.seconds) };
      case 'removeStatus':
        return { type: 'removeStatus', status: e.status };
      case 'breakArmor':
        return { type: 'breakArmor' };
      case 'acidifyMist':
        return { type: 'acidifyMist', damagePerSecond: e.damagePerSecond, ticks: ticks(e.seconds) };
      case 'putOutTorch':
        return { type: 'putOutTorch', ticks: ticks(e.seconds) };
      case 'devour':
        return { type: 'devour', healMultiplier: e.healMultiplier ?? 1 };
      case 'healBody':
        return { type: 'healBody', amount: e.amount };
      case 'splash':
        return { type: 'splash', amount: e.amount, radius: e.radius };
      case 'statusAround':
        return { type: 'statusAround', status: e.status, radius: e.radius, ticks: maybeTicks(e.seconds) };
      case 'statusInCloud':
        return { type: 'statusInCloud', status: e.status, ticks: maybeTicks(e.seconds) };
      case 'afterStatus':
        return { type: 'afterStatus', status: e.status, then: e.then, ticks: maybeTicks(e.seconds) };
      case 'knockback':
        return { type: 'knockback', hexes: e.hexes, collisionStatus: e.collisionStatus ?? null, collisionTicks: maybeTicks(e.collisionSeconds) };
      case 'pull':
        return { type: 'pull', hexes: e.hexes };
      case 'keepEntranced':
        return { type: 'keepEntranced' };
      case 'crackCenser':
        return { type: 'crackCenser' };
    }
  };

  const special = (s: SkillSpecialData): SkillSpecial => {
    switch (s.type) {
      case 'mistCloud':
        return { type: 'mistCloud', radius: s.radius, ticks: ticks(s.seconds), wholeBoard: s.wholeBoard ?? false };
      case 'pool':
        return { type: 'pool', radius: s.radius, ticks: ticks(s.seconds), status: s.status };
      case 'beacon':
        return { type: 'beacon', radius: s.radius ?? null, ticks: ticks(s.seconds), kneel: s.kneel, skipsTypes: s.skipsTypes ?? [] };
      case 'driftClouds':
        return { type: 'driftClouds', hexes: s.hexes };
      case 'selfAttackSpeed':
        return { type: 'selfAttackSpeed', multiplier: s.multiplier, ticks: ticks(s.seconds) };
      case 'healOnKill':
        return { type: 'healOnKill', amount: s.amount, ticks: ticks(s.seconds) };
      case 'headsAttackSpeed':
        return { type: 'headsAttackSpeed', multiplier: s.multiplier, ticks: ticks(s.seconds) };
      case 'healHead':
        return { type: 'healHead', share: s.share, cleanse: s.cleanse };
      case 'protectStump':
        return { type: 'protectStump', ticks: ticks(s.seconds), resetBurning: s.resetBurning };
      case 'hurryStump':
        return { type: 'hurryStump', multiplier: s.multiplier };
      case 'moreHeadsNextRegrowth':
        return { type: 'moreHeadsNextRegrowth', heads: s.heads };
      case 'hurtSelf':
        return { type: 'hurtSelf', amount: s.amount };
      case 'toss':
        return { type: 'toss', hexes: s.hexes, collisionStatus: s.collisionStatus, collisionTicks: ticks(s.collisionSeconds), knocksOverBraziers: s.knocksOverBraziers ?? false };
      case 'putOutBraziers':
        return { type: 'putOutBraziers', radius: s.radius ?? null };
      case 'seizeMany':
        return { type: 'seizeMany', count: s.count, ticks: ticks(s.seconds), breakArmor: s.breakArmor };
      case 'bottomless':
        return { type: 'bottomless', ticks: ticks(s.seconds), hpShare: s.hpShare, sleepTicks: ticks(s.sleepSeconds) };
      case 'copycat':
        return { type: 'copycat', power: s.power };
      case 'rummage':
        return { type: 'rummage' };
      case 'multiverse':
        return { type: 'multiverse', chance: s.chance, damage: s.damage, killBelowShare: s.killBelowShare };
    }
  };

  const ultimates = new Set(Object.values(heads.classes).flatMap((c) => (c.ultimate ? [c.ultimate] : [])));
  const skills: Record<string, SkillRules> = Object.fromEntries(
    Object.entries(heads.skills).map(([id, s]) => [
      id,
      {
        id,
        target: s.target,
        range: s.range ?? 0,
        cooldownTicks: ticks(s.cooldownSeconds),
        tags: s.tags ?? [],
        hitMultiplier: s.hitMultiplier ?? 0,
        targetHpBelow: s.targetHpBelow ?? null,
        needsHeld: s.needsHeld ?? false,
        usesMeal: s.usesMeal ?? false,
        area: (s.area ?? { shape: 'single' }) as SkillArea,
        effects: (s.effects ?? []).map(effect),
        specials: (s.specials ?? []).map(special),
        ultimate: ultimates.has(id),
      },
    ]),
  );

  return {
    ticksPerSecond: tps,
    boardColumns: balance.battle.boardColumns,
    boardRows: balance.battle.boardRows,
    bodyStepTicks: ticks(balance.battle.bodyStepSeconds),
    maxHeads: heads.maxHeads,
    regrowTicks: ticks(heads.regrowSeconds),
    headClasses: Object.fromEntries(
      Object.entries(heads.classes).map(([id, c]) => [
        id,
        {
          maxHp: c.maxHp,
          attack: {
            damage: c.attack.damage,
            cooldownTicks: ticks(c.attack.cooldownSeconds),
            range: c.attack.range,
            melee: c.attack.melee ?? false,
            tags: c.attack.tags,
            appliesStatus: c.attack.appliesStatus ?? null,
            statusTicks: maybeTicks(c.attack.statusSeconds),
            createsMistCloud: c.attack.createsMistCloud ?? false,
            devourHeal: c.attack.devourHeal ?? 0,
            healsHeads: c.attack.healsHeads ?? 0,
            randomEffectChance: c.attack.randomEffectChance ?? 0,
            randomEffects: (c.attack.randomEffects ?? []).map(effect),
          },
          skills: c.skills,
          ultimate: c.ultimate ?? null,
          badIdea: c.badIdea ? { ticks: ticks(c.badIdea.seconds), earliestTick: ticks(c.badIdea.earliestSecond), latestTick: ticks(c.badIdea.latestSecond) } : null,
        },
      ]),
    ),
    skills,
    hatchlingClassPool: heads.hatchlingClassPool,
    headNames: heads.names,
    enemyTypes: Object.fromEntries(
      Object.entries(enemies.types).map(([id, e]) => [
        id,
        {
          maxHp: e.maxHp,
          armor: e.armor,
          stepTicks: ticks(e.stepSeconds),
          attack: { damage: e.attack.damage, cooldownTicks: ticks(e.attack.cooldownSeconds), range: e.attack.range },
          bonusDamageVsHeads: e.bonusDamageVsHeads ?? 1,
          cauterizeTicks: e.cauterizeSeconds !== undefined ? ticks(e.cauterizeSeconds) : null,
          behavior: e.behavior,
          immuneTo: e.immuneTo ?? [],
          blindInMist: e.blindInMist ?? false,
          shots: e.shots ?? null,
          charge: e.charge ? { stepMultiplier: e.charge.stepMultiplier, firstHitMultiplier: e.charge.firstHitMultiplier } : null,
          collectTicks: e.collectSeconds !== undefined ? ticks(e.collectSeconds) : null,
          boss: e.boss ?? false,
          censer: e.censer
            ? {
                everyTicks: ticks(e.censer.everySeconds),
                swingTicks: ticks(e.censer.swingSeconds),
                radius: e.censer.radius,
                smokeTicks: ticks(e.censer.smokeSeconds),
                boostMultiplier: 1 + e.censer.damageBoostPercent / 100,
                boostTicks: ticks(e.censer.boostSeconds),
                keepsStatuses: e.censer.keepsStatuses ?? [],
              }
            : null,
          braziers: e.braziers
            ? {
                count: e.braziers.count,
                fromBody: e.braziers.fromBody,
                setDownTicks: ticks(e.braziers.setDownSeconds),
                everyTicks: ticks(e.braziers.everySeconds),
                dryRadius: e.braziers.dryRadius,
                mistRadius: e.braziers.mistRadius,
                bodySlowMultiplier: e.braziers.bodySlowMultiplier,
              }
            : null,
        },
      ]),
    ),
    statuses: Object.fromEntries(
      Object.entries(combos.statuses).map(([id, s]) => [
        id,
        {
          durationTicks: ticks(s.durationSeconds),
          armorChange: s.armorChange,
          damagePerSecond: s.damagePerSecond,
          speedMultiplier: s.speedMultiplier,
          canWalk: s.canWalk ?? true,
          canAttack: s.canAttack ?? true,
          canChannel: s.canChannel ?? true,
          flees: s.flees ?? false,
          damageTakenMultiplier: s.damageTakenMultiplier ?? 1,
          endsOnDamage: s.endsOnDamage ?? false,
          breaksWhenHolderTakes: s.breaksWhenHolderTakes ?? null,
        },
      ]),
    ),
    mistCloud: {
      radius: combos.mistCloud.radius,
      durationTicks: ticks(combos.mistCloud.durationSeconds),
      appliesStatus: combos.mistCloud.appliesStatus ?? null,
    },
    combos: combos.combos.map((combo) => ({
      id: combo.id,
      when: combo.when,
      conditions: {
        attackTag: combo.conditions.attackTag ?? null,
        headClass: combo.conditions.headClass ?? null,
        enemyHasStatus: combo.conditions.enemyHasStatus ?? null,
        enemyInMist: combo.conditions.enemyInMist ?? null,
        enemyCarriesFire: combo.conditions.enemyCarriesFire ?? null,
        enemyArmorBroken: combo.conditions.enemyArmorBroken ?? null,
        enemyHpBelow: combo.conditions.enemyHpBelow ?? null,
        otherHeads: combo.conditions.otherHeads
          ? {
              count: combo.conditions.otherHeads.count,
              windowTicks: ticks(combo.conditions.otherHeads.withinSeconds),
              sameClass: combo.conditions.otherHeads.sameClass ?? false,
              sameStump: combo.conditions.otherHeads.sameStump ?? false,
              oppositeSide: combo.conditions.otherHeads.oppositeSide ?? false,
              tag: combo.conditions.otherHeads.tag ?? null,
            }
          : null,
        beaconInMist: combo.conditions.beaconInMist ?? null,
        terrifiedOnBoard: combo.conditions.terrifiedOnBoard ?? null,
      },
      effects: (combo.effects ?? []).map(effect),
      beacon: combo.beacon
        ? { extraRadius: combo.beacon.extraRadius ?? 0, takesTorches: combo.beacon.takesTorches ?? false, callsTerrified: combo.beacon.callsTerrified ?? false }
        : null,
      cooldownTicks: combo.cooldownSeconds !== undefined ? ticks(combo.cooldownSeconds) : 0,
    })),
    twinLoss: { ticks: ticks(combos.twinLoss.seconds), rageAttackSpeed: combos.twinLoss.rageAttackSpeed, griefAttackSpeed: combos.twinLoss.griefAttackSpeed },
    spareMischief: { classId: combos.spareMischief.classId, chance: combos.spareMischief.chance, effects: combos.spareMischief.effects.map(effect) },
    rummage: heads.rummage.map((find): RummageFind => {
      switch (find.type) {
        case 'healHead':
          return { id: find.id, weight: find.weight, type: 'healHead', amount: find.amount };
        case 'statusAroundNearest':
          return { id: find.id, weight: find.weight, type: 'statusAroundNearest', status: find.status, radius: find.radius, ticks: maybeTicks(find.seconds) };
        case 'healClass':
          return { id: find.id, weight: find.weight, type: 'healClass', classId: find.classId, amount: find.amount };
        case 'nothing':
          return { id: find.id, weight: find.weight, type: 'nothing' };
      }
    }),
    hitMemoryTicks: ticks(combos.hitMemorySeconds),
    broodling: {
      maxHp: brood.battle.maxHp,
      stepTicks: ticks(brood.battle.stepSeconds),
      attack: { damage: brood.battle.attack.damage, cooldownTicks: ticks(brood.battle.attack.cooldownSeconds), range: brood.battle.attack.range },
    },
    experience: experienceRulesFrom(data),
    surface: {
      startClouds: {
        count: data.surface.battle.startClouds.count,
        radius: data.surface.battle.startClouds.radius,
        ticks: ticks(data.surface.battle.startClouds.seconds),
        fromBody: data.surface.battle.startClouds.fromBody,
      },
    },
  };
}
