// State of one run on the strategic map, and the commands that change it.
// Commands mutate the state and return events, which the scenes use to animate and show messages.
// What the hydra meets on the way (thresholds, places, remains, hints) is in ./world.

import type { BattleResult, BattleSetup } from '../battle';
import { hexDistance, hexEquals, hexKey, hexNeighbors } from '../hex';
import type { Hex } from '../hex';
import { generateUnderground, updateVisibility } from '../map';
import type { Layer, MapObject, Tile } from '../map';
import { Rng } from '../rng';
import { gainExperience } from './experience';
import { applyBirthMutations, gainMutation, headMaxHp, mutationTotal, startingHeadCount } from './mutations';
import { breakEggs, lairTurn, newLair, scoutsCaught } from './lair';
import { meetOrderAt, newOrder, orderBlocks, orderTurn, sendMessenger, unitBeaten } from './order';
import { eventArrived, meetEnemies, newStory, serpentOnTheWay, storyMoment } from './story';
import { arriveOnSurface, breathCost, canCrawl, coverIfMisty, exposedNow, hasMist, newSurface, putMist, putOutShrine, surfaceTurn } from './surface';
import type { BlessingEffects, Heritage, Journey, Reachable, RunEvent, RunRules, RunState } from './types';
import {
  arriveAt,
  battleSilenced,
  coolTunnels,
  growHeads,
  isWaiting,
  look,
  lookAround,
  mapOf,
  movementForTurn,
  raiseAlert,
  tickConditions,
  tileAt,
  tileHere,
  tileOn,
  visibilityOf,
} from './world';

export interface RunOptions {
  /** Run modifiers (ids from world.json runModifiers) that shape this run's world. */
  modifiers?: readonly string[];
  /** What the hydra hatches with from her lineage (GAME_DESIGN.md §12): name, mutations, what is remembered. */
  heritage?: Heritage;
}

export function createRun(seed: number, rules: RunRules, options: RunOptions = {}): RunState {
  const heritage = options.heritage;
  const map = generateUnderground(
    seed,
    { ...rules.generator, modifiers: [...(options.modifiers ?? [])], placesSeen: [...(heritage?.placesSeen ?? [])] },
    rules.terrain,
  );
  // A separate stream from the map's, so changing starting heads never changes the map.
  const rng = new Rng((seed ^ 0x5eed) >>> 0);
  const names = [...rules.headNames];
  // Mutations she is born with may change how many heads she hatches with: one more of a random hatchling class, or
  // one fewer, at random.
  let lineup = [...rules.startingHeads];
  const count = startingHeadCount(heritage?.mutations ?? [], rules);
  while (lineup.length > count) lineup.splice(rng.int(0, lineup.length - 1), 1);
  while (lineup.length < count) lineup.push(rng.pick(rules.hatchlingClasses));
  const heads = lineup.map((h, i) => {
    const name = names.splice(rng.int(0, names.length - 1), 1)[0] ?? `Head ${i + 1}`;
    return { id: `h${i + 1}`, name, classId: h.classId, level: 1, hp: h.maxHp, maxHp: h.maxHp };
  });

  const state: RunState = {
    seed,
    generation: heritage?.generation ?? 1,
    lineageName: heritage?.lineageName ?? '',
    turn: 1,
    map,
    hydra: {
      name: heritage?.name ?? '',
      mutations: [],
      inherited: [...(heritage?.mutations ?? [])],
      position: map.lair,
      movementLeft: rules.movementPointsPerTurn,
      movementPerTurn: rules.movementPointsPerTurn,
      sightRange: rules.sightRangeHexes,
      bodyHp: rules.bodyMaxHp,
      bodyMaxHp: rules.bodyMaxHp,
      regeneration: rules.healing.bodyHpPerTurn,
      heads,
      layer: 'underground',
      scars: 0,
      blessings: [],
      conditions: [],
    },
    visibility: new Map(),
    alert: rules.alertMin,
    resources: { muck: 0, moisture: 0, bones: 0 },
    pendingBattle: null,
    pendingShrine: null,
    pendingPlace: null,
    echoes: [],
    draughtsFelt: [],
    battlesFought: 0,
    deepestRing: 0,
    nextId: heads.length + 1,
    rngState: rng.getState(),
    over: false,
    deathCause: null,
    story: newStory(seed, map.tiles.get(hexKey(map.lair))!.biome),
    pendingEvent: null,
    hotUntil: {},
    order: newOrder(seed, rules),
    lair: { eggs: [], defenders: 0, scouts: [], nextId: 1, eggHidden: false },
    surface: newSurface(seed, map, rules),
  };
  if (heritage) {
    state.story.flags.push(...heritage.flags);
    state.story.seen.push(...heritage.seen);
    state.story.enemyTypesMet.push(...heritage.enemyTypesMet);
    applyBirthMutations(state, heritage.mutations, rules);
  }
  // Her mother's eggs wait in the lair, each with its share of what she was born with.
  newLair(state, rules);
  state.lair.eggHidden = heritage?.hiddenEgg ?? false;
  placeMark(state, rules);
  // Seeing the lair's surroundings at the start doesn't count as exploring.
  lookAround(state, rules, []);
  // An heiress: Old Mother Toad greets her, and her mother may speak through her sleep.
  if (heritage?.mother) {
    const facts = { mother: heritage.mother.name, motherKilledBy: heritage.mother.killedBy, inherited: heritage.mutations };
    storyMoment(state, rules, 'newGeneration', facts, []);
    const voice = Rng.fromState(state.story.rngState);
    const speaks = voice.chance(rules.story.ancestorVoiceChance);
    state.story.rngState = voice.getState();
    if (speaks) storyMoment(state, rules, 'ancestorInSleep', facts, []);
  }
  return state;
}

