// The Order of the Eternal Flame on the map (GAME_DESIGN.md §5.5, §8): Alert stages, patrols, messengers, expeditions.

import { describe, expect, it } from 'vitest';
import { checkCrossReferences, loadGameData } from '../src/data';
import { hex, hexDistance, hexKey } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { emptyLayout } from '../src/sim/map';
import type { HexMap } from '../src/sim/map';
import { createRun, endTurn, finishBattle, moveHydra, orderTurn, pendingBattleSetup, reachableHexes, stageReached } from '../src/sim/turn';
import type { OrderUnit, RunEvent, RunState } from '../src/sim/turn';
import { flatMap, rules, runOn } from './runHelpers';

const stageEvents = (events: RunEvent[]) => events.flatMap((e) => (e.type === 'alertStage' ? [e.stageId] : []));

/** A flat map with a Passage at (7, 0) and two chambers to walk between. */
function orderMap(): HexMap {
  const map = flatMap(8, (tiles) => {
    tiles.get('7,0')!.object = { kind: 'passage' };
  });
  return { ...map, layout: { ...emptyLayout(), chambers: [chamber([hex(-6, 3), hex(-6, 4)]), chamber([hex(6, -6), hex(5, -6)])] } };
}

function chamber(hexes: Hex[]) {
  return { ring: 1, biome: 'lairSwamp', patch: false, hexes, exits: 2 };
}

/** Puts one of the Order's units on the map by hand. */
function place(state: RunState, kind: OrderUnit['kind'], at: Hex, groupId = 'patrol'): OrderUnit {
  const unit: OrderUnit = { id: `o${state.order.nextUnitId++}`, kind, at, groupId: kind === 'messenger' ? '' : groupId, tier: 1, goal: null, chase: 0, trail: null, layer: 'underground' };
  state.order.units.push(unit);
  return unit;
}

/** A run on the order map where no new patrol comes down unless a test wants one. */
function quietRun(): RunState {
  const state = runOn(orderMap(), 6);
  state.order.nextPatrolTurn = 999;
  return state;
}

const won = (state: RunState) => ({ outcome: 'won' as const, bodyHp: state.hydra.bodyHp, heads: [...pendingBattleSetup(state, rules)!.heads], newScars: 0, nextId: state.nextId });

describe('Alert stages', () => {
  it('are heard in the world turn, lowest first, once each', () => {
    const state = runOn(flatMap(4));
    state.alert = 10;
    expect(stageEvents(endTurn(state, rules))).toEqual([]);
    state.alert = 55;
    expect(stageEvents(endTurn(state, rules))).toEqual(['morePatrols', 'expeditions']);
    expect(stageEvents(endTurn(state, rules))).toEqual([]);
    expect(state.order.stagesReached).toEqual(['morePatrols', 'expeditions']);
  });

  it('stay reached when the Alert falls again', () => {
    const state = runOn(flatMap(4));
    state.alert = 30;
    endTurn(state, rules);
    state.alert = 5;
    endTurn(state, rules);
    expect(stageReached(state, 'morePatrols')).toBe(true);
    expect(stageReached(state, 'expeditions')).toBe(false);
  });

  it('are named in order.json by stages that exist, and groups that exist', () => {
    const data = loadGameData();
    const order = structuredClone(data.order);
    order.expeditions.fromStage = 'expedition';
    order.patrols.groups[0]!.group = 'patrolz';
    expect(() => checkCrossReferences({ ...data, order })).toThrow(/order\.json, patrols\.groups\.0\.group: unknown encounter group "patrolz"/);
    expect(() => checkCrossReferences({ ...data, order })).toThrow(/order\.json, expeditions\.fromStage: unknown Alert stage "expedition"/);
  });
});

