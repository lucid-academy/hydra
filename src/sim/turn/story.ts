// The story on the map (GAME_DESIGN.md §10, §11): flags, dialogues that react to what happened, events with choices,
// and mini quests (events chained by flags). All of it is data (src/data/dialogues.json, events.json); this file
// decides which dialogue or event fits a moment, and applies what a choice does.

import { hexKey, hexesInRange } from '../hex';
import type { Hex } from '../hex';
import { Rng } from '../rng';
import type {
  DialogueLineRules,
  DialogueRules,
  EventOutcome,
  EventRules,
  RunEvent,
  RunRules,
  RunState,
  ShownDialogue,
  ShownLine,
  StoryConditions,
  StoryState,
  StoryTrigger,
} from './types';
import { gainMutation } from './mutations';
import { boreTunnel, growHeads, look, mapOf, openThreshold, pendingThreshold, raiseAlert, startCondition, tileHere, visibilityOf } from './world';

/** What happened just now, for the conditions of a dialogue (and the names in its lines). */
export interface StoryFacts {
  biome?: string;
  won?: boolean;
  severed?: number;
  grown?: number;
  cauterized?: number;
  newEnemyTypes?: readonly string[];
  /** Heads that just grew (ids), for head:new. */
  newHeadIds?: readonly string[];
  /** A new generation: her mother's name and killer (an enemy type), and the mutations she inherited. */
  mother?: string;
  motherKilledBy?: string | null;
  inherited?: readonly string[];
}

export function newStory(seed: number, lairBiome: string): StoryState {
  return { flags: [], seen: [], enemyTypesMet: [], biomesEntered: [lairBiome], lastSerpentTurn: 1, dialogues: [], rngState: (seed ^ 0x570e7) >>> 0 };
}

/** Do the conditions hold now? */
export function conditionsHold(state: RunState, c: StoryConditions, facts: StoryFacts = {}): boolean {
  const { story, hydra } = state;
  const here = tileHere(state, hydra.position);
  const has = (flag: string) => story.flags.includes(flag);
  return (
    (c.rings === undefined || (here !== undefined && c.rings.includes(here.ring))) &&
    (c.biomes === undefined || (here !== undefined && c.biomes.includes(facts.biome ?? here.biome))) &&
    (c.flags ?? []).every(has) &&
    !(c.notFlags ?? []).some(has) &&
    (c.minAlert === undefined || state.alert >= c.minAlert) &&
    (c.maxAlert === undefined || state.alert <= c.maxAlert) &&
    (c.minTurn === undefined || state.turn >= c.minTurn) &&
    (c.headClasses ?? []).every((cls) => hydra.heads.some((h) => h.classId === cls)) &&
    (c.minHeads === undefined || hydra.heads.length >= c.minHeads) &&
    (c.maxHeads === undefined || hydra.heads.length <= c.maxHeads) &&
    (c.won === undefined || facts.won === c.won) &&
    (c.severedAtLeast === undefined || (facts.severed ?? 0) >= c.severedAtLeast) &&
    (c.grownAtLeast === undefined || (facts.grown ?? 0) >= c.grownAtLeast) &&
    (c.cauterizedAtLeast === undefined || (facts.cauterized ?? 0) >= c.cauterizedAtLeast) &&
    (c.newEnemyTypes === undefined || c.newEnemyTypes.some((t) => (facts.newEnemyTypes ?? []).includes(t))) &&
    (c.minGeneration === undefined || state.generation >= c.minGeneration) &&
    (c.maxGeneration === undefined || state.generation <= c.maxGeneration) &&
    (c.mutations ?? []).every((id) => hydra.mutations.includes(id)) &&
    (c.inheritedAtLeast === undefined || (facts.inherited ?? []).length >= c.inheritedAtLeast) &&
    (c.motherKilledBy === undefined || (facts.motherKilledBy !== undefined && facts.motherKilledBy !== null && c.motherKilledBy.includes(facts.motherKilledBy)))
  );
}

function withRng<T>(story: StoryState, use: (rng: Rng) => T): T {
  const rng = Rng.fromState(story.rngState);
  const result = use(rng);
  story.rngState = rng.getState();
  return result;
}

/** Of the things that fit, those with the highest priority. */
function best<T extends { priority: number }>(fitting: readonly T[]): T[] {
  const top = Math.max(...fitting.map((f) => f.priority));
  return fitting.filter((f) => f.priority === top);
}

// ---------------------------------------------------------------- dialogues

/**
 * The lines of a dialogue with their speakers found among the heads, or null if a speaker can't be found
 * (head:other needs two heads, head:new a new one, head:<class> a head of that class).
 * {any}, {other} and {new} in a text are those heads' names, {biome} the biome's name, {name} the hydra's, {lineage}
 * her lineage's, {mother} her mother's, and {mutation} one of the mutations she inherited (or else carries); a dialogue
 * that needs a mother or a mutation she doesn't have can't be said.
 */
