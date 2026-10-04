// State of one run on the strategic map, and the commands that change it.
// Commands mutate the state and return events, which the scenes use to animate and show messages.
// What the hydra meets on the way (thresholds, places, remains, hints) is in ./world.

import type { BattleResult, BattleSetup } from '../battle';
import { hexDistance, hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { generateUnderground, hexesSeenFrom, updateVisibility } from '../map';
import type { MapObject } from '../map';
import { Rng } from '../rng';
import type { BlessingEffects, Reachable, RunEvent, RunRules, RunState } from './types';
import { arriveAt, battleSilenced, lookAround, movementForTurn, raiseAlert, tickConditions, tileAt } from './world';

export interface RunOptions {
  /** Run modifiers (ids from world.json runModifiers) that shape this run's world. */
  modifiers?: readonly string[];
}

export function createRun(seed: number, rules: RunRules, options: RunOptions = {}): RunState {
  const map = generateUnderground(seed, { ...rules.generator, modifiers: [...(options.modifiers ?? [])] }, rules.terrain);
  // A separate stream from the map's, so changing starting heads never changes the map.
  const rng = new Rng((seed ^ 0x5eed) >>> 0);
  const names = [...rules.headNames];
  const heads = rules.startingHeads.map((h, i) => {
    const name = names.splice(rng.int(0, names.length - 1), 1)[0] ?? `Head ${i + 1}`;
    return { id: `h${i + 1}`, name, classId: h.classId, level: 1, hp: h.maxHp, maxHp: h.maxHp };
  });

  const state: RunState = {
    seed,
    turn: 1,
    map,
    hydra: {
      position: map.lair,
      movementLeft: rules.movementPointsPerTurn,
      movementPerTurn: rules.movementPointsPerTurn,
      sightRange: rules.sightRangeHexes,
      bodyHp: rules.bodyMaxHp,
      bodyMaxHp: rules.bodyMaxHp,
      regeneration: rules.healing.bodyHpPerTurn,
      heads,
      scars: 0,
      blessings: [],
      conditions: [],
    },
    visibility: new Map(),
    alert: rules.alertMin,
    resources: { muck: 0, moisture: 0, bones: 0 },
    pendingBattle: null,
    pendingShrine: null,
    pendingPlace: null,
    echoes: [],
    draughtsFelt: [],
    battlesFought: 0,
    nextId: heads.length + 1,
    rngState: rng.getState(),
    over: false,
  };
  // Seeing the lair's surroundings at the start doesn't count as exploring.
  lookAround(state, rules, []);
  return state;
}

/** The hydra is busy: a battle, a shrine or a panel waits for an answer, or it is dead. Nothing else can happen until then. */
function isWaiting(state: RunState): boolean {
  return state.over || state.pendingBattle !== null || state.pendingShrine !== null || state.pendingPlace !== null;
}

/** Objects the hydra stops at when it walks onto them, and can't walk through. */
function stopsTheHydra(object: MapObject | null): boolean {
  return object?.kind === 'encounter' || (object?.kind === 'shrine' && !object.used) || (object?.kind === 'place' && !object.visited);
}

/**
 * Hexes the hydra can reach this turn, with the cheapest path to each.
 * Only known (explored) hexes can be crossed. Encounters, unused shrines and places not yet visited can be entered but not crossed.
 */
export function reachableHexes(state: RunState, rules: RunRules): Map<string, Reachable> {
  const start = state.hydra.position;
  const best = new Map<string, Reachable>([[hexKey(start), { cost: 0, path: [] }]]);
  if (isWaiting(state)) return new Map();
  const frontier: Hex[] = [start];
  while (frontier.length > 0) {
    // A simple "take the cheapest" is enough here and easier to read than a priority queue.
    frontier.sort((a, b) => best.get(hexKey(a))!.cost - best.get(hexKey(b))!.cost);
    const current = frontier.shift()!;
    const here = best.get(hexKey(current))!;
    const tile = state.map.tiles.get(hexKey(current))!;
    if (!hexEquals(current, start) && stopsTheHydra(tile.object)) continue;
    for (const next of hexNeighbors(current)) {
      const key = hexKey(next);
      const nextTile = state.map.tiles.get(key);
      if (!nextTile || !state.visibility.has(key)) continue;
      const stepCost = rules.terrain[nextTile.terrain].moveCost;
      if (stepCost === null) continue;
      const cost = here.cost + stepCost;
      if (cost > state.hydra.movementLeft) continue;
      const known = best.get(key);
      if (known && known.cost <= cost) continue;
      best.set(key, { cost, path: [...here.path, next] });
      frontier.push(next);
    }
  }
  best.delete(hexKey(start));
  return best;
}

/**
 * Moves the hydra step by step, revealing the map as it goes. Does nothing if the target is out of reach.
 * Ending the move on a place with something to do opens its panel.
 */
export function moveHydra(state: RunState, target: Hex, rules: RunRules): RunEvent[] {
  const route = reachableHexes(state, rules).get(hexKey(target));
  if (!route) return [];

  const events: RunEvent[] = [];
  const walked: Hex[] = [];
  let discovered = 0;
  let stopped = false;
  for (const step of route.path) {
    const tile = tileAt(state, step)!;
    state.hydra.movementLeft -= rules.terrain[tile.terrain].moveCost!;
    walked.push(step);
    const arrived = arriveAt(state, step, rules, events);
    discovered += arrived.discovered;
    if (arrived.stop) {
      stopped = true;
      break;
    }
  }
  if (!stopped) {
    const object = tileAt(state, target)?.object;
    if (object?.kind === 'place' && (rules.places[object.placeId]?.actions.length ?? 0) > 0) {
      state.pendingPlace = target;
      events.push({ type: 'placeReached', at: target, placeId: object.placeId, firstVisit: false });
    }
  }

  events.unshift({ type: 'moved', path: walked });
  if (discovered > 0) {
    raiseAlert(state, discovered * rules.alertPerHexDiscovered, rules);
    events.push({ type: 'discovered', count: discovered });
  }
  if (state.pendingBattle) events.push({ type: 'battleStarted', at: state.pendingBattle.at });
  return events;
}

/**
 * The player taps a place or a threshold to deal with it. The place the hydra stands on: its panel opens.
 * A closed threshold it knows: the hydra walks next to it the cheapest way (if it can this turn), and its panel opens.
 * Anything else: nothing happens.
 */
export function inspect(state: RunState, target: Hex, rules: RunRules): RunEvent[] {
  if (isWaiting(state) || !state.visibility.has(hexKey(target))) return [];
  const object = tileAt(state, target)?.object;
  if (object?.kind === 'place' && hexEquals(target, state.hydra.position)) {
    state.pendingPlace = target;
    return [{ type: 'placeReached', at: target, placeId: object.placeId, firstVisit: false }];
  }
  if (object?.kind !== 'threshold' || object.state !== 'closed') return [];

  const events: RunEvent[] = [];
  if (hexDistance(state.hydra.position, target) > 1) {
    const approach = thresholdApproach(state, target, rules);
    if (!approach) return [];
    events.push(...moveHydra(state, approach, rules));
    if (isWaiting(state) || hexDistance(state.hydra.position, target) > 1) return events;
  }
  state.pendingPlace = target;
  events.push({ type: 'thresholdReached', at: target, thresholdId: object.thresholdId });
  return events;
}

/** The hex next to a threshold the hydra can reach most cheaply this turn, without walking into anything that stops it. */
export function thresholdApproach(state: RunState, threshold: Hex, rules: RunRules): Hex | null {
  const reachable = reachableHexes(state, rules);
  let best: { hex: Hex; cost: number } | null = null;
  for (const h of hexNeighbors(threshold)) {
    const route = reachable.get(hexKey(h));
    if (!route || stopsTheHydra(tileAt(state, h)?.object ?? null)) continue;
    if (!best || route.cost < best.cost) best = { hex: h, cost: route.cost };
  }
  return best?.hex ?? null;
}

// ---------------------------------------------------------------- shrines

function pendingShrineObject(state: RunState): Extract<MapObject, { kind: 'shrine' }> | null {
  if (!state.pendingShrine) return null;
  const object = tileAt(state, state.pendingShrine)?.object;
  return object?.kind === 'shrine' ? object : null;
}

/** Takes the blessing of the shrine the hydra stands at: its effects apply now, and the shrine has nothing more to give. */
export function acceptBlessing(state: RunState, rules: RunRules): RunEvent[] {
  const shrine = pendingShrineObject(state);
  if (!shrine) return [];
  const effects = rules.blessings[shrine.blessingId];
  if (!effects) throw new Error(`Unknown blessing "${shrine.blessingId}"`);
  applyBlessing(state, effects, rules);
  shrine.used = true;
  state.hydra.blessings.push(shrine.blessingId);
  state.pendingShrine = null;
  return [{ type: 'blessingAccepted', blessingId: shrine.blessingId }];
}

/** Walks away from the shrine; it keeps its blessing for later. */
export function refuseBlessing(state: RunState): RunEvent[] {
  const shrine = pendingShrineObject(state);
  if (!shrine) return [];
  state.pendingShrine = null;
  return [{ type: 'blessingRefused', blessingId: shrine.blessingId }];
}

function applyBlessing(state: RunState, effects: BlessingEffects, rules: RunRules): void {
  const { hydra } = state;
  if (effects.movement) {
    const before = hydra.movementPerTurn;
    hydra.movementPerTurn = Math.max(1, hydra.movementPerTurn + effects.movement);
    // Felt at once: this turn's movement changes by the same amount.
    hydra.movementLeft = Math.max(0, hydra.movementLeft + (hydra.movementPerTurn - before));
  }
  if (effects.sight) {
    hydra.sightRange = Math.max(1, hydra.sightRange + effects.sight);
    updateVisibility(state.visibility, hexesSeenFrom(state.map, hydra.position, hydra.sightRange, rules.terrain));
  }
  if (effects.bodyMaxHp) {
    const before = hydra.bodyMaxHp;
    hydra.bodyMaxHp = Math.max(20, hydra.bodyMaxHp + effects.bodyMaxHp);
    hydra.bodyHp = Math.max(1, Math.min(hydra.bodyMaxHp, hydra.bodyHp + (hydra.bodyMaxHp - before)));
  }
  if (effects.regeneration) hydra.regeneration = Math.max(0, hydra.regeneration + effects.regeneration);
  if (effects.alert) raiseAlert(state, effects.alert, rules);
  if (effects.muck) state.resources.muck = Math.max(0, state.resources.muck + effects.muck);
  if (effects.moisture) state.resources.moisture = Math.max(0, state.resources.moisture + effects.moisture);
}

// ---------------------------------------------------------------- battles

/** Everything the battle simulation needs to start the pending battle. */
export function pendingBattleSetup(state: RunState, rules: RunRules): BattleSetup | null {
  const pending = state.pendingBattle;
  if (!pending) return null;
  const enemies = rules.encounterGroupMembers[pending.groupId];
  if (!enemies) throw new Error(`Unknown encounter group "${pending.groupId}"`);
  return {
    // Every battle of a run gets its own seed, derived from the run seed.
    seed: (Math.imul(state.seed ^ 0x9e3779b9, state.battlesFought + 1) ^ Math.imul(pending.at.q, 73856093) ^ Math.imul(pending.at.r, 19349663)) >>> 0,
    heads: state.hydra.heads.map((h) => ({ ...h })),
    bodyHp: state.hydra.bodyHp,
    bodyMaxHp: state.hydra.bodyMaxHp,
    enemies,
    firstFreeId: state.nextId,
  };
}

/**
 * Applies a finished battle: new head line-up, body HP, scars; if won, the encounter is cleared and its people give Bones.
 * The Order hears every battle (the Alert rises), except near the Silent Bell.
 */
export function finishBattle(state: RunState, result: BattleResult, rules: RunRules): RunEvent[] {
  const pending = state.pendingBattle;
  if (!pending) return [];
  state.pendingBattle = null;
  state.battlesFought += 1;
  state.nextId = result.nextId;
  state.hydra.heads = result.heads.map((h) => ({ ...h }));
  state.hydra.bodyHp = result.bodyHp;
  state.hydra.scars += result.newScars;
  const silenced = battleSilenced(state, pending.at, rules);
  if (!silenced) raiseAlert(state, rules.alertPerBattle, rules);

  if (result.outcome === 'lost') {
    state.over = true;
    return [{ type: 'hydraDied' }];
  }
  const tile = tileAt(state, pending.at);
  if (tile?.object?.kind === 'encounter') tile.object = null;
  const bones = (rules.encounterGroupMembers[pending.groupId]?.length ?? 0) * rules.bonesPerEnemy;
  state.resources.bones += bones;
  return [{ type: 'battleWon', at: pending.at, bones, silenced }];
}

// ---------------------------------------------------------------- turns and the lair

/**
 * Ends the turn: conditions wear off, movement comes back, the body and heads heal a little.
 * Ending it in the lair is resting: everything heals fully, and burnt stumps heal and grow heads again.
 */
export function endTurn(state: RunState, rules: RunRules): RunEvent[] {
  if (isWaiting(state)) return [];
  const { hydra } = state;
  const events: RunEvent[] = [];
  state.turn += 1;
  tickConditions(state, events);
  hydra.movementLeft = movementForTurn(state, rules);
  hydra.bodyHp = Math.min(hydra.bodyMaxHp, hydra.bodyHp + hydra.regeneration);
  for (const head of hydra.heads) head.hp = Math.min(head.maxHp, head.hp + rules.healing.headHpPerTurn);

  if (hexEquals(hydra.position, state.map.lair)) {
    hydra.bodyHp = hydra.bodyMaxHp;
    for (const head of hydra.heads) head.hp = head.maxHp;
    const healedScars = hydra.scars;
    hydra.scars = 0;
    const newHeadIds = growHeads(state, rules, healedScars * 2);
    events.push({ type: 'rested', healedScars, newHeadIds });
  }
  events.push({ type: 'turnEnded', turn: state.turn });
  return events;
}

/** New hatchling heads (random class and name), as many as fit under the head limit. */
function growHeads(state: RunState, rules: RunRules, count: number): string[] {
  const rng = Rng.fromState(state.rngState);
  const ids: string[] = [];
  for (let i = 0; i < count && state.hydra.heads.length < rules.maxHeads; i++) {
    const cls = rng.pick(rules.hatchlingClasses);
    const taken = new Set(state.hydra.heads.map((h) => h.name));
    const free = rules.headNames.filter((name) => !taken.has(name));
    const head = { id: `h${state.nextId++}`, name: rng.pick(free.length > 0 ? free : rules.headNames), classId: cls.classId, level: 1, hp: cls.maxHp, maxHp: cls.maxHp };
    state.hydra.heads.push(head);
    ids.push(head.id);
  }
  state.rngState = rng.getState();
  return ids;
}
