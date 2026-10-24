// The surface (GAME_DESIGN.md §5.6, §5.7; M4): mist and how it fades (by day, by night, in the wind, over water),
// Exhale Mist, mist breathed ahead as the hydra walks, being Exposed, the things lying about, and the Flame Shrines put
// out and lit again. The Passages are used in run.ts; the Order's people on the surface walk in order.ts.

import { hexDistance, hexKey, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import { generateSurface } from '../map';
import type { HexMap, MapObject } from '../map';
import { Rng } from '../rng';
import { gainMutation, mutationTotal } from './mutations';
import { setFlags, storyMoment } from './story';
import type { OrderUnit, RunEvent, RunRules, RunState, SurfaceState } from './types';
import { addLoot, isNight, isWaiting, lookAround, movementForTurn, raiseAlert, revealNearestHidden, tileOn } from './world';

type ShrineObject = Extract<MapObject, { kind: 'flameShrine' }>;

/** Why mist lies on a Passage's hexes for good. */
const PASSAGE = 'passage';

/**
 * The surface of a new run, over its underground: every Passage comes out on the same hex, mist round it at the start,
 * and on the Passage itself for good.
 */
export function newSurface(seed: number, underground: HexMap, rules: RunRules): SurfaceState {
  // The Passage nearest the lair first: the castle stands on the far side from it.
  const passages = [...underground.tiles.values()]
    .filter((t) => t.object?.kind === 'passage')
    .sort((a, b) => a.ring - b.ring || hexDistance(a.hex, underground.lair) - hexDistance(b.hex, underground.lair))
    .map((t) => t.hex);
  const map = generateSurface(seed, rules.surface.generator, rules.terrain, passages);
  const surface: SurfaceState = {
    map,
    visibility: new Map(),
    mist: {},
    lastingMist: {},
    exposed: false,
    windy: false,
    relights: {},
    nextPatrolTurn: null,
    shrinesPutOut: 0,
    rngState: new Rng((seed ^ 0x6d157) >>> 0).getState(),
  };
  const { start } = rules.surface.mist;
  for (const p of map.passages) {
    surface.lastingMist[hexKey(p)] = PASSAGE;
    for (const h of hexesInRange(p, start.radius)) {
      const key = hexKey(h);
      if (map.tiles.has(key)) surface.mist[key] = Math.max(surface.mist[key] ?? 0, start.turns);
    }
  }
  return surface;
}

// ---------------------------------------------------------------- mist

/** Does mist lie on this surface hex? */
export function hasMist(state: RunState, h: Hex): boolean {
  const key = hexKey(h);
  return state.surface.lastingMist[key] !== undefined || (state.surface.mist[key] ?? 0) > 0;
}

/** How much mist lies on a surface hex, in turns of daylight; mist that never fades counts as the most there can be. */
export function mistAt(state: RunState, h: Hex, rules: RunRules): number {
  const key = hexKey(h);
  return state.surface.lastingMist[key] !== undefined ? rules.surface.mist.maxTurns : (state.surface.mist[key] ?? 0);
}

/** Mist on these surface hexes for at least `turns` turns of daylight (never more than the most there can be). */
export function putMist(state: RunState, hexes: readonly Hex[], turns: number, rules: RunRules): Hex[] {
  const covered: Hex[] = [];
  for (const h of hexes) {
    const key = hexKey(h);
    if (!state.surface.map.tiles.has(key)) continue;
    state.surface.mist[key] = Math.min(rules.surface.mist.maxTurns, Math.max(state.surface.mist[key] ?? 0, turns));
    covered.push(h);
  }
  return covered;
}

/** The mist on these hexes is gone (a Censer Priest's smoke); mist that never fades stays. */
export function clearMist(state: RunState, hexes: readonly Hex[]): void {
  for (const h of hexes) delete state.surface.mist[hexKey(h)];
}

/** How far Exhale Mist reaches: farther with a head of some classes (a Mist Breather). */
export function exhaleRadius(state: RunState, rules: RunRules): number {
  const { exhale } = rules.surface.mist;
  return Math.max(exhale.radius, ...state.hydra.heads.filter((h) => h.hp > 0).map((h) => exhale.radiusByClass[h.classId] ?? 0));
}

export type ExhaleCheck = { can: true } | { can: false; why: 'notOnSurface' | 'busy' | 'moisture' };

export function canExhale(state: RunState, rules: RunRules): ExhaleCheck {
  if (state.hydra.layer !== 'surface') return { can: false, why: 'notOnSurface' };
  if (isWaiting(state)) return { can: false, why: 'busy' };
  if (state.resources.moisture < rules.surface.mist.exhale.moisture) return { can: false, why: 'moisture' };
  return { can: true };
}

/** Exhale Mist (GAME_DESIGN.md §5.6): for Moisture, mist on her hex and round it. */
export function exhaleMist(state: RunState, rules: RunRules): RunEvent[] {
  if (!canExhale(state, rules).can) return [];
  const { exhale } = rules.surface.mist;
  state.resources.moisture -= exhale.moisture;
  const hexes = putMist(state, hexesInRange(state.hydra.position, exhaleRadius(state, rules)), exhale.turns, rules);
  const events: RunEvent[] = [{ type: 'mistExhaled', hexes, moisture: exhale.moisture }];
  coverIfMisty(state, events);
  return events;
}

/** She stands in mist again: no longer Exposed. */
export function coverIfMisty(state: RunState, events: RunEvent[]): void {
  if (state.hydra.layer !== 'surface' || !state.surface.exposed || !hasMist(state, state.hydra.position)) return;
  state.surface.exposed = false;
  events.push({ type: 'covered' });
}

/**
 * What a step onto a surface hex costs on top of its terrain: nothing in mist; without it, the Moisture to breathe mist
 * onto it first (null: she can't afford it, or that isn't allowed).
 */
export function breathCost(state: RunState, h: Hex, rules: RunRules): number | null {
  if (hasMist(state, h)) return 0;
  return rules.surface.mist.breatheAhead?.moisture ?? null;
}

/**
 * Can an Exposed hydra crawl one step onto bare ground (surface.json exposed.crawl)? Only with no Moisture to breathe
 * mist ahead and a whole turn's movement, which the crawl takes.
 */
export function canCrawl(state: RunState, rules: RunRules): boolean {
  const ahead = rules.surface.mist.breatheAhead;
  return (
    rules.surface.exposed.crawl &&
    state.hydra.layer === 'surface' &&
    !hasMist(state, state.hydra.position) &&
    (ahead === null || state.resources.moisture < ahead.moisture) &&
    state.hydra.movementLeft >= movementForTurn(state, rules)
  );
}

/**
 * The hydra arrives on a surface hex, walking. She looks around and picks up what lies there. Returns whether she must
 * stop here (a burning Flame Shrine: a battle with its guard), and how many hexes she saw for the first time.
 */
export function arriveOnSurface(state: RunState, step: Hex, rules: RunRules, events: RunEvent[]): { stop: boolean; discovered: number } {
  state.hydra.position = step;
  coverIfMisty(state, events);
  const discovered = lookAround(state, rules, events);
  const tile = tileOn(state, 'surface', step)!;
  const object = tile.object;
  if (object?.kind === 'find' && !object.looted) {
    const find = rules.surface.finds[object.findId];
    object.looted = true;
    const loot = find?.loot ?? {};
    addLoot(state, loot);
    const revealed = find?.revealsHiddenThreshold ? revealNearestHidden(state, step, events) : null;
    events.push({ type: 'findTaken', at: step, findId: object.findId, loot, revealed });
  } else if (object?.kind === 'flameShrine' && object.burning) {
    state.pendingBattle = { at: step, layer: 'surface', groupId: object.groupId };
    return { stop: true, discovered };
  }
  return { stop: false, discovered };
}

// ---------------------------------------------------------------- the world turn

/**
 * The surface's part of the world turn, before the Order moves: night falls or the day breaks (a windy day, maybe),
 * mist fades, and a hydra left without mist is Exposed.
 */
export function surfaceTurn(state: RunState, rules: RunRules, events: RunEvent[]): void {
  const { surface } = state;
  const { mist } = rules.surface;
  const night = isNight(state.turn, rules);
  const wasNight = isNight(state.turn - 1, rules);
  // Underground nobody notices the sky.
  const up = state.hydra.layer === 'surface';
  if (night && !wasNight) {
    surface.windy = false;
    if (up) events.push({ type: 'nightFalls' });
  }
  if (!night && wasNight) {
    const rng = Rng.fromState(surface.rngState);
    surface.windy = rng.chance(mist.windChance);
    surface.rngState = rng.getState();
    if (up) events.push({ type: 'dayBreaks', windy: surface.windy });
  }
  fadeMist(state, rules, night);
  if (state.hydra.layer === 'surface' && !state.over && !hasMist(state, state.hydra.position)) exposeHydra(state, rules, events);
}

function fadeMist(state: RunState, rules: RunRules, night: boolean): void {
  const { surface } = state;
  const { mist } = rules.surface;
  const drought = state.map.layout.modifiers.includes('drought') ? mist.droughtFade : 1;
  const fade = ((night ? mist.fade.night : mist.fade.day) + (surface.windy ? mist.fade.windExtra : 0)) * drought;
  for (const [key, left] of Object.entries(surface.mist)) {
    if (surface.lastingMist[key] !== undefined) continue;
    const overWater = surface.map.tiles.get(key)?.terrain === 'water';
    const after = left - fade * (overWater ? mist.waterFade : 1);
    if (after > 0) surface.mist[key] = after;
    else delete surface.mist[key];
  }
}

/** No mist under her (GAME_DESIGN.md §5.6): she loses body HP (never below 1), and the Order hears of her. */
function exposeHydra(state: RunState, rules: RunRules, events: RunEvent[]): void {
  const { exposed } = rules.surface;
  const { hydra } = state;
  state.surface.exposed = true;
  const loss = Math.max(0, Math.round(exposed.bodyHp * (1 + mutationTotal(hydra, rules, 'exposedDamagePercent') / 100)));
  const bodyHp = Math.min(loss, hydra.bodyHp - 1);
  hydra.bodyHp -= bodyHp;
  raiseAlert(state, exposed.alert, rules);
  events.push({ type: 'exposed', bodyHp, alert: exposed.alert });
  storyMoment(state, rules, 'exposed', {}, events);
}

/** Is the hydra out of the mist now (on the surface, nothing under her)? For battles: no mist to hide in. */
export function exposedNow(state: RunState): boolean {
  return state.hydra.layer === 'surface' && !hasMist(state, state.hydra.position);
}

// ---------------------------------------------------------------- Flame Shrines

function shrineAt(state: RunState, at: Hex): ShrineObject | null {
  const object = tileOn(state, 'surface', at)?.object;
  return object?.kind === 'flameShrine' ? object : null;
}

/** Flame Shrines still burning. */
export function shrinesBurning(state: RunState): number {
  return state.surface.map.shrines.filter((h) => shrineAt(state, h)?.burning).length;
}

/**
 * Its guard beaten, a Flame Shrine goes out (GAME_DESIGN.md §5.7): the Alert falls, mist lies round it for good, and
 * after a while the Order sends Torchbearers to light it again. Sometimes the flame leaves her a mutation (§12).
 */
export function putOutShrine(state: RunState, at: Hex, rules: RunRules, events: RunEvent[]): void {
  const shrine = shrineAt(state, at);
  if (!shrine?.burning) return;
  const { flameShrines } = rules.surface;
  const { surface } = state;
  shrine.burning = false;
  const key = hexKey(at);
  raiseAlert(state, flameShrines.alertWhenPutOut, rules);
  for (const h of hexesInRange(at, flameShrines.lastingMistRadius)) {
    const k = hexKey(h);
    if (surface.map.tiles.has(k) && surface.lastingMist[k] === undefined) surface.lastingMist[k] = key;
  }
  surface.relights[key] = state.turn + flameShrines.relight.afterTurns;
  surface.shrinesPutOut += 1;
  setFlags(state, flameShrines.setFlags);
  events.push({ type: 'shrineOut', at, alert: flameShrines.alertWhenPutOut, left: shrinesBurning(state) });
  coverIfMisty(state, events);

  const rng = Rng.fromState(surface.rngState);
  const chance = surface.shrinesPutOut === 1 ? flameShrines.firstMutationChance : flameShrines.mutationChance;
  const fresh = flameShrines.mutations.filter((id) => !state.hydra.mutations.includes(id));
  if (fresh.length > 0 && rng.chance(chance)) gainMutation(state, rng.pick(fresh), rules, events);
  surface.rngState = rng.getState();
  storyMoment(state, rules, 'shrineOut', {}, events);
}

/**
 * Torchbearers light a Flame Shrine again and stay to guard it: the Alert rises, and the mist it held for good fades
 * from now on, from as much as an exhaled breath.
 */
export function relightShrine(state: RunState, at: Hex, party: OrderUnit, rules: RunRules, events: RunEvent[]): void {
  const shrine = shrineAt(state, at);
  if (!shrine || shrine.burning) return;
  const { surface } = state;
  const key = hexKey(at);
  shrine.burning = true;
  shrine.groupId = party.groupId;
  shrine.tier = party.tier;
  for (const [k, holder] of Object.entries(surface.lastingMist)) {
    if (holder !== key) continue;
    delete surface.lastingMist[k];
    surface.mist[k] = rules.surface.mist.exhale.turns;
  }
  delete surface.relights[key];
  const { alert } = rules.surface.flameShrines.relight;
  raiseAlert(state, alert, rules);
  events.push({ type: 'shrineRelit', at, alert });
  storyMoment(state, rules, 'shrineRelit', {}, events);
}
