// The Order of the Eternal Flame in the world turn (GAME_DESIGN.md §5.5, §8): it hears how alarmed it should be (the
// Alert stages) and acts on it after End Turn.

import { Rng } from '../rng';
import type { OrderState, RunEvent, RunRules, RunState } from './types';
import { raiseAlert } from './world';

export function newOrder(seed: number): OrderState {
  // Its own stream of random numbers, so what the Order does never changes the map or the hydra's luck.
  return { act: 1, stagesReached: [], rngState: new Rng((seed ^ 0x0de7) >>> 0).getState() };
}

/** Whether the Order has reached this Alert stage in this act (in act 2 and later, every stage counts as reached). */
export function stageReached(state: RunState, stageId: string): boolean {
  return state.order.act > 1 || state.order.stagesReached.includes(stageId);
}

/** Stages the Alert has passed that the Order hasn't heard of yet: it hears of them now, lowest first. */
function hearAlert(state: RunState, rules: RunRules, events: RunEvent[]): void {
  for (const stage of rules.order.stages) {
    if (state.alert < stage.at || state.order.stagesReached.includes(stage.id)) continue;
    state.order.stagesReached.push(stage.id);
    events.push({ type: 'alertStage', stageId: stage.id });
  }
}

/** The Order's part of the world turn, after End Turn. */
export function orderTurn(state: RunState, rules: RunRules, events: RunEvent[]): void {
  if (rules.order.alertPerTurn > 0) raiseAlert(state, rules.order.alertPerTurn, rules);
  hearAlert(state, rules, events);
}
