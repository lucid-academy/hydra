// The surface (GAME_DESIGN.md §5.6, §5.7; M4): its generator on a thousand worlds, the Passages, mist and how it
// fades, Exhale Mist, mist breathed ahead, being Exposed, the Flame Shrines put out and lit again, night.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { readRun, writeRun } from '../src/save/format';
import { hex, hexDistance, hexKey, hexNeighbors, hexesInRange } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { CAMP, generateSurface, generateSurfaceWithReport, generateUnderground } from '../src/sim/map';
import type { HexMap, MapObject, SurfaceMap, Tile } from '../src/sim/map';
import {
  canExhale,
  createRun,
  endTurn,
  exhaleMist,
  exhaleRadius,
  finishBattle,
  hasMist,
  isNight,
  moveHydra,
  pendingBattleSetup,
  reachableHexes,
  sightNow,
  surfaceTurn,
  usePassage,
} from '../src/sim/turn';
import type { RunEvent, RunState } from '../src/sim/turn';
import { flatMap, runOn, testRules } from './runHelpers';

const data = loadGameData();
const rules = runRulesFrom(data);
const gen = rules.surface.generator;
const UNDERGROUNDS = 20;
const SURFACES_EACH = 50;

/** The Passages of an underground, the one nearest the lair first (as a run hands them to the surface). */
function passagesOf(map: HexMap): Hex[] {
  return [...map.tiles.values()]
    .filter((t) => t.object?.kind === 'passage')
    .sort((a, b) => a.ring - b.ring || hexDistance(a.hex, map.lair) - hexDistance(b.hex, map.lair))
    .map((t) => t.hex);
}

function objectsOf<K extends MapObject['kind']>(map: SurfaceMap, kind: K): Array<{ hex: Hex; object: Extract<MapObject, { kind: K }> }> {
  return [...map.tiles.values()].flatMap((t) => (t.object?.kind === kind ? [{ hex: t.hex, object: t.object as Extract<MapObject, { kind: K }> }] : []));
}

/** Steps from `from` over hexes anyone can walk (the Order goes round crags), or -1 where it can't get. */
function stepsOver(map: SurfaceMap, from: Hex): Map<string, number> {
  const steps = new Map<string, number>([[hexKey(from), 0]]);
  const queue = [from];
  for (let head = 0; head < queue.length; head++) {
    const at = queue[head]!;
    for (const n of hexNeighbors(at)) {
      const tile = map.tiles.get(hexKey(n));
      if (!tile || steps.has(hexKey(n)) || rules.terrain[tile.terrain].moveCost === null) continue;
      steps.set(hexKey(n), steps.get(hexKey(at))! + 1);
      queue.push(n);
    }
  }
  return steps;
}

