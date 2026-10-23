// The Order of the Eternal Flame on the map (GAME_DESIGN.md §5.5, §8): Alert stages, patrols, messengers, expeditions.

import { describe, expect, it } from 'vitest';
import { checkCrossReferences, loadGameData } from '../src/data';
import { endTurn, stageReached } from '../src/sim/turn';
import type { RunEvent } from '../src/sim/turn';
import { flatMap, rules, runOn } from './runHelpers';

const stageEvents = (events: RunEvent[]) => events.flatMap((e) => (e.type === 'alertStage' ? [e.stageId] : []));

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

  it('all count as reached from act 2 on', () => {
    const state = runOn(flatMap(4));
    state.order.act = 2;
    expect(stageReached(state, 'newEnemies')).toBe(true);
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
