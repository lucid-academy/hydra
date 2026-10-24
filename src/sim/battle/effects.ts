// Statuses on enemies, things lying on the board (Mist clouds, pools, beacons), combos, and the effects
// that attacks, skills and combos are made of. Combos are described in data (combos.json): a trigger,
// conditions and effects. A new combo is a new entry there.

import { HEX_DIRECTIONS, hexAdd, hexDistance, hexEquals, hexKey } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import { angleDifference, bodyDistance, hexAngle, isOnBoard } from './board';
import type { Ally, Beacon, BattleHead, BattleRules, BattleState, Brazier, ComboRules, ComboTrigger, Effect, Enemy, HitSource, MistCloud, StatusRules } from './types';

// ---------------------------------------------------------------- randomness

/** A random number in [0, 1) from the battle's own generator (so the battle stays deterministic). */
export function random(state: BattleState): number {
  const rng = Rng.fromState(state.rngState);
  const value = rng.next();
  state.rngState = rng.getState();
  return value;
}

export function randomPick<T>(state: BattleState, items: readonly T[]): T {
  if (items.length === 0) throw new Error('randomPick: empty list');
  return items[Math.min(items.length - 1, Math.floor(random(state) * items.length))]!;
}

// ---------------------------------------------------------------- hits on enemies

/**
 * What a head's attack or skill brings to the effects it sets off: who did it, with what tags, how hard it hit,
 * and at what strength (Copycat repeats skills at half strength).
 */
export interface HitContext {
  head: BattleHead | null;
  tags: readonly string[];
  hitDamage: number;
  power: number;
  /** Set by an effect: this hit doesn't wake an Entranced enemy (Anointing). */
  keepEntranced: boolean;
}

export function noHit(power = 1): HitContext {
  return { head: null, tags: [], hitDamage: 0, power, keepEntranced: false };
}

/**
 * Deals damage (armor is not applied here, statuses like Seized are) and removes the enemy if it dies.
 * `wake`: the damage ends statuses that end on damage (Entranced). A head's hit wakes the enemy only after
 * its combos are done, so a scream can still use the trance it breaks (Rude Awakening).
 * Returns the damage dealt.
 */
export function hurtEnemy(
  state: BattleState,
  enemy: Enemy,
  damage: number,
  attacker: HitSource,
  attackerId: string | number | null = null,
  rules?: BattleRules,
  wake = true,
): number {
  if (!state.enemies.includes(enemy)) return 0;
  let dealt = damage;
  if (rules) for (const status of enemy.statuses) dealt *= rules.statuses[status.id]!.damageTakenMultiplier;
  dealt = Math.round(dealt * 100) / 100;
  enemy.hp -= dealt;
  state.events.push({ type: 'hit', tick: state.tick, attacker, attackerId, targetKind: 'enemy', targetId: enemy.id, damage: dealt, at: enemy.hex });
  if (enemy.hp <= 0) {
    removeEnemy(state, enemy, rules);
    state.events.push({ type: 'enemyKilled', tick: state.tick, enemyId: enemy.id, at: enemy.hex });
    if (typeof attackerId === 'string') countKill(state, attackerId);
    if (rules && typeof attackerId === 'string') rewardKill(state, attackerId, rules);
  } else if (wake && rules) {
    wakeUp(state, enemy, rules);
  }
  return dealt;
}

/** Ends statuses that end on damage (Entranced). */
export function wakeUp(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  endStatuses(state, enemy, rules, (s) => rules.statuses[s.id]!.endsOnDamage);
}

/** The enemy is gone (killed, eaten or fled the board): heads holding it let go. */
export function removeEnemy(state: BattleState, enemy: Enemy, rules?: BattleRules): void {
  state.enemies = state.enemies.filter((e) => e !== enemy);
  for (const head of state.heads) {
    if (head.holdingId === enemy.id) releaseHold(head);
  }
  void rules;
}

/** A human killed or eaten counts towards the head's experience (only heads count; Broodlings learn nothing). */
function countKill(state: BattleState, headId: string): void {
  if (state.heads.some((h) => h.id === headId)) state.kills[headId] = (state.kills[headId] ?? 0) + 1;
}

