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
export const RUN_FORMAT = 8;

/** The run of the living hydra, with whose it is (a lineage's number and the hydra's generation). */
export interface SavedRun {
  lineage: number;
  generation: number;
  state: RunState;
}

/**
 * Maps are written as their entries. The two big ones are packed, because the Big World's maps (GAME_DESIGN.md §5.1,
 * radius 40, two layers) would not fit in the browser otherwise: tiles as rows of their values with the field names
 * once (`<tiles>`), and what the hydra knows as two lists (`<known>`). Words that repeat (biomes, terrain) are
 * written once and then by number.
 */
function replacer(_key: string, value: unknown): unknown {
  if (!(value instanceof Map)) return value;
  const entries = [...value.entries()];
  if (entries.length > 0 && entries.every(([k, v]) => isTileLike(k, v))) return packTiles(entries as Array<[string, TileLike]>);
  if (entries.length > 0 && entries.every(([k, v]) => typeof k === 'string' && !k.includes(';') && typeof v === 'string')) return packKnown(entries as Array<[string, string]>);
  return { '<map>': entries };
}

function reviver(_key: string, value: unknown): unknown {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return value;
  if ('<map>' in value && Array.isArray((value as { '<map>': unknown })['<map>'])) {
    return new Map((value as { '<map>': Array<[unknown, unknown]> })['<map>']);
  }
  if ('<tiles>' in value) return unpackTiles((value as { '<tiles>': PackedTiles })['<tiles>']);
  if ('<known>' in value) return unpackKnown((value as { '<known>': PackedKnown })['<known>']);
  return value;
}

type TileLike = { hex: { q: number; r: number } } & Record<string, unknown>;
interface PackedTiles {
  fields: string[];
  /** Fields that hold only words (or null): their words are written by number. */
  wordFields: string[];
  words: string[];
  rows: unknown[][];
}
interface PackedKnown {
  keys: string;
  words: string[];
  values: string;
}
/** Marks a field the tile doesn't have (JSON has no `undefined`). */
const MISSING = '<->';

function isTileLike(key: unknown, value: unknown): boolean {
  if (typeof key !== 'string' || value === null || typeof value !== 'object') return false;
  const hex = (value as { hex?: unknown }).hex;
  return isObject(hex) && typeof hex.q === 'number' && typeof hex.r === 'number' && key === `${hex.q},${hex.r}` && Object.keys(hex).length === 2;
}

function packTiles(entries: Array<[string, TileLike]>): { '<tiles>': PackedTiles } {
  const fields = [...new Set(entries.flatMap(([, t]) => Object.keys(t).filter((k) => k !== 'hex')))];
  const wordFields = fields.filter((f) => entries.every(([, t]) => t[f] === undefined || t[f] === null || typeof t[f] === 'string'));
  const words: string[] = [];
  const wordIndex = new Map<string, number>();
  const word = (w: string): number => {
    let i = wordIndex.get(w);
    if (i === undefined) {
      i = words.length;
      words.push(w);
      wordIndex.set(w, i);
    }
    return i;
  };
  const rows = entries.map(([, t]) => [
    t.hex.q,
    t.hex.r,
    ...fields.map((f) => {
      const v = t[f];
      if (v === undefined) return MISSING;
      // A word becomes its number; everything else stays as it is.
      return typeof v === 'string' && wordFields.includes(f) ? word(v) : v;
    }),
  ]);
  return { '<tiles>': { fields, wordFields, words, rows } };
}

function unpackTiles(packed: PackedTiles): Map<string, unknown> {
  const out = new Map<string, unknown>();
  for (const row of packed.rows) {
    const [q, r, ...values] = row as [number, number, ...unknown[]];
    const tile: Record<string, unknown> = { hex: { q, r } };
    packed.fields.forEach((f, i) => {
      const v = values[i];
      if (v === MISSING) return;
      tile[f] = typeof v === 'number' && packed.wordFields.includes(f) ? packed.words[v] : v;
    });
    out.set(`${q},${r}`, tile);
  }
  return out;
}

function packKnown(entries: Array<[string, string]>): { '<known>': PackedKnown } {
  const words = [...new Set(entries.map(([, v]) => v))];
  if (words.length > 36) return { '<known>': { keys: JSON.stringify(entries.map(([k]) => k)), words: entries.map(([, v]) => v), values: '' } };
  return { '<known>': { keys: entries.map(([k]) => k).join(';'), words, values: entries.map(([, v]) => words.indexOf(v).toString(36)).join('') } };
}

function unpackKnown(packed: PackedKnown): Map<string, string> {
  if (packed.values === '') {
    const keys = JSON.parse(packed.keys) as string[];
    return new Map(keys.map((k, i) => [k, packed.words[i]!]));
  }
  const keys = packed.keys === '' ? [] : packed.keys.split(';');
  return new Map(keys.map((k, i) => [k, packed.words[Number.parseInt(packed.values[i]!, 36)]!]));
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
    // The surface (M4): its own map and what the hydra knows of it.
    if (!isObject(state.surface) || !isObject(state.surface.map) || !(state.surface.map.tiles instanceof Map) || !(state.surface.visibility instanceof Map)) return null;
    return { lineage: saved.lineage, generation: saved.generation, state: state as unknown as RunState };
  } catch {
    return null;
  }
}