function castDialogue(state: RunState, rules: RunRules, d: DialogueRules, facts: StoryFacts, rng: Rng): ShownDialogue | null {
  const heads = state.hydra.heads;
  const cast = new Map<string, (typeof heads)[number]>();
  const newHeads = heads.filter((h) => (facts.newHeadIds ?? []).includes(h.id));
  const all = [...d.lines, ...d.choices.flatMap((c) => c.reply)];
  const taken = () => new Set([...cast.values()].map((h) => h.id));
  // Heads of a class first, so head:any never turns out to be the same head as head:biter.
  const classRoles = [...new Set(all.map((l) => l.speaker.replace(/^head:/, '')))].filter((r) => !['toad', 'serpent', 'ancestor', 'new', 'any', 'other'].includes(r));
  for (const role of classRoles) {
    const pool = heads.filter((h) => h.classId === role && !taken().has(h.id));
    if (pool.length === 0) return null;
    cast.set(role, rng.pick(pool));
  }
  for (const role of ['new', 'any', 'other']) {
    if (!all.some((l) => l.speaker === `head:${role}` || l.text.includes(`{${role}}`))) continue;
    const pool = (role === 'new' ? newHeads : heads).filter((h) => !taken().has(h.id));
    if (pool.length === 0) return null;
    cast.set(role, rng.pick(pool));
  }
  const story = rules.story;
  const uses = (placeholder: string) => all.some((l) => l.text.includes(`{${placeholder}}`)) || d.choices.some((c) => c.text.includes(`{${placeholder}}`));
  if ((uses('mother') || all.some((l) => l.speaker === 'ancestor')) && !facts.mother) return null;
  let mutation: string | null = null;
  if (uses('mutation')) {
    const pool = (facts.inherited ?? []).length > 0 ? facts.inherited! : state.hydra.mutations;
    if (pool.length === 0) return null;
    mutation = story.mutationNames[rng.pick(pool)] ?? null;
  }
  const fill = (text: string) =>
    text
      .replace(/\{(any|other|new)\}/g, (_, role: string) => cast.get(role)!.name)
      .replace(/\{biome\}/g, story.biomeNames[facts.biome ?? tileHere(state, state.hydra.position)?.biome ?? ''] ?? '')
      .replace(/\{name\}/g, state.hydra.name)
      .replace(/\{lineage\}/g, state.lineageName)
      .replace(/\{mother\}/g, facts.mother ?? '')
      .replace(/\{mutation\}/g, mutation ?? '');
  const line = (l: DialogueLineRules): ShownLine => {
    if (l.speaker === 'toad' || l.speaker === 'serpent') return { speaker: l.speaker, name: story.speakerNames[l.speaker] ?? l.speaker, classId: null, text: fill(l.text) };
    if (l.speaker === 'ancestor') return { speaker: 'ancestor', name: facts.mother ?? story.speakerNames.ancestor ?? '', classId: null, text: fill(l.text) };
    const head = cast.get(l.speaker.replace(/^head:/, ''))!;
    return { speaker: 'head', name: head.name, classId: head.classId, text: fill(l.text) };
  };
  return { id: d.id, lines: d.lines.map(line), choices: d.choices.map((c) => ({ text: fill(c.text), reply: c.reply.map(line) })) };
}

/** Says a dialogue: it is queued for the screen, counts as seen, and sets its flags. */
function say(state: RunState, d: DialogueRules, shown: ShownDialogue, events: RunEvent[]): void {
  const { story } = state;
  story.dialogues.push(shown);
  if (!story.seen.includes(d.id)) story.seen.push(d.id);
  setFlags(state, d.setFlags);
  events.push({ type: 'dialogueQueued', id: d.id });
}

/** Something happened: the dialogue that fits it best is queued (if any fits). Returns whether one was. */
export function storyMoment(state: RunState, rules: RunRules, trigger: StoryTrigger, facts: StoryFacts, events: RunEvent[]): boolean {
  const { story } = state;
  const fitting = rules.story.dialogues.filter(
    (d) => d.trigger === trigger && !(d.once && story.seen.includes(d.id)) && conditionsHold(state, d.conditions, facts),
  );
  return withRng(story, (rng) => {
    // The best that can be cast; if none of the best can, the next best.
    let left = fitting;
    while (left.length > 0) {
      const top = best(left);
      const order = top.map((d) => ({ d, key: rng.next() })).sort((a, b) => a.key - b.key);
      for (const { d } of order) {
        const shown = castDialogue(state, rules, d, facts, rng);
        if (shown) {
          say(state, d, shown, events);
          return true;
        }
      }
      left = left.filter((d) => !top.includes(d));
    }
    return false;
  });
}

