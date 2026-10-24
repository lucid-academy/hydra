// Run balance report (GAME_DESIGN.md §8): a bot plays many whole runs on the map and shows how the Order's pressure
// grows: when the Alert passes each stage, how much of the underground the hydra knows when the first expedition
// marches on the lair (target: 40–80 hexes), how many messengers get away, how runs end.
// Run it after changing numbers in src/data/:  npm run balance:runs
// It prints a table and saves the report to docs/BALANCE_RUNS.md (scripts/runBalance.mjs does the running and saving).
//
// The bot is a simple, steady player: it walks to the nearest edge of what it knows (or to a draught it has felt),
// fights what it meets (focus fire and skills, as in the battle report), takes every blessing, picks the first event
// choice it can afford, goes home to rest when hurt or when there is nothing left to find, lays eggs when it can and
// hatches defenders. It never opens thresholds other than Draught Cracks, so it explores less than a player would.
// From a set turn (or once nothing is left to find below), healthy and with Moisture to spare, it climbs the nearest
// Passage it knows, scouts for a burning Flame Shrine (breathing mist ahead, exhaling more when its mist is thin),
// fights its guard, and goes back down when hurt or nearly out of Moisture.

import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { runRulesFrom } from '../src/data/runRules';
import { battleResult, createBattle, stepBattle } from '../src/sim/battle';
import { hexDistance, hexEquals, hexKey, hexNeighbors } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import {
  acceptBlessing,
  canChooseEventOption,
  canHatch,
  canLayEgg,
  canUsePassage,
  chooseEventOption,
  closeEvent,
  createRun,
  canExhale,
  dialogueShown,
  endTurn,
  exhaleMist,
  finishBattle,
  hatchEgg,
  knownDraughts,
  layEgg,
  leavePlace,
  mapOf,
  mistAt,
  moveHydra,
  pendingBattleSetup,
  pendingEventRules,
  plannedJourney,
  reachableHexes,
  tileAt,
  tileOn,
  usePassage,
  visibilityOf,
} from '../src/sim/turn';
import type { RunEvent, RunState } from '../src/sim/turn';
import { giveFocusOrders, useSkills } from './autoPlayer';

/** A run still going after this many turns stops there. */
const TURN_LIMIT = 120;
/** A battle still running after this many seconds of game time counts as lost. */
const BATTLE_SECONDS = 600;
/** The bot goes home to rest below this share of body HP, or with fewer heads than this. */
const REST_BELOW = { bodyShare: 0.5, heads: 2 };
/** §8: the hexes known when the first expedition marches should be in this range. */
const TARGET_HEXES = { min: 40, max: 80 };
/**
 * The bot on the surface. It goes up from fromTurn on (or sooner, once nothing is left to find below), healthy and with
 * at least minMoisture. Up there it makes for a burning Flame Shrine when mist (and its Moisture) can take it there;
 * otherwise it scouts, each turn as near a shrine it knows of from afar (or as far from the Passages) as it can get. It turns back once its Moisture would
 * only just breathe mist to the nearest safe hex (a Passage, or mist that never fades) plus spareMoisture, or when hurt,
 * and once turned back it keeps going until it is below. It exhales at the end of a turn when the mist under it would be
 * gone by the next one.
 */
const SURFACE = { fromTurn: 20, minMoisture: 24, spareMoisture: 4 };
/** Runs whose bot has turned back on the surface and is making for a Passage. */
const turnedBack = new WeakSet<RunState>();

const data = loadGameData();
const rules = runRulesFrom(data);
const battleRules = battleRulesFrom(data);

interface RunStats {
  turns: number;
  /** How it ended: died (and to whom), or still alive at the turn limit. */
  end: 'died' | 'alive';
  killedBy: string | null;
  hexesKnown: number;
  alert: number;
  /** Turn and hexes known when the Alert first passed each stage, by stage id. */
  stages: Record<string, { turn: number; hexes: number }>;
  firstExpedition: { turn: number; hexes: number } | null;
  greatBurning: { turn: number; hexes: number } | null;
  greatBurningBeaten: boolean;
  battles: number;
  battlesWon: number;
  messengersSent: number;
  messengersEscaped: number;
  messengersEaten: number;
  lairRaids: number;
  eggsBroken: number;
  levelsGained: number;
  surface: {
    climbs: number;
    firstClimb: number | null;
    turns: number;
    exposedTurns: number;
    shrinesOut: number;
    shrinesRelit: number;
    battles: number;
    battlesWon: number;
    diedUpThere: boolean;
  };
}