/** A head hits this many times harder for its level (heads.json experience). */
export function levelDamageMultiplier(head: BattleHead, rules: BattleRules): number {
  return 1 + ((head.level - 1) * rules.experience.damagePercentPerLevel) / 100;
}

/** How hard a head hits in this battle: its level, and the battle's own multiplier (Exposed on the surface). */
export function headDamageMultiplier(state: BattleState, head: BattleHead, rules: BattleRules): number {
  return levelDamageMultiplier(head, rules) * state.headDamageMultiplier;
}

/** A head that kills heals itself if it has a Frenzy going. */
function rewardKill(state: BattleState, headId: string, rules: BattleRules): void {
  const head = state.heads.find((h) => h.id === headId);
  if (!head) return;
  for (const buff of head.buffs) {
    if (buff.kind === 'healOnKill' && state.tick < buff.untilTick) healHead(state, head, buff.amount, rules);
  }
}

/** The enemy is eaten on the spot; the body heals. */
export function devourEnemy(state: BattleState, enemy: Enemy, healAmount: number, head: BattleHead | null, rules: BattleRules): void {
  if (!state.enemies.includes(enemy)) return;
  const at = enemy.hex;
  removeEnemy(state, enemy, rules);
  state.events.push({ type: 'enemyKilled', tick: state.tick, enemyId: enemy.id, at });
  if (head) countKill(state, head.id);
  afterMeal(state, enemy, healAmount, head, rules);
}

/** After a head ate a human (killed by a bite, or eaten whole): heal, a meal for Regurgitate, and meal combos. */
export function afterMeal(state: BattleState, enemy: Enemy, healAmount: number, head: BattleHead | null, rules: BattleRules): void {
  state.events.push({ type: 'devoured', tick: state.tick, enemyId: enemy.id, headId: head?.id ?? null, at: enemy.hex });
  healBody(state, healAmount);
  if (head) {
    head.meals += 1;
    rewardKill(state, head.id, rules);
  }
  triggerCombos(state, 'enemyDevoured', enemy, { head, tags: ['devour'], hitDamage: 0, power: 1, keepEntranced: false }, rules);
}

export function healBody(state: BattleState, amount: number): void {
  const { body } = state;
  const healed = Math.min(amount, body.maxHp - body.hp);
  if (healed <= 0) return;
  body.hp += healed;
  state.events.push({ type: 'heal', tick: state.tick, targetKind: 'body', targetId: 'body', amount: healed, at: body.center });
}

export function healHead(state: BattleState, head: BattleHead, amount: number, rules: BattleRules): void {
  const healed = Math.min(amount, head.maxHp - head.hp);
  if (healed <= 0) return;
  head.hp += healed;
  void rules;
  state.events.push({ type: 'heal', tick: state.tick, targetKind: 'head', targetId: head.id, amount: healed, at: state.body.center });
}

export function enemyArmor(enemy: Enemy, rules: BattleRules): number {
  if (enemy.armorBroken) return 0;
  let armor = rules.enemyTypes[enemy.typeId]!.armor;
  for (const status of enemy.statuses) armor += rules.statuses[status.id]!.armorChange;
  return Math.max(0, armor);
}

/** Ticks one step takes this enemy now: statuses that slow it down make steps longer, a charge shorter. */
export function enemyStepTicks(enemy: Enemy, rules: BattleRules): number {
  const type = rules.enemyTypes[enemy.typeId]!;
  let speed = 1;
  for (const status of enemy.statuses) speed *= rules.statuses[status.id]!.speedMultiplier;
  const charge = enemy.charging && type.charge ? type.charge.stepMultiplier : 1;
  return Math.max(1, Math.round((type.stepTicks * charge) / speed));
}

// ---------------------------------------------------------------- statuses

export function hasStatus(enemy: Enemy, statusId: string): boolean {
  return enemy.statuses.some((s) => s.id === statusId);
}

/** Whether the enemy's statuses let it do something (walk, attack, channel): all of them must allow it. */
export function enemyCan(enemy: Enemy, what: 'canWalk' | 'canAttack' | 'canChannel', rules: BattleRules): boolean {
  return enemy.statuses.every((s) => rules.statuses[s.id]![what]);
}

export function enemyFlees(enemy: Enemy, rules: BattleRules): boolean {
  return enemy.statuses.some((s) => rules.statuses[s.id]!.flees);
}

