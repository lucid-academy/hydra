// M7 on the map: the castle of the Eternal Flame (castle.json; GAME_DESIGN.md §5.7). Its gate opens when enough Flame
// Shrines are out; the assault is fought part by part, and the last part won puts out the Eternal Flame: the run is won.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { readRun, writeRun } from '../src/save/format';
import { hex, hexDistance, hexKey, hexesInRange } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import type { SurfaceMap, Tile } from '../src/sim/map';
import {
  canStormCastle,
  castleOpen,
  castlePanelOpen,
  endTurn,
  finishBattle,
  inspect,
  moveHydra,
  pendingBattleSetup,
  relightShrine,
  stormCastle,
} from '../src/sim/turn';
import type { RunEvent, RunRules, RunState } from '../src/sim/turn';
import { flatMap, runOn, testRules } from './runHelpers';

const data = loadGameData();
const rules = runRulesFrom(data);
const castleRules: RunRules = { ...testRules, surface: rules.surface, castle: rules.castle };

const CASTLE = hex(-6, 0);
const PASSAGE = hex(0, 0);
const SHRINES = [hex(-2, 0), hex(-4, 0)];

/** An all-field surface of radius 6 with a Passage in the middle, the castle at (-6, 0) and two Flame Shrines on the way. */
function castleSurface(): SurfaceMap {
  const tiles = new Map<string, Tile>();
  for (const h of hexesInRange(hex(0, 0), 6)) tiles.set(hexKey(h), { hex: h, biome: 'surface', ring: 0, region: 'surface', terrain: 'field', object: null });
  tiles.get(hexKey(PASSAGE))!.object = { kind: 'passage' };
  tiles.get(hexKey(CASTLE))!.object = { kind: 'castle' };
  for (const h of SHRINES) tiles.get(hexKey(h))!.object = { kind: 'flameShrine', burning: true, groupId: 'shrineWatch', tier: 1 };
  return { radius: 6, tiles, castle: CASTLE, passages: [PASSAGE], camps: [], shrines: [...SHRINES] };
}

/** A run whose hydra stands on the surface, on the Passage, knowing the whole surface. */
function upThere(): RunState {
  const state = runOn(flatMap(6, (tiles) => (tiles.get(hexKey(PASSAGE))!.object = { kind: 'passage' })), 5);
  state.order.nextPatrolTurn = 999;
  state.hydra.position = PASSAGE;
  state.hydra.layer = 'surface';
  const map = castleSurface();
  state.surface = { ...state.surface, map, visibility: new Map(), mist: {}, lastingMist: { [hexKey(PASSAGE)]: 'passage' }, exposed: false, windy: false, relights: {}, nextPatrolTurn: 999 };
  for (const key of map.tiles.keys()) state.surface.visibility.set(key, 'remembered');
  state.resources = { muck: 0, moisture: 20, bones: 0 };
  return state;
}

/** Wins the battle waiting now (everyone comes out of it as they went in). */
function win(state: RunState, r: RunRules = castleRules): RunEvent[] {
  const setup = pendingBattleSetup(state, r)!;
  return finishBattle(state, { outcome: 'won', bodyHp: state.hydra.bodyHp, heads: [...setup.heads], newScars: 0, nextId: state.nextId }, r);
}

/** Walks onto a burning Flame Shrine and beats its guard. */
function putOut(state: RunState, at: Hex, r: RunRules = castleRules): RunEvent[] {
  state.hydra.movementLeft = 5;
  moveHydra(state, at, r);
  expect(state.pendingBattle).toMatchObject({ at, groupId: 'shrineWatch' });
  return win(state, r);
}

/** Lets whoever is speaking finish. */
function hush(state: RunState): void {
  state.story.dialogues = [];
}

/** Both shrines out, the gate open, and the hydra at the walls with the castle's panel open. */
function atTheWalls(r: RunRules = castleRules): RunState {
  const state = upThere();
  for (const h of SHRINES) putOut(state, h, r);
  hush(state);
  state.hydra.movementLeft = 5;
  inspect(state, CASTLE, r);
  expect(castlePanelOpen(state)).toBe(true);
  return state;
}

describe('the castle gate', () => {
  it('is shut while Flame Shrines burn, and opens once enough of them are out at the same time', () => {
    const state = upThere();
    expect(castleOpen(state)).toBe(false);
    const first = putOut(state, SHRINES[0]!);
    expect(castleOpen(state)).toBe(false);
    expect(first.some((e) => e.type === 'castleOpened')).toBe(false);
    const second = putOut(state, SHRINES[1]!);
    // The surface has 2 shrines here, fewer than castle.json asks for: then all of them are enough.
    expect(rules.castle.gate.shrinesOut).toBeGreaterThan(SHRINES.length);
    expect(castleOpen(state)).toBe(true);
    expect(second).toContainEqual({ type: 'castleOpened' });
  });

  it('stays open when a shrine is lit again; without staysOpen, it shuts until enough are out again', () => {
    const party = { id: 'o90', kind: 'relight' as const, layer: 'surface' as const, at: SHRINES[0]!, groupId: 'relightDetail', tier: 1, goal: SHRINES[0]!, chase: 0, trail: null };
    const state = upThere();
    for (const h of SHRINES) putOut(state, h);
    const events: RunEvent[] = [];
    relightShrine(state, SHRINES[0]!, party, castleRules, events);
    expect(castleOpen(state)).toBe(true);
    expect(events.some((e) => e.type === 'castleShut')).toBe(false);

    const shutting: RunRules = { ...castleRules, castle: { ...castleRules.castle, gate: { ...castleRules.castle.gate, staysOpen: false } } };
    const other = upThere();
    for (const h of SHRINES) putOut(other, h, shutting);
    const relit: RunEvent[] = [];
    relightShrine(other, SHRINES[0]!, party, shutting, relit);
    expect(castleOpen(other)).toBe(false);
    expect(relit).toContainEqual({ type: 'castleShut' });
  });
});

