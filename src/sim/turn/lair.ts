// The lair (GAME_DESIGN.md §7): eggs laid for Bones and Muck, which wait until the hydra tells one to hatch. A
// hatched Broodling guards the lair (and fights beside her in the battle for it) or goes scouting on its own. Every
// egg left unhatched is a candidate for the next generation.

import { hexDistance, hexEquals, hexKey } from '../hex';
import type { Hex } from '../hex';
import { hexesSeenFrom } from '../map';
import { Rng } from '../rng';
import { waysFrom, pathTo } from './order';
import type { BroodlingRole, Egg, LairState, RunEvent, RunRules, RunState, Scout } from './types';
import { hydraOn, tileAt } from './world';

/** The lair a hydra hatches into: her mother's eggs (startingEggs of them), each with its share of her mutations. */
export function newLair(state: RunState, rules: RunRules): LairState {
  const lair: LairState = { eggs: [], defenders: 0, scouts: [], nextId: 1, eggHidden: false };
  state.lair = lair;
  for (let i = 0; i < rules.brood.startingEggs; i++) lair.eggs.push(newEgg(state, rules));
  return lair;
}

function newEgg(state: RunState, rules: RunRules): Egg {
  const rng = Rng.fromState(state.rngState);
  const mutations = eggMutations(state.hydra.mutations, state.lair.eggs, rules.brood.inheritedShare, rng);
  state.rngState = rng.getState();
  return { id: `e${state.lair.nextId++}`, mutations, hatching: null };
}

/**
 * A random share of the mother's mutations (rounded up), in the order she carries them: one no other egg carries,
 * when there is one to be had (GAME_DESIGN.md §12: each egg carries a different half).
 */
export function eggMutations(mutations: readonly string[], eggs: readonly Egg[], share: number, rng: Rng): string[] {
  const count = Math.ceil(mutations.length * share);
  const taken = new Set(eggs.map((e) => e.mutations.join(',')));
  let pick: string[] = [];
  for (let tries = 0; tries < 12; tries++) {
    const order = mutations.map((id) => ({ id, key: rng.next() })).sort((a, b) => a.key - b.key);
    const kept = new Set(order.slice(0, count).map((o) => o.id));
    pick = mutations.filter((id) => kept.has(id));
    if (!taken.has(pick.join(','))) break;
  }
  return pick;
}

function inTheLair(state: RunState): boolean {
  const hydra = hydraOn(state, 'underground');
  return hydra !== null && hexEquals(hydra, state.map.lair);
}

export type LairCheck = { can: true } | { can: false; why: 'notInLair' | 'cost' | 'full' | 'noEgg' | 'alreadyHatching' | 'alreadyHidden' };

export function canLayEgg(state: RunState, rules: RunRules): LairCheck {
  const { eggCost } = rules.brood;
  const { resources } = state;
  if (!inTheLair(state)) return { can: false, why: 'notInLair' };
  if (state.lair.eggs.length >= rules.brood.maxEggs) return { can: false, why: 'full' };
  if (resources.bones < eggCost.bones || resources.muck < eggCost.muck || resources.moisture < eggCost.moisture) return { can: false, why: 'cost' };
  return { can: true };
}

/** Lays an egg in the lair: it carries its share of the mutations she has now. */
export function layEgg(state: RunState, rules: RunRules): RunEvent[] {
  if (!canLayEgg(state, rules).can) return [];
  const { eggCost } = rules.brood;
  state.resources.bones -= eggCost.bones;
  state.resources.muck -= eggCost.muck;
  state.resources.moisture -= eggCost.moisture;
  const egg = newEgg(state, rules);
  state.lair.eggs.push(egg);
  return [{ type: 'eggLaid', eggId: egg.id }];
}

export function canHatch(state: RunState, eggId: string): LairCheck {
  const egg = state.lair.eggs.find((e) => e.id === eggId);
  if (!inTheLair(state)) return { can: false, why: 'notInLair' };
  if (!egg) return { can: false, why: 'noEgg' };
  if (egg.hatching) return { can: false, why: 'alreadyHatching' };
  return { can: true };
}

/** Tells an egg to hatch, as a guard of the lair or a scout: it hatches after hatchTurns world turns. */
export function hatchEgg(state: RunState, eggId: string, role: BroodlingRole, rules: RunRules): RunEvent[] {
  if (!canHatch(state, eggId).can) return [];
  const egg = state.lair.eggs.find((e) => e.id === eggId)!;
  egg.hatching = { role, onTurn: state.turn + rules.brood.hatchTurns };
  const events: RunEvent[] = [{ type: 'hatchingStarted', eggId, role }];
  if (rules.brood.hatchTurns === 0) hatchReady(state, events);
  return events;
}