/** Known hexes of her map that can be walked on, next to a hex the hydra doesn't know yet. */
function isFrontier(state: RunState, h: Hex): boolean {
  const { tiles } = mapOf(state);
  const visibility = visibilityOf(state);
  return hexNeighbors(h).some((n) => tiles.has(hexKey(n)) && !visibility.has(hexKey(n)));
}

/** The nearest known hex of her map (by steps) that `wanted` picks and she can get to, or null when there is none. */
function nearest(state: RunState, wanted: (h: Hex) => boolean): Hex | null {
  const start = state.hydra.position;
  const visibility = visibilityOf(state);
  const seen = new Set([hexKey(start)]);
  let ring: Hex[] = [start];
  while (ring.length > 0) {
    const next: Hex[] = [];
    for (const h of ring) {
      for (const n of hexNeighbors(h)) {
        const key = hexKey(n);
        if (seen.has(key) || !visibility.has(key)) continue;
        seen.add(key);
        const tile = tileOn(state, state.hydra.layer, n);
        if (!tile || rules.terrain[tile.terrain].moveCost === null) continue;
        if (wanted(n) && plannedJourney(state, n, rules)) return n;
        next.push(n);
      }
    }
    ring = next;
  }
  return null;
}

/** The nearest hex at the edge of what the hydra knows of her map, or null when there is none. */
const nearestFrontier = (state: RunState): Hex | null => nearest(state, (h) => isFrontier(state, h));
/** The nearest Passage she knows on her map. */
const nearestPassage = (state: RunState): Hex | null => nearest(state, (h) => tileOn(state, state.hydra.layer, h)?.object?.kind === 'passage');
/** The Passages she knows on her map. */
function knownPassages(state: RunState): Hex[] {
  const visibility = visibilityOf(state);
  return [...mapOf(state).tiles.values()].filter((t) => t.object?.kind === 'passage' && visibility.has(hexKey(t.hex))).map((t) => t.hex);
}

/** Of `hexes`, the one fewest steps from her as the crow flies, whether or not mist leads there. */
function closest(state: RunState, hexes: readonly Hex[]): Hex | null {
  return [...hexes].sort((a, b) => hexDistance(a, state.hydra.position) - hexDistance(b, state.hydra.position))[0] ?? null;
}

/** Safe hexes up there: the Passages she knows and mist that never fades. */
function havens(state: RunState): Hex[] {
  const lasting = [...state.surface.map.tiles.values()].filter((t) => state.surface.lastingMist[hexKey(t.hex)] !== undefined).map((t) => t.hex);
  return [...knownPassages(state), ...lasting];
}

/** Burning Flame Shrines she knows of up there, seen or known from afar, whether or not she knows the way. */
function knownShrines(state: RunState): Hex[] {
  return [...state.surface.map.tiles.values()]
    .filter((t) => t.object?.kind === 'flameShrine' && t.object.burning && state.surface.visibility.has(hexKey(t.hex)))
    .map((t) => t.hex);
}

/**
 * Scouting up there: the hex it can reach this turn nearest a burning shrine it knows of (or, knowing none, farthest
 * from every Passage), if that gets it closer (or farther) than here.
 */
function scoutGoal(state: RunState): Hex | null {
  const shrines = knownShrines(state);
  const passages = knownPassages(state);
  const score = (h: Hex): number =>
    shrines.length > 0 ? -Math.min(...shrines.map((s) => hexDistance(s, h))) : passages.length > 0 ? Math.min(...passages.map((p) => hexDistance(p, h))) : 0;
  let best: { hex: Hex; score: number; moisture: number } | null = null;
  for (const route of reachableHexes(state, rules).values()) {
    const hex = route.path[route.path.length - 1]!;
    const candidate = { hex, score: score(hex), moisture: route.moisture ?? 0 };
    if (!best || candidate.score > best.score || (candidate.score === best.score && candidate.moisture < best.moisture)) best = candidate;
  }
  return best && best.score > score(state.hydra.position) ? best.hex : null;
}

