// The saved game (GAME_DESIGN.md §12, CLAUDE.md "Zapis gry"): the account's profile (lineages, the Book of Lineages,
// world knowledge, unlocks) and the run of the living hydra. Both are JSON with a format number, so a save made by an
// older version of the game is recognised and dropped instead of breaking the new one.
//
// Bump RUN_FORMAT whenever RunState changes shape (a new field the game can't do without), and PROFILE_FORMAT whenever
// Profile does. A run of another format is dropped and the living generation starts again; a profile of another
// format is a fresh start. Old profiles could be converted here instead, when there are players to keep.

import type { Lineage, Profile } from '../sim/lineage';
import type { RunState } from '../sim/turn';

export const PROFILE_FORMAT = 1;
export const RUN_FORMAT = 1;

/** The run of the living hydra, with whose it is (a lineage's number and the hydra's generation). */
export interface SavedRun {
  lineage: number;
  generation: number;
  state: RunState;
}

/** Maps (the map's tiles, what the hydra knows of it) are written as their entries. */
function replacer(_key: string, value: unknown): unknown {
  return value instanceof Map ? { '<map>': [...value.entries()] } : value;
}

function reviver(_key: string, value: unknown): unknown {
  if (value !== null && typeof value === 'object' && '<map>' in value && Array.isArray((value as { '<map>': unknown })['<map>'])) {
    return new Map((value as { '<map>': Array<[unknown, unknown]> })['<map>']);
  }
  return value;
}

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

export function writeProfile(profile: Profile): string {
  return JSON.stringify({ format: PROFILE_FORMAT, profile });
}

/** The profile in a save, or null when there is none, or it is of another format or broken. */
export function readProfile(text: string | null): Profile | null {
  if (text === null) return null;
  try {
    const saved: unknown = JSON.parse(text);
    if (!isObject(saved) || saved.format !== PROFILE_FORMAT || !isObject(saved.profile)) return null;
    const profile = saved.profile;
    if (!Array.isArray(profile.lineages) || !isObject(profile.knowledge) || !Array.isArray(profile.unlocked)) return null;
    if (!Array.isArray(profile.knowledge.flags) || !Array.isArray(profile.knowledge.placesSeen)) return null;
    if (!profile.lineages.every((l) => isLineage(l))) return null;
    return profile as unknown as Profile;
  } catch {
    return null;
  }
}

function isLineage(l: unknown): l is Lineage {
  return (
    isObject(l) &&
    typeof l.number === 'number' &&
    typeof l.seed === 'number' &&
    typeof l.name === 'string' &&
    typeof l.generation === 'number' &&
    typeof l.hydraName === 'string' &&
    Array.isArray(l.names) &&
    Array.isArray(l.inherited) &&
    Array.isArray(l.flags) &&
    Array.isArray(l.seen) &&
    Array.isArray(l.enemyTypesMet) &&
    Array.isArray(l.chronicle) &&
    typeof l.ended === 'boolean' &&
    typeof l.rngState === 'number'
  );
}

export function writeRun(run: SavedRun): string {
  return JSON.stringify({ format: RUN_FORMAT, ...run }, replacer);
}

/** The run in a save, or null when there is none, or it is of another format or broken. */
export function readRun(text: string | null): SavedRun | null {
  if (text === null) return null;
  try {
    const saved: unknown = JSON.parse(text, reviver);
    if (!isObject(saved) || saved.format !== RUN_FORMAT || typeof saved.lineage !== 'number' || typeof saved.generation !== 'number') return null;
    const state = saved.state;
    if (!isObject(state) || !isObject(state.map) || !(state.map.tiles instanceof Map) || !(state.visibility instanceof Map)) return null;
    if (!isObject(state.hydra) || !Array.isArray(state.hydra.heads) || !isObject(state.story) || typeof state.turn !== 'number') return null;
    return { lineage: saved.lineage, generation: saved.generation, state: state as unknown as RunState };
  } catch {
    return null;
  }
}
