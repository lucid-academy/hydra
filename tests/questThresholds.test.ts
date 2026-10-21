// The two thresholds that come from the story (GAME_DESIGN.md §9.3): the Sealed Door, a step of a mini quest, and
// the Cinder Bore, a tunnel the Cinderkin melt when an event asks them to.

import { describe, expect, it } from 'vitest';
import { hex, hexKey, hexNeighbors } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { floodFill, ringsAmong } from '../src/sim/map';
import type { Tile } from '../src/sim/map';
import { Rng } from '../src/sim/rng';
import {
  boreTunnel,
  canChooseEventOption,
  canOpenSealed,
  canWorkThreshold,
  chooseEventOption,
  endTurn,
  inspect,
  moveHydra,
  openSealed,
  workThreshold,
} from '../src/sim/turn';
import type { EventOutcome, EventRules, RunRules, RunState } from '../src/sim/turn';
import { flatMap, rules, runOn, terrain, testRules } from './runHelpers';

/**
 * Ring 1 west of q = 3, a band of rock two hexes thick (q = 3 and 4), ring 2 from q = 5 on.
 * The hydra starts in the lair, in ring 1.
 */
function twoRings(edit: (tiles: Map<string, Tile>) => void = () => {}): RunState {
  return runOn(
    flatMap(8, (tiles) => {
      for (const [key, t] of tiles) {
        if (t.hex.q === 3 || t.hex.q === 4) tiles.set(key, { ...t, region: 'band', ring: 1, terrain: 'rock' });
        else if (t.hex.q >= 5) tiles.set(key, { ...t, region: 'ring', ring: 2 });
      }
      edit(tiles);
    }),
  );
}

const outcome = (over: Partial<EventOutcome>): EventOutcome => ({
  text: 'So it goes.',
  loot: { muck: 0, moisture: 0, bones: 0 },
  alert: 0,
  bodyHp: 0,
  headsHp: 0,
  condition: null,
  reveal: 0,
  battle: null,
  setFlags: [],
  dialogue: null,
  newHead: null,
  bore: false,
  mutation: null,
  ...over,
});

function withEvent(event: EventRules): RunRules {
  return { ...testRules, story: { ...testRules.story, events: [event] } };
}

/** An event with one choice, right where the hydra stands, its panel open. */
function standAtEvent(state: RunState, eventId: string): void {
  state.pendingEvent = { at: state.hydra.position, eventId, result: null };
}

describe('the Sealed Door', () => {
  const door: Hex = hex(3, 0);
  const run = () => {
    const state = twoRings((tiles) => {
      tiles.get(hexKey(door))!.object = { kind: 'threshold', thresholdId: 'sealedDoor', state: 'closed', border: 1, floor: 'mud', dug: 0, digsNeeded: 0 };
      // The tunnel past the door, carved open, as the generator does.
      tiles.get(hexKey(hex(4, 0)))!.terrain = 'mud';
    });
    // Next to it.
    state.hydra.position = hex(2, 0);
    inspect(state, door, testRules);
    return state;
  };

  it('stays shut without what one of its ways needs, and no head or digging opens it', () => {
    const state = run();
    expect(state.pendingPlace).toEqual(door);
    expect(canOpenSealed(state, testRules, 0)).toEqual({ can: false, why: 'missing' });
    expect(canOpenSealed(state, testRules, 1)).toEqual({ can: false, why: 'missing' });
    expect(canWorkThreshold(state, testRules)).toEqual({ can: false, why: 'sealed' });
    expect(workThreshold(state, testRules)).toEqual([]);
    expect(openSealed(state, testRules, 0)).toEqual([]);
    expect(state.map.tiles.get(hexKey(door))!.terrain).toBe('rock');
  });

  it('opens the way whose flag a quest set: the door opens, sets its flags and says its dialogue', () => {
    const state = run();
    state.story.flags.push('hushedMaskTaken');
    expect(canOpenSealed(state, testRules, 0).can).toBe(false);
    expect(canOpenSealed(state, testRules, 1).can).toBe(true);
    const events = openSealed(state, testRules, 1);
    expect(events.some((e) => e.type === 'thresholdOpened')).toBe(true);
    const tile = state.map.tiles.get(hexKey(door))!;
    expect(tile.object).toMatchObject({ thresholdId: 'sealedDoor', state: 'open' });
    expect(tile.terrain).toBe('mud');
    expect(state.pendingPlace).toBeNull();
    expect(state.story.flags).toContain('hushedDoorOpened');
    expect(state.story.dialogues.map((d) => d.id)).toContain('sealedDoorOpens');
    // Ring 2 is now in reach.
    expect(ringsAmong(state.map, floodFill(state.map.tiles, state.map.lair, terrain)).has(2)).toBe(true);
  });

  it('is a step of "The Silent Song": its ways need the flags of the quest\'s last step', () => {
    const sealed = rules.thresholds.sealedDoor!.sealed!;
    const lastNote = rules.story.events.find((e) => e.id === 'lastNote')!;
    const flagsOfLastNote = new Set(lastNote.choices.flatMap((c) => c.success.setFlags));
    for (const way of sealed.ways) expect(flagsOfLastNote.has(way.flag), way.flag).toBe(true);
  });
});

