// The saved game (GAME_DESIGN.md §12, CLAUDE.md "Zapis gry"): the account's profile (lineages, the Book of Lineages,
// world knowledge, unlocks) and the run of the living hydra. Both are JSON with a format number, so a save made by an
// older version of the game is recognised and dropped instead of breaking the new one.
//
// Bump RUN_FORMAT whenever RunState changes shape (a new field the game can't do without), and PROFILE_FORMAT whenever
// Profile does. A run of another format is dropped and the living generation starts again. A profile of an older
// format is brought up to date (upgradeProfile), so the Book of Lineages and the unlocks survive a new version of
// the game; one it doesn't know is a fresh start.

import type { Lineage, Profile } from '../sim/lineage';
import type { RunState } from '../sim/turn';

export const PROFILE_FORMAT = 2;
export const RUN_FORMAT = 5;

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
    if (!isObject(saved) || typeof saved.format !== 'number' || !isObject(saved.profile)) return null;
    const profile = upgradeProfile(saved.format, saved.profile);
    if (!profile) return null;
    if (!Array.isArray(profile.lineages) || !isObject(profile.knowledge) || !Array.isArray(profile.unlocked)) return null;
    if (!Array.isArray(profile.knowledge.flags) || !Array.isArray(profile.knowledge.placesSeen)) return null;
    if (!profile.lineages.every((l) => isLineage(l))) return null;
    return profile as unknown as Profile;
  } catch {
    return null;
  }
}

/** A profile of an older format, brought up to this one; null for a format this game doesn't know. */
function upgradeProfile(format: number, profile: Record<string, unknown>): Record<string, unknown> | null {
  if (format > PROFILE_FORMAT || format < 1) return null;
  // 1 → 2 (M3): a lineage keeps the eggs its last hydra left, and the egg Old Mother Toad hid. Format 1 had neither:
  // an heiress waiting to hatch already has her inheritance.
  if (format < 2 && Array.isArray(profile.lineages)) {
    for (const lineage of profile.lineages) {
      if (isObject(lineage)) Object.assign(lineage, { eggs: null, hiddenEgg: null });
    }
  }
  return profile;
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
    (l.eggs === null || (Array.isArray(l.eggs) && l.eggs.every((e) => Array.isArray(e)))) &&
    (l.hiddenEgg === null || (isObject(l.hiddenEgg) && Array.isArray(l.hiddenEgg.mutations))) &&
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
