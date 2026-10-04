// What the hydra meets on the M2c map besides battles and shrines: thresholds, places, finds, conditions and hints.

import { describe, expect, it } from 'vitest';
import { hex, hexDistance, hexKey } from '../src/sim/hex';
import type { MapObject, Tile } from '../src/sim/map';
import {
  canDoPlaceAction,
  canWorkThreshold,
  doPlaceAction,
  encountersRevealed,
  endTurn,
  finishBattle,
  inspect,
  knownDraughts,
  leavePlace,
  moveHydra,
  pendingBattleSetup,
  reachableHexes,
  workThreshold,
} from '../src/sim/turn';
import type { RunState } from '../src/sim/turn';
import { flatMap, runOn, testRules } from './runHelpers';

function threshold(thresholdId: string, state: 'hidden' | 'closed' | 'open', digsNeeded = 0): MapObject {
  return { kind: 'threshold', thresholdId, state, border: 1, floor: 'mud', dug: 0, digsNeeded };
}

function place(placeId: string, carryPath: ReturnType<typeof hex>[] | null = null): Extract<MapObject, { kind: 'place' }> {
  return { kind: 'place', placeId, visited: false, used: [], readyOnTurn: {}, carryPath };
}

/** A rock hex with a threshold in it. */
function gate(tiles: Map<string, Tile>, key: string, object: MapObject): void {
  const tile = tiles.get(key)!;
  tile.terrain = object.kind === 'threshold' && object.state === 'open' ? 'mud' : 'rock';
  tile.object = object;
}

function standAt(state: RunState, h: ReturnType<typeof hex>): void {
  state.hydra.position = h;
}

