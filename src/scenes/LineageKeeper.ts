// The account's lineages (GAME_DESIGN.md §12): the profile with the Book of Lineages, the living hydra's run, and the
// saved game. It starts each generation (her world's seed, her heritage from the egg the player chose, one unlocked
// run modifier), writes the dead into the book, keeps the egg Old Mother Toad hides, ends a lineage that has died
// out, unlocks run modifiers, and saves after every command, and when the page is hidden or closed.
// On a test URL (urlParams testUrl) the same happens in memory only: nothing is loaded and nothing is saved.

import type * as Phaser from 'phaser';
import { battleRulesFrom } from '../data/battleRules';
import { lineageRulesFrom, runRulesFrom } from '../data/runRules';
import { SAVE_KEYS, readProfile, readRun, readSaved, writeProfile, writeRun, writeSaved } from '../save';
import type { BattleRules } from '../sim/battle';
import {
  checkUnlocks,
  chooseEgg,
  currentLineage,
  endLineage,
  generationSeed,
  heritageOf,
  hideEgg,
  hydraDied,
  miraculousIntervention,
  modifierFor,
  newProfile,
  startLineage,
} from '../sim/lineage';
import type { Lineage, LineageRules, Profile } from '../sim/lineage';
import { Rng } from '../sim/rng';
import { createRun, eggMutations, finishBattle, gainMutation } from '../sim/turn';
import type { RunEvent, RunRules, RunState, StoryFacts } from '../sim/turn';
import { testUrl } from '../urlParams';
import { getContext } from './context';
import type { GameContext } from './context';
import { RunController, setRun } from './RunController';

const REGISTRY_KEY = 'lineages';
/** A run is saved this long after the last change (a move changes it several times). */
const SAVE_DELAY_MS = 150;

export class LineageKeeper {
  readonly profile: Profile;
  readonly rules: LineageRules;
  readonly runRules: RunRules;
  readonly battleRules: BattleRules;
  /** The saved game is read and written (not on a test URL). */
  readonly persist: boolean;
  /** Run modifiers the last death unlocked, for the generation screen. */
  unlockedAtDeath: string[] = [];
  private run: RunController | null = null;
  /** The number of the lineage the run belongs to. */
  private runLineage = 0;
  private saveTimer: ReturnType<typeof setTimeout> | null = null;
  /** The seed of the next new lineage: the page's (from ?seed=, or random) the first time, then a random one. */
  private nextSeed: number | null;