describe('the surface generator', () => {
  const undergrounds = Array.from({ length: UNDERGROUNDS }, (_, u) => generateUnderground(u + 1, rules.generator, rules.terrain));

  it(`keeps its rules on ${UNDERGROUNDS * SURFACES_EACH} worlds`, { timeout: 120_000 }, () => {
    let rejected = 0;
    undergrounds.forEach((underground, u) => {
      const passages = passagesOf(underground);
      for (let k = 0; k < SURFACES_EACH; k++) {
        const seed = u * SURFACES_EACH + k + 1;
        const report = generateSurfaceWithReport(seed, gen, rules.terrain, passages);
        rejected += report.rejected.length;
        const map = report.map;
        expect(map.tiles.size).toBe(underground.tiles.size);
        // Every Passage comes out on its own hex, and nothing else stands there.
        expect(map.passages).toEqual(passages);
        for (const p of passages) expect(map.tiles.get(hexKey(p))!.object).toEqual({ kind: 'passage' });
        // The castle on its hill, on the far side from the first Passage.
        const castle = map.tiles.get(hexKey(map.castle))!;
        expect(castle.object).toEqual({ kind: 'castle' });
        expect(castle.terrain).toBe('hill');
        expect(hexDistance(map.castle, passages[0]!)).toBeGreaterThan(gen.radius);
        // Flame Shrines: how many, how far apart, from the Passages and the castle, and their tiers.
        const shrines = objectsOf(map, 'flameShrine');
        expect(shrines).toHaveLength(gen.flameShrines.count);
        expect(map.shrines.map(hexKey).sort()).toEqual(shrines.map((s) => hexKey(s.hex)).sort());
        for (const [i, a] of shrines.entries()) {
          for (const b of shrines.slice(i + 1)) expect(hexDistance(a.hex, b.hex)).toBeGreaterThanOrEqual(gen.flameShrines.minApart);
          for (const p of passages) expect(hexDistance(a.hex, p)).toBeGreaterThanOrEqual(gen.flameShrines.minFromPassage);
          const fromCastle = hexDistance(a.hex, map.castle);
          expect(fromCastle).toBeGreaterThanOrEqual(gen.flameShrines.minFromCastle);
          expect(a.object.tier).toBe(1 + gen.flameShrines.tierByCastleDistance.filter((d) => fromCastle <= d).length);
          expect(gen.flameShrines.groupsByTier[a.object.tier]!.map((g) => g.id)).toContain(a.object.groupId);
          expect(a.object.burning).toBe(true);
        }
        // Camps, settlements, finds (a unique one at most once) and event sites.
        const settlements = objectsOf(map, 'settlement');
        expect(settlements.filter((s) => s.object.settlementId === CAMP)).toHaveLength(gen.camps.count);
        expect(map.camps.map(hexKey).sort()).toEqual(settlements.filter((s) => s.object.settlementId === CAMP).map((s) => hexKey(s.hex)).sort());
        for (const s of gen.settlements) expect(settlements.filter((t) => t.object.settlementId === s.id)).toHaveLength(s.count);
        const finds = objectsOf(map, 'find');
        expect(finds).toHaveLength(gen.finds.count);
        for (const f of gen.finds.pool.filter((p) => p.unique)) expect(finds.filter((t) => t.object.findId === f.id).length).toBeLessThanOrEqual(1);
        expect(objectsOf(map, 'event')).toHaveLength(gen.eventSites);
        // Everything can be walked to from the first Passage; nothing stands on rock or in the river.
        const steps = stepsOver(map, passages[0]!);
        for (const tile of map.tiles.values()) {
          if (!tile.object) continue;
          expect(steps.has(hexKey(tile.hex)), `${tile.object.kind} at ${hexKey(tile.hex)} (seed ${seed})`).toBe(true);
          expect(tile.terrain).not.toBe('rock');
          if (tile.object.kind !== 'passage') expect(tile.terrain).not.toBe('water');
        }
        // There is a river.
        expect([...map.tiles.values()].filter((t) => t.terrain === 'water').length).toBeGreaterThan(gen.radius);
      }
    });
    // Most attempts work the first time (if this fails, the settings ask too much of the map).
    expect(rejected / (UNDERGROUNDS * SURFACES_EACH)).toBeLessThan(1);
  });

  it('makes the same surface from the same seed', () => {
    const passages = passagesOf(undergrounds[0]!);
    const a = generateSurface(7, gen, rules.terrain, passages);
    const b = generateSurface(7, gen, rules.terrain, passages);
    expect([...a.tiles.values()]).toEqual([...b.tiles.values()]);
    expect([...generateSurface(8, gen, rules.terrain, passages).tiles.values()]).not.toEqual([...a.tiles.values()]);
  });
});

// ---------------------------------------------------------------- a hand-made surface

const PASSAGE = hex(0, 0);

