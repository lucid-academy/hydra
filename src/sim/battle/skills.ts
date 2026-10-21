// Skills (keys Q and W, the ultimate on E). A skill is described in data (heads.json, "skills"):
// whom it is aimed at, how far it reaches, its cooldown, its tags (for combos), which enemies it lands on,
// the effects on them, and its special things (clouds, beacons, heals...). This file checks whether a skill
// can be used and carries it out.

import { hexDistance } from '../hex';
import type { Hex } from '../hex';
import { angleDifference, bodyDistance, hexAngle } from './board';
import {
  applyEffect,
  applyStatus,
  breakHold,
  createMistCloud,
  devourEnemy,
  enemyArmor,
  healHead,
  hurtEnemy,
  random,
  rememberHit,
  seize,
  toss,
  triggerBeaconCombos,
  triggerCombos,
  wakeUp,
} from './effects';
import type { HitContext } from './effects';
import type { BattleHead, BattleRules, BattleState, Enemy, SkillAim, SkillRules } from './types';

/** The skill a head has in a slot: 0 = Q, 1 = W (its two chosen skills), 2 = E (its class's ultimate, if unlocked). */
export function skillInSlot(state: BattleState, head: BattleHead, slot: number, rules: BattleRules): SkillRules | null {
  const id = slot === 2 ? (state.ultimatesUnlocked ? rules.headClasses[head.classId]!.ultimate : null) : head.skills[slot];
  return id ? (rules.skills[id] ?? null) : null;
}

/** Ticks left before the head can use the skill again (0 = ready). */
export function skillCooldown(head: BattleHead, skillId: string): number {
  return Math.max(0, head.skillCooldowns[skillId] ?? 0);
}

/** Why a skill can't be used right now, or null if it can. Waiting for a target to come into reach counts as "not yet". */
export type SkillBlock = 'cooldown' | 'asleep' | 'wrongAim' | 'outOfReach' | 'noTarget' | 'targetTooHealthy' | 'nothingHeld' | 'noMeal';

export function skillBlock(state: BattleState, head: BattleHead, skill: SkillRules, aim: SkillAim, rules: BattleRules): SkillBlock | null {
  if (state.tick < head.asleepUntilTick) return 'asleep';
  if (skillCooldown(head, skill.id) > 0) return 'cooldown';
  if (aim.kind !== skill.target) return 'wrongAim';
  if (skill.needsHeld && !state.enemies.some((e) => e.id === head.holdingId)) return 'nothingHeld';
  if (skill.usesMeal && head.meals <= 0) return 'noMeal';
  switch (aim.kind) {
    case 'enemy': {
      const enemy = state.enemies.find((e) => e.id === aim.enemyId);
      if (!enemy) return 'noTarget';
      if (bodyDistance(state.body.center, enemy.hex) > skill.range) return 'outOfReach';
      if (skill.targetHpBelow !== null && enemy.hp >= enemy.maxHp * skill.targetHpBelow) return 'targetTooHealthy';
      return null;
    }
    case 'hex':
      return bodyDistance(state.body.center, aim.at) > skill.range ? 'outOfReach' : null;
    case 'head':
      return state.heads.some((h) => h.id === aim.headId) ? null : 'noTarget';
    case 'stump':
      return state.stumps.some((s) => s.id === aim.stumpId && !s.cauterized) ? null : 'noTarget';
    case 'none':
      return null;
  }
}

/** Uses the skill (it must be usable: see skillBlock). `power` < 1 for Copycat. */
export function useSkill(state: BattleState, head: BattleHead, skill: SkillRules, aim: SkillAim, rules: BattleRules, power = 1): void {
  if (power === 1) head.skillCooldowns[skill.id] = skill.cooldownTicks;
  const aimedEnemy = aim.kind === 'enemy' ? (state.enemies.find((e) => e.id === aim.enemyId) ?? null) : null;
  const aimHex: Hex | null = aimedEnemy?.hex ?? (aim.kind === 'hex' ? aim.at : null);
  if (skill.usesMeal) head.meals -= 1;
  if (aimedEnemy && rules.headClasses[head.classId]!.attack.melee) head.targetId = aimedEnemy.id;

  let worked = true;
  for (const special of skill.specials) worked = doSpecial(state, head, skill, special, aim, aimHex, rules, power) && worked;

  for (const enemy of enemiesHit(state, skill, aimedEnemy, aimHex, rules)) landOn(state, head, skill, enemy, enemy === aimedEnemy, rules, power);

  state.events.push({ type: 'skill', tick: state.tick, headId: head.id, skillId: skill.id, at: aimHex, worked });
  if (power === 1 && !skill.specials.some((s) => s.type === 'copycat')) state.lastSkill = { headId: head.id, skillId: skill.id, aim };
}

