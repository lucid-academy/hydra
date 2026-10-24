import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { generateUnderground } from '../src/sim/map';
import { generatorSettingsFrom } from '../src/data/runRules';
import { hex, hexKey } from '../src/sim/hex';
import {
  canChooseEventOption,
  chooseEventOption,
  closeEvent,
  conditionsHold,
  dialogueShown,
  endTurn,
  moveHydra,
  serpentInBattle,
  storyMoment,
} from '../src/sim/turn';
import type { DialogueRules, EventRules, RunEvent, RunRules, RunState } from '../src/sim/turn';
import { flatMap, rules, runOn, testRules } from './runHelpers';

function dialogue(over: Partial<DialogueRules> & { id: string }): DialogueRules {
  return { trigger: 'afterBattle', priority: 0, once: true, conditions: {}, lines: [{ speaker: 'head:any', text: 'Hm.' }], setFlags: [], choices: [], ...over };
}

function withStory(base: RunRules, story: Partial<RunRules['story']>): RunRules {
  return { ...base, story: { ...base.story, ...story } };
}

/** A run with an event site two hexes east of the lair. */
function runWithEventSite(): RunState {
  return runOn(
    flatMap(5, (tiles) => {
      tiles.get(hexKey(hex(2, 0)))!.object = { kind: 'event', eventId: null, done: false };
    }),
  );
}

function stepOnEvent(state: RunState, r: RunRules): RunEvent[] {
  return moveHydra(state, hex(2, 0), r);
}

describe('story conditions', () => {
  it('checks flags, alert, turn and the heads present', () => {
    const state = runWithEventSite();
    state.story.flags.push('a');
    state.alert = 30;
    expect(conditionsHold(state, { flags: ['a'], notFlags: ['b'], minAlert: 20, maxAlert: 40 })).toBe(true);
    expect(conditionsHold(state, { flags: ['b'] })).toBe(false);
    expect(conditionsHold(state, { notFlags: ['a'] })).toBe(false);
    expect(conditionsHold(state, { minTurn: 5 })).toBe(false);
    expect(conditionsHold(state, { headClasses: ['biter'] })).toBe(true);
    expect(conditionsHold(state, { headClasses: ['nobody'] })).toBe(false);
    expect(conditionsHold(state, { severedAtLeast: 1 }, { severed: 1 })).toBe(true);
    expect(conditionsHold(state, { severedAtLeast: 1 }, {})).toBe(false);
    expect(conditionsHold(state, { newEnemyTypes: ['torchbearer'] }, { newEnemyTypes: ['manAtArms', 'torchbearer'] })).toBe(true);
  });
});