describe('the assault', () => {
  it('a tap on the castle from afar walks her up to the walls and opens its panel; shut, it can\'t be stormed', () => {
    const state = upThere();
    state.hydra.position = hex(-3, 0);
    state.surface.map.tiles.get(hexKey(SHRINES[0]!))!.object = null;
    state.surface.map.tiles.get(hexKey(SHRINES[1]!))!.object = { kind: 'flameShrine', burning: true, groupId: 'shrineWatch', tier: 1 };
    state.surface.map = { ...state.surface.map, shrines: [SHRINES[1]!] };
    // The shrine is in the way at (-4, 0): she goes round it.
    const events = inspect(state, CASTLE, castleRules);
    expect(hexDistance(state.hydra.position, CASTLE)).toBe(1);
    expect(events).toContainEqual({ type: 'castleReached', at: CASTLE, open: false });
    expect(castlePanelOpen(state)).toBe(true);
    expect(canStormCastle(state, castleRules)).toEqual({ can: false, why: 'shut' });
    expect(stormCastle(state, castleRules)).toEqual([]);
    expect(state.pendingBattle).toBeNull();
    // The castle's panel needs no answer: the turn can end with it open.
    expect(endTurn(state, castleRules).length).toBeGreaterThan(0);
    expect(state.pendingPlace).toBeNull();
  });

  it('is fought part by part; the Eternal Flame burns only in the last; a part won stays won and the panel opens again', () => {
    const state = atTheWalls();
    const parts = castleRules.castle.parts;
    for (let i = 0; i < parts.length - 1; i++) {
      expect(canStormCastle(state, castleRules)).toEqual({ can: true });
      stormCastle(state, castleRules);
      expect(state.pendingBattle).toMatchObject({ at: CASTLE, layer: 'surface', groupId: parts[i]!.groupId, castlePart: i });
      expect(pendingBattleSetup(state, castleRules)!.eternalFlame).toBe(false);
      const events = win(state);
      expect(events).toContainEqual({ type: 'castlePartWon', partId: parts[i]!.id, nextPartId: parts[i + 1]!.id });
      expect(state.surface.castle.partsWon).toBe(i + 1);
      expect(castlePanelOpen(state)).toBe(true);
      expect(state.won).toBe(false);
      hush(state);
    }

    // Falling back: the parts won stay won.
    endTurn(state, castleRules);
    expect(castlePanelOpen(state)).toBe(false);
    expect(state.surface.castle.partsWon).toBe(parts.length - 1);
    state.hydra.movementLeft = 5;
    inspect(state, CASTLE, castleRules);
    stormCastle(state, castleRules);
    expect(state.pendingBattle).toMatchObject({ groupId: parts[parts.length - 1]!.groupId, castlePart: parts.length - 1 });
    expect(pendingBattleSetup(state, castleRules)!.eternalFlame).toBe(true);
  });

  it('winning the last part puts out the Eternal Flame: the run is won, and the world remembers it', () => {
    const state = atTheWalls();
    for (let i = 0; i < castleRules.castle.parts.length; i++) {
      stormCastle(state, castleRules);
      const events = win(state);
      hush(state);
      if (i === castleRules.castle.parts.length - 1) {
        expect(events).toContainEqual({ type: 'castlePartWon', partId: castleRules.castle.parts[i]!.id, nextPartId: null });
        expect(events).toContainEqual({ type: 'eternalFlameOut', at: CASTLE });
      }
    }
    expect(state.won).toBe(true);
    expect(state.over).toBe(false);
    for (const flag of castleRules.castle.victoryFlags) expect(state.story.flags).toContain(flag);
    expect(castlePanelOpen(state)).toBe(false);
    expect(canStormCastle(state, castleRules)).toEqual({ can: false, why: 'taken' });
    // Nothing more happens in a won run.
    expect(endTurn(state, castleRules)).toEqual([]);
    expect(moveHydra(state, hex(-4, 1), castleRules)).toEqual([]);
  });

  it('a part lost is death, like any battle lost', () => {
    const state = atTheWalls();
    stormCastle(state, castleRules);
    const setup = pendingBattleSetup(state, castleRules)!;
    const events = finishBattle(state, { outcome: 'lost', bodyHp: 0, heads: [], newScars: 0, nextId: state.nextId }, castleRules);
    expect(events).toContainEqual({ type: 'hydraDied' });
    expect(state.over).toBe(true);
    expect(state.deathCause?.groupId).toBe(castleRules.castle.parts[0]!.groupId);
    expect(setup.enemies).toEqual(rules.encounterGroupMembers[castleRules.castle.parts[0]!.groupId]);
  });

  it('the castle (its gate, the parts won) survives a save', () => {
    const state = atTheWalls();
    stormCastle(state, castleRules);
    win(state);
    const loaded = readRun(writeRun({ lineage: 1, generation: 1, state }))!;
    expect(loaded).not.toBeNull();
    expect(loaded.state.surface.castle).toEqual({ opened: true, partsWon: 1 });
    expect(loaded.state.won).toBe(false);
  });
});
