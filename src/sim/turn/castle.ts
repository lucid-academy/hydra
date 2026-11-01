// The castle of the Eternal Flame and the last assault (GAME_DESIGN.md §5.7; M7, castle.json). Its gate opens when
// enough Flame Shrines are out at once. The assault is fought part by part, a battle each; a part won stays won, and
// between parts the hydra may press on or fall back. Winning the last part puts out the Eternal Flame: the run is won.

import { hexDistance, hexEquals } from '../hex';
import { setFlags, storyMoment } from './story';
import type { RunEvent, RunRules, RunState } from './types';
import { isWaiting, tileOn } from './world';

/** Is the castle's gate open now? */
export function castleOpen(state: RunState): boolean {
  return state.surface.castle.opened;
}

/** Flame Shrines that must be out at once for the gate to open (never more than the surface has). */
export function shrinesToOpen(state: RunState, rules: RunRules): number {
  return Math.min(rules.castle.gate.shrinesOut, state.surface.map.shrines.length);
}

/**
 * After a Flame Shrine went out or burns again: the gate opens once enough are out at the same time, and (without
 * castle.json gate.staysOpen) shuts again when too few are.
 */
export function checkGate(state: RunState, rules: RunRules, events: RunEvent[]): void {
  const { castle } = state.surface;
  const out = state.surface.map.shrines.filter((h) => {
    const object = tileOn(state, 'surface', h)?.object;
    return object?.kind === 'flameShrine' && !object.burning;
  }).length;
  const enough = out >= shrinesToOpen(state, rules);
  if (enough && !castle.opened) {
    castle.opened = true;
    events.push({ type: 'castleOpened' });
    storyMoment(state, rules, 'castleOpened', {}, events);
  } else if (!enough && castle.opened && !rules.castle.gate.staysOpen) {
    castle.opened = false;
    events.push({ type: 'castleShut' });
  }
}

/** The part of the assault fought next (castle.json parts), or null when all are won. */
export function nextCastlePart(state: RunState, rules: RunRules): RunRules['castle']['parts'][number] | null {
  return rules.castle.parts[state.surface.castle.partsWon] ?? null;
}

/** Does the hydra stand at the castle's walls (next to its hex, on the surface)? */
export function atCastle(state: RunState): boolean {
  return state.hydra.layer === 'surface' && hexDistance(state.hydra.position, state.surface.map.castle) === 1;
}

/** Is the castle's panel open? */
export function castlePanelOpen(state: RunState): boolean {
  return state.hydra.layer === 'surface' && state.pendingPlace !== null && hexEquals(state.pendingPlace, state.surface.map.castle);
}

export type StormCheck = { can: true } | { can: false; why: 'shut' | 'notNext' | 'busy' | 'taken' };

export function canStormCastle(state: RunState, rules: RunRules): StormCheck {
  if (!castleOpen(state)) return { can: false, why: 'shut' };
  if (!nextCastlePart(state, rules)) return { can: false, why: 'taken' };
  if (!atCastle(state)) return { can: false, why: 'notNext' };
  // Only the castle's own panel may be open.
  if (state.over || state.won || state.pendingBattle || state.pendingShrine || state.pendingEvent || (state.pendingPlace && !castlePanelOpen(state))) return { can: false, why: 'busy' };
  return { can: true };
}

/** At the walls: the castle's panel opens (shut, or open with the part to storm next). */
export function reachCastle(state: RunState, events: RunEvent[]): void {
  const at = state.surface.map.castle;
  if (atCastle(state) && !isWaiting(state)) state.pendingPlace = at;
  events.push({ type: 'castleReached', at, open: castleOpen(state) });
}

/** The next part of the castle is stormed: its battle with the Order waits (run.ts stormCastle starts it). */
export function beginAssault(state: RunState, rules: RunRules): boolean {
  if (!canStormCastle(state, rules).can) return false;
  const part = nextCastlePart(state, rules)!;
  state.pendingPlace = null;
  state.pendingBattle = { at: state.surface.map.castle, layer: 'surface', groupId: part.groupId, castlePart: state.surface.castle.partsWon };
  return true;
}

/**
 * A part of the castle won (from finishBattle): the next one waits behind it, and the castle's panel opens again to
 * press on or fall back. The last one won puts out the Eternal Flame: the run is won. Returns whether someone spoke
 * about it (then the heads don't talk the battle over as well).
 */
export function castlePartWon(state: RunState, part: number, rules: RunRules, events: RunEvent[]): boolean {
  const { castle } = state.surface;
  castle.partsWon = Math.max(castle.partsWon, part + 1);
  const won = rules.castle.parts[part];
  const next = nextCastlePart(state, rules);
  events.push({ type: 'castlePartWon', partId: won?.id ?? '', nextPartId: next?.id ?? null });
  if (next) {
    if (atCastle(state)) state.pendingPlace = state.surface.map.castle;
    return storyMoment(state, rules, 'castlePartWon', {}, events);
  }
  state.won = true;
  setFlags(state, rules.castle.victoryFlags);
  events.push({ type: 'eternalFlameOut', at: state.surface.map.castle });
  storyMoment(state, rules, 'eternalFlameOut', {}, events);
  return true;
}