describe('thresholds', () => {
  it('a closed threshold is rock: the hydra walks up to it and its panel opens', () => {
    const state = runOn(flatMap(6, (tiles) => gate(tiles, '4,0', threshold('rubbleChoke', 'closed', 2))));
    expect(reachableHexes(state, testRules).has('4,0')).toBe(false);
    const events = inspect(state, hex(4, 0), testRules);
    expect(hexDistance(state.hydra.position, hex(4, 0))).toBe(1);
    expect(events[0]?.type).toBe('moved');
    expect(events.some((e) => e.type === 'thresholdReached' && e.thresholdId === 'rubbleChoke')).toBe(true);
    expect(state.pendingPlace).toEqual(hex(4, 0));
    // While the panel is open, nothing else happens.
    expect(reachableHexes(state, testRules).size).toBe(0);
    expect(endTurn(state, testRules)).toEqual([]);
    leavePlace(state);
    expect(state.pendingPlace).toBeNull();
  });

  it('out of reach this turn: nothing happens', () => {
    const state = runOn(flatMap(8, (tiles) => gate(tiles, '7,0', threshold('rubbleChoke', 'closed', 1))), 2);
    expect(inspect(state, hex(7, 0), testRules)).toEqual([]);
    expect(state.pendingPlace).toBeNull();
    expect(hexKey(state.hydra.position)).toBe('0,0');
  });

  it('a Rubble Choke takes a dig per turn, and opens after the last one', () => {
    const state = runOn(flatMap(4, (tiles) => gate(tiles, '2,0', threshold('rubbleChoke', 'closed', 2))));
    standAt(state, hex(1, 0));
    inspect(state, hex(2, 0), testRules);
    expect(canWorkThreshold(state, testRules)).toEqual({ can: true });
    const first = workThreshold(state, testRules);
    expect(first).toEqual([{ type: 'thresholdDug', at: hex(2, 0), thresholdId: 'rubbleChoke', dug: 1, needed: 2 }]);
    expect(state.hydra.movementLeft).toBe(0); // digging takes the rest of the turn
    expect(state.pendingPlace).toBeNull();
    expect(state.map.tiles.get('2,0')!.terrain).toBe('rock');

    inspect(state, hex(2, 0), testRules);
    expect(canWorkThreshold(state, testRules)).toEqual({ can: false, why: 'noMovement' });
    leavePlace(state);
    endTurn(state, testRules);
    inspect(state, hex(2, 0), testRules);
    const second = workThreshold(state, testRules);
    expect(second.map((e) => e.type)).toEqual(['thresholdDug', 'thresholdOpened']);
    expect(state.map.tiles.get('2,0')!.terrain).toBe('mud');
    endTurn(state, testRules);
    expect(reachableHexes(state, testRules).has('2,0')).toBe(true);
  });

  it('a Root Wall needs a Biter, and a Biter gnaws through it at once', () => {
    const state = runOn(flatMap(4, (tiles) => gate(tiles, '2,0', threshold('rootWall', 'closed'))));
    standAt(state, hex(1, 0));
    const biter = state.hydra.heads.find((h) => h.classId === 'biter')!;
    state.hydra.heads = state.hydra.heads.filter((h) => h !== biter);
    inspect(state, hex(2, 0), testRules);
    expect(canWorkThreshold(state, testRules)).toEqual({ can: false, why: 'needsHead' });
    expect(workThreshold(state, testRules)).toEqual([]);
    leavePlace(state);

    state.hydra.heads.push(biter);
    inspect(state, hex(2, 0), testRules);
    const left = state.hydra.movementLeft;
    expect(workThreshold(state, testRules).map((e) => e.type)).toEqual(['thresholdOpened']);
    expect(state.hydra.movementLeft).toBe(left); // a head's work costs no movement
    expect(state.map.tiles.get('2,0')!.terrain).toBe('mud');
  });

  it('a Draught Crack gives itself away with a draught, and opens when the hydra stands next to it', () => {
    const state = runOn(flatMap(6, (tiles) => gate(tiles, '4,0', threshold('draughtCrack', 'hidden'))));
    state.visibility = new Map([['0,0', 'visible']]);
    expect(knownDraughts(state)).toEqual([]);
    for (const key of ['1,0', '2,0', '3,0', '0,1', '1,1', '2,1', '3,1']) state.visibility.set(key, 'remembered');
    const toward = moveHydra(state, hex(2, 0), testRules);
    expect(toward.some((e) => e.type === 'draughtFelt' && e.thresholdId === 'draughtCrack')).toBe(true);
    expect(knownDraughts(state).length).toBeGreaterThan(0);
    expect(inspect(state, hex(4, 0), testRules)).toEqual([]); // it still looks like rock

    const found = moveHydra(state, hex(3, 0), testRules);
    expect(found.some((e) => e.type === 'thresholdFound' && e.thresholdId === 'draughtCrack')).toBe(true);
    expect(state.map.tiles.get('4,0')!.terrain).toBe('mud');
    expect(knownDraughts(state)).toEqual([]);
  });
});