/**
 * A marking shrine (GAME_DESIGN.md §12): with some chance one shrine of the deeper rings offers a mutation the hydra
 * doesn't carry instead of its blessing. Its own stream of random numbers, so the rest of the world stays the same.
 */
function placeMark(state: RunState, rules: RunRules): void {
  const rng = new Rng((state.seed ^ 0x3a2c71) >>> 0);
  if (!rng.chance(rules.marks.chance)) return;
  const shrines = [...state.map.tiles.values()].filter((t) => t.object?.kind === 'shrine' && t.region === 'ring' && rules.marks.rings.includes(t.ring));
  const marks = Object.keys(rules.mutations).filter((id) => !state.hydra.mutations.includes(id) && !rules.bossMutations.includes(id));
  if (shrines.length === 0 || marks.length === 0) return;
  const shrine = rng.pick(shrines).object as Extract<MapObject, { kind: 'shrine' }>;
  shrine.mark = rng.pick(marks);
}

/** Objects the hydra stops at when it walks onto them, and can't walk through. */
function stopsTheHydra(object: MapObject | null): boolean {
  return (
    object?.kind === 'encounter' ||
    (object?.kind === 'shrine' && !object.used) ||
    (object?.kind === 'place' && !object.visited) ||
    (object?.kind === 'event' && !object.done) ||
    (object?.kind === 'flameShrine' && object.burning)
  );
}

/** Objects she can't go onto at all: the castle (until M7), and the villages, mills, watchtowers and camps. */
function closedToTheHydra(object: MapObject | null): boolean {
  return object?.kind === 'castle' || object?.kind === 'settlement';
}

/**
 * Hexes the hydra can reach this turn, with the cheapest path to each.
 * Only known (explored) hexes can be crossed. Encounters, unused shrines and places not yet visited can be entered but not crossed.
 */
export function reachableHexes(state: RunState, rules: RunRules): Map<string, Reachable> {
  if (isWaiting(state)) return new Map();
  return cheapestPaths(state, rules, state.hydra.movementLeft);
}

/**
 * A journey of several turns to a known hex (a travel plan, as in Heroes): the cheapest way there by the same rules as
 * a move, without the limit of this turn's movement, and the turn each step is taken in (0 = this turn). Later turns are
 * counted with the hydra's usual movement; a step that costs more than the turn has left waits for the next turn.
 * Null when the hex can't be reached at all.
 */
export function plannedJourney(state: RunState, target: Hex, rules: RunRules): Journey | null {
  if (isWaiting(state) || hexEquals(target, state.hydra.position)) return null;
  const route = cheapestPaths(state, rules, Infinity).get(hexKey(target));
  if (!route) return null;
  const turns: number[] = [];
  let turn = 0;
  let left = state.hydra.movementLeft;
  for (const step of route.path) {
    const cost = rules.terrain[tileHere(state, step)!.terrain].moveCost!;
    while (cost > left) {
      // A step dearer than a whole turn (a slow hydra in salt) is still taken, with a fresh turn's movement.
      if (left === state.hydra.movementPerTurn) break;
      turn++;
      left = state.hydra.movementPerTurn;
    }
    left -= cost;
    turns.push(turn);
  }
  return { ...route, turns };
}

