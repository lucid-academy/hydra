// A lineage of hydras (GAME_DESIGN.md §12): when a hydra dies, her heiress hatches with a part of her mutations and
// what the lineage remembers; the Book of Lineages keeps every hydra with her epitaph. Until eggs come (M3) an heiress
// always hatches, so a lineage ends only when the player starts a new one.

import { hexKey } from '../hex';
import { Rng } from '../rng';
import type { Heritage, RunState } from '../turn';
import type { Challenge, ChronicleEntry, Lineage, LineageRules, Profile } from './types';

export function newProfile(): Profile {
  return { lineages: [], knowledge: { flags: [], placesSeen: [] }, unlocked: [] };
}

/** The lineage being played: the last one, unless it has ended. */
export function currentLineage(profile: Profile): Lineage | null {
  const last = profile.lineages[profile.lineages.length - 1];
  return last && !last.ended ? last : null;
}

/** Starts a lineage: its first hydra gets a name, and the lineage is named after her. */
export function startLineage(profile: Profile, seed: number, rules: LineageRules): Lineage {
  const rng = new Rng((seed ^ 0x11ea9e) >>> 0);
  const name = nextName([], rules, rng);
  const lineage: Lineage = {
    number: profile.lineages.length + 1,
    seed,
    name,
    generation: 1,
    hydraName: name,
    names: [name],
    inherited: [],
    mother: null,
    flags: [],
    seen: [],
    enemyTypesMet: [],
    chronicle: [],
    ended: false,
    rngState: rng.getState(),
  };
  profile.lineages.push(lineage);
  return lineage;
}

/**
 * The seed of the living hydra's world: the lineage's own for its first hydra, then one worked out from it and the
 * generation, so a whole lineage can be played again.
 */