/** Can this enemy burn stumps shut right now? */
export function canCauterize(state: BattleState, enemy: Enemy, rules: BattleRules): boolean {
  return rules.enemyTypes[enemy.typeId]!.cauterizeTicks !== null && state.tick >= enemy.torchOutUntilTick && enemyCan(enemy, 'canChannel', rules);
}

/**
 * Puts a status on an enemy, or makes it last longer if it is already there. Returns true if it is new.
 * `ticks` overrides the status's own duration. Enemy types immune to the status shrug it off.
 */
export function applyStatus(
  state: BattleState,
  enemy: Enemy,
  statusId: string,
  rules: BattleRules,
  ticks: number | null = null,
  sourceHeadId: string | null = null,
): boolean {
  const status = rules.statuses[statusId];
  if (!status) throw new Error(`Unknown status "${statusId}"`);
  if (!state.enemies.includes(enemy)) return false;
  if (rules.enemyTypes[enemy.typeId]!.immuneTo.includes(statusId)) return false;
  const untilTick = state.tick + Math.max(1, Math.round(ticks ?? status.durationTicks));
  const active = enemy.statuses.find((s) => s.id === statusId);
  if (active) {
    active.untilTick = Math.max(active.untilTick, untilTick);
    if (sourceHeadId !== null) active.sourceHeadId = sourceHeadId;
    return false;
  }
  enemy.statuses.push({ id: statusId, untilTick, nextDamageTick: state.tick + rules.ticksPerSecond, sourceHeadId, then: null });
  if (!status.canChannel) {
    enemy.cauterizingStumpId = null;
    interruptChannel(state, enemy, rules);
  }
  state.events.push({ type: 'status', tick: state.tick, enemyId: enemy.id, status: statusId, at: enemy.hex });
  return true;
}

/** Ends the matching statuses now, with whatever comes after them (`then`) and holds let go. */
export function endStatuses(state: BattleState, enemy: Enemy, rules: BattleRules, which: (s: Enemy['statuses'][number]) => boolean): void {
  const ending = enemy.statuses.filter(which);
  if (ending.length === 0) return;
  enemy.statuses = enemy.statuses.filter((s) => !ending.includes(s));
  for (const status of ending) {
    if (status.sourceHeadId !== null) {
      const holder = state.heads.find((h) => h.id === status.sourceHeadId && h.holdingId === enemy.id);
      if (holder) releaseHold(holder);
    }
    if (status.then) applyStatus(state, enemy, status.then.status, rules, status.then.ticks);
  }
}

/** A swing of the censer or a brazier being set down stops half-way; the next one has to wait its full time. */
export function interruptChannel(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  const channel = enemy.channel;
  if (!channel) return;
  enemy.channel = null;
  const type = rules.enemyTypes[enemy.typeId]!;
  enemy.nextChannelTick = state.tick + (channel.kind === 'censer' ? (type.censer?.everyTicks ?? 0) : (type.braziers?.everyTicks ?? 0));
  if (channel.kind === 'censer') state.events.push({ type: 'censer', tick: state.tick, enemyId: enemy.id, what: 'interrupted', at: enemy.hex, radius: type.censer?.radius ?? 0 });
  else state.events.push({ type: 'brazier', tick: state.tick, what: 'interrupted', enemyId: enemy.id, brazierId: null, at: enemy.hex });
}

export function releaseHold(head: BattleHead): void {
  head.holdingId = null;
  head.hurtWhileHolding = 0;
}

/** The head lets go of the human it holds (it was hit too hard, or it was severed). */
export function breakHold(state: BattleState, head: BattleHead, rules: BattleRules): void {
  const held = state.enemies.find((e) => e.id === head.holdingId);
  releaseHold(head);
  if (held) endStatuses(state, held, rules, (s) => s.sourceHeadId === head.id && rules.statuses[s.id]!.breaksWhenHolderTakes !== null);
}

/** The head grabs the enemy: it is Seized (or whatever status holds) for as long as the head keeps hold. */
export function seize(state: BattleState, head: BattleHead, enemy: Enemy, statusId: string, ticks: number | null, rules: BattleRules): void {
  if (head.holdingId !== null && head.holdingId !== enemy.id) breakHold(state, head, rules);
  if (!applyStatus(state, enemy, statusId, rules, ticks, head.id) && !hasStatus(enemy, statusId)) return; // immune
  head.holdingId = enemy.id;
  head.hurtWhileHolding = 0;
}