/**
 * The cheapest paths from the hydra to every known hex of her map she can get to for at most `limit` movement. On the
 * surface she walks only in mist, or breathes mist ahead of her for Moisture (as much as she has); an Exposed hydra
 * with none may crawl one step (surface.ts canCrawl).
 */
function cheapestPaths(state: RunState, rules: RunRules, limit: number): Map<string, Reachable> {
  const start = state.hydra.position;
  const surface = state.hydra.layer === 'surface';
  const { tiles } = mapOf(state);
  const visibility = visibilityOf(state);
  const best = new Map<string, Reachable>([[hexKey(start), { cost: 0, path: [], moisture: 0 }]]);
  const frontier: Hex[] = [start];
  while (frontier.length > 0) {
    // Take the cheapest hex left (the first of equals): simpler to read than a priority queue, and quick enough here.
    let pick = 0;
    for (let i = 1; i < frontier.length; i++) if (cheaper(best.get(hexKey(frontier[i]!))!, best.get(hexKey(frontier[pick]!))!)) pick = i;
    const current = frontier.splice(pick, 1)[0]!;
    const here = best.get(hexKey(current))!;
    const tile = tiles.get(hexKey(current))!;
    if (!hexEquals(current, start) && (stopsTheHydra(tile.object) || orderBlocks(state, current))) continue;
    for (const next of hexNeighbors(current)) {
      const key = hexKey(next);
      const nextTile = tiles.get(key);
      if (!nextTile || !visibility.has(key) || closedToTheHydra(nextTile.object)) continue;
      const stepCost = rules.terrain[nextTile.terrain].moveCost;
      if (stepCost === null) continue;
      let cost = here.cost + stepCost;
      let moisture = here.moisture ?? 0;
      if (surface) {
        const breath = breathCost(state, next, rules);
        if (breath !== null && moisture + breath <= state.resources.moisture) moisture += breath;
        else if (hexEquals(current, start) && canCrawl(state, rules)) cost = Math.max(cost, state.hydra.movementLeft);
        else continue;
      }
      if (cost > limit) continue;
      const step = { cost, path: [...here.path, next], moisture };
      const known = best.get(key);
      if (known && !cheaper(step, known)) continue;
      best.set(key, step);
      frontier.push(next);
    }
  }
  best.delete(hexKey(start));
  return best;
}

/** A way that takes less movement, or as much and less Moisture. */
function cheaper(a: Reachable, b: Reachable): boolean {
  return a.cost < b.cost || (a.cost === b.cost && (a.moisture ?? 0) < (b.moisture ?? 0));
}

/**
 * Moves the hydra step by step, revealing the map as it goes. Does nothing if the target is out of reach.
 * Ending the move on a place with something to do opens its panel.
 */
export function moveHydra(state: RunState, target: Hex, rules: RunRules): RunEvent[] {
  const route = reachableHexes(state, rules).get(hexKey(target));
  if (!route) return [];

  const events: RunEvent[] = [];
  const surface = state.hydra.layer === 'surface';
  const walked: Hex[] = [];
  const breathed: Hex[] = [];
  let moisture = 0;
  let discovered = 0;
  let stopped = false;
  for (const step of route.path) {
    const tile = tileHere(state, step)!;
    walked.push(step);
    // On the surface, mist goes ahead of her: breathed onto the hex before she steps on it.
    const ahead = rules.surface.mist.breatheAhead;
    if (surface && !hasMist(state, step) && (!ahead || state.resources.moisture < ahead.moisture)) {
      // Exposed with nothing to breathe: she crawls, and that takes the turn.
      state.hydra.movementLeft = 0;
    } else {
      state.hydra.movementLeft -= rules.terrain[tile.terrain].moveCost!;
      if (surface && ahead && !hasMist(state, step)) {
        state.resources.moisture -= ahead.moisture;
        moisture += ahead.moisture;
        breathed.push(...putMist(state, [step], ahead.turns, rules));
      }
    }
    const arrived = surface ? arriveOnSurface(state, step, rules, events) : arriveAt(state, step, rules, events);
    discovered += arrived.discovered;
    if (arrived.stop || meetOrderAt(state, step, rules, events) || eventArrived(state, step, rules, events)) {
      stopped = true;
      break;
    }
  }
  if (!stopped) openPanelAt(state, target, rules, events);

  events.unshift({ type: 'moved', path: walked });
  if (breathed.length > 0) events.push({ type: 'mistBreathed', hexes: breathed, moisture });
  noticeDiscoveries(state, rules, discovered, walked, events);
  battleAhead(state, rules, events);
  return events;
}