describe('patrols', () => {
  it('come down a Passage from the turn order.json says, one at a time', () => {
    const state = runOn(orderMap(), 6);
    const arrivals: RunEvent[] = [];
    while (state.turn < rules.order.patrols.firstOnTurn) arrivals.push(...endTurn(state, rules).filter((e) => e.type === 'orderArrived'));
    expect(arrivals).toEqual([{ type: 'orderArrived', unitId: 'o1', kind: 'patrol', at: hex(7, 0), seen: false }]);
    expect(state.order.units).toHaveLength(1);
    // The most the first stage allows is out: no more come down.
    for (let i = 0; i < 12; i++) endTurn(state, rules);
    expect(state.order.units.filter((u) => u.kind === 'patrol')).toHaveLength(rules.order.patrols.maxByStage[0]!);
  });

  it('walk from chamber to chamber while they have not seen the hydra', () => {
    const state = quietRun();
    const unit = place(state, 'patrol', hex(7, 0));
    endTurn(state, rules);
    expect(unit.goal).not.toBeNull();
    expect(hexDistance(unit.at, hex(7, 0))).toBeGreaterThan(0);
    expect(state.pendingBattle).toBeNull();
  });

  it('that see the hydra walk onto her, and that is a battle', () => {
    const state = quietRun();
    const unit = place(state, 'patrol', hex(3, 0));
    const events = endTurn(state, rules);
    expect(unit.at).toEqual(state.hydra.position);
    // She is in her lair: it is the battle for the lair.
    expect(state.pendingBattle).toEqual({ at: state.hydra.position, layer: 'underground', groupId: 'patrol', unitId: unit.id, defense: true });
    expect(events.map((e) => e.type)).toContain('orderAttacked');
    expect(events.at(-2)?.type === 'battleStarted' || events.some((e) => e.type === 'battleStarted')).toBe(true);
  });

  it('follow her to where they saw her last, for a few turns', () => {
    const state = quietRun();
    state.hydra.position = hex(-4, 0);
    const unit = place(state, 'patrol', hex(-4, 4));
    // Out of its sight (4 hexes), then in sight for one world turn, then gone again.
    unit.trail = hex(-4, 1);
    unit.chase = 2;
    endTurn(state, rules);
    expect(unit.chase).toBe(1);
  });

  it('are stops on the hydra\'s way when she sees them, and walking onto one is a battle', () => {
    const state = quietRun();
    const unit = place(state, 'patrol', hex(2, 0));
    expect(reachableHexes(state, rules).get(hexKey(hex(3, 0)))?.path).not.toContainEqual(hex(2, 0));
    moveHydra(state, hex(2, 0), rules);
    expect(state.pendingBattle).toEqual({ at: hex(2, 0), layer: 'underground', groupId: 'patrol', unitId: unit.id });
  });

  it('beaten, are gone, and a messenger runs for the Passage', () => {
    const state = quietRun();
    place(state, 'patrol', hex(2, 0));
    moveHydra(state, hex(2, 0), rules);
    const events = finishBattle(state, won(state), rules);
    expect(state.order.units.map((u) => u.kind)).toEqual(['messenger']);
    const messenger = state.order.units[0]!;
    expect(hexDistance(messenger.at, hex(2, 0))).toBe(rules.order.messengers.headStart);
    expect(hexDistance(messenger.at, hex(7, 0))).toBeLessThan(hexDistance(hex(2, 0), hex(7, 0)));
    expect(events.map((e) => e.type)).toContain('messengerSent');
  });
});

describe('messengers', () => {
  it('who reach the Passage raise the Alert, and are gone', () => {
    const state = quietRun();
    place(state, 'messenger', hex(5, 0));
    state.alert = 10;
    const events = endTurn(state, rules);
    expect(state.order.units).toEqual([]);
    expect(state.alert).toBeCloseTo(10 + rules.order.messengers.alertOnArrival);
    expect(events.find((e) => e.type === 'messengerEscaped')).toMatchObject({ alert: rules.order.messengers.alertOnArrival });
  });

  it('keep clear of the hydra on the way', () => {
    const state = quietRun();
    state.hydra.position = hex(6, 0);
    const unit = place(state, 'messenger', hex(4, 0));
    endTurn(state, rules);
    expect(unit.at).not.toEqual(hex(6, 0));
    expect(state.pendingBattle).toBeNull();
  });

  it('are eaten when the hydra steps on them: Bones, the Alert falls, no battle', () => {
    const state = quietRun();
    place(state, 'messenger', hex(2, 0));
    state.alert = 20;
    const events = moveHydra(state, hex(2, 0), rules);
    expect(state.pendingBattle).toBeNull();
    expect(state.order.units).toEqual([]);
    expect(state.resources.bones).toBe(rules.order.messengers.bones);
    expect(state.alert).toBeLessThan(20);
    expect(events.find((e) => e.type === 'messengerEaten')).toMatchObject({ bones: rules.order.messengers.bones, alert: rules.order.messengers.alertWhenEaten });
  });

  it('are not sent when the Silent Bell drowns the battle out, or when there is no way up', () => {
    const state = runOn(flatMap(6), 6);
    place(state, 'patrol', hex(2, 0));
    moveHydra(state, hex(2, 0), rules);
    finishBattle(state, won(state), rules);
    expect(state.order.units).toEqual([]);
  });
});

