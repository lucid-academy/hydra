// What the hydra meets on the map besides battles and shrines (GAME_DESIGN.md §9): thresholds between rings, places
// and what can be done there, remains and hoards, conditions, and the hints (draughts, echoes, landmarks seen from afar).

import { hexDistance, hexEquals, hexKey, hexNeighbors, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import { hexesSeenFrom, updateVisibility } from '../map';
import type { HexMap, Loot, MapObject, Tile } from '../map';
import { Rng } from '../rng';
import { headMaxHp, mutationTotal } from './mutations';
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

/** Changes the Alert. A rise is faster or slower with the hydra's mutations (Bog-scented: slower). */
export function raiseAlert(state: RunState, amount: number, rules: RunRules): void {
  const change = amount > 0 ? amount * (1 + mutationTotal(state.hydra, rules, 'alertPercent') / 100) : amount;
  state.alert = Math.min(rules.alertMax, Math.max(rules.alertMin, state.alert + change));
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
  burnIfHot(state, step, rules, events);
  for (const n of hexNeighbors(step)) {
    const t = tileAt(state, n);
    if (t?.object?.kind === 'threshold' && t.object.state === 'hidden') {
      openThreshold(t as ThresholdTile);
      events.push({ type: 'thresholdFound', at: n, thresholdId: t.object.thresholdId });
    }
  }
  const discovered = lookAround(state, rules, events);

  const tile = tileAt(state, step)!;
  if (tile.region === 'ring') state.deepestRing = Math.max(state.deepestRing, tile.ring);
  const object = tile.object;
  if (object?.kind === 'muck' || object?.kind === 'moisture') {
    // More with the hydra's mutations (Hoarder's Gut).
    const amount = Math.round(object.amount * (1 + mutationTotal(state.hydra, rules, 'findsPercent') / 100));
    state.resources[object.kind] += amount;
    events.push({ type: 'collected', resource: object.kind, amount, rich: object.rich, at: step });
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

/**
 * New heads (a random hatchling class unless `classId` says which, and a random name), as many as fit under the head
 * limit. Returns their ids.
 */
export function growHeads(state: RunState, rules: RunRules, count: number, classId: string | null = null): string[] {
  const rng = Rng.fromState(state.rngState);
  const ids: string[] = [];
  for (let i = 0; i < count && state.hydra.heads.length < rules.maxHeads; i++) {
    const cls = classId === null ? rng.pick(rules.hatchlingClasses) : { classId, maxHp: rules.headMaxHp[classId] ?? 1 };
    const taken = new Set(state.hydra.heads.map((h) => h.name));
    const free = rules.headNames.filter((name) => !taken.has(name));
    const maxHp = headMaxHp(state.hydra, rules, cls.maxHp);
    const head = { id: `h${state.nextId++}`, name: rng.pick(free.length > 0 ? free : rules.headNames), classId: cls.classId, level: 1, hp: maxHp, maxHp };
    state.hydra.heads.push(head);
    ids.push(head.id);
  }
  state.rngState = rng.getState();
  return ids;
}

// ---------------------------------------------------------------- hints

/** Looks around and takes in the hints: landmarks seen from afar, draughts, echoes. Returns how many hexes it saw for the first time. */
export function lookAround(state: RunState, rules: RunRules, events: RunEvent[]): number {
  const discovered = look(state, rules);
  sightLandmarks(state, rules, events);
  feelDraughts(state, events);
  hearEchoes(state, rules, events);
  noteSightings(state);
  return discovered;
}

/**
 * The Order's people in sight are noted where they stand, and when (GAME_DESIGN.md §5.3: out of sight they are shown
 * where they were last seen). A noted spot seen empty again is forgotten.
 */
export function noteSightings(state: RunState): void {
  const { order, visibility } = state;
  const inSight = (h: Hex) => visibility.get(hexKey(h)) === 'visible';
  for (const unit of order.units) {
    if (!inSight(unit.at)) continue;
    const sighting = { unitId: unit.id, kind: unit.kind, tier: unit.tier, at: unit.at, turn: state.turn };
    const i = order.sightings.findIndex((s) => s.unitId === unit.id);
    if (i >= 0) order.sightings[i] = sighting;
    else order.sightings.push(sighting);
  }
  order.sightings = order.sightings.filter((s) => !inSight(s.at) || order.units.some((u) => u.id === s.unitId && hexEquals(u.at, s.at)));
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
    if (hexDistance(state.hydra.position, source.at) > rules.echoRange + mutationTotal(state.hydra, rules, 'echoRange')) continue;
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

export function openThreshold(tile: ThresholdTile): void {
  tile.object.state = 'open';
  tile.terrain = tile.object.floor;
}

/** The threshold whose panel is open, if it is one. */
export function pendingThreshold(state: RunState): ThresholdTile | null {
  const tile = state.pendingPlace ? tileAt(state, state.pendingPlace) : undefined;
  return tile?.object?.kind === 'threshold' ? (tile as ThresholdTile) : null;
}

export type ThresholdWorkCheck = { can: true } | { can: false; why: 'needsHead' | 'noMovement' | 'notClosed' | 'sealed' };

/** Can the hydra work on the threshold whose panel is open (dig, or open it with a head)? A sealed one opens its own way (story.ts). */
export function canWorkThreshold(state: RunState, rules: RunRules): ThresholdWorkCheck {
  const tile = pendingThreshold(state);
  if (!tile || tile.object.state !== 'closed') return { can: false, why: 'notClosed' };
  const kind = rules.thresholds[tile.object.thresholdId];
  if (kind?.sealed) return { can: false, why: 'sealed' };
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

// ---------------------------------------------------------------- the Cinderkin melt a tunnel (Cinder Bore)

/**
 * The Cinderkin melt a tunnel (GAME_DESIGN.md §9.3): from open ground of the hydra's ring near `from`, through one of
 * the thinnest spots of rock nearby, out onto open ground of another ring. Which spot is a matter of chance, among the
 * thinnest. Its rock becomes floor that burns for a few turns, and its hex nearest the middle of the band becomes an
 * open threshold. Returns the tunnel (from this ring to the other) and its threshold, or null when no rock nearby is
 * thin enough (or the hydra is in the lair).
 */
export function boreTunnel(state: RunState, rules: RunRules, from: Hex, rng: Rng): { path: Hex[]; at: Hex } | null {
  const bore = rules.bore;
  const here = tileAt(state, from);
  // From a ring, or from a tunnel through a band (which counts to the ring inside it); never from the lair.
  if (!bore || !here || (here.region !== 'ring' && here.region !== 'band')) return null;
  // Plain rock of the rings and bands melts; thresholds and the rock outside the world don't.
  const meltable = (t: Tile | undefined) => t !== undefined && t.terrain === 'rock' && t.object === null && (t.region === 'band' || t.region === 'ring');
  const otherRing = (t: Tile | undefined) => t !== undefined && t.terrain !== 'rock' && t.region === 'ring' && t.ring !== here.ring;

  // Rock hexes by how many rock hexes it takes to get there from open ground of this ring near the hydra.
  const cameFrom = new Map<string, string | null>();
  let layer: Hex[] = [];
  for (const h of hexesInRange(from, bore.within)) {
    const t = tileAt(state, h);
    if (!t || t.region !== 'ring' || t.ring !== here.ring || t.terrain === 'rock') continue;
    for (const n of hexNeighbors(h)) {
      const key = hexKey(n);
      if (cameFrom.has(key) || !meltable(tileAt(state, n))) continue;
      cameFrom.set(key, null);
      layer.push(n);
    }
  }
  // Ends of tunnels: rock touching open ground of another ring, as thin as the thinnest or one hex thicker.
  const ends: Hex[] = [];
  let thinnest: number | null = null;
  for (let length = 1; length <= bore.longest && layer.length > 0; length++) {
    for (const h of layer) if (hexNeighbors(h).some((n) => otherRing(tileAt(state, n)))) ends.push(h);
    if (thinnest === null && ends.length > 0) thinnest = length;
    if (thinnest !== null && length >= thinnest + 1) break;
    const next: Hex[] = [];
    for (const h of layer) {
      for (const n of hexNeighbors(h)) {
        const key = hexKey(n);
        if (cameFrom.has(key) || !meltable(tileAt(state, n))) continue;
        cameFrom.set(key, hexKey(h));
        next.push(n);
      }
    }
    layer = next;
  }
  if (ends.length === 0) return null;

  const end = rng.pick(ends);
  const path: Hex[] = [];
  for (let key: string | null = hexKey(end); key !== null; key = cameFrom.get(key) ?? null) path.unshift(state.map.tiles.get(key)!.hex);
  const lastTurn = state.turn + bore.hotTurns - 1;
  for (const h of path) {
    tileAt(state, h)!.terrain = 'mud';
    state.hotUntil[hexKey(h)] = lastTurn;
  }
  // Its threshold: the band hex nearest the middle of the tunnel.
  const middle = (path.length - 1) / 2;
  const gate = path
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => tileAt(state, h)!.region === 'band')
    .sort((a, b) => Math.abs(a.i - middle) - Math.abs(b.i - middle))[0]?.h ?? path[Math.floor(middle)]!;
  const gateTile = tileAt(state, gate)!;
  const beyond = hexNeighbors(end).map((n) => tileAt(state, n)).find(otherRing)!;
  gateTile.object = {
    kind: 'threshold',
    thresholdId: bore.thresholdId,
    state: 'open',
    border: gateTile.region === 'band' ? gateTile.ring : Math.min(here.ring, beyond.ring),
    floor: 'mud',
    dug: 0,
    digsNeeded: 0,
  };
  lasting.delete(state.map);
  // The glow of the molten rock shows the way: the tunnel and the ground around it become known.
  for (const h of path) {
    for (const n of [h, ...hexNeighbors(h)]) {
      const key = hexKey(n);
      if (state.map.tiles.has(key) && !state.visibility.has(key)) state.visibility.set(key, 'remembered');
    }
  }
  return { path, at: gate };
}

/** Stepping on a hex of a Cinder Bore that still burns costs body HP (never the last of it). */
function burnIfHot(state: RunState, at: Hex, rules: RunRules, events: RunEvent[]): void {
  const lastTurn = state.hotUntil[hexKey(at)];
  if (lastTurn === undefined || lastTurn < state.turn || !rules.bore || rules.bore.burn <= 0) return;
  const before = state.hydra.bodyHp;
  state.hydra.bodyHp = Math.max(1, before - rules.bore.burn);
  events.push({ type: 'burned', at, amount: before - state.hydra.bodyHp });
}

/** A turn has passed: hexes of a Cinder Bore that burnt their last turn cool down. */
export function coolTunnels(state: RunState, events: RunEvent[]): void {
  const cooled = Object.keys(state.hotUntil).filter((key) => state.hotUntil[key]! < state.turn);
  if (cooled.length === 0) return;
  for (const key of cooled) delete state.hotUntil[key];
  if (Object.keys(state.hotUntil).length === 0) events.push({ type: 'tunnelCooled' });
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