/** Queues a dialogue by id (an event's choice asks for it). */
export function storyDialogue(state: RunState, rules: RunRules, id: string, events: RunEvent[], facts: StoryFacts = {}): boolean {
  const d = rules.story.dialogues.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown dialogue "${id}"`);
  const shown = withRng(state.story, (rng) => castDialogue(state, rules, d, facts, rng));
  if (!shown) return false;
  say(state, d, shown, events);
  return true;
}

/** The screen has shown the first queued dialogue; `choice` is the answer picked (if it had choices). */
export function dialogueShown(state: RunState, rules: RunRules, choice: number | null): void {
  const shown = state.story.dialogues.shift();
  if (!shown || choice === null) return;
  setFlags(state, rules.story.dialogues.find((d) => d.id === shown.id)?.choices[choice]?.setFlags ?? []);
}

/** At the end of a turn away from the lair, the Serpent may speak (not too often). */
export function serpentOnTheWay(state: RunState, rules: RunRules, events: RunEvent[]): void {
  const { story } = state;
  const voice = rules.story.serpentVoice;
  if (state.turn - story.lastSerpentTurn < voice.minTurnsBetween) return;
  if (!withRng(story, (rng) => rng.chance(voice.chancePerTurn))) return;
  if (storyMoment(state, rules, 'serpentOnTheWay', {}, events)) story.lastSerpentTurn = state.turn;
}

/** A short line of the Serpent for the battle about to start (said over the battle, without a pause), or null. */
export function serpentInBattle(state: RunState, rules: RunRules): ShownLine | null {
  if (!withRng(state.story, (rng) => rng.chance(rules.story.serpentVoice.battleChance))) return null;
  const events: RunEvent[] = [];
  if (!storyMoment(state, rules, 'serpentInBattle', {}, events)) return null;
  // Not shown as a dialogue: the battle shows its first line itself.
  return state.story.dialogues.pop()?.lines[0] ?? null;
}

/** Enemy types of a group met for the first time; from now on they are known. */
export function meetEnemies(state: RunState, types: readonly string[]): string[] {
  const fresh = [...new Set(types)].filter((t) => !state.story.enemyTypesMet.includes(t));
  state.story.enemyTypesMet.push(...fresh);
  return fresh;
}

// ---------------------------------------------------------------- events

/** The hydra steps on an event site: the event that fits best happens (or, if none does, the site is empty). */
export function eventArrived(state: RunState, at: Hex, rules: RunRules, events: RunEvent[]): boolean {
  const tile = tileHere(state, at);
  const object = tile?.object;
  if (object?.kind !== 'event' || object.done) return false;
  if (object.eventId === null) {
    const { story } = state;
    // On the surface, only events that name its biome: the rest happen underground.
    const fitsHere = (e: EventRules) => state.hydra.layer !== 'surface' || (e.conditions.biomes ?? []).includes(tile!.biome);
    const fitting = rules.story.events.filter((e) => fitsHere(e) && !(e.once && story.seen.includes(e.id)) && conditionsHold(state, e.conditions));
    if (fitting.length === 0) {
      object.done = true;
      return false;
    }
    const picked = withRng(story, (rng) => rng.weightedPick(best(fitting)));
    object.eventId = picked.id;
    if (!story.seen.includes(picked.id)) story.seen.push(picked.id);
  }
  state.pendingEvent = { at, eventId: object.eventId, result: null };
  events.push({ type: 'eventReached', at, eventId: object.eventId });
  return true;
}

export function pendingEventRules(state: RunState, rules: RunRules): EventRules | null {
  const id = state.pendingEvent?.eventId;
  return id ? (rules.story.events.find((e) => e.id === id) ?? null) : null;
}

export type EventChoiceCheck = { can: true } | { can: false; why: 'needsHead' | 'needsCondition' | 'cost' | 'done' };

export function canChooseEventOption(state: RunState, rules: RunRules, index: number): EventChoiceCheck {
  const choice = pendingEventRules(state, rules)?.choices[index];
  if (!choice || state.pendingEvent?.result) return { can: false, why: 'done' };
  if (choice.needsHead && !state.hydra.heads.some((h) => h.classId === choice.needsHead && h.hp > 0)) return { can: false, why: 'needsHead' };
  if (choice.needsCondition && !state.hydra.conditions.some((c) => c.id === choice.needsCondition)) return { can: false, why: 'needsCondition' };
  const { resources } = state;
  if (resources.muck < choice.cost.muck || resources.moisture < choice.cost.moisture || resources.bones < choice.cost.bones) return { can: false, why: 'cost' };
  return { can: true };
}

/** Picks a choice of the event the hydra stands at: pays its cost, rolls a gamble, and applies what comes of it. */
export function chooseEventOption(state: RunState, rules: RunRules, index: number): RunEvent[] {
  const pending = state.pendingEvent;
  const event = pendingEventRules(state, rules);
  if (!pending || !event || !canChooseEventOption(state, rules, index).can) return [];
  const choice = event.choices[index]!;
  for (const kind of ['muck', 'moisture', 'bones'] as const) state.resources[kind] -= choice.cost[kind];
  const success = choice.chance === null || choice.failure === null || withRng(state.story, (rng) => rng.chance(choice.chance!));
  const outcome = success ? choice.success : choice.failure!;
  const events: RunEvent[] = [];
  applyOutcome(state, rules, outcome, pending.at, events);
  pending.result = { text: outcome.text, choice: index, success };
  const object = tileHere(state, pending.at)?.object;
  if (object?.kind === 'event') object.done = true;
  events.unshift({ type: 'eventResolved', at: pending.at, eventId: event.id, choice: index, success });
  return events;
}

/** Closes the event's panel (after its choice). A battle it started waits on the map. */
export function closeEvent(state: RunState): void {
  if (state.pendingEvent?.result) state.pendingEvent = null;
}

function applyOutcome(state: RunState, rules: RunRules, o: EventOutcome, at: Hex, events: RunEvent[]): void {
  const { hydra, resources } = state;
  for (const kind of ['muck', 'moisture', 'bones'] as const) resources[kind] = Math.max(0, resources[kind] + o.loot[kind]);
  if (o.alert !== 0) raiseAlert(state, o.alert, rules);
  if (o.bodyHp !== 0) hydra.bodyHp = Math.max(1, Math.min(hydra.bodyMaxHp, hydra.bodyHp + o.bodyHp));
  if (o.headsHp !== 0) for (const head of hydra.heads) head.hp = Math.max(1, Math.min(head.maxHp, head.hp + o.headsHp));
  if (o.condition) startCondition(state, o.condition.id, o.condition.turns, rules, events);
  if (o.reveal > 0) {
    const visibility = visibilityOf(state);
    for (const h of hexesInRange(hydra.position, o.reveal)) {
      const key = hexKey(h);
      if (mapOf(state).tiles.has(key) && !visibility.has(key)) visibility.set(key, 'remembered');
    }
  }
  setFlags(state, o.setFlags);
  if (o.newHead) growHeads(state, rules, 1, o.newHead);
  if (o.mutation) gainMutation(state, o.mutation, rules, events);
  if (o.bore) {
    const tunnel = withRng(state.story, (rng) => boreTunnel(state, rules, at, rng));
    events.push(tunnel ? { type: 'tunnelBored', at: tunnel.at, path: tunnel.path } : { type: 'boreFailed' });
  }
  if (o.battle) {
    state.pendingBattle = { at, layer: state.hydra.layer, groupId: o.battle };
    const fresh = meetEnemies(state, rules.encounterGroupMembers[o.battle] ?? []);
    storyMoment(state, rules, 'enemyAhead', { newEnemyTypes: fresh }, events);
  }
  if (o.dialogue) storyDialogue(state, rules, o.dialogue, events);
}

export function setFlags(state: RunState, flags: readonly string[]): void {
  for (const flag of flags) if (!state.story.flags.includes(flag)) state.story.flags.push(flag);
}

// ---------------------------------------------------------------- sealed thresholds (a step of a mini quest)

export type SealedWayCheck = { can: true } | { can: false; why: 'missing' | 'notSealed' };

/** Can the sealed threshold whose panel is open be opened its way number `way` (is that way's flag set)? */
export function canOpenSealed(state: RunState, rules: RunRules, way: number): SealedWayCheck {
  const tile = pendingThreshold(state);
  const sealed = tile?.object.state === 'closed' ? rules.thresholds[tile.object.thresholdId]?.sealed : null;
  const flag = sealed?.ways[way]?.flag;
  if (!flag) return { can: false, why: 'notSealed' };
  return state.story.flags.includes(flag) ? { can: true } : { can: false, why: 'missing' };
}

/** Opens the sealed threshold whose panel is open, its way number `way`: it sets its flags and says its dialogue. */
export function openSealed(state: RunState, rules: RunRules, way: number): RunEvent[] {
  const tile = pendingThreshold(state);
  if (!tile || !canOpenSealed(state, rules, way).can) return [];
  const sealed = rules.thresholds[tile.object.thresholdId]!.sealed!;
  const events: RunEvent[] = [];
  openThreshold(tile);
  events.push({ type: 'thresholdOpened', at: tile.hex, thresholdId: tile.object.thresholdId });
  state.pendingPlace = null;
  look(state, rules);
  setFlags(state, sealed.setFlags);
  if (sealed.dialogue) storyDialogue(state, rules, sealed.dialogue, events);
  return events;
}