describe('sightings', () => {
  it('remember where a unit was last seen, and forget it when the spot is seen empty', () => {
    const state = quietRun();
    const unit = place(state, 'patrol', hex(-2, 0));
    unit.goal = hex(-6, 4);
    moveHydra(state, hex(0, 1), rules);
    expect(state.order.sightings).toMatchObject([{ unitId: unit.id, at: hex(-2, 0) }]);
    // It walks off out of sight: the sighting stays where it was, until that spot is seen empty.
    unit.at = hex(-7, 4);
    state.visibility.set(hexKey(hex(-7, 4)), 'remembered');
    orderTurn(state, rules, []);
    expect(state.order.sightings.map((s) => s.at)).not.toContainEqual(hex(-2, 0));
  });

  it('stay where the unit was while that spot is out of sight', () => {
    const state = quietRun();
    const unit = place(state, 'patrol', hex(-2, 0));
    moveHydra(state, hex(1, 0), rules);
    const seenOn = state.turn;
    moveHydra(state, hex(5, 0), rules);
    unit.at = hex(-5, 0);
    endTurn(state, rules);
    expect(state.order.sightings).toMatchObject([{ unitId: unit.id, at: hex(-2, 0), turn: seenOn }]);
  });
});

describe('the Order on generated worlds', () => {
  it('always has a way down, and its patrols come', () => {
    for (const seed of [1, 7, 123, 2026]) {
      const state = createRun(seed, rules);
      for (let i = 0; i < 12 && !state.pendingBattle; i++) endTurn(state, rules);
      expect(state.order.units.length, `seed ${seed}`).toBeGreaterThan(0);
    }
  });

  it('does the same with the same seed', () => {
    const play = () => {
      const state = createRun(99, rules);
      for (let i = 0; i < 25 && !state.pendingBattle; i++) endTurn(state, rules);
      return JSON.stringify(state.order);
    };
    expect(play()).toEqual(play());
  });
});

describe('expeditions', () => {
  /** A run that has just reached the expeditions stage, the first one due in the next world turn. */
  function expeditionRun(): RunState {
    const state = quietRun();
    state.order.stagesReached = ['morePatrols', 'expeditions'];
    state.order.nextExpeditionTurn = state.turn + 1;
    return state;
  }

  it('set out once the stage is reached, after a few turns, from the Passage', () => {
    const state = quietRun();
    state.alert = 50;
    endTurn(state, rules);
    expect(state.order.nextExpeditionTurn).toBe(state.turn + rules.order.expeditions.firstAfterTurns);
    const events: RunEvent[] = [];
    for (let i = 0; i <= rules.order.expeditions.firstAfterTurns; i++) events.push(...endTurn(state, rules));
    expect(events.find((e) => e.type === 'expeditionSent')).toMatchObject({ kind: 'expedition', at: hex(7, 0) });
    expect(state.order.units.filter((u) => u.kind === 'expedition')).toHaveLength(1);
  });

  it('walk to the lair and camp there while the hydra is away, killing a guard, then breaking eggs', () => {
    const state = expeditionRun();
    state.hydra.position = hex(-6, 6);
    state.lair.defenders = 1;
    state.lair.eggs = [{ id: 'e1', mutations: [], hatching: null }, { id: 'e2', mutations: [], hatching: null }];
    const raids: string[] = [];
    for (let i = 0; i < 8; i++) raids.push(...endTurn(state, rules).flatMap((e) => (e.type === 'lairRaided' ? [e.killed] : [])));
    expect(state.order.units.find((u) => u.kind === 'expedition')?.at).toEqual(state.map.lair);
    expect(raids.slice(0, 3)).toEqual(['defender', 'egg', 'egg']);
    expect(state.lair.eggs).toEqual([]);
  });

  it('in the lair fight the hydra when she comes back, a battle for the lair', () => {
    const state = expeditionRun();
    state.hydra.position = hex(-3, 0);
    const unit = place(state, 'expedition', state.map.lair, 'burningDetail');
    moveHydra(state, state.map.lair, rules);
    expect(state.pendingBattle).toEqual({ at: state.map.lair, layer: 'underground', groupId: 'burningDetail', unitId: unit.id, defense: true });
  });

  it('beaten, are followed by the next one after a while', () => {
    const state = expeditionRun();
    state.order.nextExpeditionTurn = null;
    place(state, 'expedition', hex(2, 0), 'burningDetail');
    moveHydra(state, hex(2, 0), rules);
    finishBattle(state, won(state), rules);
    expect(state.order.nextExpeditionTurn).toBe(state.turn + rules.order.expeditions.everyTurns);
  });

  it('the Broodlings guarding the lair fight in the battle for it; those killed are gone', () => {
    const state = quietRun();
    state.lair.defenders = 3;
    const unit = place(state, 'patrol', hex(1, 0));
    state.pendingBattle = { at: state.map.lair, layer: 'underground', groupId: 'patrol', unitId: unit.id, defense: true };
    expect(pendingBattleSetup(state, rules)?.allies).toBe(3);
    finishBattle(state, { ...won(state), alliesLeft: 1 }, rules);
    expect(state.lair.defenders).toBe(1);
    // Away from the lair they stay at home.
    const away = place(state, 'patrol', hex(3, 0));
    state.pendingBattle = { at: hex(3, 0), layer: 'underground', groupId: 'patrol', unitId: away.id };
    expect(pendingBattleSetup(state, rules)?.allies).toBe(0);
  });

  it('lost, the battle for the lair breaks eggs', () => {
    const state = quietRun();
    state.lair.eggs = [1, 2, 3, 4].map((n) => ({ id: `e${n}`, mutations: [], hatching: null }));
    const unit = place(state, 'patrol', hex(1, 0));
    state.pendingBattle = { at: state.map.lair, layer: 'underground', groupId: 'patrol', unitId: unit.id, defense: true };
    const events = finishBattle(state, { outcome: 'lost', bodyHp: 0, heads: [], newScars: 0, nextId: state.nextId }, rules);
    expect(state.lair.eggs).toHaveLength(4 - Math.ceil(4 * rules.brood.lostDefenseBreaksShare));
    expect(events.map((e) => e.type)).toEqual(['eggsBroken', 'hydraDied']);
  });
});