describe('places', () => {
  it('walking onto a place for the first time stops there and opens its panel', () => {
    const state = runOn(flatMap(5, (tiles) => (tiles.get('2,0')!.object = place('sunkenOak'))));
    expect(reachableHexes(state, testRules).has('3,0')).toBe(true); // around it, not through
    const events = moveHydra(state, hex(2, 0), testRules);
    expect(events.some((e) => e.type === 'placeReached' && e.placeId === 'sunkenOak' && e.firstVisit)).toBe(true);
    expect(state.pendingPlace).toEqual(hex(2, 0));
    leavePlace(state);
    // Visited: now it can be crossed, and a landmark with nothing to do doesn't open its panel again.
    moveHydra(state, hex(1, 0), testRules);
    expect(moveHydra(state, hex(3, 0), testRules).some((e) => e.type === 'placeReached')).toBe(false);
    expect(state.pendingPlace).toBeNull();
  });

  it('a place with something to do opens its panel when a move ends on it, or when tapped while standing on it', () => {
    const state = runOn(flatMap(5, (tiles) => (tiles.get('2,0')!.object = place('ninefoldCamp'))));
    moveHydra(state, hex(2, 0), testRules);
    leavePlace(state);
    moveHydra(state, hex(1, 0), testRules);
    expect(moveHydra(state, hex(2, 0), testRules).some((e) => e.type === 'placeReached' && !e.firstVisit)).toBe(true);
    leavePlace(state);
    expect(inspect(state, hex(2, 0), testRules).map((e) => e.type)).toEqual(['placeReached']);
  });

  it('an action done once is done; one with a wait comes back on its turn', () => {
    const state = runOn(flatMap(5, (tiles) => {
      tiles.get('1,0')!.object = place('gallowsRoots');
      tiles.get('0,1')!.object = place('ninefoldCamp');
    }));
    moveHydra(state, hex(1, 0), testRules);
    const bones = testRules.places.gallowsRoots!.actions[0]!;
    expect(doPlaceAction(state, bones.id, testRules).map((e) => e.type)).toEqual(['placeAction']);
    expect(state.resources.bones).toBe(bones.gain.bones);
    expect(canDoPlaceAction(state, bones)).toEqual({ can: false, why: 'done' });
    expect(doPlaceAction(state, bones.id, testRules)).toEqual([]);
    leavePlace(state);

    moveHydra(state, hex(0, 1), testRules);
    const gifts = testRules.places.ninefoldCamp!.actions[0]!;
    doPlaceAction(state, gifts.id, testRules);
    expect(state.resources.muck).toBe(gifts.gain.muck);
    expect(canDoPlaceAction(state, gifts)).toEqual({ can: false, why: 'notYet', turnsLeft: gifts.cooldownTurns });
    leavePlace(state);
    for (let i = 0; i < gifts.cooldownTurns; i++) endTurn(state, testRules);
    inspect(state, hex(0, 1), testRules);
    expect(canDoPlaceAction(state, gifts)).toEqual({ can: true });
  });

  it('drinking from the Brine Lake salts the hydra: one move fewer, from now, for three turns', () => {
    const state = runOn(flatMap(5, (tiles) => (tiles.get('1,0')!.object = place('brineLake'))));
    moveHydra(state, hex(1, 0), testRules);
    const left = state.hydra.movementLeft;
    const events = doPlaceAction(state, 'drink', testRules);
    expect(events.some((e) => e.type === 'conditionStarted' && e.id === 'salted')).toBe(true);
    expect(state.resources.moisture).toBe(testRules.places.brineLake!.actions[0]!.gain.moisture);
    expect(state.hydra.movementLeft).toBe(left - 1);
    leavePlace(state);
    const movement: number[] = [];
    const ended: number[] = [];
    for (let turn = 2; turn <= 5; turn++) {
      if (endTurn(state, testRules).some((e) => e.type === 'conditionEnded')) ended.push(turn);
      movement.push(state.hydra.movementLeft);
    }
    expect(movement).toEqual([4, 4, 5, 5]);
    expect(ended).toEqual([4]);
  });

  it('the Undertow carries the hydra along its current, and lets go before an encounter', () => {
    const path = [hex(2, 0), hex(3, 0), hex(4, 0), hex(5, 0)];
    const state = runOn(flatMap(7, (tiles) => {
      tiles.get('1,0')!.object = place('undertow', path);
      tiles.get('5,0')!.object = { kind: 'encounter', groupId: 'patrol', tier: 1 };
    }));
    moveHydra(state, hex(1, 0), testRules);
    const before = state.hydra.movementLeft;
    const events = doPlaceAction(state, 'ride', testRules);
    const carried = events.find((e) => e.type === 'carried');
    expect(carried).toEqual({ type: 'carried', path: [hex(2, 0), hex(3, 0), hex(4, 0)] });
    expect(hexKey(state.hydra.position)).toBe('4,0');
    expect(state.hydra.movementLeft).toBe(before - testRules.places.undertow!.actions[0]!.movementCost);
    expect(state.pendingPlace).toBeNull();
    expect(state.pendingBattle).toBeNull();
  });

  it('the Mycelium Whisper shows every encounter for a few turns', () => {
    const state = runOn(flatMap(5, (tiles) => (tiles.get('1,0')!.object = place('myceliumWhisper'))));
    moveHydra(state, hex(1, 0), testRules);
    expect(encountersRevealed(state, testRules)).toBe(false);
    doPlaceAction(state, 'listen', testRules);
    expect(encountersRevealed(state, testRules)).toBe(true);
    leavePlace(state);
    for (let i = 0; i < 4; i++) endTurn(state, testRules);
    expect(encountersRevealed(state, testRules)).toBe(false);
  });

  it('near the Silent Bell, a battle raises no Alert', () => {
    const state = runOn(flatMap(6, (tiles) => {
      tiles.get('4,0')!.object = { ...place('silentBell'), visited: true };
      tiles.get('2,0')!.object = { kind: 'encounter', groupId: 'patrol', tier: 1 };
    }));
    moveHydra(state, hex(2, 0), testRules);
    const alert = state.alert;
    const setup = pendingBattleSetup(state, testRules)!;
    const events = finishBattle(state, { outcome: 'won', bodyHp: 50, heads: [...setup.heads], newScars: 0, nextId: 9 }, testRules);
    expect(events[0]).toMatchObject({ type: 'battleWon', silenced: true });
    expect(state.alert).toBe(alert);
  });

  it("the Lost Survey's map shows the nearest hidden threshold", () => {
    const state = runOn(flatMap(8, (tiles) => {
      tiles.get('1,0')!.object = place('lostSurvey');
      gate(tiles, '5,0', threshold('draughtCrack', 'hidden'));
      gate(tiles, '-7,0', threshold('draughtCrack', 'hidden'));
    }));
    state.visibility = new Map([['0,0', 'visible'], ['1,0', 'visible']]);
    moveHydra(state, hex(1, 0), testRules);
    const events = doPlaceAction(state, 'map', testRules);
    expect(events.some((e) => e.type === 'thresholdRevealed' && hexKey(e.at) === '5,0')).toBe(true);
    expect(state.map.tiles.get('5,0')!.object).toMatchObject({ state: 'open' });
    expect(state.map.tiles.get('-7,0')!.object).toMatchObject({ state: 'hidden' });
    expect(state.visibility.has('5,0')).toBe(true);
  });
});

