// Real-time battle on a hex board, simulated in fixed ticks (20 per second by default). Pausing = not calling stepBattle().
// Same seed + same commands at the same ticks = same battle.
//
// The body covers seven hexes in the middle of the board. Humans walk from hex to hex, surround it and hit
// whatever is next to them: a head if one is there, then a Broodling, otherwise the body. Heads don't stand on hexes:
// they grow out of the body and reach a number of hexes from it. A biting head goes out to its enemy and can be hit
// back there, and so does a head holding a human (Strangler). In the battle for the lair, Broodlings stand on hexes
// round the body, walk to the nearest human and bite it.

import { HEX_DIRECTIONS, hex, hexAdd, hexDistance, hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import { anchorHex, angleDifference, bodyDistance, bodyHexes, boardHexes, canBodyStandAt, distanceField, hexAngle, isOnBoard, rimHexes } from './board';
import {
  afterMeal,
  applyEffect,
  applyStatus,
  beaconFor,
  breakHold,
  canCauterize,
  createMistCloud,
  devourEnemy,
  enemyArmor,
  enemyCan,
  enemyFlees,
  enemyStepTicks,
  healHead,
  hurtEnemy,
  isInMist,
  random,
  randomPick,
  rememberHit,
  removeEnemy,
  takenHexes,
  triggerCombos,
  updateEffects,
  wakeUp,
} from './effects';
import type { HitContext } from './effects';
import { skillBlock, skillInSlot, useSkill } from './skills';
import type { Ally, BattleCommand, BattleHead, BattleOutcome, BattleRules, BattleState, Enemy, HeadAttackRules, HeadRecord, Stump } from './types';

/**
 * Where the first neck leaves the body; the others follow evenly around it. It points north-east, at a hex,
 * nudged a little so that no neck ever points exactly between two hexes.
 */
const FIRST_NECK_ANGLE = -Math.PI / 3 + 0.05;
/** Angle between the heads that grow from one stump. */
const TWIN_SPREAD = 0.2;
/** The body starts in the middle of the board. */
const BOARD_MIDDLE = hex(0, 0);

export interface BattleSetup {
  seed: number;
  heads: readonly HeadRecord[];
  bodyHp: number;
  bodyMaxHp: number;
  /** Enemy type ids, one per enemy. */
  enemies: readonly string[];
  /** First free number for ids of heads grown in this battle (so ids stay unique over the whole run). */
  firstFreeId: number;
  /** Ultimate skills (key E) can be used. */
  ultimatesUnlocked?: boolean;
  /** Broodlings fighting beside the hydra (the battle for the lair). */
  allies?: number;
  /** Burning a stump shut takes this many percent longer (Fireproof Scales). */
  cauterizePercent?: number;
}

/** The two skills a head takes into battle: its own choice if it is still valid, otherwise its class's first two. */
export function battleSkills(record: HeadRecord, rules: BattleRules): string[] {
  const own = rules.headClasses[record.classId]!.skills;
  const chosen = (record.skills ?? []).filter((id) => own.includes(id));
  const result = [...new Set(chosen)].slice(0, 2);
  for (const id of own) if (result.length < 2 && !result.includes(id)) result.push(id);
  return result;
}

function battleHead(record: HeadRecord, anchorAngle: number, twinGroup: number | null, rules: BattleRules): BattleHead {
  return {
    ...record,
    skills: battleSkills(record, rules),
    anchorAngle,
    cooldown: 0,
    skillCooldowns: {},
    orderTargetId: null,
    targetId: null,
    twinGroup,
    holdingId: null,
    hurtWhileHolding: 0,
    meals: 0,
    buffs: [],
    asleepUntilTick: 0,
    pendingSkill: null,
  };
}

export function createBattle(setup: BattleSetup, rules: BattleRules): BattleState {
  const rng = new Rng(setup.seed);
  const heads: BattleHead[] = setup.heads.map((record, i) => battleHead(record, FIRST_NECK_ANGLE + (i / setup.heads.length) * Math.PI * 2, null, rules));

  // The Order starts on the edge of the board, spread evenly around the hydra, with a little randomness.
  const freeRim = rimHexes(rules);
  const ringStart = rng.next() * Math.PI * 2;
  const enemies: Enemy[] = setup.enemies.map((typeId, i) => {
    const type = rules.enemyTypes[typeId];
    if (!type) throw new Error(`Unknown enemy type "${typeId}"`);
    const angle = ringStart + (i / setup.enemies.length) * Math.PI * 2 + (rng.next() - 0.5) * 0.5;
    const start = minBy(freeRim, (h) => angleDifference(hexAngle(BOARD_MIDDLE, h), angle));
    if (!start) throw new Error('No room left on the edge of the battle board for more enemies');
    freeRim.splice(freeRim.indexOf(start), 1);
    return {
      id: i + 1,
      typeId,
      hex: start,
      stepFrom: start,
      stepStartTick: 0,
      stepEndTick: 0,
      hp: type.maxHp,
      maxHp: type.maxHp,
      cooldown: rng.int(0, type.attack.cooldownTicks),
      cauterizingStumpId: null,
      statuses: [],
      armorBroken: false,
      torchOutUntilTick: 0,
      recentHits: [],
      comboCooldowns: {},
      ...(type.charge ? { charging: true } : {}),
      ...(type.shots !== null ? { shotsLeft: type.shots } : {}),
      ...(type.behavior === 'collector' ? { collectProgress: 0, collected: false } : {}),
    };
  });

  // Broodlings stand round the body, spread evenly, on hexes the Order hasn't taken.
  const taken = new Set(enemies.map((e) => hexKey(e.hex)));
  const ring = boardHexes(rules)
    .filter((h) => bodyDistance(BOARD_MIDDLE, h) === 1 && !taken.has(hexKey(h)))
    .sort((a, b) => hexAngle(BOARD_MIDDLE, a) - hexAngle(BOARD_MIDDLE, b));
  const allyCount = Math.min(setup.allies ?? 0, ring.length);
  const allies: Ally[] = Array.from({ length: allyCount }, (_, i) => {
    const at = ring[Math.floor((i * ring.length) / allyCount)]!;
    return { id: i + 1, hex: at, stepFrom: at, stepStartTick: 0, stepEndTick: 0, hp: rules.broodling.maxHp, maxHp: rules.broodling.maxHp, cooldown: 0 };
  });

  // The Spare's Bad Idea: once per battle, at a random moment (only heads present at the start).
  let badIdea: BattleState['badIdea'] = null;
  const spare = heads.find((h) => rules.headClasses[h.classId]!.badIdea !== null);
  if (spare) {
    const idea = rules.headClasses[spare.classId]!.badIdea!;
    const atTick = rng.int(idea.earliestTick, idea.latestTick);
    badIdea = { headId: spare.id, atTick, untilTick: atTick + idea.ticks, done: false, savedOrders: {} };
  }

  return {
    tick: 0,
    rngState: rng.getState(),
    body: {
      center: BOARD_MIDDLE,
      hp: setup.bodyHp,
      maxHp: setup.bodyMaxHp,
      moveTarget: null,
      stepFrom: BOARD_MIDDLE,
      stepStartTick: 0,
      stepEndTick: 0,
    },
    heads,
    stumps: [],
    enemies,
    allies,
    tithesTaken: 0,
    cauterizeMultiplier: Math.max(0.1, 1 + (setup.cauterizePercent ?? 0) / 100),
    clouds: [],
    pools: [],
    beacons: [],
    nextId: Math.max(setup.firstFreeId, setup.enemies.length + 1),
    ultimatesUnlocked: setup.ultimatesUnlocked ?? false,
    nextRegrowthHeads: null,
    lastSkill: null,
    badIdea,
    outcome: null,
    events: [],
  };
}

export function applyCommand(state: BattleState, command: BattleCommand, rules: BattleRules): void {
  if (state.outcome) return;
  switch (command.type) {
    case 'moveBody':
      state.body.moveTarget = nearestBodySpot(command.to, rules);
      break;
    case 'attack': {
      const head = state.heads.find((h) => h.id === command.headId);
      if (head && state.enemies.some((e) => e.id === command.enemyId)) head.orderTargetId = command.enemyId;
      break;
    }
    case 'clearOrder': {
      const head = state.heads.find((h) => h.id === command.headId);
      if (head) {
        head.orderTargetId = null;
        head.pendingSkill = null;
      }
      break;
    }
    case 'useSkill': {
      const head = state.heads.find((h) => h.id === command.headId);
      if (!head) break;
      const skill = skillInSlot(state, head, command.slot, rules);
      if (!skill || command.aim.kind !== skill.target) break;
      // Carried out on the next tick (or later, when its target comes within reach), so orders given in pause wait for the game to run.
      head.pendingSkill = { slot: command.slot, aim: command.aim };
      break;
    }
    case 'chooseSkills': {
      const head = state.heads.find((h) => h.id === command.headId);
      if (!head || state.tick > 0) break;
      head.skills = battleSkills({ ...head, skills: command.skills }, rules);
      break;
    }
  }
}

/** The body can't hang over the edge: a spot near the edge becomes the nearest spot where all seven hexes fit. */
export function nearestBodySpot(to: Hex, rules: BattleRules): Hex {
  if (canBodyStandAt(to, rules)) return to;
  return minBy(boardHexes(rules).filter((h) => canBodyStandAt(h, rules)), (h) => hexDistance(h, to)) ?? BOARD_MIDDLE;
}

export function stepBattle(state: BattleState, rules: BattleRules): void {
  if (state.outcome) return;
  state.tick += 1;
  state.events = [];

  updateBadIdea(state, rules);
  moveBody(state, rules);
  for (const head of [...state.heads]) if (state.heads.includes(head)) updateHead(state, head, rules);
  updateEffects(state, rules);
  for (const ally of [...state.allies]) updateAlly(state, ally, rules);
  for (const enemy of [...state.enemies]) updateEnemy(state, enemy, rules);
  regrowStumps(state, rules, false);

  checkOutcome(state);
}

// ---------------------------------------------------------------- body & heads

/** One step at a time towards the ordered spot, and only when all the hexes it steps onto are free. */
function moveBody(state: BattleState, rules: BattleRules): void {
  const { body } = state;
  const target = body.moveTarget;
  if (!target || state.tick < body.stepEndTick) return;
  if (hexEquals(body.center, target)) {
    body.moveTarget = null;
    return;
  }
  const taken = takenHexes(state, null);
  const closer = hexDistance(body.center, target) - 1;
  const next = HEX_DIRECTIONS.map((d) => hexAdd(body.center, d)).find(
    (c) => hexDistance(c, target) === closer && canBodyStandAt(c, rules) && bodyHexes(c).every((h) => !taken.has(hexKey(h))),
  );
  if (!next) return; // blocked: wait until the way is clear
  body.stepFrom = body.center;
  body.center = next;
  body.stepStartTick = state.tick;
  body.stepEndTick = state.tick + rules.bodyStepTicks;
}

/** The hex a head is at: the human it holds, or its enemy's hex while it bites (melee), otherwise its own side of the body. */
export function headHex(state: BattleState, head: BattleHead, rules: BattleRules): Hex {
  if (head.holdingId !== null) {
    const held = state.enemies.find((e) => e.id === head.holdingId);
    if (held) return held.hex;
  }
  if (rules.headClasses[head.classId]!.attack.melee && head.targetId !== null) {
    const target = state.enemies.find((e) => e.id === head.targetId);
    if (target) return target.hex;
  }
  return anchorHex(state.body.center, head.anchorAngle);
}

/** Is the enemy close enough to the body for this head's neck (or spit, or breath) to reach? */
export function canHeadReach(state: BattleState, head: BattleHead, enemy: Enemy, rules: BattleRules): boolean {
  return bodyDistance(state.body.center, enemy.hex) <= rules.headClasses[head.classId]!.attack.range;
}

/** How fast the head attacks now: 1 = normal, 2 = twice as fast (Frenzy, Rally Cry, rage), 0.5 = half (grief). */
export function headAttackSpeed(state: BattleState, head: BattleHead): number {
  let speed = 1;
  for (const buff of head.buffs) if (buff.kind === 'attackSpeed' && state.tick < buff.untilTick) speed *= buff.multiplier;
  return speed;
}

function updateHead(state: BattleState, head: BattleHead, rules: BattleRules): void {
  const { attack } = rules.headClasses[head.classId]!;
  for (const id of Object.keys(head.skillCooldowns)) head.skillCooldowns[id] = Math.max(0, head.skillCooldowns[id]! - 1);
  endBuffs(state, head);
  if (state.tick < head.asleepUntilTick) {
    head.targetId = null;
    return;
  }
  if (head.cooldown > 0) head.cooldown = Math.max(0, head.cooldown - headAttackSpeed(state, head));

  if (head.pendingSkill) tryPendingSkill(state, head, rules);
  if (!state.heads.includes(head)) return;
  bottomlessHunger(state, head, rules);

  // Tender: licks the most wounded head first (unless it was ordered at a human).
  if (attack.healsHeads > 0 && head.orderTargetId === null) {
    const wounded = minBy(
      state.heads.filter((h) => h.hp < h.maxHp),
      (h) => h.hp / h.maxHp,
    );
    if (wounded) {
      head.targetId = null;
      if (head.cooldown <= 0) {
        head.cooldown = attack.cooldownTicks;
        healHead(state, wounded, attack.healsHeads, rules);
      }
      return;
    }
  }

  const target = pickHeadTarget(state, head, rules);
  head.targetId = target?.id ?? null;
  if (target && head.cooldown <= 0) {
    head.cooldown = attack.cooldownTicks;
    headAttackLands(state, head, target, attack, rules);
    if (!state.enemies.includes(target)) head.targetId = null;
  }
}

function endBuffs(state: BattleState, head: BattleHead): void {
  const ended = head.buffs.filter((b) => state.tick >= b.untilTick);
  if (ended.length === 0) return;
  head.buffs = head.buffs.filter((b) => !ended.includes(b));
  for (const buff of ended) {
    if (buff.kind === 'bottomless') head.asleepUntilTick = Math.max(head.asleepUntilTick, state.tick + buff.sleepTicks);
  }
}

/** Glutton's Bottomless: eats every weak human in reach. */
function bottomlessHunger(state: BattleState, head: BattleHead, rules: BattleRules): void {
  const hunger = head.buffs.find((b) => b.kind === 'bottomless');
  if (!hunger || hunger.kind !== 'bottomless') return;
  const { devourHeal } = rules.headClasses[head.classId]!.attack;
  for (const enemy of [...state.enemies]) {
    if (canHeadReach(state, head, enemy, rules) && enemy.hp < enemy.maxHp * hunger.hpShare) devourEnemy(state, enemy, devourHeal, head, rules);
  }
}

function tryPendingSkill(state: BattleState, head: BattleHead, rules: BattleRules): void {
  const pending = head.pendingSkill!;
  const skill = skillInSlot(state, head, pending.slot, rules);
  if (!skill) {
    head.pendingSkill = null;
    return;
  }
  const block = skillBlock(state, head, skill, pending.aim, rules);
  if (block === null) {
    head.pendingSkill = null;
    useSkill(state, head, skill, pending.aim, rules);
    return;
  }
  // Waiting makes sense only for a target still to come into reach, or a skill still cooling down.
  if (block !== 'outOfReach' && block !== 'cooldown' && block !== 'asleep') {
    head.pendingSkill = null;
    state.events.push({ type: 'skill', tick: state.tick, headId: head.id, skillId: skill.id, at: null, worked: false });
  }
}

function pickHeadTarget(state: BattleState, head: BattleHead, rules: BattleRules): Enemy | null {
  // A head holding a human keeps at it.
  if (head.holdingId !== null) {
    const held = state.enemies.find((e) => e.id === head.holdingId);
    if (held) return held;
  }
  if (head.orderTargetId !== null) {
    const ordered = state.enemies.find((e) => e.id === head.orderTargetId);
    if (!ordered) head.orderTargetId = null;
    // An order waits until its enemy comes within reach; meanwhile the head fights whoever else it can.
    else if (canHeadReach(state, head, ordered, rules)) return ordered;
  }
  // By itself: of the enemies in reach, the one nearest to this head's side of the body (keeping the current one on a tie).
  // So heads left alone spread out over the enemies; ganging up on one (and setting off combos) takes an order.
  // Heads leave kneeling (Entranced) humans alone unless ordered: hitting them would wake them up.
  const side = anchorHex(state.body.center, head.anchorAngle);
  const inReach = state.enemies.filter((e) => canHeadReach(state, head, e, rules));
  const awake = inReach.filter((e) => !e.statuses.some((s) => rules.statuses[s.id]!.endsOnDamage));
  const candidates = awake.length > 0 ? awake : inReach;
  const best = minBy(candidates, (e) => hexDistance(side, e.hex));
  const current = candidates.find((e) => e.id === head.targetId);
  if (current && best && hexDistance(side, current.hex) <= hexDistance(side, best.hex)) return current;
  return best;
}

/** A head's attack hits: damage, then combos with what is already on the target, then what this attack leaves behind. */
function headAttackLands(state: BattleState, head: BattleHead, target: Enemy, attack: HeadAttackRules, rules: BattleRules): void {
  const at = target.hex;
  const hit: HitContext = { head, tags: attack.tags, hitDamage: 0, power: 1, keepEntranced: false };
  if (attack.damage > 0) hit.hitDamage = hurtEnemy(state, target, Math.max(1, attack.damage - enemyArmor(target, rules)), 'head', head.id, rules, false);
  if (!state.enemies.includes(target)) {
    // Killed by the bite: a Glutton eats what it killed.
    if (attack.devourHeal > 0) afterMeal(state, target, attack.devourHeal, head, rules);
    if (attack.createsMistCloud) createMistCloud(state, at, rules, undefined, undefined, head.id);
    return;
  }
  triggerCombos(state, 'headHitsEnemy', target, hit, rules);
  // The hit wakes an Entranced human only now: a combo could still use the trance (Rude Awakening, Anointing).
  if (state.enemies.includes(target) && hit.hitDamage > 0 && !hit.keepEntranced) wakeUp(state, target, rules);
  if (state.enemies.includes(target)) {
    if (attack.appliesStatus !== null) applyStatus(state, target, attack.appliesStatus, rules, attack.statusTicks);
    if (attack.randomEffects.length > 0 && random(state) < attack.randomEffectChance) {
      const effect = randomPick(state, attack.randomEffects);
      applyEffect(state, target, effect, hit, rules);
      state.events.push({ type: 'mischief', tick: state.tick, headId: head.id, effect: effect.type === 'status' ? effect.status : effect.type, at });
    }
  }
  if (attack.createsMistCloud) createMistCloud(state, at, rules, undefined, undefined, head.id);
  if (state.enemies.includes(target)) rememberHit(state, target, head, attack.tags, rules);
}

// ---------------------------------------------------------------- the Spare's Bad Idea

function updateBadIdea(state: BattleState, rules: BattleRules): void {
  const idea = state.badIdea;
  if (!idea || idea.done) return;
  if (state.tick === idea.atTick) {
    const spare = state.heads.find((h) => h.id === idea.headId);
    if (!spare || state.enemies.length === 0) {
      idea.done = true;
      return;
    }
    // Everyone goes for one random human, wherever it is. The old orders come back afterwards.
    const victim = randomPick(state, state.enemies);
    for (const head of state.heads) {
      idea.savedOrders[head.id] = head.orderTargetId;
      head.orderTargetId = victim.id;
    }
    state.events.push({ type: 'badIdea', tick: state.tick, headId: spare.id, enemyId: victim.id });
  } else if (state.tick >= idea.untilTick && state.tick > idea.atTick) {
    for (const head of state.heads) {
      if (head.id in idea.savedOrders) head.orderTargetId = idea.savedOrders[head.id] ?? null;
    }
    idea.done = true;
  }
  void rules;
}

// ---------------------------------------------------------------- enemies

function updateEnemy(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  if (!state.enemies.includes(enemy)) return; // killed earlier this tick
  const type = rules.enemyTypes[enemy.typeId]!;
  if (enemy.cooldown > 0) enemy.cooldown -= 1;
  if (state.tick < enemy.stepEndTick) return; // still on the way to its next hex
  const canWalk = enemyCan(enemy, 'canWalk', rules);

  // A false light draws it in, and it kneels there.
  const beacon = beaconFor(state, enemy, rules);
  if (beacon) {
    enemy.cauterizingStumpId = null;
    if (hexDistance(enemy.hex, beacon.at) <= 1) {
      if (beacon.kneel) applyStatus(state, enemy, 'entranced', rules, rules.ticksPerSecond);
      if (beacon.takesTorches && type.cauterizeTicks !== null) enemy.torchOutUntilTick = Number.MAX_SAFE_INTEGER;
      return;
    }
    if (canWalk) walk(state, enemy, freeHexes(state, enemy, rules).filter((h) => hexDistance(h, beacon.at) <= 1), rules);
    return;
  }

  if (enemyFlees(enemy, rules)) {
    enemy.cauterizingStumpId = null;
    if (canWalk) fleeStep(state, enemy, rules);
    return;
  }

  if (type.behavior === 'collector' && type.collectTicks !== null) {
    collectTithe(state, enemy, type.collectTicks, canWalk, rules);
    return;
  }
  if (type.behavior === 'torchbearer' && type.cauterizeTicks !== null && canCauterize(state, enemy, rules) && tendStump(state, enemy, cauterizeTicksFor(state, enemy, rules), canWalk, rules)) return;
  enemy.cauterizingStumpId = null;

  if (enemyCan(enemy, 'canAttack', rules)) {
    const target = pickEnemyTarget(state, enemy, rules);
    if (target) {
      if (enemy.cooldown <= 0) {
        enemy.cooldown = type.attack.cooldownTicks;
        // A charging knight's first blow lands harder.
        const damage = type.attack.damage * (enemy.charging && type.charge ? type.charge.firstHitMultiplier : 1);
        enemy.charging = type.charge ? false : undefined;
        if (enemy.shotsLeft !== undefined && enemy.shotsLeft > 0) enemy.shotsLeft -= 1;
        if (target.kind === 'body') damageBody(state, damage, enemy.id);
        else if (target.kind === 'ally') damageAlly(state, target.ally, damage, enemy.id);
        else damageHead(state, target.head, damage * type.bonusDamageVsHeads, enemy.id, rules);
      }
      return;
    }
  }
  if (canWalk) walk(state, enemy, attackSpots(state, enemy, rules), rules);
}

/**
 * A Tithe Collector walks up to the body and counts what the hydra has (it takes collectTicks, and a status that
 * stops channelling stops the counting), then runs for the edge of the board. There it is gone, with the tithe.
 */
function collectTithe(state: BattleState, enemy: Enemy, collectTicks: number, canWalk: boolean, rules: BattleRules): void {
  const center = state.body.center;
  if (!enemy.collected) {
    if (bodyDistance(center, enemy.hex) <= 1) {
      if (!enemyCan(enemy, 'canChannel', rules)) return;
      enemy.collectProgress = (enemy.collectProgress ?? 0) + 1;
      if (enemy.collectProgress >= collectTicks) {
        enemy.collected = true;
        state.events.push({ type: 'collected', tick: state.tick, enemyId: enemy.id, at: enemy.hex });
      }
      return;
    }
    if (canWalk) walk(state, enemy, freeHexes(state, enemy, rules).filter((h) => bodyDistance(center, h) <= 1), rules);
    return;
  }
  const rim = rimHexes(rules);
  if (!canWalk) return;
  if (rim.some((h) => hexEquals(h, enemy.hex))) {
    removeEnemy(state, enemy, rules);
    state.tithesTaken += 1;
    state.events.push({ type: 'escaped', tick: state.tick, enemyId: enemy.id, at: enemy.hex });
    return;
  }
  const taken = takenHexes(state, enemy);
  walk(state, enemy, rim.filter((h) => !taken.has(hexKey(h))), rules);
}

/** How far the enemy reaches now: a crossbowman out of bolts comes in close. */
export function enemyRange(enemy: Enemy, rules: BattleRules): number {
  return enemy.shotsLeft === 0 ? 1 : rules.enemyTypes[enemy.typeId]!.attack.range;
}

type EnemyTarget = { kind: 'head'; head: BattleHead } | { kind: 'ally'; ally: Ally } | { kind: 'body' };

/**
 * Who this enemy can hit from where it stands: a head first (it is in the way; the one biting this enemy before others,
 * then the weakest), then the weakest Broodling, otherwise the body. Headhunters leave the body alone while there are
 * heads to take. A crossbowman sees nothing through Mist (blindInMist) but what is right next to him.
 */
function pickEnemyTarget(state: BattleState, enemy: Enemy, rules: BattleRules): EnemyTarget | null {
  const type = rules.enemyTypes[enemy.typeId]!;
  const range = enemyRange(enemy, rules);
  const sees = (h: Hex): boolean => !type.blindInMist || hexDistance(enemy.hex, h) <= 1 || (!isInMist(state, h) && !isInMist(state, enemy.hex));
  const inReach = state.heads.filter((h) => {
    const at = headHex(state, h, rules);
    return hexDistance(enemy.hex, at) <= range && sees(at);
  });
  const biter = inReach.find((h) => (h.targetId === enemy.id && rules.headClasses[h.classId]!.attack.melee) || h.holdingId === enemy.id);
  const head = biter ?? minBy(inReach, (h) => h.hp);
  if (head) return { kind: 'head', head };
  const ally = minBy(
    state.allies.filter((a) => hexDistance(enemy.hex, a.hex) <= range && sees(a.hex)),
    (a) => a.hp,
  );
  if (ally) return { kind: 'ally', ally };
  const bodyInReach = bodyDistance(state.body.center, enemy.hex) <= range && sees(nearestBodyHex(state.body.center, enemy.hex));
  if (bodyInReach && (type.behavior !== 'headhunter' || state.heads.length === 0)) return { kind: 'body' };
  return null;
}

/** The hex of the body nearest to `h`. */
function nearestBodyHex(center: Hex, h: Hex): Hex {
  return minBy(bodyHexes(center), (b) => hexDistance(b, h)) ?? center;
}

/**
 * Free hexes from which this enemy could attack: near a head for Headhunters, near the body for everyone else. A
 * crossbowman who sees nothing from where he stands (Mist) comes up close.
 */
function attackSpots(state: BattleState, enemy: Enemy, rules: BattleRules): Hex[] {
  const type = rules.enemyTypes[enemy.typeId]!;
  const reach = enemyRange(enemy, rules);
  const range = type.blindInMist && bodyDistance(state.body.center, enemy.hex) <= reach ? 1 : reach;
  const free = freeHexes(state, enemy, rules);
  if (type.behavior === 'headhunter' && state.heads.length > 0) {
    const headSpots = state.heads.map((h) => headHex(state, h, rules));
    return free.filter((h) => headSpots.some((s) => hexDistance(h, s) <= range));
  }
  return free.filter((h) => bodyDistance(state.body.center, h) <= range);
}

/** Board hexes this enemy could stand on: not under the body, not taken by another enemy (its own hex counts as free). */
function freeHexes(state: BattleState, enemy: Enemy, rules: BattleRules): Hex[] {
  const taken = takenHexes(state, enemy);
  return boardHexes(rules).filter((h) => bodyDistance(state.body.center, h) > 0 && !taken.has(hexKey(h)));
}

/** Takes one step along the shortest way to the nearest goal, walking around the body. Waits if someone is in the way. */
function walk(state: BattleState, enemy: Enemy | Ally, goals: readonly Hex[], rules: BattleRules): void {
  if (goals.length === 0) return;
  const center = state.body.center;
  const field = distanceField(goals, (h) => isOnBoard(h, rules) && bodyDistance(center, h) > 0);
  const here = field.get(hexKey(enemy.hex));
  if (here === undefined || here === 0) return;
  const taken = takenHexes(state, enemy);
  let next: Hex | null = null;
  let nextSteps = here;
  for (const neighbor of hexNeighbors(enemy.hex)) {
    const steps = field.get(hexKey(neighbor));
    if (steps === undefined || steps >= nextSteps || taken.has(hexKey(neighbor))) continue;
    next = neighbor;
    nextSteps = steps;
  }
  if (next) stepTo(state, enemy, next, rules);
}

/** Terrified: one step further from the body, if there is a free hex further away. */
function fleeStep(state: BattleState, enemy: Enemy, rules: BattleRules): void {
  const center = state.body.center;
  const taken = takenHexes(state, enemy);
  const here = hexDistance(center, enemy.hex);
  const away = hexNeighbors(enemy.hex).filter((n) => isOnBoard(n, rules) && !taken.has(hexKey(n)) && hexDistance(center, n) > here);
  const next = minBy(away, (n) => angleDifference(hexAngle(center, n), hexAngle(center, enemy.hex)));
  if (next) stepTo(state, enemy, next, rules);
}

function stepTo(state: BattleState, enemy: Enemy | Ally, next: Hex, rules: BattleRules): void {
  enemy.stepFrom = enemy.hex;
  enemy.hex = next;
  enemy.stepStartTick = state.tick;
  enemy.stepEndTick = state.tick + ('typeId' in enemy ? enemyStepTicks(enemy, rules) : rules.broodling.stepTicks);
}

// ---------------------------------------------------------------- Broodlings

/** A Broodling bites the weakest human in reach, or walks to the nearest one. */
function updateAlly(state: BattleState, ally: Ally, rules: BattleRules): void {
  if (!state.allies.includes(ally)) return;
  const { attack } = rules.broodling;
  if (ally.cooldown > 0) ally.cooldown -= 1;
  if (state.tick < ally.stepEndTick) return;
  const target = minBy(
    state.enemies.filter((e) => hexDistance(ally.hex, e.hex) <= attack.range),
    (e) => e.hp,
  );
  if (target) {
    if (ally.cooldown <= 0) {
      ally.cooldown = attack.cooldownTicks;
      hurtEnemy(state, target, Math.max(1, attack.damage - enemyArmor(target, rules)), 'ally', ally.id, rules);
    }
    return;
  }
  const taken = takenHexes(state, ally);
  const center = state.body.center;
  const goals = boardHexes(rules).filter((h) => bodyDistance(center, h) > 0 && !taken.has(hexKey(h)) && state.enemies.some((e) => hexDistance(e.hex, h) <= attack.range));
  walk(state, ally, goals, rules);
}

function damageAlly(state: BattleState, ally: Ally, damage: number, attackerId: number): void {
  ally.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', attackerId, targetKind: 'ally', targetId: ally.id, damage, at: ally.hex });
  if (ally.hp > 0) return;
  state.allies = state.allies.filter((a) => a !== ally);
  state.events.push({ type: 'allyKilled', tick: state.tick, allyId: ally.id, at: ally.hex });
}

/** How long this human takes to burn a stump shut in this battle (the hydra's Fireproof Scales make it longer). */
export function cauterizeTicksFor(state: BattleState, enemy: Enemy, rules: BattleRules): number {
  return Math.max(1, Math.round((rules.enemyTypes[enemy.typeId]!.cauterizeTicks ?? 1) * state.cauterizeMultiplier));
}

/** Returns true if the Torchbearer spent this tick on a stump (walking to it or burning it). */
function tendStump(state: BattleState, enemy: Enemy, cauterizeTicks: number, canWalk: boolean, rules: BattleRules): boolean {
  const center = state.body.center;
  const open = state.stumps.filter((s) => !s.cauterized && state.tick >= (s.protectedUntilTick ?? 0));
  const stump = open.find((s) => s.id === enemy.cauterizingStumpId) ?? minBy(open, (s) => hexDistance(enemy.hex, anchorHex(center, s.anchorAngle)));
  if (!stump) return false;

  const spot = anchorHex(center, stump.anchorAngle);
  if (hexDistance(enemy.hex, spot) > 1) {
    enemy.cauterizingStumpId = null;
    if (!canWalk) return false;
    const nextToStump = freeHexes(state, enemy, rules).filter((h) => hexDistance(h, spot) === 1);
    if (nextToStump.length === 0) return false; // no room at the stump: fight instead
    walk(state, enemy, nextToStump, rules);
    return true;
  }
  enemy.cauterizingStumpId = stump.id;
  stump.cauterizeProgress += 1;
  if (stump.cauterizeProgress >= cauterizeTicks) {
    stump.cauterized = true;
    enemy.cauterizingStumpId = null;
    state.events.push({ type: 'cauterized', tick: state.tick, stumpId: stump.id });
  }
  return true;
}

function damageHead(state: BattleState, head: BattleHead, damage: number, attackerId: number, rules: BattleRules): void {
  head.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', attackerId, targetKind: 'head', targetId: head.id, damage, at: headHex(state, head, rules) });
  if (head.holdingId !== null) {
    head.hurtWhileHolding += damage;
    const held = state.enemies.find((e) => e.id === head.holdingId);
    const hold = held?.statuses.find((s) => s.sourceHeadId === head.id);
    const breaksAt = hold ? rules.statuses[hold.id]!.breaksWhenHolderTakes : null;
    if (breaksAt !== null && head.hurtWhileHolding >= breaksAt) breakHold(state, head, rules);
  }
  if (head.hp > 0) return;
  // Severed: the head is gone, a stump stays where its neck was.
  if (head.holdingId !== null) breakHold(state, head, rules);
  state.heads = state.heads.filter((h) => h !== head);
  const stump: Stump = {
    id: state.nextId++,
    anchorAngle: head.anchorAngle,
    regrowAtTick: state.tick + rules.regrowTicks,
    cauterizeProgress: 0,
    cauterized: false,
  };
  state.stumps.push(stump);
  state.events.push({ type: 'severed', tick: state.tick, headId: head.id, name: head.name, stumpId: stump.id });
  twinLoss(state, head, rules);
}

/** Heads from the same stump take the loss badly: each falls into a rage or into grief (random) for a while. */
function twinLoss(state: BattleState, lost: BattleHead, rules: BattleRules): void {
  if (lost.twinGroup === null) return;
  for (const twin of state.heads) {
    if (twin.twinGroup !== lost.twinGroup) continue;
    const mood = random(state) < 0.5 ? 'rage' : 'grief';
    const multiplier = mood === 'rage' ? rules.twinLoss.rageAttackSpeed : rules.twinLoss.griefAttackSpeed;
    twin.buffs.push({ kind: 'attackSpeed', multiplier, untilTick: state.tick + rules.twinLoss.ticks, mood });
    state.events.push({ type: 'mood', tick: state.tick, headId: twin.id, mood });
  }
}

function damageBody(state: BattleState, damage: number, attackerId: number): void {
  state.body.hp -= damage;
  state.events.push({ type: 'hit', tick: state.tick, attacker: 'enemy', attackerId, targetKind: 'body', targetId: 'body', damage, at: state.body.center });
}

// ---------------------------------------------------------------- regrowth & end

/** Grows two heads (three after Triplets) from each due stump (or from every open stump when `all` is true). */
function regrowStumps(state: BattleState, rules: BattleRules, all: boolean): void {
  const due = state.stumps.filter((s) => !s.cauterized && (all || state.tick >= s.regrowAtTick));
  for (const stump of due) {
    state.stumps = state.stumps.filter((s) => s !== stump);
    const wanted = state.nextRegrowthHeads ?? 2;
    state.nextRegrowthHeads = null;
    const count = Math.max(0, Math.min(wanted, rules.maxHeads - state.heads.length));
    const headIds: string[] = [];
    for (let i = 0; i < count; i++) {
      const spread = count === 1 ? 0 : -TWIN_SPREAD + (2 * TWIN_SPREAD * i) / (count - 1);
      const head = hatchling(state, rules, stump.anchorAngle + spread, stump.id);
      state.heads.push(head);
      headIds.push(head.id);
    }
    for (const enemy of state.enemies) if (enemy.cauterizingStumpId === stump.id) enemy.cauterizingStumpId = null;
    state.events.push({ type: 'regrown', tick: state.tick, stumpId: stump.id, headIds });
  }
}

function hatchling(state: BattleState, rules: BattleRules, anchorAngle: number, twinGroup: number): BattleHead {
  const classId = randomPick(state, rules.hatchlingClassPool);
  const cls = rules.headClasses[classId]!;
  const taken = new Set(state.heads.map((h) => h.name));
  const freeNames = rules.headNames.filter((name) => !taken.has(name));
  const record: HeadRecord = {
    id: `h${state.nextId++}`,
    name: randomPick(state, freeNames.length > 0 ? freeNames : rules.headNames),
    classId,
    level: 1,
    hp: cls.maxHp,
    maxHp: cls.maxHp,
  };
  return battleHead(record, anchorAngle, twinGroup, rules);
}

function checkOutcome(state: BattleState): void {
  let outcome: BattleOutcome | null = null;
  if (state.body.hp <= 0) outcome = 'lost';
  else if (state.enemies.length === 0) outcome = 'won';
  if (!outcome) return;
  state.outcome = outcome;
  state.events.push({ type: 'ended', tick: state.tick, outcome });
}

export interface BattleResult {
  outcome: BattleOutcome;
  bodyHp: number;
  heads: HeadRecord[];
  /** Stumps burnt shut in this battle; they stay as scars. */
  newScars: number;
  nextId: number;
  /** Broodlings still alive (missing: none fought). */
  alliesLeft?: number;
  /** Tithe Collectors that got away with the tithe (missing: none). */
  tithesTaken?: number;
}

/** What goes back to the map. Stumps still waiting to regrow do so right away. */
export function battleResult(state: BattleState, rules: BattleRules): BattleResult {
  if (!state.outcome) throw new Error('battleResult() called before the battle ended');
  const newScars = state.stumps.filter((s) => s.cauterized).length;
  regrowStumps(state, rules, true);
  return {
    outcome: state.outcome,
    bodyHp: Math.max(0, state.body.hp),
    heads: state.heads.map(({ id, name, classId, level, hp, maxHp, skills }) => ({ id, name, classId, level, hp, maxHp, skills: [...skills] })),
    newScars,
    nextId: state.nextId,
    alliesLeft: state.allies.length,
    tithesTaken: state.tithesTaken,
  };
}

// ---------------------------------------------------------------- helpers

/** The item with the smallest score; on a tie, the earlier one. Null for an empty list. */
function minBy<T>(items: readonly T[], score: (item: T) => number): T | null {
  let best: T | null = null;
  let bestScore = Infinity;
  for (const item of items) {
    const s = score(item);
    if (s < bestScore) {
      best = item;
      bestScore = s;
    }
  }
  return best;
}