describe('the Tithe Collector', () => {
  it('who got away takes his share of everything, and the escaped leave no Bones', () => {
    const state = quietRun();
    state.resources = { muck: 55, moisture: 20, bones: 9 };
    state.pendingBattle = { at: hex(2, 0), layer: 'underground', groupId: 'titheVisit' };
    const events = finishBattle(state, { ...won(state), tithesTaken: 1 }, rules);
    const share = (n: number) => Math.floor((n * rules.order.tithePercent) / 100);
    const bones = (rules.encounterGroupMembers.titheVisit!.length - 1) * rules.bonesPerEnemy;
    expect(events).toContainEqual({ type: 'titheTaken', muck: share(55), moisture: share(20), bones: share(9 + bones) });
    expect(state.resources).toEqual({ muck: 55 - share(55), moisture: 20 - share(20), bones: 9 + bones - share(9 + bones) });
  });
});

describe('groups only the Order brings', () => {
  it('never wait on the map, but come with the new enemies stage', () => {
    const orderOnly = loadGameData().enemies.encounterGroups.filter((g) => g.orderOnly).map((g) => g.id);
    expect(orderOnly.length).toBeGreaterThan(0);
    for (let seed = 1; seed <= 10; seed++) {
      const state = createRun(seed, rules);
      for (const tile of state.map.tiles.values()) if (tile.object?.kind === 'encounter') expect(orderOnly).not.toContain(tile.object.groupId);
    }
    const sent = [...rules.order.patrols.groups, ...rules.order.expeditions.groups].filter((g) => orderOnly.includes(g.groupId));
    expect(sent.length).toBeGreaterThan(0);
    for (const g of sent) expect(g.fromStage).toBe('newEnemies');
  });
});

describe('the Great Burning', () => {
  it('sets out once per act at the last stage, and beaten, begins the next act', () => {
    const state = quietRun();
    state.alert = 100;
    endTurn(state, rules);
    const burning = state.order.units.find((u) => u.kind === 'greatBurning');
    expect(burning?.groupId).toBe(rules.order.greatBurning.groupId);
    endTurn(state, rules);
    expect(state.order.units.filter((u) => u.kind === 'greatBurning')).toHaveLength(1);

    burning!.at = hex(1, 0);
    state.hydra.position = hex(2, 0);
    state.pendingBattle = { at: hex(1, 0), layer: 'underground', groupId: burning!.groupId, unitId: burning!.id };
    const events = finishBattle(state, won(state), rules);
    expect(events).toContainEqual({ type: 'actBegins', act: 2 });
    expect(state.order.act).toBe(2);
    expect(state.alert).toBe(rules.alertMin);
    expect(state.order.stagesReached).toEqual([]);
    // The Master is eaten: one of his mutations is hers now.
    const gained = events.find((e) => e.type === 'mutationGained');
    expect(gained && gained.type === 'mutationGained' && rules.order.greatBurning.mutations.includes(gained.id)).toBe(true);
  });

  it('is led by the Master of the Order, a boss', () => {
    expect(rules.encounterGroupMembers[rules.order.greatBurning.groupId]).toContain('masterOfTheOrder');
  });

  it('in act 2 the Order sends every group, and more patrols', () => {
    const state = quietRun();
    state.order.act = 2;
    state.order.nextPatrolTurn = state.turn + 1;
    for (let i = 0; i < 30; i++) {
      endTurn(state, rules);
      state.pendingBattle = null;
      state.order.units = state.order.units.filter((u) => u.kind === 'patrol');
    }
    expect(state.order.units.length).toBe(rules.order.patrols.maxByStage[0]! + rules.order.patrols.actMaxBonus);
  });
});