/** The enemies a skill's effects land on. */
function enemiesHit(state: BattleState, skill: SkillRules, aimed: Enemy | null, aimHex: Hex | null, rules: BattleRules): Enemy[] {
  const area = skill.area;
  switch (area.shape) {
    case 'none':
      return [];
    case 'single':
      return aimed ? [aimed] : [];
    case 'around':
      return aimHex ? state.enemies.filter((e) => hexDistance(e.hex, aimHex) <= area.radius) : [];
    case 'aroundBody':
      return state.enemies.filter((e) => bodyDistance(state.body.center, e.hex) <= area.radius);
    case 'cone': {
      if (!aimHex) return [];
      const direction = hexAngle(state.body.center, aimHex);
      const half = (area.degrees / 2) * (Math.PI / 180);
      return state.enemies.filter(
        (e) => bodyDistance(state.body.center, e.hex) <= skill.range && angleDifference(hexAngle(state.body.center, e.hex), direction) <= half + 1e-9,
      );
    }
    case 'nearest': {
      if (!aimed) return [];
      const others = state.enemies
        .filter((e) => e !== aimed && hexDistance(e.hex, aimed.hex) <= area.radius)
        .sort((a, b) => hexDistance(a.hex, aimed.hex) - hexDistance(b.hex, aimed.hex) || a.id - b.id);
      return [aimed, ...others.slice(0, area.count - 1)];
    }
    case 'all':
      return [...state.enemies];
  }
  void rules;
}

/**
 * The skill lands on one enemy: the hit (aimed enemy only), its effects, then combos with what is on the enemy now
 * (so Coil's grip is there for Wrung Out), then the hit wakes an Entranced enemy unless a combo kept the trance.
 */
function landOn(state: BattleState, head: BattleHead, skill: SkillRules, enemy: Enemy, aimed: boolean, rules: BattleRules, power: number): void {
  if (!state.enemies.includes(enemy)) return;
  const hit: HitContext = { head, tags: skill.tags, hitDamage: 0, power, keepEntranced: false };
  if (aimed && skill.hitMultiplier > 0) {
    const attack = rules.headClasses[head.classId]!.attack;
    const raw = Math.max(1, attack.damage * skill.hitMultiplier * power - enemyArmor(enemy, rules));
    hit.hitDamage = hurtEnemy(state, enemy, raw, 'head', head.id, rules, false);
  }
  for (const effect of skill.effects) {
    if (!state.enemies.includes(enemy)) break;
    applyEffect(state, enemy, effect, hit, rules);
  }
  if (!state.enemies.includes(enemy)) return;
  triggerCombos(state, 'headHitsEnemy', enemy, hit, rules);
  if (!state.enemies.includes(enemy)) return;
  rememberHit(state, enemy, head, skill.tags, rules);
  if (hit.hitDamage > 0 && !hit.keepEntranced) wakeUp(state, enemy, rules);
}