describe('the Cinder Bore', () => {
  const bore = rules.bore!;

  it('melts a tunnel through the thinnest rock nearby into the other ring, with its threshold on the band', () => {
    const state = twoRings();
    state.turn = 4;
    const tunnel = boreTunnel(state, testRules, state.hydra.position, new Rng(7))!;
    expect(tunnel).not.toBeNull();
    // The band is two hexes thick, so the thinnest way through is two hexes of rock.
    expect(tunnel.path.length).toBeGreaterThanOrEqual(2);
    expect(tunnel.path.length).toBeLessThanOrEqual(3);
    for (const h of tunnel.path) {
      expect(state.map.tiles.get(hexKey(h))!.terrain).toBe('mud');
      expect(state.hotUntil[hexKey(h)]).toBe(4 + bore.hotTurns - 1);
    }
    const gate = state.map.tiles.get(hexKey(tunnel.at))!;
    expect(gate.region).toBe('band');
    expect(gate.object).toMatchObject({ kind: 'threshold', thresholdId: bore.thresholdId, state: 'open', border: 1 });
    expect(ringsAmong(state.map, floodFill(state.map.tiles, state.map.lair, terrain)).has(2)).toBe(true);
    // The glow shows the way: the tunnel is known.
    for (const h of tunnel.path) expect(state.visibility.has(hexKey(h))).toBe(true);
  });

  it('picks the same tunnel for the same random numbers, and finds none when no rock nearby is thin enough', () => {
    const a = boreTunnel(twoRings(), testRules, hex(0, 0), new Rng(3))!;
    const b = boreTunnel(twoRings(), testRules, hex(0, 0), new Rng(3))!;
    expect(a.path).toEqual(b.path);
    const far = { ...testRules, bore: { ...bore, within: 1 } };
    expect(boreTunnel(twoRings(), far, hex(-2, 0), new Rng(3))).toBeNull();
    const thick = { ...testRules, bore: { ...bore, longest: 1 } };
    expect(boreTunnel(twoRings(), thick, hex(0, 0), new Rng(3))).toBeNull();
  });

  it('burns the hydra while it is hot, never to death, and cools after its turns', () => {
    const state = twoRings();
    const tunnel = boreTunnel(state, testRules, state.hydra.position, new Rng(7))!;
    const first = tunnel.path[0]!;
    // Next to the tunnel's mouth, on open ground of ring 1.
    state.hydra.position = hexNeighbors(first).find((h) => {
      const t = state.map.tiles.get(hexKey(h));
      return t !== undefined && t.terrain !== 'rock' && t.ring === 1 && t.region === 'ring';
    })!;
    state.hydra.movementLeft = 5;
    const before = state.hydra.bodyHp;
    const events = moveHydra(state, first, testRules);
    expect(events.some((e) => e.type === 'burned')).toBe(true);
    expect(state.hydra.bodyHp).toBe(before - bore.burn);
    state.hydra.bodyHp = 3;
    moveHydra(state, tunnel.path[1]!, testRules);
    expect(state.hydra.bodyHp).toBe(1);

    const ended = [];
    for (let i = 0; i < bore.hotTurns; i++) ended.push(...endTurn(state, testRules));
    expect(ended.filter((e) => e.type === 'tunnelCooled')).toHaveLength(1);
    expect(state.hotUntil).toEqual({});
  });

  it('comes from an event: the outcome melts the tunnel, or says the swarm found nothing', () => {
    const event: EventRules = {
      id: 'swarm',
      title: 'Swarm',
      quest: null,
      text: 'Hot.',
      priority: 0,
      weight: 1,
      once: true,
      conditions: {},
      choices: [{ text: 'Go on.', needsHead: null, needsCondition: null, cost: { muck: 0, moisture: 0, bones: 0 }, chance: null, success: outcome({ bore: true }), failure: null }],
    };
    const r = withEvent(event);
    const state = twoRings();
    standAtEvent(state, 'swarm');
    expect(chooseEventOption(state, r, 0).some((e) => e.type === 'tunnelBored')).toBe(true);

    const nowhere = runOn(flatMap(4));
    standAtEvent(nowhere, 'swarm');
    expect(chooseEventOption(nowhere, r, 0).some((e) => e.type === 'boreFailed')).toBe(true);
  });

  it('a choice that needs a condition (Warm) waits for it', () => {
    const event: EventRules = {
      id: 'warmth',
      title: 'Swarm',
      quest: null,
      text: 'Hot.',
      priority: 0,
      weight: 1,
      once: true,
      conditions: {},
      choices: [{ text: 'Warm them.', needsHead: null, needsCondition: 'warmed', cost: { muck: 0, moisture: 0, bones: 0 }, chance: null, success: outcome({}), failure: null }],
    };
    const r = withEvent(event);
    const state = twoRings();
    standAtEvent(state, 'warmth');
    expect(canChooseEventOption(state, r, 0)).toEqual({ can: false, why: 'needsCondition' });
    state.hydra.conditions.push({ id: 'warmed', turnsLeft: 2 });
    expect(canChooseEventOption(state, r, 0)).toEqual({ can: true });
  });

  it('in the data: the Cinderkin never come in ring 1, and something hot is always on offer', () => {
    const swarm = rules.story.events.find((e) => e.choices.some((c) => c.success.bore))!;
    expect(swarm.conditions.rings).toBeDefined();
    expect(swarm.conditions.rings).not.toContain(1);
    // Warmth (from the Warm Crack) or Muck to burn.
    const boring = swarm.choices.filter((c) => c.success.bore);
    expect(boring.some((c) => c.needsCondition === 'warmed')).toBe(true);
    expect(boring.some((c) => c.needsCondition === null && c.needsHead === null)).toBe(true);
    const warmCrack = rules.story.events.find((e) => e.id === 'warmCrack')!;
    expect(warmCrack.choices.some((c) => c.success.condition?.id === 'warmed')).toBe(true);
  });
});