/** The nearest Flame Shrine still burning that she knows of. */
const nearestShrine = (state: RunState): Hex | null =>
  nearest(state, (h) => {
    const object = tileOn(state, 'surface', h)?.object;
    return object?.kind === 'flameShrine' && object.burning;
  });

/** A draught felt on a known hex: standing there shows the crack it comes from. Null when none can be reached. */
function nearestDraught(state: RunState): Hex | null {
  return knownDraughts(state).find((h) => plannedJourney(state, h, rules)) ?? null;
}

/** Walks as far along the way to `target` as this turn allows. Returns false when it can't move at all. */
function walkTowards(state: RunState, target: Hex, events: RunEvent[]): boolean {
  const journey = plannedJourney(state, target, rules);
  if (!journey) return crawlTowards(state, target, events);
  const today = journey.path.filter((_, i) => journey.turns[i] === 0);
  const stop = today[today.length - 1];
  if (!stop) return false;
  const moved = moveHydra(state, stop, rules);
  events.push(...moved);
  return moved.length > 0;
}

/** Up there with no way through mist: one step (a crawl, if need be) along the shortest way over known ground to `target`. */
function crawlTowards(state: RunState, target: Hex, events: RunEvent[]): boolean {
  if (state.hydra.layer !== 'surface') return false;
  const step = firstStep(state, target);
  if (!step || !reachableHexes(state, rules).has(hexKey(step))) return false;
  const moved = moveHydra(state, step, rules);
  events.push(...moved);
  return moved.length > 0;
}

/** The first step of the shortest way from her to `target` over known hexes she could walk on, mist or not. */
function firstStep(state: RunState, target: Hex): Hex | null {
  const visibility = visibilityOf(state);
  const from = new Map<string, Hex | null>([[hexKey(target), null]]);
  let ring: Hex[] = [target];
  while (ring.length > 0) {
    const next: Hex[] = [];
    for (const h of ring) {
      for (const n of hexNeighbors(h)) {
        const key = hexKey(n);
        if (from.has(key)) continue;
        if (hexEquals(n, state.hydra.position)) return h;
        const tile = tileOn(state, state.hydra.layer, n);
        if (!tile || !visibility.has(key) || rules.terrain[tile.terrain].moveCost === null) continue;
        from.set(key, h);
        next.push(n);
      }
    }
    ring = next;
  }
  return null;
}

/** Plays the pending battle as the battle report's "focus + skills" player, and applies it to the run. */
function fight(state: RunState, events: RunEvent[]): void {
  const battle = createBattle(pendingBattleSetup(state, rules)!, battleRules);
  while (!battle.outcome && battle.tick < BATTLE_SECONDS * battleRules.ticksPerSecond) {
    if (battle.tick % 10 === 0) {
      giveFocusOrders(battle, battleRules);
      useSkills(battle, battleRules);
    }
    stepBattle(battle, battleRules);
  }
  // A battle that never ends counts as lost: a real player would have run out of patience, or of hydra.
  battle.outcome ??= 'lost';
  events.push(...finishBattle(state, battleResult(battle, battleRules), rules));
}

/** Everything that waits on the player: dialogues, a shrine, an event, a place's panel. Eggs in the lair. */
function answerWhatWaits(state: RunState, events: RunEvent[]): void {
  while (state.story.dialogues.length > 0) dialogueShown(state, rules, null);
  if (state.pendingShrine) events.push(...acceptBlessing(state, rules));
  if (state.pendingEvent) {
    const event = pendingEventRules(state, rules);
    const choice = event?.choices.findIndex((_, i) => canChooseEventOption(state, rules, i).can) ?? -1;
    if (choice >= 0) events.push(...chooseEventOption(state, rules, choice));
    closeEvent(state);
    // An event none of whose choices she can take: a player would walk away from it.
    state.pendingEvent = null;
  }
  if (state.pendingPlace && tileOn(state, state.hydra.layer, state.pendingPlace)?.object?.kind === 'passage') {
    // A Passage's panel: up or down, if that is where the bot was going.
    if (wantsOtherLayer(state)) events.push(...usePassage(state, rules));
    else events.push(...leavePlace(state));
  }
  if (state.pendingPlace) {
    while (canLayEgg(state, rules).can) events.push(...layEgg(state, rules));
    const egg = state.lair.eggs.find((e) => canHatch(state, e.id).can);
    if (egg && state.lair.eggs.length >= 2) events.push(...hatchEgg(state, egg.id, 'defender', rules));
    events.push(...leavePlace(state));
  }
}