/** An all-field surface of radius 6 with a Passage in the middle, the castle at (-6, 0) and a camp at (6, -6). */
function fieldSurface(edit: (tiles: Map<string, Tile>) => void = () => {}): SurfaceMap {
  const tiles = new Map<string, Tile>();
  for (const h of hexesInRange(hex(0, 0), 6)) tiles.set(hexKey(h), { hex: h, biome: 'surface', ring: 0, region: 'surface', terrain: 'field', object: null });
  tiles.get(hexKey(PASSAGE))!.object = { kind: 'passage' };
  tiles.get('-6,0')!.object = { kind: 'castle' };
  tiles.get('6,-6')!.object = { kind: 'settlement', settlementId: CAMP };
  edit(tiles);
  const shrines = [...tiles.values()].filter((t) => t.object?.kind === 'flameShrine').map((t) => t.hex);
  return { radius: 6, tiles, castle: hex(-6, 0), passages: [PASSAGE], camps: [hex(6, -6)], shrines };
}

/** A run whose hydra stands on the surface, on the Passage, knowing the whole surface; no mist but on the Passage. */
function upThere(surface = fieldSurface(), movement = 5): RunState {
  const state = runOn(flatMap(6, (tiles) => (tiles.get(hexKey(PASSAGE))!.object = { kind: 'passage' })), movement);
  state.order.nextPatrolTurn = 999;
  state.hydra.position = hex(0, 0);
  state.hydra.layer = 'surface';
  state.surface = { ...state.surface, map: surface, visibility: new Map(), mist: {}, lastingMist: { [hexKey(PASSAGE)]: 'passage' }, exposed: false, windy: false, relights: {}, nextPatrolTurn: 999 };
  for (const key of surface.tiles.keys()) state.surface.visibility.set(key, 'remembered');
  state.resources = { muck: 0, moisture: 20, bones: 0 };
  return state;
}

const surfaceRules = { ...testRules, surface: rules.surface };

describe('Passages', () => {
  it('a new run has mist round every Passage, and for good on the Passage itself', () => {
    const state = createRun(3, rules);
    for (const p of state.surface.map.passages) {
      expect(state.surface.lastingMist[hexKey(p)]).toBe('passage');
      for (const h of hexesInRange(p, rules.surface.mist.start.radius)) if (state.surface.map.tiles.has(hexKey(h))) expect(hasMist(state, h)).toBe(true);
    }
    expect(state.hydra.layer).toBe('underground');
    expect(state.surface.nextPatrolTurn).toBeNull();
  });

  it('take her up onto the same hex of the surface, in mist, and down again', () => {
    const state = upThere();
    state.hydra.layer = 'underground';
    state.surface.nextPatrolTurn = null;
    state.pendingPlace = PASSAGE;
    const events = usePassage(state, surfaceRules);
    expect(events[0]).toEqual({ type: 'climbed', layer: 'surface', at: PASSAGE });
    expect(state.hydra.layer).toBe('surface');
    expect(state.hydra.position).toEqual(PASSAGE);
    expect(state.hydra.movementLeft).toBe(5 - rules.surface.passageMovement);
    expect(hasMist(state, PASSAGE)).toBe(true);
    // The Order up there stirs once she has been seen.
    expect(state.surface.nextPatrolTurn).toBe(state.turn + rules.surface.order.patrols.firstOnTurn);
    // What she saw down there she only remembers now.
    expect([...state.visibility.values()].every((v) => v === 'remembered')).toBe(true);
    usePassage(state, surfaceRules);
    expect(state.hydra.layer).toBe('underground');
  });

  it('a hydra not on a Passage can\'t use one', () => {
    const state = upThere();
    state.hydra.position = hex(1, 0);
    expect(usePassage(state, surfaceRules)).toEqual([]);
    expect(state.hydra.layer).toBe('surface');
  });
});