export function canHideEgg(state: RunState, eggId: string): LairCheck {
  const check = canHatch(state, eggId);
  if (!check.can) return check;
  if (state.lair.eggHidden) return { can: false, why: 'alreadyHidden' };
  return { can: true };
}

/**
 * Old Mother Toad hides an egg somewhere secret (GAME_DESIGN.md §12, the Hidden Egg): it leaves the lair, and the
 * lineage keeps it with the mutations it carries, for when no other egg is left. One at a time.
 */
export function hideEgg(state: RunState, eggId: string): RunEvent[] {
  if (!canHideEgg(state, eggId).can) return [];
  const egg = state.lair.eggs.find((e) => e.id === eggId)!;
  state.lair.eggs = state.lair.eggs.filter((e) => e !== egg);
  state.lair.eggHidden = true;
  return [{ type: 'eggHidden', eggId, mutations: [...egg.mutations] }];
}

/** The lair's part of the world turn: eggs whose time has come hatch, and the scouts walk. */
export function lairTurn(state: RunState, rules: RunRules, events: RunEvent[]): void {
  hatchReady(state, events);
  for (const scout of state.lair.scouts) scoutAhead(state, scout, rules, events);
}

function hatchReady(state: RunState, events: RunEvent[]): void {
  const { lair } = state;
  for (const egg of [...lair.eggs]) {
    if (!egg.hatching || egg.hatching.onTurn > state.turn) continue;
    lair.eggs = lair.eggs.filter((e) => e !== egg);
    let scoutId: string | null = null;
    if (egg.hatching.role === 'defender') lair.defenders += 1;
    else {
      scoutId = `s${lair.nextId++}`;
      lair.scouts.push({ id: scoutId, at: state.map.lair });
    }
    events.push({ type: 'hatched', eggId: egg.id, role: egg.hatching.role, scoutId });
  }
}

/**
 * A scout walks towards the nearest ground nobody has seen yet, keeping clear of encounters and of the Order, and
 * shows what it sees. What it finds is known, as if seen before (it doesn't raise the Alert: nobody notices a
 * Broodling).
 */
function scoutAhead(state: RunState, scout: Scout, rules: RunRules, events: RunEvent[]): void {
  const hydra = hydraOn(state, 'underground');
  const ways = waysFrom(state, rules, scout.at, null, (h) => !(hydra && hexEquals(h, hydra)), 'underground');
  let goal: { at: Hex; cost: number } | null = null;
  for (const way of ways.values()) {
    if (state.visibility.has(hexKey(way.at))) continue;
    if (!goal || way.cost < goal.cost) goal = { at: way.at, cost: way.cost };
  }
  if (!goal) return;
  const walked: Hex[] = [];
  let left = rules.brood.scouts.movement;
  for (const step of pathTo(ways, goal.at)) {
    const cost = rules.terrain[tileAt(state, step)!.terrain].moveCost ?? Infinity;
    if (cost > left) break;
    left -= cost;
    walked.push(step);
  }
  if (walked.length === 0) return;
  scout.at = walked[walked.length - 1]!;
  for (const key of hexesSeenFrom(state.map, scout.at, rules.brood.scouts.sight, rules.terrain)) {
    if (!state.visibility.has(key)) state.visibility.set(key, 'remembered');
  }
  events.push({ type: 'scoutMoved', scoutId: scout.id, path: walked });
}

/** After the Order has moved: a scout next to any of its people is caught. */
export function scoutsCaught(state: RunState, events: RunEvent[]): void {
  const { lair, order } = state;
  for (const scout of [...lair.scouts]) {
    if (!order.units.some((u) => u.layer === 'underground' && u.kind !== 'messenger' && hexDistance(u.at, scout.at) <= 1)) continue;
    lair.scouts = lair.scouts.filter((s) => s !== scout);
    events.push({ type: 'scoutKilled', scoutId: scout.id, at: scout.at });
  }
}

/** A lost battle for the lair: the Order breaks a share of the eggs (rounded up). Returns how many. */
export function breakEggs(state: RunState, share: number): number {
  const count = Math.min(state.lair.eggs.length, Math.ceil(state.lair.eggs.length * share));
  const rng = Rng.fromState(state.order.rngState);
  for (let i = 0; i < count; i++) state.lair.eggs.splice(rng.int(0, state.lair.eggs.length - 1), 1);
  state.order.rngState = rng.getState();
  return count;
}