describe('dialogues', () => {
  it('the heads remark on each of the Order\'s new people the first time they meet one', () => {
    for (const [type, id] of [['crossbowman', 'firstCrossbowman'], ['titheCollector', 'firstTitheCollector'], ['knight', 'firstKnight'], ['masterOfTheOrder', 'firstMaster']]) {
      const state = runWithEventSite();
      const events: RunEvent[] = [];
      storyMoment(state, rules, 'enemyAhead', { newEnemyTypes: [type!] }, events);
      expect(events.flatMap((e) => (e.type === 'dialogueQueued' ? [e.id] : [])), type).toEqual([id]);
    }
  });

  it('picks the highest priority that fits, and says each one once', () => {
    const r = withStory(rules, { dialogues: [dialogue({ id: 'low' }), dialogue({ id: 'high', priority: 5 }), dialogue({ id: 'never', priority: 9, conditions: { flags: ['x'] } })] });
    const state = runWithEventSite();
    const said = () => {
      const events: RunEvent[] = [];
      storyMoment(state, r, 'afterBattle', {}, events);
      return events.flatMap((e) => (e.type === 'dialogueQueued' ? [e.id] : []));
    };
    expect(said()).toEqual(['high']);
    expect(said()).toEqual(['low']);
    expect(said()).toEqual([]);
    expect(state.story.seen).toEqual(['high', 'low']);
  });

  it('casts different heads for different roles, and a head of the class asked for', () => {
    const r = withStory(rules, {
      dialogues: [
        dialogue({
          id: 'cast',
          lines: [
            { speaker: 'head:biter', text: 'I am {any}? No.' },
            { speaker: 'head:any', text: 'x' },
            { speaker: 'head:other', text: 'y' },
          ],
        }),
      ],
    });
    for (let seed = 0; seed < 20; seed++) {
      const state = runWithEventSite();
      state.story.rngState = seed;
      storyMoment(state, r, 'afterBattle', {}, []);
      const lines = state.story.dialogues[0]!.lines;
      expect(lines[0]!.classId).toBe('biter');
      expect(new Set(lines.map((l) => l.name)).size).toBe(3);
      expect(lines[0]!.text).toBe(`I am ${lines[1]!.name}? No.`);
    }
  });

  it('skips a dialogue whose heads are missing and falls back to the next one', () => {
    const r = withStory(rules, {
      dialogues: [dialogue({ id: 'needsNew', priority: 5, lines: [{ speaker: 'head:new', text: 'Hello.' }] }), dialogue({ id: 'plain' })],
    });
    const state = runWithEventSite();
    storyMoment(state, r, 'afterBattle', {}, []);
    expect(state.story.dialogues.map((d) => d.id)).toEqual(['plain']);
    expect(state.story.seen).not.toContain('needsNew');
  });

  it('sets the flags of a dialogue, and of the answer picked when it is shown', () => {
    const r = withStory(rules, {
      dialogues: [dialogue({ id: 'ask', setFlags: ['asked'], choices: [{ text: 'Yes', setFlags: ['yes'], reply: [] }, { text: 'No', setFlags: ['no'], reply: [] }] })],
    });
    const state = runWithEventSite();
    storyMoment(state, r, 'afterBattle', {}, []);
    expect(state.story.flags).toEqual(['asked']);
    dialogueShown(state, r, 1);
    expect(state.story.flags).toEqual(['asked', 'no']);
    expect(state.story.dialogues).toEqual([]);
  });

  it('Old Mother Toad speaks when the hydra rests in the lair', () => {
    const state = runWithEventSite();
    endTurn(state, rules);
    expect(state.story.dialogues[0]?.id).toBe('toadWelcome');
    expect(state.story.dialogues[0]!.lines[0]!.speaker).toBe('toad');
  });

  it('the Serpent speaks on the way now and then, never twice within minTurnsBetween', () => {
    const state = runWithEventSite();
    moveHydra(state, hex(1, 0), testRules);
    const turns: number[] = [];
    for (let i = 0; i < 40; i++) {
      const before = state.story.dialogues.length;
      endTurn(state, testRules);
      if (state.story.dialogues.length > before) turns.push(state.turn);
    }
    expect(turns.length).toBeGreaterThan(0);
    expect(state.story.dialogues[0]!.id).toBe('serpentFirst');
    for (let i = 1; i < turns.length; i++) expect(turns[i]! - turns[i - 1]!).toBeGreaterThanOrEqual(rules.story.serpentVoice.minTurnsBetween);
  });

  it('a Serpent line in battle is one line, not queued as a dialogue', () => {
    const r = withStory(rules, { serpentVoice: { ...rules.story.serpentVoice, battleChance: 1 } });
    const state = runWithEventSite();
    const line = serpentInBattle(state, r);
    expect(line?.speaker).toBe('serpent');
    expect(state.story.dialogues).toEqual([]);
  });

  it('every dialogue in the data can be cast with the starting heads, or names a head that may grow later', () => {
    const state = runWithEventSite();
    const classes = new Set(state.hydra.heads.map((h) => h.classId));
    for (const d of rules.story.dialogues) {
      for (const l of [...d.lines, ...d.choices.flatMap((c) => c.reply)]) {
        const role = l.speaker.replace(/^head:/, '');
        if (l.speaker.startsWith('head:') && !['any', 'other', 'new'].includes(role)) expect(classes.has(role), `${d.id}: ${l.speaker}`).toBe(true);
      }
    }
  });
});