describe('mist', () => {
  it('fades a turn of daylight a world turn by day, half by night, faster in the wind and over water', () => {
    const state = upThere(fieldSurface((tiles) => (tiles.get('3,0')!.terrain = 'water')));
    state.surface.mist = { '2,0': 4, '3,0': 4 };
    state.turn = 1;
    surfaceTurn(state, surfaceRules, []);
    expect(state.surface.mist['2,0']).toBe(3);
    expect(state.surface.mist['3,0']).toBe(3.5);
    state.turn = rules.surface.dayNight.dayTurns + 1;
    expect(isNight(state.turn, surfaceRules)).toBe(true);
    surfaceTurn(state, surfaceRules, []);
    expect(state.surface.mist['2,0']).toBe(2.5);
    state.surface.windy = false;
    state.turn = 2;
    state.surface.windy = true;
    surfaceTurn(state, surfaceRules, []);
    expect(state.surface.mist['2,0']).toBe(0.5);
    surfaceTurn(state, surfaceRules, []);
    expect(state.surface.mist['2,0']).toBeUndefined();
    // The Passage's own mist never fades.
    expect(hasMist(state, PASSAGE)).toBe(true);
  });

  it('dawn may bring a windy day, and the night calms it; underground nobody notices', () => {
    const state = upThere();
    const events: RunEvent[] = [];
    const { dayTurns, nightTurns } = rules.surface.dayNight;
    state.turn = dayTurns + 1;
    surfaceTurn(state, surfaceRules, events);
    expect(events).toContainEqual({ type: 'nightFalls' });
    state.turn = dayTurns + nightTurns + 1;
    surfaceTurn(state, surfaceRules, events);
    expect(events.some((e) => e.type === 'dayBreaks')).toBe(true);
    state.hydra.layer = 'underground';
    const below: RunEvent[] = [];
    state.turn = dayTurns + 1;
    surfaceTurn(state, surfaceRules, below);
    expect(below).toEqual([]);
  });

  it('Exhale Mist covers her and the hexes round her, farther with a Mist Breather, for Moisture', () => {
    const state = upThere();
    state.hydra.position = hex(3, 0);
    expect(state.hydra.heads.some((h) => h.classId === 'mistBreather')).toBe(true);
    const radius = exhaleRadius(state, surfaceRules);
    expect(radius).toBe(rules.surface.mist.exhale.radiusByClass.mistBreather);
    const events = exhaleMist(state, surfaceRules);
    expect(events[0]?.type).toBe('mistExhaled');
    expect(state.resources.moisture).toBe(20 - rules.surface.mist.exhale.moisture);
    for (const h of hexesInRange(hex(3, 0), radius)) expect(state.surface.mist[hexKey(h)]).toBe(rules.surface.mist.exhale.turns);
    // Without its Mist Breather, the breath is shorter.
    for (const h of state.hydra.heads) if (h.classId === 'mistBreather') h.hp = 0;
    expect(exhaleRadius(state, surfaceRules)).toBe(rules.surface.mist.exhale.radius);
    state.resources.moisture = 0;
    expect(canExhale(state, surfaceRules)).toEqual({ can: false, why: 'moisture' });
    state.hydra.layer = 'underground';
    expect(canExhale(state, surfaceRules)).toEqual({ can: false, why: 'notOnSurface' });
  });

  it('she breathes mist ahead of her as she walks off it, for Moisture each bare hex', () => {
    const state = upThere();
    const ahead = rules.surface.mist.breatheAhead!;
    const route = reachableHexes(state, surfaceRules).get('3,0')!;
    expect(route.cost).toBe(3);
    expect(route.moisture).toBe(3 * ahead.moisture);
    const events = moveHydra(state, hex(3, 0), surfaceRules);
    expect(state.hydra.position).toEqual(hex(3, 0));
    expect(state.resources.moisture).toBe(20 - 3 * ahead.moisture);
    expect(events).toContainEqual({ type: 'mistBreathed', hexes: [hex(1, 0), hex(2, 0), hex(3, 0)], moisture: 3 * ahead.moisture });
    for (const k of ['1,0', '2,0', '3,0']) expect(state.surface.mist[k]).toBe(ahead.turns);
    // With too little Moisture she gets only as far as it lasts.
    state.resources.moisture = ahead.moisture;
    state.hydra.movementLeft = 5;
    const reach = reachableHexes(state, surfaceRules);
    expect(reach.has('5,0')).toBe(false);
    expect(reach.has('4,0')).toBe(true);
  });
});