function hurt(state: RunState): boolean {
  const { hydra } = state;
  return hydra.bodyHp < hydra.bodyMaxHp * REST_BELOW.bodyShare || hydra.heads.length < REST_BELOW.heads;
}

/** Below: time to go up. Up there: time to go back down (and then it keeps wanting to, until it is below). */
function wantsOtherLayer(state: RunState): boolean {
  if (state.hydra.layer === 'surface') {
    if (turnedBack.has(state)) return true;
    const haven = closest(state, havens(state));
    // Mist breathed all the way, and a breath out at the end of every turn of it.
    const steps = haven ? hexDistance(state.hydra.position, haven) : 0;
    const wayBack = steps * (rules.surface.mist.breatheAhead?.moisture ?? 0) + Math.ceil(steps / state.hydra.movementPerTurn) * rules.surface.mist.exhale.moisture;
    // A shrine it can reach is worth it even with no Moisture left: put out, it leaves mist that never fades.
    const back = hurt(state) || (!nearestShrine(state) && (state.resources.moisture < SURFACE.spareMoisture + wayBack || !nearestFrontier(state)));
    if (back) turnedBack.add(state);
    return back;
  }
  turnedBack.delete(state);
  const time = state.turn >= SURFACE.fromTurn || (!nearestFrontier(state) && !nearestDraught(state));
  return time && !hurt(state) && state.resources.moisture >= SURFACE.minMoisture;
}

/** Where the bot walks this turn. */
function goalOf(state: RunState): Hex {
  if (wantsOtherLayer(state)) {
    const passage = nearestPassage(state) ?? (state.hydra.layer === 'surface' ? closest(state, knownPassages(state)) : null);
    if (passage) return passage;
  }
  if (state.hydra.layer === 'surface') return nearestShrine(state) ?? scoutGoal(state) ?? nearestFrontier(state) ?? state.hydra.position;
  // Hurt: home to rest. Otherwise the nearest edge of the map, or a draught to follow, or home when there is neither.
  return hurt(state) ? state.map.lair : (nearestFrontier(state) ?? nearestDraught(state) ?? state.map.lair);
}