/** Ending a move where there is something to deal with: a place's panel, the lair's, a Passage's. */
function openPanelAt(state: RunState, at: Hex, rules: RunRules, events: RunEvent[]): void {
  const object = tileHere(state, at)?.object;
  if (object?.kind === 'place' && (rules.places[object.placeId]?.actions.length ?? 0) > 0) {
    state.pendingPlace = at;
    events.push({ type: 'placeReached', at, placeId: object.placeId, firstVisit: false });
  }
  // Home: the lair's panel opens, for the eggs.
  if (object?.kind === 'lair') {
    state.pendingPlace = at;
    events.push({ type: 'lairOpened' });
  }
  if (object?.kind === 'passage') {
    state.pendingPlace = at;
    events.push({ type: 'passageReached', at, layer: state.hydra.layer });
  }
}

/** New hexes seen raise the Alert a little; the story notices a biome entered for the first time. */
function noticeDiscoveries(state: RunState, rules: RunRules, discovered: number, walked: readonly Hex[], events: RunEvent[]): void {
  if (discovered > 0) {
    const each = state.hydra.layer === 'surface' ? rules.surface.alertPerHexDiscovered : rules.alertPerHexDiscovered;
    raiseAlert(state, discovered * each, rules);
    events.push({ type: 'discovered', count: discovered });
  }
  const newBiomes = [...new Set(walked.map((h) => tileHere(state, h)!.biome))].filter((b) => !state.story.biomesEntered.includes(b));
  state.story.biomesEntered.push(...newBiomes);
  if (newBiomes.length > 0) storyMoment(state, rules, 'newBiome', { biome: newBiomes[0] }, events);
}

/** A battle is about to start: the story notices people of the Order never met before. */
function battleAhead(state: RunState, rules: RunRules, events: RunEvent[]): void {
  if (!state.pendingBattle) return;
  const fresh = meetEnemies(state, rules.encounterGroupMembers[state.pendingBattle.groupId] ?? []);
  storyMoment(state, rules, 'enemyAhead', { newEnemyTypes: fresh }, events);
  events.push({ type: 'battleStarted', at: state.pendingBattle.at });
}

// ---------------------------------------------------------------- Passages

export type PassageCheck = { can: true } | { can: false; why: 'notOnPassage' | 'noMovement' };

/** Can she go up (or down) the Passage she stands on, whose panel is open? */
export function canUsePassage(state: RunState, rules: RunRules): PassageCheck {
  if (state.over || tileHere(state, state.hydra.position)?.object?.kind !== 'passage') return { can: false, why: 'notOnPassage' };
  if (state.hydra.movementLeft < rules.surface.passageMovement) return { can: false, why: 'noMovement' };
  return { can: true };
}

/**
 * Up (or down) the Passage she stands on, onto the same hex of the other map (GAME_DESIGN.md §5.1). The Passage keeps
 * mist on its hex for good, so she always comes out in mist. Someone of the Order standing there: a battle.
 */
export function usePassage(state: RunState, rules: RunRules): RunEvent[] {
  if (!canUsePassage(state, rules).can) return [];
  const { hydra } = state;
  const events: RunEvent[] = [];
  state.pendingPlace = null;
  hydra.movementLeft -= rules.surface.passageMovement;
  // What she saw on the map she leaves, she now only remembers.
  updateVisibility(visibilityOf(state), new Set());
  const layer: Layer = hydra.layer === 'surface' ? 'underground' : 'surface';
  hydra.layer = layer;
  // The Order on the surface stirs once she has been seen up there.
  if (layer === 'surface' && state.surface.nextPatrolTurn === null) state.surface.nextPatrolTurn = state.turn + rules.surface.order.patrols.firstOnTurn;
  events.push({ type: 'climbed', layer, at: hydra.position });
  coverIfMisty(state, events);
  const discovered = lookAround(state, rules, events);
  noticeDiscoveries(state, rules, discovered, [hydra.position], events);
  meetOrderAt(state, hydra.position, rules, events);
  battleAhead(state, rules, events);
  return events;
}