describe('being Exposed', () => {
  it('without mist at the end of the turn she loses body HP, the Order hears, and she doesn\'t heal', () => {
    const state = upThere();
    state.hydra.position = hex(3, 0);
    state.hydra.bodyHp = 100;
    const alert = state.alert;
    const events = endTurn(state, surfaceRules);
    const { exposed } = rules.surface;
    expect(events).toContainEqual({ type: 'exposed', bodyHp: exposed.bodyHp, alert: exposed.alert });
    expect(state.hydra.bodyHp).toBe(100 - exposed.bodyHp);
    expect(state.alert).toBeCloseTo(alert + exposed.alert);
    expect(state.surface.exposed).toBe(true);
    // In battle her heads hit softer.
    state.pendingBattle = { at: hex(4, 0), layer: 'surface', groupId: 'fieldPatrol' };
    expect(pendingBattleSetup(state, surfaceRules)?.surface).toEqual({ inMist: false, damagePercent: exposed.battleDamagePercent });
  });

  it('never kills her', () => {
    const state = upThere();
    state.hydra.position = hex(3, 0);
    state.hydra.bodyHp = 5;
    endTurn(state, surfaceRules);
    expect(state.hydra.bodyHp).toBe(1);
    expect(state.over).toBe(false);
  });

  it('a Smoke-cured hide loses less', () => {
    const state = upThere();
    state.hydra.position = hex(3, 0);
    state.hydra.bodyHp = 100;
    state.hydra.mutations = ['smokeCured'];
    endTurn(state, surfaceRules);
    expect(state.hydra.bodyHp).toBe(100 - Math.round(rules.surface.exposed.bodyHp * 0.5));
  });

  it('with no Moisture, an Exposed hydra can only crawl one step a turn', () => {
    const state = upThere();
    state.hydra.position = hex(3, 0);
    state.resources.moisture = 0;
    const reach = reachableHexes(state, surfaceRules);
    expect([...reach.keys()].sort()).toEqual(hexNeighbors(hex(3, 0)).map(hexKey).sort());
    moveHydra(state, hex(4, 0), surfaceRules);
    expect(state.hydra.movementLeft).toBe(0);
  });

  it('in mist again, she is covered', () => {
    const state = upThere();
    state.hydra.position = hex(1, 0);
    state.surface.exposed = true;
    const events = moveHydra(state, PASSAGE, surfaceRules);
    expect(events).toContainEqual({ type: 'covered' });
    expect(state.surface.exposed).toBe(false);
  });
});

describe('night', () => {
  it('shortens sight on the surface, not below', () => {
    const state = upThere();
    state.turn = rules.surface.dayNight.dayTurns + 1;
    expect(sightNow(state, surfaceRules)).toBe(state.hydra.sightRange - rules.surface.dayNight.nightSight);
    state.hydra.layer = 'underground';
    expect(sightNow(state, surfaceRules)).toBe(state.hydra.sightRange);
  });
});