// ---------------------------------------------------------------- things on the board

/** Mist can't lie here now: censer smoke, or a lit brazier near enough. */
export function isClearOfMist(state: BattleState, h: Hex): boolean {
  return state.smokes.some((s) => hexDistance(s.center, h) <= s.radius) || state.braziers.some((b) => hexDistance(b.at, h) <= b.mistRadius);
}

/** The clouds lying on this hex (none where smoke or a brazier keeps the Mist off). */
export function cloudsOver(state: BattleState, h: Hex): MistCloud[] {
  if (isClearOfMist(state, h)) return [];
  return state.clouds.filter((cloud) => hexDistance(cloud.center, h) <= cloud.radius);
}

export function isInMist(state: BattleState, h: Hex): boolean {
  return cloudsOver(state, h).length > 0;
}

export function isAcid(state: BattleState, cloud: MistCloud): boolean {
  return state.tick < cloud.acidUntilTick;
}

/** New Mist cloud centred on `at`. Breathing again on the same hex just makes that cloud last longer. */
export function createMistCloud(
  state: BattleState,
  at: Hex,
  rules: BattleRules,
  radius = rules.mistCloud.radius,
  ticks = rules.mistCloud.durationTicks,
  ownerHeadId: string | null = null,
): MistCloud {
  const untilTick = state.tick + ticks;
  const existing = state.clouds.find((cloud) => hexEquals(cloud.center, at) && cloud.radius === radius);
  if (existing) {
    existing.untilTick = Math.max(existing.untilTick, untilTick);
    if (ownerHeadId !== null) existing.ownerHeadId = ownerHeadId;
    return existing;
  }
  const cloud: MistCloud = { id: state.nextId++, center: at, radius, untilTick, acidUntilTick: 0, acidDamagePerSecond: 0, nextAcidTick: 0, ownerHeadId };
  state.clouds.push(cloud);
  return cloud;
}

/** The ground here is dried by a brazier: the brazier that slows the body most, or null. */
export function dryingBrazier(state: BattleState, h: Hex): Brazier | null {
  let best: Brazier | null = null;
  for (const brazier of state.braziers) {
    if (hexDistance(brazier.at, h) > brazier.dryRadius) continue;
    if (!best || brazier.bodySlowMultiplier > best.bodySlowMultiplier) best = brazier;
  }
  return best;
}

/** Braziers within `radius` of `at` go out (radius null: all of them). Returns how many. */
export function putOutBraziers(state: BattleState, at: Hex | null, radius: number | null): number {
  const out = state.braziers.filter((b) => radius === null || (at !== null && hexDistance(b.at, at) <= radius));
  if (out.length === 0) return 0;
  state.braziers = state.braziers.filter((b) => !out.includes(b));
  for (const brazier of out) state.events.push({ type: 'brazier', tick: state.tick, what: 'out', enemyId: null, brazierId: brazier.id, at: brazier.at });
  return out.length;
}

/** Who a beacon draws to itself right now. */
export function drawnBy(state: BattleState, beacon: Beacon, enemy: Enemy, rules: BattleRules): boolean {
  if (beacon.skipsTypes.includes(enemy.typeId)) return false;
  if (rules.enemyTypes[enemy.typeId]!.immuneTo.includes('entranced')) return false;
  if (beacon.callsTerrified && enemyFlees(enemy, rules)) return true;
  return beacon.radius === null || hexDistance(beacon.at, enemy.hex) <= beacon.radius;
}

/** The beacon that draws this enemy (the nearest, if several), or null. */
export function beaconFor(state: BattleState, enemy: Enemy, rules: BattleRules): Beacon | null {
  let best: Beacon | null = null;
  for (const beacon of state.beacons) {
    if (!drawnBy(state, beacon, enemy, rules)) continue;
    if (!best || hexDistance(beacon.at, enemy.hex) < hexDistance(best.at, enemy.hex)) best = beacon;
  }
  return best;
}