  constructor(
    private readonly game: Phaser.Game,
    private readonly context: GameContext,
  ) {
    const { data, params, seed } = context;
    this.rules = lineageRulesFrom(data);
    this.runRules = runRulesFrom(data);
    this.battleRules = battleRulesFrom(data);
    this.persist = !testUrl(params);
    this.profile = (this.persist ? readProfile(readSaved(SAVE_KEYS.profile)) : null) ?? newProfile();
    this.nextSeed = seed;
    if (this.persist) {
      window.addEventListener('pagehide', () => this.saveRunNow());
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') this.saveRunNow();
      });
    }
    // ?ancestors=3, ?scene=generation, ?scene=book: a lineage whose hydras have already lived and died.
    const ancestors = params.ancestors ?? (params.scene === 'generation' ? 1 : 0);
    if (!this.persist && ancestors > 0) {
      const lineage = startLineage(this.profile, this.takeSeed(), this.rules);
      this.liveAndDie(lineage, ancestors, params.eggs ?? 1, params.hidden);
    }
  }

  /** The lineage being played, or null before the first one (or after the player ended it). */
  lineage(): Lineage | null {
    return currentLineage(this.profile);
  }

  /** The living hydra's run, if she has hatched. */
  liveRun(): RunController | null {
    const lineage = this.lineage();
    return this.run && lineage && this.runLineage === lineage.number && this.run.state.generation === lineage.generation ? this.run : null;
  }

  /**
   * Continue from the title: the living hydra's saved run, or the generation screen when an heiress waits to hatch.
   * Returns the scene to go to, or null when there is no lineage to continue.
   */
  continueGame(): 'map' | 'generation' | null {
    const lineage = this.lineage();
    if (!lineage) return null;
    if (this.liveRun()) return this.liveRun()!.state.over ? 'generation' : 'map';
    const saved = this.persist ? readRun(readSaved(SAVE_KEYS.run)) : null;
    if (saved && saved.lineage === lineage.number && saved.generation === lineage.generation) {
      this.attach(saved.state, lineage);
      if (!saved.state.over) return 'map';
      // She died just as the page was closed, before the book was written.
      this.died(saved.state);
      return 'generation';
    }
    // An heiress waits to hatch (or her saved run was of an older format: she hatches again).
    if (lineage.generation > 1) return 'generation';
    this.hatch();
    return 'map';
  }

  /** What the story knows of the living hydra's mother, for a dialogue asked for by ?say=. */
  motherFacts(): StoryFacts {
    const mother = this.lineage()?.mother;
    return mother ? { mother: mother.name, motherKilledBy: mother.killedBy, inherited: this.lineage()!.inherited } : {};
  }

  /** Her mother has died and the heiress hasn't hatched yet: Continue shows the generation screen. */
  heiressWaits(): boolean {
    const lineage = this.lineage();
    if (!lineage || lineage.generation === 1 || this.liveRun()) return false;
    const saved = this.persist ? readRun(readSaved(SAVE_KEYS.run)) : null;
    return !(saved && saved.lineage === lineage.number && saved.generation === lineage.generation);
  }

  /**
   * The run for a scene opened straight from a test URL: the living hydra's, or a new hydra's. An heiress whose mother
   * left eggs hatches from the first (or the hidden egg, or with nothing, when there are none).
   */
  playNow(): RunController {
    const live = this.liveRun();
    if (live) return live;
    const lineage = this.lineage();
    if (!lineage) return this.newLineage();
    if (lineage.eggs && !chooseEgg(lineage, 0) && !miraculousIntervention(lineage)) lineage.eggs = null;
    return this.hatch();
  }

  /** The heiress hatches from the egg her mother left at `index` (the generation screen). */
  hatchFromEgg(index: number): RunController {
    const lineage = this.lineage();
    if (!lineage || !chooseEgg(lineage, index)) throw new Error(`No egg ${index} to hatch from.`);
    this.saveProfile();
    return this.hatch();
  }

  /** No egg survived: Old Mother Toad brings out the hidden one, and the heiress hatches from it. */
  intervene(): RunController {
    const lineage = this.lineage();
    if (!lineage || !miraculousIntervention(lineage)) throw new Error('No hidden egg to hatch from.');
    this.saveProfile();
    return this.hatch();
  }

  /** No egg survived, and the player lets the lineage end: it goes into the Book of Lineages. Unlocks stay. */
  letLineageEnd(): void {
    const lineage = this.lineage();
    if (!lineage) return;
    endLineage(this.profile, lineage, null, this.rules);
    this.saveProfile();
  }

  /**
   * New Lineage: the lineage being played ends (its living hydra goes into the book as the last of her line) and a
   * new one starts, its first hydra hatching at once. World knowledge and unlocks stay.
   */
  newLineage(seed = this.takeSeed()): RunController {
    const old = this.lineage();
    if (old) endLineage(this.profile, old, this.runOf(old), this.rules);
    startLineage(this.profile, seed, this.rules);
    this.saveProfile();
    return this.hatch();
  }

  /** The living generation hatches: her world from the lineage's seed and her generation, her heritage, one unlocked modifier. */
  hatch(): RunController {
    const lineage = this.lineage();
    if (!lineage) throw new Error('No lineage to hatch in: start one first.');
    if (lineage.eggs) throw new Error('Her mother left eggs: choose the one she hatches from first.');
    const state = createRun(generationSeed(lineage), this.runRules, { modifiers: this.modifiers(lineage), heritage: heritageOf(this.profile, lineage) });
    this.unlockedAtDeath = [];
    const run = this.attach(state, lineage);
    this.saveRunNow();
    return run;
  }

  /** ?modifiers= on a test URL, else one of the unlocked ones (GAME_DESIGN.md §9.6). */
  private modifiers(lineage: Lineage): string[] {
    const { data, params } = this.context;
    if (params.modifiers.length > 0) {
      const available = Object.keys(data.world.runModifiers).filter((id) => id !== '//');
      for (const m of params.modifiers) if (!available.includes(m)) console.warn(`?modifiers=${m} is unknown. Available: ${available.join(', ')}`);
      return params.modifiers.filter((m) => available.includes(m));
    }
    const picked = modifierFor(this.profile, lineage, this.rules);
    return picked ? [picked] : [];
  }

  /** The run of a lineage's living hydra: the one in play, or the saved one. */
  private runOf(lineage: Lineage): RunState | null {
    if (this.run && this.runLineage === lineage.number) return this.run.state;
    const saved = this.persist ? readRun(readSaved(SAVE_KEYS.run)) : null;
    return saved && saved.lineage === lineage.number ? saved.state : null;
  }

  private attach(state: RunState, lineage: Lineage): RunController {
    const run = new RunController(state, this.runRules, this.battleRules);
    this.run = run;
    this.runLineage = lineage.number;
    run.on('events', (events: RunEvent[]) => {
      for (const event of events) if (event.type === 'eggHidden') this.eggHidden(run, event.mutations);
      if (events.some((e) => e.type === 'hydraDied')) this.died(run.state);
    });
    run.on('changed', () => {
      this.unlock(run);
      this.saveSoon();
    });
    setRun(this.game, run);
    return run;
  }

  /** She has died: she goes into the book, her heiress is named, and what the lineage reached may unlock something. */
  private died(state: RunState): void {
    const lineage = this.lineage();
    if (!lineage || state.generation !== lineage.generation || this.runLineage !== lineage.number) return;
    hydraDied(this.profile, lineage, state, this.rules);
    this.unlockedAtDeath = checkUnlocks(this.profile, lineage, state, this.rules);
    this.saveProfile();
    this.saveRunNow();
  }

  /** Old Mother Toad has hidden an egg of the living hydra: the lineage keeps it, whatever becomes of her. */
  private eggHidden(run: RunController, mutations: readonly string[]): void {
    const lineage = this.lineage();
    if (!lineage || run !== this.liveRun()) return;
    hideEgg(lineage, mutations);
    this.saveProfile();
  }

  /** Challenges met in this life unlock their run modifiers for the account; the screen is told which. */
  private unlock(run: RunController): void {
    const lineage = this.lineage();
    if (!lineage || run !== this.liveRun() || run.state.over) return;
    const earned = checkUnlocks(this.profile, lineage, run.state, this.rules);
    if (earned.length === 0) return;
    this.saveProfile();
    run.emit('unlocked', earned);
  }

  private takeSeed(): number {
    // Math.random is fine here, outside sim/: the seed is shown in the debug overlay, so a lineage can be replayed.
    const seed = this.nextSeed ?? Math.floor(Math.random() * 1_000_000);
    this.nextSeed = null;
    return seed;
  }

  /**
   * For test URLs: `count` hydras of the lineage live (each gaining two mutations and laying an egg, the first hiding
   * one when `hidden`) and die to a group of the Order. Each heiress hatches from the first egg; the last one leaves
   * `lastEggs` eggs for the generation screen.
   */
  private liveAndDie(lineage: Lineage, count: number, lastEggs: number, hidden: boolean): void {
    for (let i = 0; i < count; i++) {
      if (i > 0 && !chooseEgg(lineage, 0)) lineage.eggs = null;
      const seed = generationSeed(lineage);
      const state = createRun(seed, this.runRules, { heritage: heritageOf(this.profile, lineage) });
      const rng = new Rng((seed ^ 0xa4ce57) >>> 0);
      for (let m = 0; m < 2; m++) {
        const fresh = Object.keys(this.runRules.mutations).filter((id) => !state.hydra.mutations.includes(id));
        if (fresh.length > 0) gainMutation(state, rng.pick(fresh), this.runRules, []);
      }
      const eggs = i === count - 1 ? lastEggs : 1;
      state.lair.eggs = [];
      for (let e = 0; e < eggs; e++) {
        state.lair.eggs.push({ id: `e${e + 1}`, mutations: eggMutations(state.hydra.mutations, state.lair.eggs, this.runRules.brood.inheritedShare, rng), hatching: null });
      }
      if (hidden && i === 0) hideEgg(lineage, eggMutations(state.hydra.mutations, [], this.runRules.brood.inheritedShare, rng));
      state.turn = rng.int(4, 30);
      const encounters = [...state.map.tiles.values()].flatMap((t) => (t.object?.kind === 'encounter' ? [{ at: t.hex, groupId: t.object.groupId }] : []));
      if (encounters.length > 0) {
        state.pendingBattle = rng.pick(encounters);
        finishBattle(state, { outcome: 'lost', bodyHp: 0, heads: [], newScars: 0, nextId: state.nextId }, this.runRules);
      }
      hydraDied(this.profile, lineage, state, this.rules);
      this.unlockedAtDeath = checkUnlocks(this.profile, lineage, state, this.rules);
    }
  }

  // ------------------------------------------------------------ saving

  private saveProfile(): void {
    if (this.persist) writeSaved(SAVE_KEYS.profile, writeProfile(this.profile));
  }

  private saveSoon(): void {
    if (!this.persist || this.saveTimer !== null) return;
    this.saveTimer = setTimeout(() => this.saveRunNow(), SAVE_DELAY_MS);
  }

  private saveRunNow(): void {
    if (this.saveTimer !== null) clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (!this.persist || !this.run) return;
    writeSaved(SAVE_KEYS.run, writeRun({ lineage: this.runLineage, generation: this.run.state.generation, state: this.run.state }));
  }
}

/** The account's lineages, read from the saved game the first time a scene asks. */
export function lineages(scene: Phaser.Scene): LineageKeeper {
  let keeper = scene.registry.get(REGISTRY_KEY) as LineageKeeper | undefined;
  if (!keeper) {
    keeper = new LineageKeeper(scene.game, getContext(scene));
    scene.registry.set(REGISTRY_KEY, keeper);
  }
  return keeper;
}
