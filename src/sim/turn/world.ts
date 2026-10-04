// What the hydra meets on the map besides battles and shrines (GAME_DESIGN.md §9): thresholds between rings, places
// and what can be done there, remains and hoards, conditions, and the hints (draughts, echoes, landmarks seen from afar).

import { hexDistance, hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { hexesSeenFrom, updateVisibility } from '../map';
import type { HexMap, Loot, MapObject, Tile } from '../map';
import type { HeardEcho, PlaceAction, RunEvent, RunRules, RunState } from './types';

type ThresholdTile = Tile & { object: Extract<MapObject, { kind: 'threshold' }> };
type PlaceTile = Tile & { object: Extract<MapObject, { kind: 'place' }> };

/** Thresholds and places never leave the map, so they are found once per map. */
const lasting = new WeakMap<HexMap, { thresholds: ThresholdTile[]; places: PlaceTile[] }>();
function lastingTiles(map: HexMap): { thresholds: ThresholdTile[]; places: PlaceTile[] } {
  let found = lasting.get(map);
  if (!found) {
    const tiles = [...map.tiles.values()];
    found = {
      thresholds: tiles.filter((t): t is ThresholdTile => t.object?.kind === 'threshold'),
      places: tiles.filter((t): t is PlaceTile => t.object?.kind === 'place'),
    };
    lasting.set(map, found);
  }
  return found;
}

export function tileAt(state: RunState, h: Hex): Tile | undefined {
  return state.map.tiles.get(hexKey(h));
}

/** Looks around from where the hydra stands. Returns how many hexes it saw for the first time. */
export function look(state: RunState, rules: RunRules): number {
  return updateVisibility(state.visibility, hexesSeenFrom(state.map, state.hydra.position, state.hydra.sightRange, rules.terrain));
}

export function raiseAlert(state: RunState, amount: number, rules: RunRules): void {
  state.alert = Math.min(rules.alertMax, Math.max(rules.alertMin, state.alert + amount));
}

export function addLoot(state: RunState, loot: Loot): void {
  for (const kind of ['muck', 'moisture', 'bones'] as const) state.resources[kind] += loot[kind] ?? 0;
}

/**
 * The hydra arrives on a hex, walking or carried. It finds hidden thresholds next to it, looks around, sights
 * landmarks, feels draughts, hears echoes and picks up what lies on the hex. Returns whether it must stop here
 * (a battle, a shrine or a place it hasn't visited), and how many hexes it saw for the first time.
 */
export function arriveAt(state: RunState, step: Hex, rules: RunRules, events: RunEvent[]): { stop: boolean; discovered: number } {
  state.hydra.position = step;
  for (const n of hexNeighbors(step)) {
    const t = tileAt(state, n);
    if (t?.object?.kind === 'threshold' && t.object.state === 'hidden') {
      openThreshold(t as ThresholdTile);
      events.push({ type: 'thresholdFound', at: n, thresholdId: t.object.thresholdId });
    }
  }
  const discovered = lookAround(state, rules, events);

  const tile = tileAt(state, step)!;
  const object = tile.object;
  if (object?.kind === 'muck' || object?.kind === 'moisture') {
    state.resources[object.kind] += object.amount;
    events.push({ type: 'collected', resource: object.kind, amount: object.amount, rich: object.rich, at: step });
    tile.object = null;
  } else if (object?.kind === 'remains' && !object.looted) {
    addLoot(state, object.loot);
    object.looted = true;
    events.push({ type: 'remainsFound', at: step, pool: object.pool, line: object.line, loot: object.loot });
  } else if (object?.kind === 'hoard') {
    addLoot(state, object.loot);
    tile.object = null;
    events.push({ type: 'hoardTaken', at: step, loot: object.loot });
  } else if (object?.kind === 'encounter') {
    state.pendingBattle = { at: step, groupId: object.groupId };
    return { stop: true, discovered };
  } else if (object?.kind === 'shrine' && !object.used) {
    state.pendingShrine = step;
    events.push({ type: 'shrineReached', at: step, blessingId: object.blessingId });
    return { stop: true, discovered };
  } else if (object?.kind === 'place' && !object.visited) {
    object.visited = true;
    state.pendingPlace = step;
    events.push({ type: 'placeReached', at: step, placeId: object.placeId, firstVisit: true });
    return { stop: true, discovered };
  }
  return { stop: false, discovered };
}

// ---------------------------------------------------------------- hints

/** Looks around and takes in the hints: landmarks seen from afar, draughts, echoes. Returns how many hexes it saw for the first time. */
export function lookAround(state: RunState, rules: RunRules, events: RunEvent[]): number {
  const discovered = look(state, rules);
  sightLandmarks(state, rules, events);
  feelDraughts(state, events);
  hearEchoes(state, rules, events);
  return discovered;
}

/** Landmarks close enough are seen even through rock: their hex becomes known. */
function sightLandmarks(state: RunState, rules: RunRules, events: RunEvent[]): void {
  for (const tile of lastingTiles(state.map).places) {
    const key = hexKey(tile.hex);
    if (state.visibility.has(key) || !rules.places[tile.object.placeId]?.landmark) continue;
    if (hexDistance(state.hydra.position, tile.hex) > rules.landmarkSightRange) continue;
    state.visibility.set(key, 'remembered');
    events.push({ type: 'landmarkSighted', at: tile.hex, placeId: tile.object.placeId });
  }
}

/** A hidden threshold gives itself away with a draught on the open hexes next to it, once one of them is in sight. */
function feelDraughts(state: RunState, events: RunEvent[]): void {
  for (const tile of lastingTiles(state.map).thresholds) {
    const key = hexKey(tile.hex);
    if (tile.object.state !== 'hidden' || state.draughtsFelt.includes(key)) continue;
    if (!draughtHexes(state, tile.hex).some((h) => state.visibility.get(hexKey(h)) === 'visible')) continue;
    state.draughtsFelt.push(key);
    events.push({ type: 'draughtFelt', at: tile.hex, thresholdId: tile.object.thresholdId });
  }
}

/** Open hexes next to a hidden threshold, where its draught is felt. */
export function draughtHexes(state: RunState, at: Hex): Hex[] {
  return hexNeighbors(at).filter((h) => {
    const t = tileAt(state, h);
    return t !== undefined && t.terrain !== 'rock';
  });
}

/** Hidden thresholds whose draught can be seen on known hexes (for drawing the hints). */
export function knownDraughts(state: RunState): Hex[] {
  const hexes: Hex[] = [];
  for (const tile of lastingTiles(state.map).thresholds) {
    if (tile.object.state !== 'hidden') continue;
    for (const h of draughtHexes(state, tile.hex)) if (state.visibility.has(hexKey(h))) hexes.push(h);
  }
  return hexes;
}

/** A place or a patch not yet seen, close enough, is heard: an echo marked at the known hex nearest to it. */
function hearEchoes(state: RunState, rules: RunRules, events: RunEvent[]): void {
  for (const source of state.map.layout.echoSources) {
    if (state.visibility.has(hexKey(source.at)) || state.echoes.some((e) => hexEquals(e.source, source.at))) continue;
    if (hexDistance(state.hydra.position, source.at) > rules.echoRange) continue;
    const echo: HeardEcho = { source: source.at, mark: nearestSeenHex(state, source.at), placeId: source.placeId, biome: source.biome };
    state.echoes.push(echo);
    events.push({ type: 'echoHeard', echo });
  }
}

/** The open hex in sight nearest to `to` (the hydra's own hex if none is nearer). */
function nearestSeenHex(state: RunState, to: Hex): Hex {
  let best = state.hydra.position;
  for (const [key, seen] of state.visibility) {
    if (seen !== 'visible') continue;
    const tile = state.map.tiles.get(key)!;
    if (tile.terrain === 'rock') continue;
    if (hexDistance(tile.hex, to) < hexDistance(best, to)) best = tile.hex;
  }
  return best;
}

// ---------------------------------------------------------------- thresholds

function openThreshold(tile: ThresholdTile): void {
  tile.object.state = 'open';
  tile.terrain = tile.object.floor;
}

/** The threshold whose panel is open, if it is one. */
export function pendingThreshold(state: RunState): ThresholdTile | null {
  const tile = state.pendingPlace ? tileAt(state, state.pendingPlace) : undefined;
  return tile?.object?.kind === 'threshold' ? (tile as ThresholdTile) : null;
}

export type ThresholdWorkCheck = { can: true } | { can: false; why: 'needsHead' | 'noMovement' | 'notClosed' };

/** Can the hydra work on the threshold whose panel is open (dig, or open it with a head)? */
export function canWorkThreshold(state: RunState, rules: RunRules): ThresholdWorkCheck {
  const tile = pendingThreshold(state);
  if (!tile || tile.object.state !== 'closed') return { can: false, why: 'notClosed' };
  const kind = rules.thresholds[tile.object.thresholdId];
  if (kind?.dug) return state.hydra.movementLeft > 0 ? { can: true } : { can: false, why: 'noMovement' };
  if (kind?.headClass) return hasHead(state, kind.headClass) ? { can: true } : { can: false, why: 'needsHead' };
  return { can: false, why: 'notClosed' };
}

/**
 * Works on the threshold whose panel is open. Digging takes the rest of the turn's movement, and the threshold
 * opens after its last dig; a head of the right class opens it at once. The panel closes either way.
 */
export function workThreshold(state: RunState, rules: RunRules): RunEvent[] {
  const tile = pendingThreshold(state);
  if (!tile || !canWorkThreshold(state, rules).can) return [];
  const { object } = tile;
  const events: RunEvent[] = [];
  if (rules.thresholds[object.thresholdId]?.dug) {
    state.hydra.movementLeft = 0;
    object.dug += 1;
    events.push({ type: 'thresholdDug', at: tile.hex, thresholdId: object.thresholdId, dug: object.dug, needed: object.digsNeeded });
    if (object.dug < object.digsNeeded) {
      state.pendingPlace = null;
      return events;
    }
  }
  openThreshold(tile);
  events.push({ type: 'thresholdOpened', at: tile.hex, thresholdId: object.thresholdId });
  state.pendingPlace = null;
  look(state, rules);
  return events;
}

function hasHead(state: RunState, classId: string): boolean {
  return state.hydra.heads.some((h) => h.classId === classId && h.hp > 0);
}

// ---------------------------------------------------------------- places

/** The place whose panel is open, if it is one. */
export function pendingPlaceTile(state: RunState): PlaceTile | null {
  const tile = state.pendingPlace ? tileAt(state, state.pendingPlace) : undefined;
  return tile?.object?.kind === 'place' ? (tile as PlaceTile) : null;
}

export type PlaceActionCheck = { can: true } | { can: false; why: 'needsHead' | 'done' | 'notYet' | 'noMovement'; turnsLeft?: number };

export function canDoPlaceAction(state: RunState, action: PlaceAction): PlaceActionCheck {
  const tile = pendingPlaceTile(state);
  if (!tile) return { can: false, why: 'done' };
  if (action.once && tile.object.used.includes(action.id)) return { can: false, why: 'done' };
  const ready = tile.object.readyOnTurn[action.id] ?? 0;
  if (state.turn < ready) return { can: false, why: 'notYet', turnsLeft: ready - state.turn };
  if (action.headClass && !hasHead(state, action.headClass)) return { can: false, why: 'needsHead' };
  if (state.hydra.movementLeft < action.movementCost) return { can: false, why: 'noMovement' };
  return { can: true };
}

/** Does one of the actions of the place whose panel is open. Being carried away closes the panel. */
export function doPlaceAction(state: RunState, actionId: string, rules: RunRules): RunEvent[] {
  const tile = pendingPlaceTile(state);
  if (!tile) return [];
  const { object } = tile;
  const action = rules.places[object.placeId]?.actions.find((a) => a.id === actionId);
  if (!action || !canDoPlaceAction(state, action).can) return [];
  const events: RunEvent[] = [];
  state.hydra.movementLeft -= action.movementCost;
  if (action.once) object.used.push(action.id);
  if (action.cooldownTurns > 0) object.readyOnTurn[action.id] = state.turn + action.cooldownTurns;
  addLoot(state, action.gain);
  events.push({ type: 'placeAction', at: tile.hex, placeId: object.placeId, actionId: action.id, gain: action.gain });
  if (action.condition) startCondition(state, action.condition.id, action.condition.turns, rules, events);
  if (action.revealHiddenThreshold) revealNearestHidden(state, tile.hex, events);
  if (action.carry && object.carryPath) {
    state.pendingPlace = null;
    carry(state, object.carryPath, rules, events);
  }
  return events;
}

/** Closes the panel of the place or threshold; the hydra stays where it is. */
export function leavePlace(state: RunState): RunEvent[] {
  state.pendingPlace = null;
  return [];
}

/** The nearest hidden threshold opens, and the map shows where it is. */
function revealNearestHidden(state: RunState, from: Hex, events: RunEvent[]): void {
  const hidden = lastingTiles(state.map).thresholds.filter((t) => t.object.state === 'hidden');
  if (hidden.length === 0) return;
  const nearest = hidden.reduce((best, t) => (hexDistance(t.hex, from) < hexDistance(best.hex, from) ? t : best));
  openThreshold(nearest);
  for (const h of [nearest.hex, ...hexNeighbors(nearest.hex)]) {
    const key = hexKey(h);
    if (state.map.tiles.has(key) && !state.visibility.has(key)) state.visibility.set(key, 'remembered');
  }
  events.push({ type: 'thresholdRevealed', at: nearest.hex, thresholdId: nearest.object.thresholdId });
}

/** A current carries the hydra along its path; it lets go early before anything that would stop it. */
function carry(state: RunState, path: readonly Hex[], rules: RunRules, events: RunEvent[]): void {
  const carried: Hex[] = [];
  let discovered = 0;
  for (const step of path) {
    const object = tileAt(state, step)?.object;
    if (object?.kind === 'encounter' || (object?.kind === 'shrine' && !object.used)) break;
    carried.push(step);
    const arrived = arriveAt(state, step, rules, events);
    discovered += arrived.discovered;
    if (arrived.stop) break;
  }
  events.unshift({ type: 'carried', path: carried });
  if (discovered > 0) {
    raiseAlert(state, discovered * rules.alertPerHexDiscovered, rules);
    events.push({ type: 'discovered', count: discovered });
  }
}

// ---------------------------------------------------------------- conditions and battles

/**
 * Puts a condition on the hydra for `turns` turns, this one included. Its change of movement is felt at once.
 * A condition the hydra already has lasts the longer of the two times, and is not felt twice.
 */
export function startCondition(state: RunState, id: string, turns: number, rules: RunRules, events: RunEvent[]): void {
  const current = state.hydra.conditions.find((c) => c.id === id);
  if (current) current.turnsLeft = Math.max(current.turnsLeft, turns);
  else {
    state.hydra.conditions.push({ id, turnsLeft: turns });
    state.hydra.movementLeft = Math.max(0, state.hydra.movementLeft + (rules.conditions[id]?.movement ?? 0));
  }
  events.push({ type: 'conditionStarted', id, turns });
}

/** Movement points the hydra gets at the start of a turn: its own, changed by its conditions. */
export function movementForTurn(state: RunState, rules: RunRules): number {
  const change = state.hydra.conditions.reduce((sum, c) => sum + (rules.conditions[c.id]?.movement ?? 0), 0);
  return Math.max(1, state.hydra.movementPerTurn + change);
}

/** One turn passes for every condition; those used up end (call before working out the next turn's movement). */
export function tickConditions(state: RunState, events: RunEvent[]): void {
  for (const c of state.hydra.conditions) c.turnsLeft -= 1;
  for (const c of state.hydra.conditions.filter((c) => c.turnsLeft <= 0)) events.push({ type: 'conditionEnded', id: c.id });
  state.hydra.conditions = state.hydra.conditions.filter((c) => c.turnsLeft > 0);
}

/** A condition shows every encounter on the map (the Mycelium Whisper). */
export function encountersRevealed(state: RunState, rules: RunRules): boolean {
  return state.hydra.conditions.some((c) => rules.conditions[c.id]?.revealsEncounters);
}

/** Is a battle here too quiet for the Order to hear (near the Silent Bell)? */
export function battleSilenced(state: RunState, at: Hex, rules: RunRules): boolean {
  return lastingTiles(state.map).places.some((tile) => {
    const radius = rules.places[tile.object.placeId]?.silencesBattlesWithin;
    return radius !== null && radius !== undefined && hexDistance(tile.hex, at) <= radius;
  });
}