/** One tick of things on the board and of statuses: clouds fade, soak and burn; pools corrode; statuses wear off and hurt. */
export function updateEffects(state: BattleState, rules: BattleRules): void {
  state.clouds = state.clouds.filter((cloud) => state.tick < cloud.untilTick);
  state.smokes = state.smokes.filter((smoke) => state.tick < smoke.untilTick);
  state.pools = state.pools.filter((pool) => state.tick < pool.untilTick);
  state.beacons = state.beacons.filter((beacon) => state.tick < beacon.untilTick);

  for (const cloud of state.clouds) {
    const acidDue = isAcid(state, cloud) && state.tick >= cloud.nextAcidTick;
    if (acidDue) cloud.nextAcidTick = state.tick + rules.ticksPerSecond;
    for (const enemy of [...state.enemies]) {
      if (hexDistance(cloud.center, enemy.hex) > cloud.radius || isClearOfMist(state, enemy.hex)) continue;
      if (rules.mistCloud.appliesStatus !== null) applyStatus(state, enemy, rules.mistCloud.appliesStatus, rules);
      if (acidDue) hurtEnemy(state, enemy, cloud.acidDamagePerSecond, 'mist', null, rules);
    }
  }
  for (const pool of state.pools) {
    for (const enemy of [...state.enemies]) {
      if (hexDistance(pool.center, enemy.hex) <= pool.radius) applyStatus(state, enemy, pool.status, rules);
    }
  }
  for (const enemy of [...state.enemies]) {
    if (isInMist(state, enemy.hex)) triggerCombos(state, 'enemyInMist', enemy, noHit(), rules);
  }

  for (const enemy of [...state.enemies]) {
    endStatuses(state, enemy, rules, (s) => state.tick >= s.untilTick);
    for (const status of enemy.statuses) {
      const { damagePerSecond } = rules.statuses[status.id]!;
      if (damagePerSecond <= 0 || state.tick < status.nextDamageTick) continue;
      status.nextDamageTick = state.tick + rules.ticksPerSecond;
      hurtEnemy(state, enemy, damagePerSecond, 'status', null, rules);
      if (!state.enemies.includes(enemy)) break;
    }
  }
}

// ---------------------------------------------------------------- combos

/** Remembers a head's hit on an enemy, for combos that need several heads. */
export function rememberHit(state: BattleState, enemy: Enemy, head: BattleHead, tags: readonly string[], rules: BattleRules): void {
  const hits = (enemy.recentHits ??= []);
  hits.push({ headId: head.id, classId: head.classId, tick: state.tick, anchorAngle: head.anchorAngle, twinGroup: head.twinGroup, tags });
  const oldest = state.tick - rules.hitMemoryTicks;
  while (hits.length > 0 && hits[0]!.tick < oldest) hits.shift();
}

/** The other heads whose recent hits on the enemy satisfy a combo's `otherHeads` condition. */
function otherHeadsThatHit(state: BattleState, enemy: Enemy, head: BattleHead, condition: NonNullable<ComboRules['conditions']['otherHeads']>): string[] {
  const ids = new Set<string>();
  for (const hit of enemy.recentHits ?? []) {
    if (hit.headId === head.id || state.tick - hit.tick > condition.windowTicks) continue;
    if (condition.sameClass && hit.classId !== head.classId) continue;
    if (condition.sameStump && (head.twinGroup === null || hit.twinGroup !== head.twinGroup)) continue;
    if (condition.oppositeSide && angleDifference(hit.anchorAngle, head.anchorAngle) < (Math.PI * 2) / 3) continue;
    if (condition.tag !== null && !hit.tags.includes(condition.tag)) continue;
    if (!state.heads.some((h) => h.id === hit.headId)) continue;
    ids.add(hit.headId);
  }
  return [...ids];
}

/**
 * Fires every combo whose trigger and conditions match.
 * A combo is announced (a 'combo' event) only when it actually changed something,
 * so a Torchbearer standing in mist is smothered once, not twenty times a second.
 * For 'enemyDevoured' the enemy is already gone; its effects then only reach the hydra.
 */