describe('finds and hints', () => {
  it('remains give their loot once and stay; a hoard is taken whole', () => {
    const state = runOn(flatMap(5, (tiles) => {
      tiles.get('1,0')!.object = { kind: 'remains', pool: 'any', line: 0, loot: { bones: 3 }, looted: false };
      tiles.get('2,0')!.object = { kind: 'hoard', loot: { muck: 25, moisture: 15 } };
    }));
    const events = moveHydra(state, hex(2, 0), testRules);
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['remainsFound', 'hoardTaken']));
    expect(state.resources).toMatchObject({ bones: 3, muck: 25, moisture: 15 });
    expect(state.map.tiles.get('1,0')!.object).toMatchObject({ kind: 'remains', looted: true });
    expect(state.map.tiles.get('2,0')!.object).toBeNull();
    moveHydra(state, hex(0, 0), testRules);
    expect(state.resources.bones).toBe(3);
  });

  it('a landmark close enough is seen through rock', () => {
    const range = testRules.landmarkSightRange;
    const state = runOn(flatMap(range + 3, (tiles) => {
      tiles.get(`${range + 1},0`)!.object = place('saltSaint');
    }));
    state.visibility = new Map([['0,0', 'visible'], ['1,0', 'visible']]);
    expect(moveHydra(state, hex(1, 0), testRules).some((e) => e.type === 'landmarkSighted' && e.placeId === 'saltSaint')).toBe(true);
    expect(state.visibility.get(`${range + 1},0`)).toBe('remembered');
  });

  it('a place not seen yet is heard from the edge of the known map, once', () => {
    const state = runOn(flatMap(8));
    state.map = { ...state.map, layout: { ...state.map.layout, echoSources: [{ at: hex(5, 0), placeId: 'ninefoldCamp', biome: 'saltMines' }] } };
    state.visibility = new Map([['0,0', 'visible'], ['1,0', 'visible']]);
    const events = moveHydra(state, hex(1, 0), testRules);
    const echo = events.find((e) => e.type === 'echoHeard');
    expect(echo).toMatchObject({ echo: { placeId: 'ninefoldCamp', source: hex(5, 0) } });
    expect(state.echoes).toHaveLength(1);
    moveHydra(state, hex(0, 0), testRules);
    expect(state.echoes).toHaveLength(1);
  });
});
