// The Order of the Eternal Flame on the map (GAME_DESIGN.md §5.5, §5.7, §8): it hears how alarmed it should be (the
// Alert stages), sends people down the Passages (and the Old Workings shaft) and out over the surface from the castle
// and its camps, and moves them in the world turn, after End Turn. Patrols walk from chamber to chamber (on the
// surface, from village to Passage) and follow the hydra once they see her; walking onto her is a battle. After a
// battle a messenger runs for the nearest way back to the Order: if he gets there, the Alert jumps; the hydra can eat
// him. On the surface, Torchbearers go to light the Flame Shrines she put out.

import { hasLineOfSight, hexDistance, hexEquals, hexKey, hexNeighbors, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import type { Layer, Tile } from '../map';
import { Rng } from '../rng';
import { gainMutation } from './mutations';
import { meetEnemies, storyMoment } from './story';
import { clearMist, hasMist, relightShrine } from './surface';
import type { OrderGroupRules, OrderState, OrderUnit, OrderUnitKind, RunEvent, RunRules, RunState } from './types';
import { hydraOn, isNight, mapOf, noteSightings, raiseAlert, tileOn, visibilityOf } from './world';

export function newOrder(seed: number, rules: RunRules): OrderState {
  return {
    act: 1,
    stagesReached: [],
    units: [],
    nextUnitId: 1,
    nextPatrolTurn: rules.order.patrols.firstOnTurn,
    nextExpeditionTurn: null,
    greatBurningSent: false,
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

/** The Order's unit standing on a hex of a layer, if any. */
export function orderUnitAt(state: RunState, at: Hex, layer: Layer): OrderUnit | undefined {
  return state.order.units.find((u) => u.layer === layer && hexEquals(u.at, at));
}

function unitsOn(state: RunState, layer: Layer): OrderUnit[] {
  return state.order.units.filter((u) => u.layer === layer);
}

/** Where the Order comes down: the Passages, and the top of the Old Workings shaft. */
export function orderEntrances(state: RunState): Hex[] {
  const passages = [...state.map.tiles.values()].filter((t) => t.object?.kind === 'passage').map((t) => t.hex);
  return state.map.layout.orderShaft ? [...passages, state.map.layout.orderShaft] : passages;
}

/** Where the Order's people on the surface come from and run back to: the castle and its camps. */
export function orderHomes(state: RunState): Hex[] {
  return [state.surface.map.castle, ...state.surface.map.camps];
}

/** Ways back to the Order on a layer: the Passages and the shaft below, the castle and the camps above. */
function waysBack(state: RunState, layer: Layer): Hex[] {
  return layer === 'surface' ? orderHomes(state) : orderEntrances(state);
}

// ---------------------------------------------------------------- the world turn

/** The Order's part of the world turn, after End Turn. */
export function orderTurn(state: RunState, rules: RunRules, events: RunEvent[]): void {
  if (rules.order.alertPerTurn > 0) raiseAlert(state, rules.order.alertPerTurn, rules);
  hearAlert(state, rules, events);
  const rng = Rng.fromState(state.order.rngState);
  raidTheLair(state, rules, rng, events);
  sendPatrol(state, rules, rng, events);
  sendToTheLair(state, rules, rng, events);
  sendSurfacePatrol(state, rules, rng, events);
  sendRelights(state, rules, events);
  // Each unit in turn, the oldest first; the first to walk onto the hydra fights her, the rest wait.
  for (const unit of [...state.order.units]) {
    if (state.pendingBattle) break;
    if (unit.kind === 'messenger') runForIt(state, unit, rules, events);
    else if (unit.kind === 'patrol') patrol(state, unit, rules, rng, events);
    else if (unit.kind === 'relight') relight(state, unit, rules, events);
    else march(state, unit, rules, events);
    // A Censer Priest's smoke clears the mist round him (GAME_DESIGN.md §5.6).
    if (unit.layer === 'surface' && state.order.units.includes(unit) && carriesCenser(unit, rules)) clearMist(state, hexesInRange(unit.at, rules.surface.mist.censerClears));
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
    if (stage.id === rules.order.expeditions.fromStage) state.order.nextExpeditionTurn = state.turn + rules.order.expeditions.firstAfterTurns;
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
  if (unitsOn(state, 'underground').filter((u) => u.kind === 'patrol').length >= most) return;
  const hydra = hydraOn(state, 'underground');
  const entrances = orderEntrances(state).filter((h) => freeFor(state, h, 'underground') && !(hydra && hexEquals(h, hydra)));
  if (entrances.length === 0) return;
  const at = rng.pick(entrances);
  const ring = tileOn(state, 'underground', at)!.ring;
  const groups = patrols.groups.filter((g) => groupAllowed(state, g, ring));
  if (groups.length === 0) return;
  const groupId = rng.weightedPick(groups).groupId;
  const unit = addOrderUnit(state, 'patrol', at, groupId, rules, 'underground');
  order.nextPatrolTurn = state.turn + (patrols.everyTurnsByStage[stageIndex(state)] ?? 1);
  events.push({ type: 'orderArrived', unitId: unit.id, kind: 'patrol', at, seen: seenByHydra(state, unit) });
}

/** Is a unit's hex in the hydra's sight (she is on its layer and sees it now)? */
function seenByHydra(state: RunState, unit: OrderUnit): boolean {
  return unit.layer === state.hydra.layer && visibilityOf(state, unit.layer).get(hexKey(unit.at)) === 'visible';
}

/** On the surface, patrols set out from the castle and the camps, as many as the Alert stage allows (surface.json). */
function sendSurfacePatrol(state: RunState, rules: RunRules, rng: Rng, events: RunEvent[]): void {
  const { patrols } = rules.surface.order;
  const { surface, order } = state;
  if (surface.nextPatrolTurn === null || state.turn < surface.nextPatrolTurn) return;
  const most = (patrols.maxByStage[stageIndex(state)] ?? 0) + rules.order.patrols.actMaxBonus * (order.act - 1);
  if (unitsOn(state, 'surface').filter((u) => u.kind === 'patrol').length >= most) return;
  const groups = patrols.groups.filter((g) => groupAllowed(state, g, 0));
  const at = setOutSpot(state, rng.pick(orderHomes(state)));
  if (groups.length === 0 || !at) return;
  const unit = addOrderUnit(state, 'patrol', at, rng.weightedPick(groups).groupId, rules, 'surface');
  surface.nextPatrolTurn = state.turn + patrols.everyTurns;
  events.push({ type: 'orderArrived', unitId: unit.id, kind: 'patrol', at, seen: seenByHydra(state, unit) });
}

/** A free hex at a home of the Order on the surface (the castle, a camp) or next to it, where people can set out; null if none. */
function setOutSpot(state: RunState, home: Hex): Hex | null {
  const hydra = hydraOn(state, 'surface');
  return [home, ...hexNeighbors(home)].find((h) => freeFor(state, h, 'surface') && !(hydra && hexEquals(h, hydra))) ?? null;
}

/**
 * Torchbearers set out to light each Flame Shrine put out, once its time has come (surface.json flameShrines.relight),
 * from whichever home of the Order is nearest to it.
 */
function sendRelights(state: RunState, rules: RunRules, events: RunEvent[]): void {
  const { relight } = rules.surface.flameShrines;
  for (const [key, onTurn] of Object.entries(state.surface.relights)) {
    if (onTurn > state.turn) continue;
    const shrine = state.surface.map.shrines.find((h) => hexKey(h) === key);
    if (!shrine || state.order.units.some((u) => u.kind === 'relight' && u.goal && hexEquals(u.goal, shrine))) continue;
    const homes = [...orderHomes(state)].sort((a, b) => hexDistance(a, shrine) - hexDistance(b, shrine));
    const at = homes.map((h) => setOutSpot(state, h)).find((h): h is Hex => h !== null);
    if (!at) continue;
    const unit = addOrderUnit(state, 'relight', at, relight.groupId, rules, 'surface');
    unit.goal = shrine;
    events.push({ type: 'relightSent', unitId: unit.id, at, shrine });
  }
}

/** Torchbearers walk to their shrine; there, they light it, and stay to guard it. On the way they fight the hydra if she stands in it. */
function relight(state: RunState, unit: OrderUnit, rules: RunRules, events: RunEvent[]): void {
  const shrine = unit.goal;
  if (!shrine) return;
  const ways = waysFrom(state, rules, unit.at, unit, () => true, 'surface');
  walk(state, unit, pathTo(ways, shrine), rules.surface.flameShrines.relight.movement, rules, events);
  const hydra = hydraOn(state, 'surface');
  if (hydra && hexEquals(unit.at, hydra)) {
    fight(state, unit);
    events.push({ type: 'orderAttacked', unitId: unit.id, at: unit.at });
  } else if (hexEquals(unit.at, shrine)) {
    removeUnit(state, unit);
    relightShrine(state, shrine, unit, rules, events);
  }
}

function carriesCenser(unit: OrderUnit, rules: RunRules): boolean {
  return (rules.encounterGroupMembers[unit.groupId] ?? []).includes(rules.surface.mist.censerType);
}

/** A unit of the Order comes onto a map at `at` (groupId: its people, from enemies.json; '' for a messenger). */
export function addOrderUnit(state: RunState, kind: OrderUnitKind, at: Hex, groupId: string, rules: RunRules, layer: Layer): OrderUnit {
  const unit: OrderUnit = { id: `o${state.order.nextUnitId++}`, kind, layer, at, groupId, tier: rules.encounterGroupTiers[groupId] ?? 1, goal: null, chase: 0, trail: null };
  state.order.units.push(unit);
  return unit;
}

/** A unit can stand here: open ground with no encounter, no burning shrine's guard and no other unit on it. */
function freeFor(state: RunState, at: Hex, layer: Layer, unit: OrderUnit | null = null): boolean {
  const tile = tileOn(state, layer, at);
  if (!tile || tile.terrain === 'rock' || holdsPeople(tile)) return false;
  const other = orderUnitAt(state, at, layer);
  return !other || other === unit;
}

/** People already stand on this hex: an encounter, or the guard of a burning Flame Shrine. */
function holdsPeople(tile: Tile): boolean {
  return tile.object?.kind === 'encounter' || (tile.object?.kind === 'flameShrine' && tile.object.burning);
}

/**
 * Can a unit see the hydra (on its layer, within its sight, nothing blocking the view)? On the surface, mist hides her
 * but from close by; Exposed, she is seen from afar, less far at night (surface.json order).
 */
function seesHydra(state: RunState, unit: OrderUnit, rules: RunRules): boolean {
  const to = hydraOn(state, unit.layer);
  if (!to) return false;
  let range = rules.order.patrols.sight;
  if (unit.layer === 'surface') {
    const { order, dayNight } = rules.surface;
    range = hasMist(state, to) ? order.sightInMist : Math.max(1, order.sight - (isNight(state.turn, rules) ? dayNight.nightSight : 0));
  }
  if (hexDistance(unit.at, to) > range) return false;
  return hasLineOfSight(unit.at, to, (h) => {
    const tile = tileOn(state, unit.layer, h);
    return !tile || rules.terrain[tile.terrain].blocksSight;
  });
}

/**
 * A patrol (or an expedition) walks: after the hydra if it sees her (and for a few turns after losing her, to where it
 * saw her last), else from chamber to chamber. Walking onto the hydra starts a battle.
 */
function patrol(state: RunState, unit: OrderUnit, rules: RunRules, rng: Rng, events: RunEvent[]): void {
  const patrols = unit.layer === 'surface' ? rules.surface.order.patrols : rules.order.patrols;
  if (seesHydra(state, unit, rules)) {
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
  const ways = waysFrom(state, rules, unit.at, unit, (h) => chasing || tileOn(state, unit.layer, h)!.region !== 'lair', unit.layer);
  let goal: Hex | null = chasing ? unit.trail : unit.goal;
  if (!goal || hexEquals(goal, unit.at) || !ways.has(hexKey(goal))) {
    goal = wanderGoal(state, unit, ways, rng);
    unit.goal = goal;
  }
  if (!goal) return;
  walk(state, unit, pathTo(ways, goal), patrols.movement, rules, events);
  const hydra = hydraOn(state, unit.layer);
  if (hydra && hexEquals(unit.at, hydra)) {
    fight(state, unit);
    events.push({ type: 'orderAttacked', unitId: unit.id, at: unit.at });
  }
}

/** A battle with a unit where the hydra stands: in the lair, a battle for the lair. */
function fight(state: RunState, unit: OrderUnit): void {
  const at = state.hydra.position;
  const defense = unit.layer === 'underground' && hexEquals(at, state.map.lair);
  state.pendingBattle = defense ? { at, layer: unit.layer, groupId: unit.groupId, unitId: unit.id, defense: true } : { at, layer: unit.layer, groupId: unit.groupId, unitId: unit.id };
}

// ---------------------------------------------------------------- expeditions and the Great Burning

/**
 * From its Alert stage on, an expedition sets out for the lair, one at a time; at the last stage, once per act, the
 * Great Burning. They come down where the way to the lair is longest (the Order likes a procession).
 */
function sendToTheLair(state: RunState, rules: RunRules, rng: Rng, events: RunEvent[]): void {
  const { order } = state;
  const { expeditions, greatBurning } = rules.order;
  if (stageReached(state, greatBurning.atStage) && !order.greatBurningSent) {
    if (setOut(state, 'greatBurning', greatBurning.groupId, rules, events)) order.greatBurningSent = true;
  }
  const out = order.units.some((u) => u.kind === 'expedition');
  if (out || order.nextExpeditionTurn === null || state.turn < order.nextExpeditionTurn) return;
  const ring = (at: Hex) => tileOn(state, 'underground', at)!.ring;
  const entrance = farthestEntrance(state, rules);
  if (!entrance) return;
  const groups = expeditions.groups.filter((g) => groupAllowed(state, g, ring(entrance)));
  if (groups.length === 0) return;
  if (setOut(state, 'expedition', rng.weightedPick(groups).groupId, rules, events)) order.nextExpeditionTurn = null;
}

/** People of the Order set out for the lair from the entrance farthest from it. Returns whether they could. */
function setOut(state: RunState, kind: OrderUnitKind, groupId: string, rules: RunRules, events: RunEvent[]): boolean {
  const at = farthestEntrance(state, rules);
  if (!at) return false;
  const unit = addOrderUnit(state, kind, at, groupId, rules, 'underground');
  unit.goal = state.map.lair;
  events.push({ type: 'expeditionSent', unitId: unit.id, kind, at });
  return true;
}

/** The free entrance with the longest way to the lair (the thresholds still shut keep some out), or null. */
function farthestEntrance(state: RunState, rules: RunRules): Hex | null {
  const ways = waysFrom(state, rules, state.map.lair, null, () => true, 'underground');
  const hydra = hydraOn(state, 'underground');
  let best: { at: Hex; cost: number } | null = null;
  for (const at of orderEntrances(state)) {
    const way = ways.get(hexKey(at));
    if (!way || !freeFor(state, at, 'underground') || (hydra && hexEquals(at, hydra))) continue;
    if (!best || way.cost > best.cost) best = { at, cost: way.cost };
  }
  return best?.at ?? null;
}

/** An expedition (or the Great Burning) walks to the lair; on the way it fights the hydra if she stands in it. */
function march(state: RunState, unit: OrderUnit, rules: RunRules, events: RunEvent[]): void {
  const lair = state.map.lair;
  if (hexEquals(unit.at, lair)) return;
  const ways = waysFrom(state, rules, unit.at, unit, () => true, 'underground');
  const movement = unit.kind === 'greatBurning' ? rules.order.greatBurning.movement : rules.order.expeditions.movement;
  walk(state, unit, pathTo(ways, lair), movement, rules, events);
  const hydra = hydraOn(state, 'underground');
  if (hydra && hexEquals(unit.at, hydra)) {
    fight(state, unit);
    events.push({ type: 'orderAttacked', unitId: unit.id, at: unit.at });
  }
}

/**
 * The Order camps in the lair while the hydra is away (GAME_DESIGN.md §5.5): every world turn it kills a Broodling
 * guarding it, or, when none is left, breaks an egg.
 */
function raidTheLair(state: RunState, rules: RunRules, rng: Rng, events: RunEvent[]): void {
  const hydra = hydraOn(state, 'underground');
  if (hydra && hexEquals(hydra, state.map.lair)) return;
  for (const unit of unitsOn(state, 'underground')) {
    if (!hexEquals(unit.at, state.map.lair) || unit.kind === 'messenger') continue;
    for (let i = 0; i < rules.order.siege.perTurn; i++) {
      const { lair } = state;
      if (lair.defenders > 0) {
        lair.defenders -= 1;
        events.push({ type: 'lairRaided', unitId: unit.id, killed: 'defender' });
      } else if (lair.eggs.length > 0) {
        lair.eggs.splice(rng.int(0, lair.eggs.length - 1), 1);
        events.push({ type: 'lairRaided', unitId: unit.id, killed: 'egg' });
      }
    }
  }
}

/**
 * A unit is beaten. An expedition: the next one comes after a while. The Great Burning: the act is survived, and a
 * new one begins (GAME_DESIGN.md §4: the Alert starts again from nothing, and the Order is stronger).
 */
export function unitBeaten(state: RunState, unit: OrderUnit, rules: RunRules, events: RunEvent[]): void {
  removeUnit(state, unit);
  const { order } = state;
  if (unit.kind === 'expedition') order.nextExpeditionTurn = state.turn + rules.order.expeditions.everyTurns;
  // Torchbearers beaten on the way: others will try again, after a while.
  if (unit.kind === 'relight' && unit.goal) state.surface.relights[hexKey(unit.goal)] = state.turn + rules.surface.flameShrines.relight.afterTurns;
  if (unit.kind === 'greatBurning') {
    // The beaten Master is eaten, and leaves her something of himself (GAME_DESIGN.md §12).
    const fresh = rules.order.greatBurning.mutations.filter((id) => !state.hydra.mutations.includes(id));
    if (fresh.length > 0) {
      const rng = Rng.fromState(order.rngState);
      const id = rng.pick(fresh);
      order.rngState = rng.getState();
      gainMutation(state, id, rules, events);
    }
    order.act += 1;
    order.stagesReached = [];
    order.nextExpeditionTurn = null;
    order.greatBurningSent = false;
    state.alert = rules.alertMin;
    events.push({ type: 'actBegins', act: order.act });
  }
}

/**
 * Somewhere new to walk to, picked at random among those the unit can get to: a free hex of another chamber, or on
 * the surface a village, a mill, a watchtower, a camp or a Passage.
 */
function wanderGoal(state: RunState, unit: OrderUnit, ways: Map<string, Way>, rng: Rng): Hex | null {
  if (unit.layer === 'surface') {
    const spots = [...state.surface.map.tiles.values()]
      .filter((t) => (t.object?.kind === 'settlement' || t.object?.kind === 'passage') && !hexEquals(t.hex, unit.at) && ways.has(hexKey(t.hex)))
      .map((t) => t.hex);
    return spots.length > 0 ? rng.pick(spots) : null;
  }
  const chambers = state.map.layout.chambers.filter((c) => !c.hexes.some((h) => hexEquals(h, unit.at)));
  const spots = chambers.map((c) => c.hexes.find((h) => ways.has(hexKey(h)) && !tileOn(state, 'underground', h)!.object)).filter((h): h is Hex => h !== undefined);
  return spots.length > 0 ? rng.pick(spots) : null;
}

/**
 * A messenger runs for the nearest way up. He keeps clear of the hydra. Getting there, he is gone, and the Order
 * knows: the Alert jumps.
 */
function runForIt(state: RunState, unit: OrderUnit, rules: RunRules, events: RunEvent[]): void {
  const hydra = hydraOn(state, unit.layer);
  const ways = waysFrom(state, rules, unit.at, unit, (h) => !(hydra && hexEquals(h, hydra)), unit.layer);
  const goal = nearestWayBack(state, ways, unit.layer);
  if (!goal) return;
  unit.goal = goal;
  walk(state, unit, pathTo(ways, goal), rules.order.messengers.movement, rules, events);
  if (!hexEquals(unit.at, goal)) return;
  state.order.units = state.order.units.filter((u) => u !== unit);
  const alert = rules.order.messengers.alertOnArrival;
  raiseAlert(state, alert, rules);
  events.push({ type: 'messengerEscaped', unitId: unit.id, alert });
}

function nearestWayBack(state: RunState, ways: Map<string, Way>, layer: Layer): Hex | null {
  let best: { at: Hex; cost: number } | null = null;
  for (const at of waysBack(state, layer)) {
    const way = ways.get(hexKey(at));
    if (way && (!best || way.cost < best.cost)) best = { at, cost: way.cost };
  }
  return best?.at ?? null;
}

/** Walks a unit along `path` as far as its movement goes. It doesn't stop on a hex another unit or an encounter holds. */
function walk(state: RunState, unit: OrderUnit, path: readonly Hex[], movement: number, rules: RunRules, events: RunEvent[]): void {
  const walked: Hex[] = [];
  const hydra = hydraOn(state, unit.layer);
  const atHydra = (h: Hex) => hydra !== null && hexEquals(h, hydra);
  let left = movement;
  for (const step of path) {
    const cost = rules.terrain[tileOn(state, unit.layer, step)!.terrain].moveCost ?? Infinity;
    if (cost > left) break;
    left -= cost;
    walked.push(step);
    if (atHydra(step)) break;
  }
  // Back off from a hex it can't stay on (passing through is fine). A shrine's own Torchbearers may step onto it.
  const mayStay = (h: Hex) => atHydra(h) || freeFor(state, h, unit.layer, unit) || (unit.kind === 'relight' && unit.goal !== null && hexEquals(h, unit.goal));
  while (walked.length > 0 && !mayStay(walked[walked.length - 1]!)) walked.pop();
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
  const layer = state.hydra.layer;
  const ways = waysFrom(state, rules, from, null, () => true, layer);
  const goal = nearestWayBack(state, ways, layer);
  if (!goal) return;
  const path = pathTo(ways, goal);
  let at = from;
  for (const step of path.slice(0, rules.order.messengers.headStart)) if (freeFor(state, step, layer)) at = step;
  if (hexEquals(at, from) && path.length > 0) at = path[0]!;
  if (!freeFor(state, at, layer) || hexEquals(at, state.hydra.position)) return;
  const unit = addOrderUnit(state, 'messenger', at, '', rules, layer);
  events.push({ type: 'messengerSent', unitId: unit.id, at });
}

/**
 * The hydra steps onto a hex the Order holds. A messenger is eaten on the spot (Bones, and the Alert falls); anyone
 * else fights: a battle. Returns whether she must stop here.
 */
export function meetOrderAt(state: RunState, at: Hex, rules: RunRules, events: RunEvent[]): boolean {
  const unit = orderUnitAt(state, at, state.hydra.layer);
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
  fight(state, unit);
  return true;
}

/** A unit is gone (beaten, eaten): it leaves the map and the hydra's memory of it. */
export function removeUnit(state: RunState, unit: OrderUnit): void {
  state.order.units = state.order.units.filter((u) => u !== unit);
  state.order.sightings = state.order.sightings.filter((s) => s.unitId !== unit.id);
}

/** Visible units of the Order: the hydra can walk into them, but not through them. */
export function orderBlocks(state: RunState, at: Hex): boolean {
  return visibilityOf(state).get(hexKey(at)) === 'visible' && orderUnitAt(state, at, state.hydra.layer) !== undefined;
}

// ---------------------------------------------------------------- ways

export interface Way {
  cost: number;
  /** The hex before this one on the cheapest way, or null at the start. */
  from: string | null;
  at: Hex;
}

/**
 * The cheapest ways from `from` to every hex of a layer that can be got to, by the terrain's costs, through hexes
 * `open` allows. Encounters, shrines' guards and the Order's units (but `mover`, the one walking) are walked around;
 * the hydra's hex can be walked into, and a relighting party's own shrine. Every hex counts, known to the hydra or not.
 */
export function waysFrom(state: RunState, rules: RunRules, from: Hex, mover: OrderUnit | null, open: (h: Hex) => boolean, layer: Layer): Map<string, Way> {
  const unit = mover;
  const tiles = mapOf(state, layer).tiles;
  const hydra = hydraOn(state, layer);
  const units = unitsOn(state, layer);
  const ways = new Map<string, Way>([[hexKey(from), { cost: 0, from: null, at: from }]]);
  // Costs are small whole numbers, so a list per cost is all the queue needed.
  const queue: Hex[][] = [[from]];
  for (let cost = 0; cost < queue.length; cost++) {
    for (const current of queue[cost] ?? []) {
      const key = hexKey(current);
      if (ways.get(key)!.cost !== cost) continue;
      for (const next of hexNeighbors(current)) {
        const nextKey = hexKey(next);
        const tile = tiles.get(nextKey);
        const step = tile ? rules.terrain[tile.terrain].moveCost : null;
        if (step === null || !open(next)) continue;
        const ownShrine = unit?.kind === 'relight' && unit.goal !== null && hexEquals(next, unit.goal);
        const blocked = (holdsPeople(tile!) && !ownShrine) || units.some((u) => u !== unit && hexEquals(u.at, next));
        if (blocked && !(hydra && hexEquals(next, hydra))) continue;
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
export function pathTo(ways: Map<string, Way>, goal: Hex): Hex[] {
  const path: Hex[] = [];
  let way = ways.get(hexKey(goal));
  while (way && way.from !== null) {
    path.unshift(way.at);
    way = ways.get(way.from);
  }
  return path;
}