export function triggerCombos(state: BattleState, when: ComboTrigger, enemy: Enemy, hit: HitContext, rules: BattleRules): void {
  for (const combo of rules.combos) {
    if (when !== 'enemyDevoured' && !state.enemies.includes(enemy)) return;
    if (combo.when !== when) continue;
    const c = combo.conditions;
    if (c.attackTag !== null && !hit.tags.includes(c.attackTag)) continue;
    if (c.headClass !== null && hit.head?.classId !== c.headClass) continue;
    if (c.enemyHasStatus !== null && !hasStatus(enemy, c.enemyHasStatus)) continue;
    if (c.enemyInMist !== null && isInMist(state, enemy.hex) !== c.enemyInMist) continue;
    if (c.enemyCarriesFire !== null && (rules.enemyTypes[enemy.typeId]!.cauterizeTicks !== null) !== c.enemyCarriesFire) continue;
    if (c.enemyArmorBroken !== null && enemy.armorBroken !== c.enemyArmorBroken) continue;
    if (c.enemyHpBelow !== null && enemy.hp >= enemy.maxHp * c.enemyHpBelow) continue;
    let partners: string[] = [];
    if (c.otherHeads !== null) {
      if (!hit.head) continue;
      partners = otherHeadsThatHit(state, enemy, hit.head, c.otherHeads);
      if (partners.length < c.otherHeads.count) continue;
    }
    const cooldowns = (enemy.comboCooldowns ??= {});
    if (state.tick < (cooldowns[combo.id] ?? 0)) continue;

    const at = enemy.hex;
    let changed = false;
    for (const effect of combo.effects) changed = applyEffect(state, enemy, effect, hit, rules) || changed;
    if (!changed) continue;
    if (combo.cooldownTicks > 0) cooldowns[combo.id] = state.tick + combo.cooldownTicks;
    const headIds = hit.head ? [hit.head.id, ...partners] : [];
    state.events.push({ type: 'combo', tick: state.tick, comboId: combo.id, enemyId: enemy.id, at, headIds });
    spareMischief(state, enemy, rules);
  }
}

/** A beacon was just lit: combos about beacons change it (Marsh Light, Sanctuary). */
export function triggerBeaconCombos(state: BattleState, beacon: Beacon, head: BattleHead | null, rules: BattleRules): void {
  for (const combo of rules.combos) {
    if (combo.when !== 'beaconLit' || !combo.beacon) continue;
    const c = combo.conditions;
    if (c.beaconInMist !== null && isInMist(state, beacon.at) !== c.beaconInMist) continue;
    if (c.terrifiedOnBoard !== null && state.enemies.some((e) => enemyFlees(e, rules)) !== c.terrifiedOnBoard) continue;
    if (beacon.radius !== null) beacon.radius += combo.beacon.extraRadius;
    if (combo.beacon.takesTorches) beacon.takesTorches = true;
    if (combo.beacon.callsTerrified) beacon.callsTerrified = true;
    state.events.push({ type: 'combo', tick: state.tick, comboId: combo.id, enemyId: null, at: beacon.at, headIds: head ? [head.id] : [] });
  }
}

/** The Spare in a combo: sometimes it adds something absurd on the combo's target. */
function spareMischief(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  const { classId, chance, effects } = rules.spareMischief;
  const spare = state.heads.find((h) => h.classId === classId && state.tick >= h.asleepUntilTick);
  if (!spare || effects.length === 0 || !state.enemies.includes(enemy) || random(state) >= chance) return;
  const effect = randomPick(state, effects);
  applyEffect(state, enemy, effect, { head: spare, tags: [], hitDamage: 0, power: 1, keepEntranced: false }, rules);
  state.events.push({ type: 'mischief', tick: state.tick, headId: spare.id, effect: effect.type === 'status' ? effect.status : effect.type, at: enemy.hex });
}

// ---------------------------------------------------------------- effects

function scaled(ticks: number | null, power: number, statusRules: StatusRules | undefined): number | null {
  if (power === 1) return ticks;
  return (ticks ?? statusRules?.durationTicks ?? 1) * power;
}