/**
 * The player taps a place or a threshold to deal with it. The place the hydra stands on: its panel opens.
 * A closed threshold it knows: the hydra walks next to it the cheapest way (if it can this turn), and its panel opens.
 * Anything else: nothing happens.
 */
export function inspect(state: RunState, target: Hex, rules: RunRules): RunEvent[] {
  if (isWaiting(state) || !visibilityOf(state).has(hexKey(target))) return [];
  const object = tileHere(state, target)?.object;
  if ((object?.kind === 'place' || object?.kind === 'lair' || object?.kind === 'passage') && hexEquals(target, state.hydra.position)) {
    const events: RunEvent[] = [];
    openPanelAt(state, target, rules, events);
    return events;
  }
  if (object?.kind === 'castle') return [{ type: 'castleReached', at: target }];
  if (object?.kind !== 'threshold' || object.state !== 'closed') return [];

  const events: RunEvent[] = [];
  if (hexDistance(state.hydra.position, target) > 1) {
    const approach = thresholdApproach(state, target, rules);
    if (!approach) return [];
    events.push(...moveHydra(state, approach, rules));
    if (isWaiting(state) || hexDistance(state.hydra.position, target) > 1) return events;
  }
  state.pendingPlace = target;
  events.push({ type: 'thresholdReached', at: target, thresholdId: object.thresholdId });
  return events;
}

/** The hex next to a threshold the hydra can reach most cheaply this turn, without walking into anything that stops it. */
export function thresholdApproach(state: RunState, threshold: Hex, rules: RunRules): Hex | null {
  const reachable = reachableHexes(state, rules);
  let best: { hex: Hex; cost: number } | null = null;
  for (const h of hexNeighbors(threshold)) {
    const route = reachable.get(hexKey(h));
    if (!route || stopsTheHydra(tileAt(state, h)?.object ?? null)) continue;
    if (!best || route.cost < best.cost) best = { hex: h, cost: route.cost };
  }
  return best?.hex ?? null;
}

// ---------------------------------------------------------------- shrines

function pendingShrineObject(state: RunState): Extract<MapObject, { kind: 'shrine' }> | null {
  if (!state.pendingShrine) return null;
  const object = tileAt(state, state.pendingShrine)?.object;
  return object?.kind === 'shrine' ? object : null;
}

/**
 * Takes the blessing of the shrine the hydra stands at: its effects apply now, and the shrine has nothing more to give.
 * A marking shrine gives its mark instead: a mutation, for her and her heiresses.
 */
export function acceptBlessing(state: RunState, rules: RunRules): RunEvent[] {
  const shrine = pendingShrineObject(state);
  if (!shrine) return [];
  if (shrine.mark) {
    const events: RunEvent[] = [{ type: 'markAccepted', mutationId: shrine.mark }];
    gainMutation(state, shrine.mark, rules, events);
    shrine.used = true;
    state.pendingShrine = null;
    return events;
  }
  const effects = rules.blessings[shrine.blessingId];
  if (!effects) throw new Error(`Unknown blessing "${shrine.blessingId}"`);
  applyBlessing(state, effects, rules);
  shrine.used = true;
  state.hydra.blessings.push(shrine.blessingId);
  state.pendingShrine = null;
  return [{ type: 'blessingAccepted', blessingId: shrine.blessingId }];
}

/** Walks away from the shrine; it keeps its blessing for later. */
export function refuseBlessing(state: RunState): RunEvent[] {
  const shrine = pendingShrineObject(state);
  if (!shrine) return [];
  state.pendingShrine = null;
  return [{ type: 'blessingRefused', blessingId: shrine.blessingId }];
}