describe('events', () => {
  const event = (over: Partial<EventRules> & { id: string }): EventRules => ({
    title: 'T',
    quest: null,
    text: 'Something.',
    priority: 0,
    weight: 1,
    once: true,
    conditions: {},
    choices: [
      {
        text: 'Take it',
        needsHead: null,
        needsCondition: null,
        cost: { muck: 0, moisture: 0, bones: 0 },
        chance: null,
        success: { text: 'Got it.', loot: { muck: 5, moisture: 0, bones: 0 }, alert: 0, bodyHp: 0, headsHp: 0, condition: null, reveal: 0, battle: null, setFlags: ['took'], dialogue: null, newHead: null, bore: false, mutation: null },
        failure: null,
      },
    ],
    ...over,
  });

  it('stepping on a site stops the hydra and opens the event; a choice applies its outcome once', () => {
    const r = withStory(testRules, { events: [event({ id: 'one' })] });
    const state = runWithEventSite();
    // A walk goes round an event site; stepping on it opens it.
    expect(moveHydra(state, hex(3, 0), r).some((e) => e.type === 'eventReached')).toBe(false);
    moveHydra(state, hex(0, 0), r);
    state.hydra.movementLeft = 5;
    const events = stepOnEvent(state, r);
    expect(state.hydra.position).toEqual(hex(2, 0));
    expect(events.some((e) => e.type === 'eventReached')).toBe(true);
    expect(state.pendingEvent?.eventId).toBe('one');
    const muck = state.resources.muck;
    chooseEventOption(state, r, 0);
    expect(state.resources.muck).toBe(muck + 5);
    expect(state.story.flags).toContain('took');
    expect(state.pendingEvent?.result?.text).toBe('Got it.');
    expect(chooseEventOption(state, r, 0)).toEqual([]);
    closeEvent(state);
    expect(state.pendingEvent).toBeNull();
    // The site is spent.
    moveHydra(state, hex(0, 0), r);
    expect(stepOnEvent(state, r).some((e) => e.type === 'eventReached')).toBe(false);
  });

  it('a quest step waits for the flag of the step before it, and then comes first', () => {
    const r = withStory(testRules, { events: [event({ id: 'start' }), event({ id: 'next', priority: 5, conditions: { flags: ['took'] } })] });
    const state = runWithEventSite();
    stepOnEvent(state, r);
    expect(state.pendingEvent?.eventId).toBe('start');
    chooseEventOption(state, r, 0);
    closeEvent(state);
    state.map.tiles.get(hexKey(hex(-2, 0)))!.object = { kind: 'event', eventId: null, done: false };
    state.hydra.movementLeft = 9;
    moveHydra(state, hex(-2, 0), r);
    expect(state.pendingEvent?.eventId).toBe('next');
  });

  it('a choice that needs a head or resources the hydra lacks cannot be picked', () => {
    const base = event({ id: 'e' }).choices[0]!;
    const r = withStory(testRules, {
      events: [event({ id: 'e', choices: [{ ...base, needsHead: 'nobody' }, { ...base, cost: { muck: 999, moisture: 0, bones: 0 } }, base] })],
    });
    const state = runWithEventSite();
    stepOnEvent(state, r);
    expect(canChooseEventOption(state, r, 0)).toEqual({ can: false, why: 'needsHead' });
    expect(canChooseEventOption(state, r, 1)).toEqual({ can: false, why: 'cost' });
    expect(canChooseEventOption(state, r, 2)).toEqual({ can: true });
    expect(chooseEventOption(state, r, 0)).toEqual([]);
  });

  it('a gamble comes out the same for the same seed, and a battle outcome waits on the event hex', () => {
    const base = event({ id: 'g' }).choices[0]!;
    const lose = { ...base.success, text: 'Ambush.', battle: 'patrol', setFlags: [] };
    const r = withStory(testRules, { events: [event({ id: 'g', choices: [{ ...base, chance: 0.5, failure: lose }] })] });
    const outcomes = [0, 1].map(() => {
      const state = runWithEventSite();
      stepOnEvent(state, r);
      chooseEventOption(state, r, 0);
      return state.pendingEvent!.result!.success;
    });
    expect(outcomes[0]).toBe(outcomes[1]);
    const r2 = withStory(testRules, { events: [event({ id: 'g', choices: [{ ...base, chance: 0, failure: lose }] })] });
    const state = runWithEventSite();
    stepOnEvent(state, r2);
    chooseEventOption(state, r2, 0);
    expect(state.pendingBattle).toEqual({ at: hex(2, 0), layer: 'underground', groupId: 'patrol' });
  });

  it('when nothing fits, the fallback event (the still pool) comes up again and again', () => {
    const r = withStory(testRules, { events: rules.story.events.map((e) => (e.priority >= 0 ? { ...e, conditions: { flags: ['never'] } } : e)) });
    for (let i = 0; i < 3; i++) {
      const state = runWithEventSite();
      state.story.seen.push('stillPool');
      stepOnEvent(state, r);
      expect(state.pendingEvent?.eventId).toBe('stillPool');
    }
  });

  it('every event in the data has a choice anyone can pick', () => {
    for (const e of rules.story.events) expect(e.choices.some((c) => c.needsHead === null && c.cost.muck + c.cost.moisture + c.cost.bones === 0), e.id).toBe(true);
  });
});

describe('event sites in the generator', () => {
  it('places the event sites of each ring, away from the lair and dead ends', () => {
    const settings = generatorSettingsFrom(loadGameData());
    for (let seed = 1; seed <= 30; seed++) {
      const map = generateUnderground(seed, settings, rules.terrain);
      const sites = [...map.tiles.values()].filter((t) => t.object?.kind === 'event');
      for (const [k, ring] of settings.rings.entries()) {
        expect(sites.filter((t) => t.ring === k + 1).length, `seed ${seed} ring ${k + 1}`).toBe(ring.eventSites);
      }
    }
  });
});
