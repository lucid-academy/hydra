// Owns the current run and passes commands from the scenes to sim/.
// Scenes listen for 'changed' to redraw, and for 'events' to animate what just happened.

import * as Phaser from 'phaser';
import type { BattleResult, BattleRules, BattleSetup } from '../sim/battle';
import type { Hex } from '../sim/hex';
import { hex, hexDistance, hexKey, hexNeighbors } from '../sim/hex';
import { hexesSeenFrom, updateVisibility } from '../sim/map';
import type { MapObject } from '../sim/map';
import {
  acceptBlessing,
  addOrderUnit,
  chooseEventOption,
  closeEvent,
  dialogueShown,
  doPlaceAction,
  endTurn,
  finishBattle,
  hatchEgg,
  inspect,
  layEgg,
  leavePlace,
  moveHydra,
  noteSightings,
  openSealed,
  orderUnitAt,
  pendingBattleSetup,
  plannedJourney,
  reachableHexes,
  refuseBlessing,
  serpentInBattle,
  startCondition,
  storyDialogue,
  workThreshold,
} from '../sim/turn';
import type { BroodlingRole, Journey, OrderUnitKind, Reachable, RunEvent, RunRules, RunState, ShownDialogue, ShownLine, StoryFacts } from '../sim/turn';
import { lineages } from './LineageKeeper';

const REGISTRY_KEY = 'run';

export class RunController extends Phaser.Events.EventEmitter {
  readonly rules: RunRules;
  readonly battleRules: BattleRules;
  readonly state: RunState;
  /** Biomes the player has already been shown the name of (only for the screen; not part of the game state). */
  readonly knownBiomes = new Set<string>();
  /** Events of the last command, for a scene that starts right after it (e.g. the map after a battle). */
  lastEvents: RunEvent[] = [];
  /** The map is still showing the last move; panels wait until it ends ('settled'). Only for the screen. */
  animating = false;
  /** The run's modifiers have been shown to the player. Only for the screen. */
  modifiersShown = false;
  /** A dialogue is on screen; the map and the HUD wait. Only for the screen. */
  talking = false;

  /** A run of the living hydra: new (createRun) or saved. Lineages (LineageKeeper) make them. */
  constructor(state: RunState, rules: RunRules, battleRules: BattleRules) {
    super();
    this.rules = rules;
    this.battleRules = battleRules;
    this.state = state;
  }

  reachable(): Map<string, Reachable> {
    return reachableHexes(this.state, this.rules);
  }

  /** A travel plan to a known hex, maybe several turns away (null if there is no way there). */
  plan(target: Hex): Journey | null {
    return plannedJourney(this.state, target, this.rules);
  }

  /** Tells the screen something it should show briefly. */
  notice(id: 'outOfReach' | 'noWayThere' | 'journeyWaits'): void {
    this.emit('notice', id);
  }

  moveTo(target: Hex): void {
    this.publish(moveHydra(this.state, target, this.rules));
  }

  /** A tap on a place or a threshold: opens its panel, walking next to the threshold first if needed. */
  inspect(target: Hex): void {
    const events = inspect(this.state, target, this.rules);
    if (events.length === 0) this.emit('notice', 'outOfReach');
    this.publish(events);
  }

  doPlaceAction(actionId: string): void {
    this.publish(doPlaceAction(this.state, actionId, this.rules));
  }

  workThreshold(): void {
    this.publish(workThreshold(this.state, this.rules));
  }

  layEgg(): void {
    this.publish(layEgg(this.state, this.rules));
  }

  hatchEgg(eggId: string, role: BroodlingRole): void {
    this.publish(hatchEgg(this.state, eggId, role, this.rules));
  }

  /** Opens the sealed threshold whose panel is open, its way number `way`. */
  openSealed(way: number): void {
    this.publish(openSealed(this.state, this.rules, way));
  }

  leavePlace(): void {
    leavePlace(this.state);
    this.emit('changed');
  }

  chooseEventOption(index: number): void {
    this.publish(chooseEventOption(this.state, this.rules, index));
  }