function doSpecial(
  state: BattleState,
  head: BattleHead,
  skill: SkillRules,
  special: SkillRules['specials'][number],
  aim: SkillAim,
  aimHex: Hex | null,
  rules: BattleRules,
  power: number,
): boolean {
  const ticks = (t: number) => Math.max(1, Math.round(t * power));
  switch (special.type) {
    case 'mistCloud': {
      const at = special.wholeBoard ? state.body.center : aimHex;
      if (!at) return false;
      const radius = special.wholeBoard ? rules.boardColumns + rules.boardRows : special.radius;
      createMistCloud(state, at, rules, radius, ticks(special.ticks), head.id);
      return true;
    }
    case 'pool':
      if (!aimHex) return false;
      state.pools.push({ id: state.nextId++, center: aimHex, radius: special.radius, untilTick: state.tick + ticks(special.ticks), status: special.status });
      return true;
    case 'beacon': {
      const at = aimHex ?? state.body.center;
      const beacon = {
        id: state.nextId++,
        at,
        radius: special.radius,
        untilTick: state.tick + ticks(special.ticks),
        kneel: special.kneel,
        skipsTypes: special.skipsTypes,
        takesTorches: false,
        callsTerrified: false,
      };
      state.beacons.push(beacon);
      triggerBeaconCombos(state, beacon, head, rules);
      return true;
    }
    case 'driftClouds': {
      if (!aimHex) return false;
      const own = state.clouds.filter((c) => c.ownerHeadId === head.id);
      for (const cloud of own) {
        for (let i = 0; i < special.hexes; i++) cloud.center = stepTowards(cloud.center, aimHex);
      }
      return own.length > 0;
    }
    case 'selfAttackSpeed':
      head.buffs.push({ kind: 'attackSpeed', multiplier: special.multiplier, untilTick: state.tick + ticks(special.ticks), mood: null });
      return true;
    case 'healOnKill':
      head.buffs.push({ kind: 'healOnKill', amount: special.amount, untilTick: state.tick + ticks(special.ticks) });
      return true;
    case 'headsAttackSpeed':
      for (const other of state.heads) {
        if (other !== head) other.buffs.push({ kind: 'attackSpeed', multiplier: special.multiplier, untilTick: state.tick + ticks(special.ticks), mood: null });
      }
      return true;
    case 'healHead': {
      const target = aim.kind === 'head' ? state.heads.find((h) => h.id === aim.headId) : head;
      if (!target) return false;
      healHead(state, target, target.maxHp * special.share * power, rules);
      if (special.cleanse) target.buffs = target.buffs.filter((b) => !(b.kind === 'attackSpeed' && b.mood === 'grief'));
      return true;
    }
    case 'protectStump': {
      const stump = aim.kind === 'stump' ? state.stumps.find((s) => s.id === aim.stumpId) : null;
      if (!stump) return false;
      stump.protectedUntilTick = state.tick + ticks(special.ticks);
      if (special.resetBurning) stump.cauterizeProgress = 0;
      for (const enemy of state.enemies) if (enemy.cauterizingStumpId === stump.id) enemy.cauterizingStumpId = null;
      return true;
    }
    case 'hurryStump': {
      const stump = aim.kind === 'stump' ? state.stumps.find((s) => s.id === aim.stumpId) : null;
      if (!stump) return false;
      const left = Math.max(0, stump.regrowAtTick - state.tick);
      stump.regrowAtTick = state.tick + Math.ceil(left / (1 + (special.multiplier - 1) * power));
      return true;
    }
    case 'moreHeadsNextRegrowth':
      state.nextRegrowthHeads = special.heads;
      return true;
    case 'hurtSelf':
      head.hp = Math.max(1, head.hp - special.amount);
      state.events.push({ type: 'hit', tick: state.tick, attacker: 'head', attackerId: head.id, targetKind: 'head', targetId: head.id, damage: special.amount, at: state.body.center });
      return true;
    case 'toss': {
      const held = state.enemies.find((e) => e.id === head.holdingId);
      if (!held || !aimHex) return false;
      breakHold(state, head, rules);
      toss(state, held, aimHex, special.hexes, special.collisionStatus, special.collisionTicks, rules);
      return true;
    }
    case 'seizeMany': {
      const inReach = state.enemies
        .filter((e) => bodyDistance(state.body.center, e.hex) <= skill.range)
        .sort((a, b) => bodyDistance(state.body.center, a.hex) - bodyDistance(state.body.center, b.hex) || a.id - b.id)
        .slice(0, special.count);
      // One neck can hold one human; the others are held by its coils just as well, for the length of the skill.
      inReach.forEach((enemy, i) => {
        if (i === 0) seize(state, head, enemy, 'seized', ticks(special.ticks), rules);
        else applyStatus(state, enemy, 'seized', rules, ticks(special.ticks));
        if (special.breakArmor) enemy.armorBroken = true;
      });
      return inReach.length > 0;
    }
    case 'bottomless':
      head.buffs.push({ kind: 'bottomless', hpShare: special.hpShare, untilTick: state.tick + ticks(special.ticks), sleepTicks: special.sleepTicks });
      return true;
    case 'copycat': {
      const last = state.lastSkill;
      const original = last ? rules.skills[last.skillId] : null;
      if (!last || !original || last.headId === head.id) return false;
      if (original.needsHeld || original.usesMeal) return false;
      if (original.specials.some((s) => s.type === 'copycat')) return false;
      const aimNow = stillValidAim(state, last.aim) ? last.aim : null;
      if (!aimNow) return false;
      useSkill(state, head, original, aimNow, rules, special.power * power);
      return true;
    }
    case 'rummage':
      return rummage(state, head, rules);
    case 'multiverse': {
      if (random(state) >= special.chance) return false;
      for (const enemy of [...state.enemies]) {
        hurtEnemy(state, enemy, special.damage * power, 'head', head.id, rules);
        if (state.enemies.includes(enemy) && enemy.hp < enemy.maxHp * special.killBelowShare) devourEnemy(state, enemy, 0, null, rules);
      }
      return true;
    }
  }
}