function playRun(seed: number): RunStats {
  const state = createRun(seed, rules);
  const s: RunStats = {
    turns: 0,
    end: 'alive',
    killedBy: null,
    hexesKnown: 0,
    alert: 0,
    stages: {},
    firstExpedition: null,
    greatBurning: null,
    greatBurningBeaten: false,
    battles: 0,
    battlesWon: 0,
    messengersSent: 0,
    messengersEscaped: 0,
    messengersEaten: 0,
    lairRaids: 0,
    eggsBroken: 0,
    levelsGained: 0,
    surface: { climbs: 0, firstClimb: null, turns: 0, exposedTurns: 0, shrinesOut: 0, shrinesRelit: 0, battles: 0, battlesWon: 0, diedUpThere: false },
  };
  const note = (events: readonly RunEvent[]) => {
    const now = { turn: state.turn, hexes: state.visibility.size };
    for (const e of events) {
      if (e.type === 'alertStage') s.stages[e.stageId] ??= now;
      else if (e.type === 'expeditionSent' && e.kind === 'expedition') s.firstExpedition ??= now;
      else if (e.type === 'expeditionSent' && e.kind === 'greatBurning') s.greatBurning ??= now;
      else if (e.type === 'actBegins') s.greatBurningBeaten = true;
      else if (e.type === 'battleWon') s.battlesWon++;
      else if (e.type === 'messengerSent') s.messengersSent++;
      else if (e.type === 'messengerEscaped') s.messengersEscaped++;
      else if (e.type === 'messengerEaten') s.messengersEaten++;
      else if (e.type === 'lairRaided') s.lairRaids++;
      else if (e.type === 'eggsBroken') s.eggsBroken += e.count;
      else if (e.type === 'headLevelled') s.levelsGained++;
      else if (e.type === 'climbed' && e.layer === 'surface') {
        s.surface.climbs++;
        s.surface.firstClimb ??= state.turn;
      } else if (e.type === 'exposed') s.surface.exposedTurns++;
      else if (e.type === 'shrineOut') s.surface.shrinesOut++;
      else if (e.type === 'shrineRelit') s.surface.shrinesRelit++;
    }
  };

  while (!state.over && state.turn <= TURN_LIMIT) {
    const events: RunEvent[] = [];
    answerWhatWaits(state, events);
    if (state.pendingBattle) {
      const up = state.pendingBattle.layer === 'surface';
      s.battles++;
      if (up) s.surface.battles++;
      fight(state, events);
      if (up && events.some((e) => e.type === 'battleWon')) s.surface.battlesWon++;
      if (up && state.over) s.surface.diedUpThere = true;
    } else {
      const goal = goalOf(state);
      const atGoal = hexEquals(state.hydra.position, goal);
      // Standing on the Passage it wanted: up (or down) it goes, if it has the movement left.
      if (atGoal && wantsOtherLayer(state) && tileOn(state, state.hydra.layer, goal)?.object?.kind === 'passage' && canUsePassage(state, rules).can) {
        events.push(...usePassage(state, rules));
        note(events);
        continue;
      }
      // End the turn once it can't walk on (resting, at home).
      if (atGoal || !walkTowards(state, goal, events)) {
        if (state.hydra.layer === 'underground' && hexEquals(state.hydra.position, state.map.lair)) state.pendingPlace = state.map.lair;
        // Up there, thin mist under it: breathe out more before the night (or the day) takes it.
        const fading = rules.surface.mist.fade.day + (state.surface.windy ? rules.surface.mist.fade.windExtra : 0);
        if (state.hydra.layer === 'surface' && mistAt(state, state.hydra.position, rules) <= fading && canExhale(state, rules).can) events.push(...exhaleMist(state, rules));
        if (state.hydra.layer === 'surface') s.surface.turns++;
        events.push(...endTurn(state, rules));
      }
    }
    note(events);
  }
  s.turns = Math.min(state.turn, TURN_LIMIT);
  s.end = state.over ? 'died' : 'alive';
  s.killedBy = state.deathCause?.groupId ?? null;
  s.hexesKnown = state.visibility.size;
  s.alert = Math.round(state.alert);
  return s;
}

/** The middle value, and the values a tenth of the way in from each end. */
function spread(values: number[]): string {
  if (values.length === 0) return '–';
  const sorted = [...values].sort((a, b) => a - b);
  const at = (share: number) => sorted[Math.min(sorted.length - 1, Math.floor(share * sorted.length))]!;
  return `${at(0.5)} (${at(0.1)}–${at(0.9)})`;
}