  /** Closes the event's panel after its choice; a dialogue or a battle it started comes next. */
  closeEvent(): void {
    closeEvent(this.state);
    this.emit('changed');
  }

  /** The dialogue to show next, or null. */
  nextDialogue(): ShownDialogue | null {
    return this.state.story.dialogues[0] ?? null;
  }

  /** The dialogue on screen has been read to the end; `choice` is the answer picked, if it had answers. */
  dialogueShown(choice: number | null): void {
    dialogueShown(this.state, this.rules, choice);
  }

  /** The dialogue screen has closed. */
  doneTalking(): void {
    this.talking = false;
    this.emit('changed');
  }

  /** A short line of the Serpent for the battle about to start, or null. */
  serpentLine(): ShownLine | null {
    return serpentInBattle(this.state, this.rules);
  }

  /** The map has finished showing the last move. */
  settle(): void {
    this.animating = false;
    this.emit('settled');
  }

  endTurn(): void {
    this.publish(endTurn(this.state, this.rules));
  }

  battleSetup(): BattleSetup | null {
    return pendingBattleSetup(this.state, this.rules);
  }

  finishBattle(result: BattleResult): void {
    this.publish(finishBattle(this.state, result, this.rules));
  }

  acceptBlessing(): void {
    this.publish(acceptBlessing(this.state, this.rules));
  }

  refuseBlessing(): void {
    this.publish(refuseBlessing(this.state));
  }

  /** For `?scene=battle`: a battle against the given group without walking to it, optionally with a wounded body. */
  startTestBattle(groupId: string, bodyHp: number | null = null): void {
    this.state.pendingBattle = { at: hex(0, 0), groupId };
    if (bodyHp !== null) this.state.hydra.bodyHp = Math.min(this.state.hydra.bodyMaxHp, bodyHp);
  }

  /**
   * For `?near=shrine` and the like: moves the hydra next to the nearest object of that kind, or the nearest place or
   * threshold of that id (`?near=brineLake`, `?near=saltPlug`), or a marking shrine (`?near=mark`), and shows the
   * area around it. Testing only; it skips the walk (and the Alert it would cost).
   */
  placeNear(kind: string): void {
    const { map, hydra } = this.state;
    const matches = (object: MapObject | null): boolean =>
      object?.kind === kind ||
      (object?.kind === 'place' && object.placeId === kind) ||
      (object?.kind === 'threshold' && object.thresholdId === kind) ||
      (kind === 'mark' && object?.kind === 'shrine' && object.mark !== undefined);
    const objects = [...map.tiles.values()].filter((t) => matches(t.object)).sort((a, b) => hexDistance(a.hex, map.lair) - hexDistance(b.hex, map.lair));
    for (const target of objects) {
      const spot = hexNeighbors(target.hex)
        .map((h) => map.tiles.get(hexKey(h)))
        .find((t) => t && t.object === null && this.rules.terrain[t.terrain].moveCost !== null);
      if (!spot) continue;
      hydra.position = spot.hex;
      updateVisibility(this.state.visibility, hexesSeenFrom(map, spot.hex, hydra.sightRange, this.rules.terrain));
      return;
    }
  }

  /**
   * For `?say=`: queues a dialogue by id (any trigger), to see it on screen; `facts` tell it of her mother (with
   * ?ancestors=). Testing only.
   */
  sayForTest(id: string, facts: StoryFacts = {}): void {
    if (!this.rules.story.dialogues.some((d) => d.id === id)) {
      console.warn(`?say=${id} is not a dialogue in dialogues.json`);
      return;
    }
    if (!storyDialogue(this.state, this.rules, id, [], facts)) console.warn(`?say=${id}: the hydra has no heads (or no mother, or no mutation) to say it`);
  }