describe('Flame Shrines', () => {
  const shrineAt = hex(3, 0);
  const withShrine = () => fieldSurface((tiles) => (tiles.get(hexKey(shrineAt))!.object = { kind: 'flameShrine', burning: true, groupId: 'shrineWatch', tier: 1 }));

  function putOut(state: RunState): RunEvent[] {
    moveHydra(state, shrineAt, surfaceRules);
    expect(state.pendingBattle).toEqual({ at: shrineAt, layer: 'surface', groupId: 'shrineWatch' });
    const setup = pendingBattleSetup(state, surfaceRules)!;
    return finishBattle(state, { outcome: 'won', bodyHp: state.hydra.bodyHp, heads: [...setup.heads], newScars: 0, nextId: state.nextId }, surfaceRules);
  }

  it('walking onto a burning one is a battle with its guard; won, it goes out and leaves mist for good', () => {
    const state = upThere(withShrine());
    state.alert = 40;
    const events = putOut(state);
    const object = state.surface.map.tiles.get(hexKey(shrineAt))!.object;
    expect(object).toMatchObject({ kind: 'flameShrine', burning: false });
    expect(events).toContainEqual({ type: 'shrineOut', at: shrineAt, alert: rules.surface.flameShrines.alertWhenPutOut, left: 0 });
    for (const h of hexesInRange(shrineAt, rules.surface.flameShrines.lastingMistRadius)) expect(state.surface.lastingMist[hexKey(h)]).toBe(hexKey(shrineAt));
    expect(state.surface.relights[hexKey(shrineAt)]).toBe(state.turn + rules.surface.flameShrines.relight.afterTurns);
    // The first flame she puts out leaves a mark on her.
    expect(state.hydra.mutations.some((m) => rules.surface.flameShrines.mutations.includes(m))).toBe(true);
    // Mist that never fades: she can end turns here.
    endTurn(state, surfaceRules);
    expect(state.surface.exposed).toBe(false);
  });

  it('Torchbearers come to light it again; then its mist fades like any other', () => {
    const state = upThere(withShrine());
    putOut(state);
    state.hydra.position = PASSAGE;
    state.pendingBattle = null;
    let sent = false;
    let relit = false;
    for (let turn = 0; turn < 30 && !relit; turn++) {
      const events = endTurn(state, surfaceRules);
      sent ||= events.some((e) => e.type === 'relightSent');
      relit = events.some((e) => e.type === 'shrineRelit');
      state.pendingBattle = null;
    }
    expect(sent).toBe(true);
    expect(relit).toBe(true);
    expect(state.surface.map.tiles.get(hexKey(shrineAt))!.object).toMatchObject({ kind: 'flameShrine', burning: true, groupId: rules.surface.flameShrines.relight.groupId });
    expect(Object.values(state.surface.lastingMist)).not.toContain(hexKey(shrineAt));
    expect(state.order.units.some((u) => u.kind === 'relight')).toBe(false);
  });
});

describe('the Order on the surface', () => {
  it('a Censer Priest\'s smoke clears the mist round him as he walks', () => {
    const state = upThere();
    state.hydra.position = PASSAGE;
    for (const h of hexesInRange(hex(-3, 0), 2)) state.surface.mist[hexKey(h)] = 5;
    state.order.units.push({ id: 'o90', kind: 'patrol', layer: 'surface', at: hex(-3, 0), groupId: 'censerWalk', tier: 1, goal: hex(-3, 0), chase: 0, trail: null });
    endTurn(state, surfaceRules);
    const unit = state.order.units.find((u) => u.id === 'o90')!;
    for (const h of hexesInRange(unit.at, rules.surface.mist.censerClears)) {
      if (state.surface.lastingMist[hexKey(h)] === undefined) expect(state.surface.mist[hexKey(h)]).toBeUndefined();
    }
  });

  it('patrols set out from the castle and the camps, once she has been up', () => {
    const state = upThere();
    state.surface.nextPatrolTurn = state.turn;
    const events = endTurn(state, surfaceRules);
    const arrived = events.find((e) => e.type === 'orderArrived');
    expect(arrived).toBeDefined();
    const unit = state.order.units.find((u) => u.layer === 'surface')!;
    expect(rules.surface.order.patrols.groups.map((g) => g.groupId)).toContain(unit.groupId);
  });
});

describe('the save', () => {
  it('keeps the surface', () => {
    const state = createRun(5, rules);
    state.surface.mist['1,1'] = 2;
    const read = readRun(writeRun({ lineage: 1, generation: 1, state }))!;
    expect(read.state.surface.map.tiles).toEqual(state.surface.map.tiles);
    expect(read.state.surface.mist).toEqual(state.surface.mist);
    expect(read.state.surface.visibility).toBeInstanceOf(Map);
  });
});