/** Carries out one effect on an enemy. Returns true if it did something new (not just kept an effect that was already running going). */
export function applyEffect(state: BattleState, enemy: Enemy, effect: Effect, hit: HitContext, rules: BattleRules): boolean {
  const alive = state.enemies.includes(enemy);
  switch (effect.type) {
    case 'damage': {
      if (!alive) return false;
      const amount = (effect.amount + effect.ofHit * hit.hitDamage) * hit.power;
      if (amount <= 0) return false;
      hurtEnemy(state, enemy, amount, 'combo', hit.head?.id ?? null, rules, false);
      return true;
    }
    case 'status': {
      if (!alive) return false;
      const ticks = scaled(effect.ticks, hit.power, rules.statuses[effect.status]);
      if (effect.status === 'seized' && hit.head) {
        const wasHeld = hit.head.holdingId === enemy.id;
        seize(state, hit.head, enemy, effect.status, ticks, rules);
        return !wasHeld && hit.head.holdingId === enemy.id;
      }
      return applyStatus(state, enemy, effect.status, rules, ticks, null);
    }
    case 'extendStatus': {
      const active = enemy.statuses.find((s) => s.id === effect.status);
      if (!alive || !active) return false;
      active.untilTick += Math.round(effect.ticks * hit.power);
      return true;
    }
    case 'removeStatus':
      endStatuses(state, enemy, rules, (s) => s.id === effect.status);
      return false;
    case 'breakArmor': {
      if (!alive) return false;
      const wasBroken = enemy.armorBroken;
      enemy.armorBroken = true;
      return !wasBroken;
    }
    case 'acidifyMist': {
      let turned = false;
      for (const cloud of cloudsOver(state, enemy.hex)) {
        if (!isAcid(state, cloud)) {
          turned = true;
          cloud.nextAcidTick = state.tick + rules.ticksPerSecond;
        }
        cloud.acidUntilTick = state.tick + effect.ticks;
        cloud.acidDamagePerSecond = effect.damagePerSecond;
      }
      return turned;
    }
    case 'putOutTorch': {
      if (!alive || rules.enemyTypes[enemy.typeId]!.cauterizeTicks === null) return false;
      const wasOut = state.tick < enemy.torchOutUntilTick;
      enemy.torchOutUntilTick = Math.max(enemy.torchOutUntilTick, state.tick + Math.round(effect.ticks * hit.power));
      if (!wasOut) enemy.cauterizingStumpId = null;
      return !wasOut;
    }
    case 'devour': {
      if (!alive) return false;
      const heal = (hit.head ? rules.headClasses[hit.head.classId]!.attack.devourHeal : 0) * effect.healMultiplier;
      devourEnemy(state, enemy, heal, hit.head, rules);
      return true;
    }
    case 'healBody': {
      const before = state.body.hp;
      healBody(state, effect.amount * hit.power);
      return state.body.hp > before || effect.amount > 0;
    }
    case 'splash': {
      let any = false;
      for (const other of [...state.enemies]) {
        if (other === enemy || hexDistance(other.hex, enemy.hex) > effect.radius) continue;
        hurtEnemy(state, other, effect.amount * hit.power, 'combo', hit.head?.id ?? null, rules);
        any = true;
      }
      return any;
    }
    case 'statusAround': {
      let any = false;
      const ticks = scaled(effect.ticks, hit.power, rules.statuses[effect.status]);
      for (const other of [...state.enemies]) {
        if (hexDistance(other.hex, enemy.hex) <= effect.radius) any = applyStatus(state, other, effect.status, rules, ticks) || any;
      }
      return any;
    }
    case 'statusInCloud': {
      const clouds = cloudsOver(state, enemy.hex);
      let any = false;
      const ticks = scaled(effect.ticks, hit.power, rules.statuses[effect.status]);
      for (const other of [...state.enemies]) {
        if (clouds.some((cloud) => hexDistance(cloud.center, other.hex) <= cloud.radius) && !isClearOfMist(state, other.hex)) any = applyStatus(state, other, effect.status, rules, ticks) || any;
      }
      return any;
    }
    case 'afterStatus': {
      const active = enemy.statuses.find((s) => s.id === effect.status);
      if (!alive || !active || active.then) return false;
      active.then = { status: effect.then, ticks: effect.ticks };
      return true;
    }
    case 'knockback':
      return alive && shove(state, enemy, effect.hexes, true, effect.collisionStatus, effect.collisionTicks, rules) > 0;
    case 'pull':
      return alive && shove(state, enemy, effect.hexes, false, null, null, rules) > 0;
    case 'keepEntranced':
      hit.keepEntranced = true;
      return hasStatus(enemy, 'entranced');
    case 'crackCenser': {
      if (!alive || !rules.enemyTypes[enemy.typeId]!.censer || enemy.censerCracked) return false;
      enemy.censerCracked = true;
      enemy.channel = null;
      state.events.push({ type: 'censer', tick: state.tick, enemyId: enemy.id, what: 'cracked', at: enemy.hex, radius: 0 });
      return true;
    }
  }
}