function applyBlessing(state: RunState, effects: BlessingEffects, rules: RunRules): void {
  const { hydra } = state;
  if (effects.movement) {
    const before = hydra.movementPerTurn;
    hydra.movementPerTurn = Math.max(1, hydra.movementPerTurn + effects.movement);
    // Felt at once: this turn's movement changes by the same amount.
    hydra.movementLeft = Math.max(0, hydra.movementLeft + (hydra.movementPerTurn - before));
  }
  if (effects.sight) {
    hydra.sightRange = Math.max(1, hydra.sightRange + effects.sight);
    look(state, rules);
  }
  if (effects.bodyMaxHp) {
    const before = hydra.bodyMaxHp;
    hydra.bodyMaxHp = Math.max(20, hydra.bodyMaxHp + effects.bodyMaxHp);
    hydra.bodyHp = Math.max(1, Math.min(hydra.bodyMaxHp, hydra.bodyHp + (hydra.bodyMaxHp - before)));
  }
  if (effects.regeneration) hydra.regeneration = Math.max(0, hydra.regeneration + effects.regeneration);
  if (effects.alert) raiseAlert(state, effects.alert, rules);
  if (effects.muck) state.resources.muck = Math.max(0, state.resources.muck + effects.muck);
  if (effects.moisture) state.resources.moisture = Math.max(0, state.resources.moisture + effects.moisture);
}

// ---------------------------------------------------------------- battles

/** Everything the battle simulation needs to start the pending battle. */
export function pendingBattleSetup(state: RunState, rules: RunRules): BattleSetup | null {
  const pending = state.pendingBattle;
  if (!pending) return null;
  const enemies = rules.encounterGroupMembers[pending.groupId];
  if (!enemies) throw new Error(`Unknown encounter group "${pending.groupId}"`);
  return {
    // Every battle of a run gets its own seed, derived from the run seed.
    seed: (Math.imul(state.seed ^ 0x9e3779b9, state.battlesFought + 1) ^ Math.imul(pending.at.q, 73856093) ^ Math.imul(pending.at.r, 19349663)) >>> 0,
    heads: state.hydra.heads.map((h) => ({ ...h })),
    bodyHp: state.hydra.bodyHp,
    bodyMaxHp: state.hydra.bodyMaxHp,
    enemies,
    firstFreeId: state.nextId,
    // In the battle for the lair, the Broodlings guarding it fight too.
    allies: pending.defense ? state.lair.defenders : 0,
    cauterizePercent: mutationTotal(state.hydra, rules, 'cauterizePercent'),
    // On the surface the battle is fought in her mist, or out of it, Exposed (GAME_DESIGN.md §5.6).
    surface: pending.layer === 'surface' ? { inMist: !exposedNow(state), damagePercent: exposedNow(state) ? rules.surface.exposed.battleDamagePercent : 0 } : undefined,
  };
}

/**
 * Applies a finished battle: new head line-up, body HP, scars; if won, the encounter is cleared, its people give Bones
 * and the heads gain experience.
 * The Order hears every battle (the Alert rises), except near the Silent Bell.
 */
export function finishBattle(state: RunState, result: BattleResult, rules: RunRules): RunEvent[] {
  const pending = state.pendingBattle;
  if (!pending) return [];
  state.pendingBattle = null;
  state.battlesFought += 1;
  state.nextId = result.nextId;
  const headsBefore = state.hydra.heads;
  const known = new Set(headsBefore.map((h) => h.id));
  // Heads grown in the battle have their class's HP: the hydra's mutations (Thick-necked) apply to them too.
  state.hydra.heads = result.heads.map((h) => {
    if (known.has(h.id)) return { ...h };
    const maxHp = headMaxHp(state.hydra, rules, h.maxHp);
    return { ...h, maxHp, hp: Math.max(1, Math.round((h.hp * maxHp) / h.maxHp)) };
  });
  state.hydra.bodyHp = result.bodyHp;
  state.hydra.scars += result.newScars;
  if (pending.defense && result.alliesLeft !== undefined) state.lair.defenders = Math.min(state.lair.defenders, result.alliesLeft);
  const silenced = battleSilenced(state, pending.at, rules);
  if (!silenced) raiseAlert(state, rules.alertPerBattle, rules);

  if (result.outcome === 'lost') {
    // Losing the battle for the lair, she loses eggs too.
    const broken = pending.defense ? breakEggs(state, rules.brood.lostDefenseBreaksShare) : 0;
    return lostBattle(state, pending, rules, broken > 0 ? [{ type: 'eggsBroken', count: broken }] : []);
  }

  const tile: Tile | undefined = tileOn(state, pending.layer, pending.at);
  if (tile?.object?.kind === 'encounter') tile.object = null;
  // Those who got away (Tithe Collectors) leave no Bones; they take their tithe instead.
  const escaped = result.tithesTaken ?? 0;
  const bones = Math.max(0, (rules.encounterGroupMembers[pending.groupId]?.length ?? 0) - escaped) * rules.bonesPerEnemy;
  state.resources.bones += bones;
  const events: RunEvent[] = [{ type: 'battleWon', at: pending.at, bones, silenced }];
  gainExperience(state, result.kills ?? {}, rules, events);
  // The guard of a Flame Shrine beaten: the flame goes out.
  if (tile?.object?.kind === 'flameShrine' && !pending.unitId) putOutShrine(state, pending.at, rules, events);
  if (escaped > 0) events.push(takeTithe(state, escaped, rules));
  const unit = pending.unitId ? state.order.units.find((u) => u.id === pending.unitId) : undefined;
  if (unit) unitBeaten(state, unit, rules, events);
  // Someone always gets away to tell the Order, unless the Silent Bell drowned it all out.
  if (!silenced) sendMessenger(state, pending.at, rules, events);
  // The heads talk it over: who was lost, who grew, what was burnt shut.
  const before = new Set(headsBefore.map((h) => h.id));
  const after = new Set(state.hydra.heads.map((h) => h.id));
  const newHeadIds = [...after].filter((id) => !before.has(id));
  storyMoment(state, rules, 'afterBattle', {
    won: true,
    severed: [...before].filter((id) => !after.has(id)).length,
    grown: newHeadIds.length,
    cauterized: result.newScars,
    newHeadIds,
  }, events);
  return events;
}