  /** For `?event=`: an event site with that event on a free hex next to the hydra. Testing only. */
  eventForTest(id: string): void {
    if (!this.rules.story.events.some((e) => e.id === id)) {
      console.warn(`?event=${id} is not an event in events.json`);
      return;
    }
    const { map, hydra } = this.state;
    const spot = hexNeighbors(hydra.position)
      .map((h) => map.tiles.get(hexKey(h)))
      .find((t) => t && t.object === null && this.rules.terrain[t.terrain].moveCost !== null);
    if (spot) spot.object = { kind: 'event', eventId: id, done: false };
  }

  /** The Serpent's battle line of a dialogue, for `?say=` with `?scene=battle`. Testing only. */
  serpentLineForTest(id: string): ShownLine | null {
    const d = this.rules.story.dialogues.find((x) => x.id === id && x.trigger === 'serpentInBattle');
    const line = d?.lines[0];
    return line ? { speaker: 'serpent', name: this.rules.story.speakerNames.serpent ?? '', classId: null, text: line.text } : null;
  }

  /** For `?flags=`: story flags set from the start, as if earlier steps of a quest were done. Testing only. */
  flagsForTest(flags: readonly string[]): void {
    for (const flag of flags) if (!this.state.story.flags.includes(flag)) this.state.story.flags.push(flag);
  }

  /** For `?conditions=`: conditions on the hydra from the start, for a few turns. Testing only. */
  conditionsForTest(ids: readonly string[]): void {
    for (const id of ids) {
      if (!this.rules.conditions[id]) console.warn(`?conditions=${id} is not a condition in world.json`);
      else startCondition(this.state, id, 5, this.rules, []);
    }
  }

  /** For `?units=`: the Order's people of these kinds 2–3 hexes from the hydra, where she sees them. Testing only. */
  unitsForTest(kinds: readonly string[]): void {
    const { state, rules } = this;
    const spots = [...state.map.tiles.values()].filter((t) => {
      const d = hexDistance(t.hex, state.hydra.position);
      return d >= 2 && d <= 3 && t.object === null && rules.terrain[t.terrain].moveCost !== null && state.visibility.get(hexKey(t.hex)) === 'visible';
    });
    for (const kind of kinds) {
      if (!['patrol', 'messenger', 'expedition', 'greatBurning'].includes(kind)) {
        console.warn(`?units=${kind}: not a kind of unit (patrol, messenger, expedition, greatBurning)`);
        continue;
      }
      const spot = spots.find((t) => !orderUnitAt(state, t.hex));
      if (!spot) continue;
      addOrderUnit(state, kind as OrderUnitKind, spot.hex, kind === 'messenger' ? '' : 'patrol', rules);
    }
    noteSightings(state);
  }

  /** For `?alert=`: the Alert at the start. Testing only. */
  alertForTest(alert: number): void {
    this.state.alert = Math.min(this.rules.alertMax, Math.max(this.rules.alertMin, alert));
  }

  /** For `?reveal=1`: every hex becomes known (seen before), to look at the whole map. Testing only. */
  revealAll(): void {
    for (const key of this.state.map.tiles.keys()) if (!this.state.visibility.has(key)) this.state.visibility.set(key, 'remembered');
  }

  private publish(events: RunEvent[]): void {
    if (events.length === 0) return;
    this.lastEvents = events;
    this.emit('events', events);
    this.emit('changed');
  }
}

/**
 * The run to play when a scene opens without one (a test URL such as ?scene=map): the living hydra's, or a new
 * hydra's. With a seed: a new lineage with that seed. Either way it is stored for all scenes.
 */
export function startNewRun(scene: Phaser.Scene, seed?: number): RunController {
  return seed === undefined ? lineages(scene).playNow() : lineages(scene).newLineage(seed);
}

/** Stores the run being played for all scenes. */
export function setRun(game: Phaser.Game, run: RunController): void {
  game.registry.set(REGISTRY_KEY, run);
}

export function getRun(scene: Phaser.Scene): RunController | undefined {
  return scene.registry.get(REGISTRY_KEY) as RunController | undefined;
}

export function requireRun(scene: Phaser.Scene): RunController {
  const run = getRun(scene);
  if (!run) throw new Error('No run in progress: call startNewRun() first.');
  return run;
}