/** Plays `runs` runs (seeds 1…runs) and returns the results as a Markdown table and a full report. */
export function runBalanceReport(runs = 50): { table: string; report: string } {
  const all = Array.from({ length: runs }, (_, i) => playRun(i + 1));
  const percent = (n: number) => `${Math.round((n / runs) * 100)}%`;
  const reached = (pick: (s: RunStats) => { turn: number; hexes: number } | null | undefined) => all.map(pick).filter((x) => x) as Array<{ turn: number; hexes: number }>;

  const rows: string[][] = [];
  for (const stage of rules.order.stages) {
    const got = reached((s) => s.stages[stage.id]);
    rows.push([`Alert ${stage.at} (${stage.id})`, percent(got.length), spread(got.map((x) => x.turn)), spread(got.map((x) => x.hexes))]);
  }
  const expeditions = reached((s) => s.firstExpedition);
  rows.push(['First expedition marches', percent(expeditions.length), spread(expeditions.map((x) => x.turn)), spread(expeditions.map((x) => x.hexes))]);
  const burnings = reached((s) => s.greatBurning);
  rows.push(['Great Burning marches', percent(burnings.length), spread(burnings.map((x) => x.turn)), spread(burnings.map((x) => x.hexes))]);
  const table = [['Moment', 'Runs that got there', 'Turn', 'Hexes known'], ['---', '---', '---', '---'], ...rows].map((cells) => `| ${cells.join(' | ')} |`).join('\n');

  const inTarget = expeditions.filter((x) => x.hexes >= TARGET_HEXES.min && x.hexes <= TARGET_HEXES.max).length;
  const died = all.filter((s) => s.end === 'died');
  const killers = new Map<string, number>();
  for (const s of died) killers.set(s.killedBy ?? '?', (killers.get(s.killedBy ?? '?') ?? 0) + 1);
  const sum = (pick: (s: RunStats) => number) => all.reduce((n, s) => n + pick(s), 0);
  const avg = (pick: (s: RunStats) => number) => (sum(pick) / runs).toFixed(1);
  const climbers = all.filter((s) => s.surface.firstClimb !== null);

  const report = `# Run balance report

Made by \`npm run balance:runs\` from the numbers in \`src/data/\`. Run it again after changing them; don't edit this file by hand.

${runs} runs (seeds 1–${runs}), each played by a bot for at most ${TURN_LIMIT} turns or until the hydra dies. The bot walks to the nearest edge of what it knows (or to a draught it has felt), fights what it meets (focus fire and skills), takes every blessing, picks the first event choice it can afford, goes home to rest when its body is below ${REST_BELOW.bodyShare * 100}% or it has fewer than ${REST_BELOW.heads} heads or when there is nothing left to find, lays eggs and hatches defenders. It opens no threshold but Draught Cracks, so it explores less than a player would, and it never hunts messengers down.

Turn and hexes: the middle run, and in brackets the range of the middle 80% of runs.

${table}

**§8 target:** ${TARGET_HEXES.min}–${TARGET_HEXES.max} hexes known when the first expedition marches. ${expeditions.length > 0 ? `${inTarget} of the ${expeditions.length} runs that saw one were in that range.` : 'No run saw an expedition.'}

## How the runs went

- Died: ${percent(died.length)} (${[...killers.entries()].sort((a, b) => b[1] - a[1]).map(([group, n]) => `${group} ${n}`).join(', ') || 'none'}); alive after ${TURN_LIMIT} turns: ${percent(runs - died.length)}.
- Turns played: ${spread(all.map((s) => s.turns))}. Hexes known at the end: ${spread(all.map((s) => s.hexesKnown))}. Alert at the end: ${spread(all.map((s) => s.alert))}.
- Battles per run: ${avg((s) => s.battles)}, won ${percent(sum((s) => s.battlesWon) / Math.max(1, sum((s) => s.battles)) * runs)} of them.
- Messengers per run: ${avg((s) => s.messengersSent)} sent, ${avg((s) => s.messengersEscaped)} got away, ${avg((s) => s.messengersEaten)} eaten.
- Expeditions camped in the empty lair: ${avg((s) => s.lairRaids)} raids per run, ${avg((s) => s.eggsBroken)} eggs broken in lost battles for the lair.
- The Great Burning beaten in ${percent(all.filter((s) => s.greatBurningBeaten).length)} of runs. Head levels gained per run: ${avg((s) => s.levelsGained)}.

## The surface

The bot goes up from turn ${SURFACE.fromTurn} (or once nothing is left to find below) when healthy and with ${SURFACE.minMoisture}+ Moisture. Up there it makes for a burning Flame Shrine it can reach, or scouts towards one it knows of from afar (or away from the Passages), and goes back down when hurt or when its Moisture would only just breathe mist to the nearest safe hex (plus ${SURFACE.spareMoisture}).

- Went up in ${percent(climbers.length)} of runs, first on turn ${spread(climbers.map((s) => s.surface.firstClimb!))}, ${avg((s) => s.surface.climbs)} times per run.
- Turns up there per run: ${spread(all.map((s) => s.surface.turns))}; of them Exposed: ${spread(all.map((s) => s.surface.exposedTurns))}.
- Flame Shrines put out per run: ${spread(all.map((s) => s.surface.shrinesOut))} (all ${rules.surface.generator.flameShrines.count} in ${percent(all.filter((s) => s.surface.shrinesOut >= rules.surface.generator.flameShrines.count).length)} of runs); lit again by the Order: ${avg((s) => s.surface.shrinesRelit)} per run.
- Battles up there: ${avg((s) => s.surface.battles)} per run, won ${percent(sum((s) => s.surface.battlesWon) / Math.max(1, sum((s) => s.surface.battles)) * runs)} of them. Died up there: ${percent(all.filter((s) => s.surface.diedUpThere).length)} of runs.
`;
  return { table, report };
}
