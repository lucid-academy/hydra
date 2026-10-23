// The Order of the Eternal Flame on the map (GAME_DESIGN.md §5.5, §8): it hears how alarmed it should be (the Alert
// stages), sends people down the Passages (and the Old Workings shaft), and moves them in the world turn, after End
// Turn. Patrols walk from chamber to chamber and follow the hydra once they see her; walking onto her is a battle.
// After a battle a messenger runs for the nearest Passage: if he gets there, the Alert jumps; the hydra can eat him.

import { hasLineOfSight, hexDistance, hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import { meetEnemies, storyMoment } from './story';
import type { OrderGroupRules, OrderState, OrderUnit, OrderUnitKind, RunEvent, RunRules, RunState } from './types';
import { noteSightings, raiseAlert, tileAt } from './world';

export function newOrder(seed: number, rules: RunRules): OrderState {
  return {
    act: 1,
    stagesReached: [],
    units: [],
    nextUnitId: 1,
    nextPatrolTurn: rules.order.patrols.firstOnTurn,
    sightings: [],
    // Its own stream of random numbers, so what the Order does never changes the map or the hydra's luck.
    rngState: new Rng((seed ^ 0x0de7) >>> 0).getState(),
  };
}

/** Whether the Order has reached this Alert stage in this act. */
export function stageReached(state: RunState, stageId: string): boolean {
  return state.order.stagesReached.includes(stageId);
}

/** Whether the Order sends this group now: from act 2 on, every group it has (GAME_DESIGN.md §4). */
function groupAllowed(state: RunState, group: OrderGroupRules, ring: number): boolean {
  return group.minRing <= ring && (group.fromStage === null || state.order.act > 1 || stageReached(state, group.fromStage));
}

/** The Order's unit standing on a hex, if any. */
export function orderUnitAt(state: RunState, at: Hex): OrderUnit | undefined {
  return state.order.units.find((u) => hexEquals(u.at, at));
}

/** Where the Order comes down: the Passages, and the top of the Old Workings shaft. */
export function orderEntrances(state: RunState): Hex[] {
  const passages = [...state.map.tiles.values()].filter((t) => t.object?.kind === 'passage').map((t) => t.hex);
  return state.map.layout.orderShaft ? [...passages, state.map.layout.orderShaft] : passages;
}

// ---------------------------------------------------------------- the world turn

/** The Order's part of the world turn, after End Turn. */
export function orderTurn(state: RunState, rules: RunRules, events: RunEvent[]): void {
  if (rules.order.alertPerTurn > 0) raiseAlert(state, rules.order.alertPerTurn, rules);
  hearAlert(state, rules, events);
  const rng = Rng.fromState(state.order.rngState);
  sendPatrol(state, rules, rng, events);
  // Each unit in turn, the oldest first; the first to walk onto the hydra fights her, the rest wait.
  for (const unit of [...state.order.units]) {
    if (state.pendingBattle) break;
    if (unit.kind === 'messenger') runForIt(state, unit, rules, events);
    else patrol(state, unit, rules, rng, events);
  }
  state.order.rngState = rng.getState();
  noteSightings(state);
  if (state.pendingBattle) {
    const fresh = meetEnemies(state, rules.encounterGroupMembers[state.pendingBattle.groupId] ?? []);
    storyMoment(state, rules, 'enemyAhead', { newEnemyTypes: fresh }, events);
    events.push({ type: 'battleStarted', at: state.pendingBattle.at });
  }
}

/** Stages the Alert has passed that the Order hasn't heard of yet: it hears of them now, lowest first. */
function hearAlert(state: RunState, rules: RunRules, events: RunEvent[]): void {
  for (const stage of rules.order.stages) {
    if (state.alert < stage.at || state.order.stagesReached.includes(stage.id)) continue;
    state.order.stagesReached.push(stage.id);
    events.push({ type: 'alertStage', stageId: stage.id });
  }
}

/** How many Alert stages the Order has reached in this act (0: none yet), to pick from the lists by stage. */
function stageIndex(state: RunState): number {
  return state.order.stagesReached.length;
}

/** A new patrol comes down when its time has come and there are fewer than the stage allows. */
function sendPatrol(state: RunState, rules: RunRules, rng: Rng, events: RunEvent[]): void {
  const { patrols } = rules.order;
  const { order } = state;
  if (state.turn < order.nextPatrolTurn) return;
  const most = (patrols.maxByStage[stageIndex(state)] ?? 0) + patrols.actMaxBonus * (order.act - 1);
  if (order.units.filter((u) => u.kind === 'patrol').length >= most) return;
  const entrances = orderEntrances(state).filter((h) => freeFor(state, h) && !hexEquals(h, state.hydra.position));
  if (entrances.length === 0) return;
  const at = rng.pick(entrances);
  const ring = tileAt(state, at)!.ring;
  const groups = patrols.groups.filter((g) => groupAllowed(state, g, ring));
  if (groups.length === 0) return;
  const groupId = rng.weightedPick(groups).groupId;
  const unit = addOrderUnit(state, 'patrol', at, groupId, rules);
  order.nextPatrolTurn = state.turn + (patrols.everyTurnsByStage[stageIndex(state)] ?? 1);
  events.push({ type: 'orderArrived', unitId: unit.id, kind: 'patrol', at, seen: state.visibility.get(hexKey(at)) === 'visible' });
}

/** A unit of the Order comes onto the map at `at` (groupId: its people, from enemies.json; '' for a messenger). */
export function addOrderUnit(state: RunState, kind: OrderUnitKind, at: Hex, groupId: string, rules: RunRules): OrderUnit {
  const unit: OrderUnit = { id: `o${state.order.nextUnitId++}`, kind, at, groupId, tier: rules.encounterGroupTiers[groupId] ?? 1, goal: null, chase: 0, trail: null };
  state.order.units.push(unit);
  return unit;
}

/** A unit can stand here: open ground with no encounter and no other unit on it. */
function freeFor(state: RunState, at: Hex, unit: OrderUnit | null = null): boolean {
  const tile = tileAt(state, at);
  if (!tile || tile.terrain === 'rock' || tile.object?.kind === 'encounter') return false;
  const other = orderUnitAt(state, at);
  return !other || other === unit;
}

/** Can a unit at `from` see the hydra (within `range`, nothing blocking the view)? */
function seesHydra(state: RunState, from: Hex, range: number, rules: RunRules): boolean {
  const to = state.hydra.position;
  if (hexDistance(from, to) > range) return false;
  return hasLineOfSight(from, to, (h) => {
    const tile = tileAt(state, h);
    return !tile || rules.terrain[tile.terrain].blocksSight;
  });
}

/**
 * A patrol (or an expedition) walks: after the hydra if it sees her (and for a few turns after losing her, to where it
 * saw her last), else from chamber to chamber. Walking onto the hydra starts a battle.
 */
function patrol(state: RunState, unit: OrderUnit, rules: RunRules, rng: Rng, events: RunEvent[]): void {
  const { patrols } = rules.order;
  if (seesHydra(state, unit.at, patrols.sight, rules)) {
    unit.chase = patrols.chaseTurns;
    unit.trail = state.hydra.position;
  } else if (unit.chase > 0 && unit.trail && !hexEquals(unit.at, unit.trail)) {
    unit.chase -= 1;
  } else {
    unit.chase = 0;
    unit.trail = null;
  }
  const chasing = unit.trail !== null;
  // The lair's swamp is the hydra's: patrols only go in after her.
  const ways = waysFrom(state, rules, unit, (h) => chasing || tileAt(state, h)!.region !== 'lair');
  let goal: Hex | null = chasing ? unit.trail : unit.goal;
  if (!goal || hexEquals(goal, unit.at) || !ways.has(hexKey(goal))) {
    goal = wanderGoal(state, unit, ways, rng);
    unit.goal = goal;
  }
  if (!goal) return;
  walk(state, unit, pathTo(ways, goal), patrols.movement, rules, events);
  if (hexEquals(unit.at, state.hydra.position)) {
    state.pendingBattle = { at: unit.at, groupId: unit.groupId, unitId: unit.id };
    events.push({ type: 'orderAttacked', unitId: unit.id, at: unit.at });
  }
}

/** Somewhere new to walk to: a free hex of a chamber the unit can get to, picked at random. */
function wanderGoal(state: RunState, unit: OrderUnit, ways: Map<string, Way>, rng: Rng): Hex | null {
  const chambers = state.map.layout.chambers.filter((c) => !c.hexes.some((h) => hexEquals(h, unit.at)));
  const spots = chambers.map((c) => c.hexes.find((h) => ways.has(hexKey(h)) && !tileAt(state, h)!.object)).filter((h): h is Hex => h !== undefined);
  return spots.length > 0 ? rng.pick(spots) : null;
}

/**
 * A messenger runs for the nearest way up. He keeps clear of the hydra. Getting there, he is gone, and the Order
 * knows: the Alert jumps.
 */
function runForIt(state: RunState, unit: OrderUnit, rules: RunRules, events: RunEvent[]): void {
  const hydra = hexKey(state.hydra.position);
  const ways = waysFrom(state, rules, unit, (h) => hexKey(h) !== hydra);
  const goal = nearestEntrance(state, ways);
  if (!goal) return;
  unit.goal = goal;
  walk(state, unit, pathTo(ways, goal), rules.order.messengers.movement, rules, events);
  if (!hexEquals(unit.at, goal)) return;
  state.order.units = state.order.units.filter((u) => u !== unit);
  const alert = rules.order.messengers.alertOnArrival;
  raiseAlert(state, alert, rules);
  events.push({ type: 'messengerEscaped', unitId: unit.id, alert });
}

function nearestEntrance(state: RunState, ways: Map<string, Way>): Hex | null {
  let best: { at: Hex; cost: number } | null = null;
  for (const at of orderEntrances(state)) {
    const way = ways.get(hexKey(at));
    if (way && (!best || way.cost < best.cost)) best = { at, cost: way.cost };
  }
  return best?.at ?? null;
}

/** Walks a unit along `path` as far as its movement goes. It doesn't stop on a hex another unit or an encounter holds. */
function walk(state: RunState, unit: OrderUnit, path: readonly Hex[], movement: number, rules: RunRules, events: RunEvent[]): void {
  const walked: Hex[] = [];
  let left = movement;
  for (const step of path) {
    const cost = rules.terrain[tileAt(state, step)!.terrain].moveCost ?? Infinity;
    if (cost > left) break;
    left -= cost;
    walked.push(step);
    if (hexEquals(step, state.hydra.position)) break;
  }
  // Back off from a hex it can't stay on (passing through is fine).
  while (walked.length > 0 && !hexEquals(walked[walked.length - 1]!, state.hydra.position) && !freeFor(state, walked[walked.length - 1]!, unit)) walked.pop();
  if (walked.length === 0) return;
  unit.at = walked[walked.length - 1]!;
  events.push({ type: 'orderMoved', unitId: unit.id, path: walked });
}

// ---------------------------------------------------------------- messengers and the hydra meeting the Order

/**
 * After a battle the Order hears of, a messenger runs for the nearest way up, `headStart` hexes ahead of the hydra.
 * No way up from here (the thresholds are still shut): no messenger.
 */
export function sendMessenger(state: RunState, from: Hex, rules: RunRules, events: RunEvent[]): void {
  const runner: OrderUnit = { id: '', kind: 'messenger', at: from, groupId: '', tier: 1, goal: null, chase: 0, trail: null };
  const ways = waysFrom(state, rules, runner, () => true);
  const goal = nearestEntrance(state, ways);
  if (!goal) return;
  const path = pathTo(ways, goal);
  let at = from;
  for (const step of path.slice(0, rules.order.messengers.headStart)) if (freeFor(state, step)) at = step;
  if (hexEquals(at, from) && path.length > 0) at = path[0]!;
  if (!freeFor(state, at) || hexEquals(at, state.hydra.position)) return;
  const unit = addOrderUnit(state, 'messenger', at, '', rules);
  events.push({ type: 'messengerSent', unitId: unit.id, at });
}

/**
 * The hydra steps onto a hex the Order holds. A messenger is eaten on the spot (Bones, and the Alert falls); anyone
 * else fights: a battle. Returns whether she must stop here.
 */
export function meetOrderAt(state: RunState, at: Hex, rules: RunRules, events: RunEvent[]): boolean {
  const unit = orderUnitAt(state, at);
  if (!unit) return false;
  if (unit.kind === 'messenger') {
    const { messengers } = rules.order;
    removeUnit(state, unit);
    state.resources.bones += messengers.bones;
    raiseAlert(state, messengers.alertWhenEaten, rules);
    const rng = Rng.fromState(state.order.rngState);
    const line = rng.int(0, messengers.eatenLines - 1);
    state.order.rngState = rng.getState();
    events.push({ type: 'messengerEaten', at, bones: messengers.bones, alert: messengers.alertWhenEaten, line });
    return false;
  }
  state.pendingBattle = { at, groupId: unit.groupId, unitId: unit.id };
  return true;
}

/** A unit is gone (beaten, eaten): it leaves the map and the hydra's memory of it. */
export function removeUnit(state: RunState, unit: OrderUnit): void {
  state.order.units = state.order.units.filter((u) => u !== unit);
  state.order.sightings = state.order.sightings.filter((s) => s.unitId !== unit.id);
}

/** Visible units of the Order: the hydra can walk into them, but not through them. */
export function orderBlocks(state: RunState, at: Hex): boolean {
  return state.visibility.get(hexKey(at)) === 'visible' && orderUnitAt(state, at) !== undefined;
}

// ---------------------------------------------------------------- ways

interface Way {
  cost: number;
  /** The hex before this one on the cheapest way, or null at the start. */
  from: string | null;
  at: Hex;
}

/**
 * The cheapest ways from a unit to every hex it can get to, by the terrain's costs, through hexes `open` allows.
 * Encounters and other units are walked around. Every hex counts, known to the hydra or not.
 */
function waysFrom(state: RunState, rules: RunRules, unit: OrderUnit, open: (h: Hex) => boolean): Map<string, Way> {
  const ways = new Map<string, Way>([[hexKey(unit.at), { cost: 0, from: null, at: unit.at }]]);
  // Costs are small whole numbers, so a list per cost is all the queue needed.
  const queue: Hex[][] = [[unit.at]];
  for (let cost = 0; cost < queue.length; cost++) {
    for (const current of queue[cost] ?? []) {
      const key = hexKey(current);
      if (ways.get(key)!.cost !== cost) continue;
      for (const next of hexNeighbors(current)) {
        const nextKey = hexKey(next);
        const tile = state.map.tiles.get(nextKey);
        const step = tile ? rules.terrain[tile.terrain].moveCost : null;
        if (step === null || !open(next)) continue;
        const blocked = tile!.object?.kind === 'encounter' || state.order.units.some((u) => u !== unit && hexEquals(u.at, next));
        if (blocked && !hexEquals(next, state.hydra.position)) continue;
        const known = ways.get(nextKey);
        if (known && known.cost <= cost + step) continue;
        ways.set(nextKey, { cost: cost + step, from: key, at: next });
        (queue[cost + step] ??= []).push(next);
      }
    }
  }
  return ways;
}

/** The steps from the start of `ways` to `goal` (the start left out, the goal included). */
function pathTo(ways: Map<string, Way>, goal: Hex): Hex[] {
  const path: Hex[] = [];
  let way = ways.get(hexKey(goal));
  while (way && way.from !== null) {
    path.unshift(way.at);
    way = ways.get(way.from);
  }
  return path;
}