function stillValidAim(state: BattleState, aim: SkillAim): boolean {
  switch (aim.kind) {
    case 'enemy':
      return state.enemies.some((e) => e.id === aim.enemyId);
    case 'head':
      return state.heads.some((h) => h.id === aim.headId);
    case 'stump':
      return state.stumps.some((s) => s.id === aim.stumpId && !s.cauterized);
    default:
      return true;
  }
}

function stepTowards(from: Hex, to: Hex): Hex {
  const distance = hexDistance(from, to);
  if (distance === 0) return from;
  const t = 1 / distance;
  // Hex lerp + rounding (Red Blob Games): the next hex on the line from `from` to `to`.
  const q = from.q + (to.q - from.q) * t;
  const r = from.r + (to.r - from.r) * t;
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const dq = Math.abs(rq - q);
  const dr = Math.abs(rr - r);
  const ds = Math.abs(rs - s);
  if (dq > dr && dq > ds) rq = -rr - rs;
  else if (dr > ds) rr = -rq - rs;
  return { q: rq, r: rr };
}

/** The Spare's Rummage: one random find from the swamp (rummage list in BattleRules). */
function rummage(state: BattleState, head: BattleHead, rules: BattleRules): boolean {
  const finds = rules.rummage;
  if (finds.length === 0) return false;
  const total = finds.reduce((sum, f) => sum + f.weight, 0);
  let roll = random(state) * total;
  let find = finds[finds.length - 1]!;
  for (const f of finds) {
    roll -= f.weight;
    if (roll < 0) {
      find = f;
      break;
    }
  }
  state.events.push({ type: 'rummage', tick: state.tick, headId: head.id, find: find.id });
  switch (find.type) {
    case 'healHead': {
      const wounded = [...state.heads].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (wounded) healHead(state, wounded, find.amount, rules);
      return true;
    }
    case 'statusAroundNearest': {
      const nearest = [...state.enemies].sort((a, b) => bodyDistance(state.body.center, a.hex) - bodyDistance(state.body.center, b.hex) || a.id - b.id)[0];
      if (!nearest) return false;
      for (const enemy of [...state.enemies]) {
        if (hexDistance(enemy.hex, nearest.hex) <= find.radius) applyStatus(state, enemy, find.status, rules, find.ticks);
      }
      return true;
    }
    case 'healClass': {
      const fan = state.heads.filter((h) => h.classId === find.classId);
      for (const h of fan) healHead(state, h, find.amount, rules);
      return fan.length > 0;
    }
    case 'nothing':
      return false;
  }
}