// ---------------------------------------------------------------- moving humans by force

/** How long a shove or a throw takes to slide along, per hex. */
const SHOVE_TICKS_PER_HEX = 2;

/**
 * Pushes the enemy away from the body (or pulls it towards it), one hex at a time, keeping to its direction.
 * It stops at the edge of the board, at the body, and at another human: if `collisionStatus` is set, both get it.
 * Returns how many hexes it moved.
 */
export function shove(
  state: BattleState,
  enemy: Enemy,
  hexes: number,
  away: boolean,
  collisionStatus: string | null,
  collisionTicks: number | null,
  rules: BattleRules,
): number {
  const center = state.body.center;
  const direction = hexAngle(center, enemy.hex);
  const start = enemy.hex;
  let at = enemy.hex;
  let moved = 0;
  for (let i = 0; i < hexes; i++) {
    const wanted = hexDistance(center, at) + (away ? 1 : -1);
    let next: Hex | null = null;
    let bestDifference = Infinity;
    for (const d of HEX_DIRECTIONS) {
      const candidate = hexAdd(at, d);
      if (hexDistance(center, candidate) !== wanted) continue;
      const difference = angleDifference(hexAngle(center, candidate), direction);
      if (difference < bestDifference - 1e-9) {
        next = candidate;
        bestDifference = difference;
      }
    }
    if (!next || !isOnBoard(next, rules) || bodyDistance(center, next) === 0) break;
    const other = state.enemies.find((e) => e !== enemy && hexEquals(e.hex, next!));
    if (other) {
      if (collisionStatus !== null) {
        applyStatus(state, other, collisionStatus, rules, collisionTicks);
        applyStatus(state, enemy, collisionStatus, rules, collisionTicks);
      }
      break;
    }
    at = next;
    moved++;
  }
  if (moved > 0) placeBySlide(state, enemy, start, at);
  return moved;
}

/** Throws the enemy towards `to`, up to `hexes` hexes. Anyone it lands on and it get the status. Returns where it lands. */
export function toss(state: BattleState, enemy: Enemy, to: Hex, hexes: number, collisionStatus: string, collisionTicks: number | null, rules: BattleRules): Hex {
  const start = enemy.hex;
  let at = start;
  for (let i = 0; i < hexes && !hexEquals(at, to); i++) {
    let next: Hex | null = null;
    for (const d of HEX_DIRECTIONS) {
      const candidate = hexAdd(at, d);
      if (!next || hexDistance(candidate, to) < hexDistance(next, to)) next = candidate;
    }
    if (!next || !isOnBoard(next, rules) || bodyDistance(state.body.center, next) === 0) break;
    const other = state.enemies.find((e) => e !== enemy && hexEquals(e.hex, next!));
    if (other) {
      applyStatus(state, other, collisionStatus, rules, collisionTicks);
      applyStatus(state, enemy, collisionStatus, rules, collisionTicks);
      break;
    }
    at = next;
  }
  if (!hexEquals(at, start)) placeBySlide(state, enemy, start, at);
  return at;
}

function placeBySlide(state: BattleState, enemy: Enemy, from: Hex, to: Hex): void {
  enemy.stepFrom = from;
  enemy.hex = to;
  enemy.stepStartTick = state.tick;
  enemy.stepEndTick = state.tick + SHOVE_TICKS_PER_HEX * Math.max(1, hexDistance(from, to));
  enemy.cauterizingStumpId = null;
}

/** Keys of hexes taken by humans and Broodlings (for walking). */
export function takenHexes(state: BattleState, except: Enemy | Ally | null): Set<string> {
  const standing: Array<Enemy | Ally> = [...state.enemies, ...state.allies];
  return new Set(standing.filter((e) => e !== except).map((e) => hexKey(e.hex)));
}