/** Each Tithe Collector who got away takes his percent of every resource (rounded down). */
function takeTithe(state: RunState, collectors: number, rules: RunRules): RunEvent {
  const taken = { muck: 0, moisture: 0, bones: 0 };
  for (let i = 0; i < collectors; i++) {
    for (const key of ['muck', 'moisture', 'bones'] as const) {
      const part = Math.floor((state.resources[key] * rules.order.tithePercent) / 100);
      state.resources[key] -= part;
      taken[key] += part;
    }
  }
  return { type: 'titheTaken', ...taken };
}

function lostBattle(state: RunState, pending: NonNullable<RunState['pendingBattle']>, rules: RunRules, events: RunEvent[]): RunEvent[] {
  state.over = true;
  state.deathCause = { at: pending.at, groupId: pending.groupId, enemyTypes: [...(rules.encounterGroupMembers[pending.groupId] ?? [])] };
  return [...events, { type: 'hydraDied' }];
}

// ---------------------------------------------------------------- turns and the lair

/**
 * Ends the turn: conditions wear off, movement comes back, the body and heads heal a little.
 * Ending it in the lair is resting: everything heals fully, and burnt stumps heal and grow heads again.
 */
export function endTurn(state: RunState, rules: RunRules): RunEvent[] {
  // The panels of the lair and of a Passage need no answer: the turn can end with them open.
  const panel = state.pendingPlace ? tileHere(state, state.pendingPlace)?.object?.kind : undefined;
  if (panel === 'lair' || panel === 'passage') state.pendingPlace = null;
  if (isWaiting(state)) return [];
  const { hydra } = state;
  const events: RunEvent[] = [];
  state.turn += 1;
  tickConditions(state, events);
  coolTunnels(state, events);
  hydra.movementLeft = movementForTurn(state, rules);
  // Out of the mist, nothing heals (GAME_DESIGN.md §5.6).
  if (!exposedNow(state)) {
    hydra.bodyHp = Math.min(hydra.bodyMaxHp, hydra.bodyHp + hydra.regeneration);
    for (const head of hydra.heads) head.hp = Math.min(head.maxHp, head.hp + rules.healing.headHpPerTurn);
  }

  if (hydra.layer === 'underground' && hexEquals(hydra.position, state.map.lair)) {
    hydra.bodyHp = hydra.bodyMaxHp;
    for (const head of hydra.heads) head.hp = head.maxHp;
    const healedScars = hydra.scars;
    hydra.scars = 0;
    const newHeadIds = growHeads(state, rules, healedScars * 2);
    events.push({ type: 'rested', healedScars, newHeadIds });
    // Old Mother Toad speaks while the hydra rests (GAME_DESIGN.md §11).
    storyMoment(state, rules, 'restInLair', { grown: newHeadIds.length, newHeadIds }, events);
  } else {
    serpentOnTheWay(state, rules, events);
  }
  lairTurn(state, rules, events);
  surfaceTurn(state, rules, events);
  orderTurn(state, rules, events);
  scoutsCaught(state, events);
  events.push({ type: 'turnEnded', turn: state.turn });
  return events;
}