export function generationSeed(lineage: Lineage): number {
  if (lineage.generation === 1) return lineage.seed;
  let h = (lineage.seed ^ Math.imul(lineage.generation, 0x9e3779b9)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

/** What the living hydra hatches with. */
export function heritageOf(profile: Profile, lineage: Lineage): Heritage {
  return {
    generation: lineage.generation,
    name: lineage.hydraName,
    lineageName: lineage.name,
    mutations: [...lineage.inherited],
    flags: [...profile.knowledge.flags, ...lineage.flags.filter((f) => !profile.knowledge.flags.includes(f))],
    seen: [...lineage.seen],
    enemyTypesMet: [...lineage.enemyTypesMet],
    placesSeen: [...profile.knowledge.placesSeen],
    mother: lineage.mother ? { ...lineage.mother } : null,
  };
}

/** The run modifier of the living hydra's world (GAME_DESIGN.md §9.6): one of those unlocked, at random; none before any is. */
export function modifierFor(profile: Profile, lineage: Lineage, rules: LineageRules): string | null {
  if (profile.unlocked.length === 0) return null;
  // A normal year (no modifier) is one more option in the draw (GAME_DESIGN.md §9.6).
  const options = [...profile.unlocked.map((id) => ({ id: id as string | null, weight: 1 })), { id: null, weight: rules.normalYearWeight }];
  return new Rng((generationSeed(lineage) ^ 0x40d1f1) >>> 0).weightedPick(options.filter((o) => o.weight > 0)).id;
}

/**
 * What a life leaves behind: world knowledge (flags of scope 'world', places seen) for everyone, flags of scope
 * 'lineage', dialogues heard and enemies met for her heiresses. Flags of her life are forgotten.
 */
export function remember(profile: Profile, lineage: Lineage, run: RunState, rules: LineageRules): void {
  for (const flag of run.story.flags) {
    const scope = rules.flagScopes[flag] ?? 'life';
    if (scope === 'world') addOnce(profile.knowledge.flags, flag);
    else if (scope === 'lineage') addOnce(lineage.flags, flag);
  }
  lineage.seen = run.story.seen.filter((id) => rules.dialogueIds.has(id));
  lineage.enemyTypesMet = [...run.story.enemyTypesMet];
  for (const tile of run.map.tiles.values()) {
    if (tile.object?.kind === 'place' && run.visibility.has(hexKey(tile.hex))) addOnce(profile.knowledge.placesSeen, tile.object.placeId);
  }
}

/**
 * The living hydra has died: she goes into the Book of Lineages with an epitaph that fits her killer, and her heiress
 * is named, with a random half of her mutations (rounded up). Returns her entry in the book.
 */
export function hydraDied(profile: Profile, lineage: Lineage, run: RunState, rules: LineageRules): ChronicleEntry {
  remember(profile, lineage, run, rules);
  const rng = Rng.fromState(lineage.rngState);
  const killers = [...new Set(run.deathCause?.enemyTypes ?? [])];
  const killedBy = killers.length > 0 ? rng.pick(killers) : null;
  const lines = (killedBy !== null ? rules.epitaphs.byEnemy[killedBy] : undefined) ?? rules.epitaphs.any;
  const biome = run.deathCause ? run.map.tiles.get(hexKey(run.deathCause.at))?.biome : undefined;
  const values = { turns: run.turn, biome: rules.biomeNames[biome ?? ''] ?? '' };
  // An epitaph already in the lineage's book is written again only when every other one is.
  const fresh = lines.filter((l) => !lineage.chronicle.some((e) => e.epitaph === fill(l, values)));
  const entry: ChronicleEntry = {
    generation: lineage.generation,
    name: lineage.hydraName,
    turns: run.turn,
    mutations: [...run.hydra.mutations],
    end: 'slain',
    killedBy,
    epitaph: fill(rng.pick(fresh.length > 0 ? fresh : lines), values),
  };
  lineage.chronicle.push(entry);

  const inherited = inherit(run.hydra.mutations, rules.inheritedShare, rng);
  const name = nextName(lineage.names, rules, rng);
  lineage.names.push(name);
  lineage.generation += 1;
  lineage.hydraName = withNumber(name, lineage.names);
  lineage.inherited = inherited;
  lineage.mother = { name: entry.name, killedBy };
  lineage.rngState = rng.getState();
  return entry;
}

/**
 * The player starts a new lineage: the current one ends. A hydra still alive goes into the Book of Lineages as the
 * last of her line, and what she learned of the world is kept. An heiress who never hatched is not written down.
 */
export function endLineage(profile: Profile, lineage: Lineage, run: RunState | null, rules: LineageRules): void {
  if (lineage.ended) return;
  if (run && !run.over && run.generation === lineage.generation) {
    remember(profile, lineage, run, rules);
    const rng = Rng.fromState(lineage.rngState);
    lineage.chronicle.push({
      generation: lineage.generation,
      name: lineage.hydraName,
      turns: run.turn,
      mutations: [...run.hydra.mutations],
      end: 'ended',
      killedBy: null,
      epitaph: fill(rng.pick(rules.epitaphs.ended), { turns: run.turn, biome: '' }),
    });
    lineage.rngState = rng.getState();
  }
  lineage.ended = true;
}

/** Challenges met by now: what they unlock is added to the account. Returns the newly unlocked ids. */
export function checkUnlocks(profile: Profile, lineage: Lineage, run: RunState, rules: LineageRules): string[] {
  const earned: string[] = [];
  for (const { id, challenge } of rules.unlocks) {
    if (profile.unlocked.includes(id) || !challengeMet(challenge, profile, lineage, run)) continue;
    profile.unlocked.push(id);
    earned.push(id);
  }
  return earned;
}

function challengeMet(c: Challenge, profile: Profile, lineage: Lineage, run: RunState): boolean {
  if (c.reachRing !== undefined) return run.deepestRing >= c.reachRing;
  if (c.battlesWon !== undefined) return run.battlesFought - (run.over ? 1 : 0) >= c.battlesWon;
  if (c.generation !== undefined) return lineage.generation >= c.generation;
  if (c.flag !== undefined) return run.story.flags.includes(c.flag) || profile.knowledge.flags.includes(c.flag);
  if (c.turns !== undefined) return run.turn >= c.turns;
  return false;
}

// ---------------------------------------------------------------- names and inheritance

/** A name for a new hydra: now and then one of her ancestresses', else one not used yet in the lineage. */
function nextName(used: readonly string[], rules: LineageRules, rng: Rng): string {
  if (used.length > 0 && rng.chance(rules.takeAncestorName)) return rng.pick([...new Set(used)]);
  const fresh = rules.names.filter((n) => !used.includes(n));
  return rng.pick(fresh.length > 0 ? fresh : rules.names);
}

/** The name with its number, when it has come before in the lineage (`names` includes this hydra): Morwenna II. */
export function withNumber(name: string, names: readonly string[]): string {
  const count = names.filter((n) => n === name).length;
  return count > 1 ? `${name} ${roman(count)}` : name;
}

export function roman(n: number): string {
  const numerals: Array<[number, string]> = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let left = n;
  let text = '';
  for (const [value, numeral] of numerals) {
    while (left >= value) {
      text += numeral;
      left -= value;
    }
  }
  return text;
}

/** A random `share` of the mutations, rounded up, in the order she carried them. */
export function inherit(mutations: readonly string[], share: number, rng: Rng): string[] {
  const count = Math.ceil(mutations.length * share);
  const order = mutations.map((id) => ({ id, key: rng.next() })).sort((a, b) => a.key - b.key);
  const kept = new Set(order.slice(0, count).map((o) => o.id));
  return mutations.filter((id) => kept.has(id));
}

function fill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
}

function addOnce(list: string[], item: string): void {
  if (!list.includes(item)) list.push(item);
}
