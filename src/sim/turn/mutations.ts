// Mutations (GAME_DESIGN.md §12): marks on the hydra that her heiresses can inherit. Their numbers are in
// mutations.json; this file applies them to the hydra, at birth or when she gains one in her life.

import { hexesSeenFrom, updateVisibility } from '../map';
import type { Hydra, MutationEffects, RunEvent, RunRules, RunState } from './types';

type Effect = keyof MutationEffects;

/** The sum of one effect over the mutations the hydra carries. */
export function mutationTotal(hydra: Hydra, rules: RunRules, effect: Effect): number {
  return hydra.mutations.reduce((sum, id) => sum + (rules.mutations[id]?.[effect] ?? 0), 0);
}

/** A head's max HP with the hydra's mutations (e.g. Thick-necked: +20%), from its class's. */
export function headMaxHp(hydra: Hydra, rules: RunRules, classMaxHp: number): number {
  return Math.max(1, Math.round(classMaxHp * (1 + mutationTotal(hydra, rules, 'headMaxHpPercent') / 100)));
}

/** How many heads a hydra hatches with: the usual number, changed by the mutations she is born with (at least 1). */
export function startingHeadCount(mutations: readonly string[], rules: RunRules): number {
  const change = mutations.reduce((sum, id) => sum + (rules.mutations[id]?.startingHeads ?? 0), 0);
  return Math.max(1, Math.min(rules.maxHeads, rules.startingHeads.length + change));
}

/**
 * What one mutation changes for good: movement, sight, body HP, regeneration, the heads' max HP. Felt at once (this
 * turn's movement too). Heads she hatches with are counted before she is born (startingHeadCount).
 */
function applyLasting(state: RunState, effects: MutationEffects, rules: RunRules, percentBefore: number): void {
  const { hydra } = state;
  if (effects.movement) {
    const before = hydra.movementPerTurn;
    hydra.movementPerTurn = Math.max(1, hydra.movementPerTurn + effects.movement);
    hydra.movementLeft = Math.max(0, hydra.movementLeft + (hydra.movementPerTurn - before));
  }
  if (effects.sight) {
    hydra.sightRange = Math.max(1, hydra.sightRange + effects.sight);
    // What she sees on the map she is on (the run's own state for the underground, its surface for the surface).
    const here = hydra.layer === 'surface' ? state.surface : state;
    updateVisibility(here.visibility, hexesSeenFrom(here.map, hydra.position, hydra.sightRange, rules.terrain));
  }
  if (effects.bodyMaxHp) {
    const before = hydra.bodyMaxHp;
    hydra.bodyMaxHp = Math.max(20, hydra.bodyMaxHp + effects.bodyMaxHp);
    hydra.bodyHp = Math.max(1, Math.min(hydra.bodyMaxHp, hydra.bodyHp + (hydra.bodyMaxHp - before)));
  }
  if (effects.regeneration) hydra.regeneration = Math.max(0, hydra.regeneration + effects.regeneration);
  if (effects.headMaxHpPercent) {
    // Every head grows (or shrinks) by the change in percent, keeping its share of HP.
    const percentAfter = percentBefore + effects.headMaxHpPercent;
    for (const head of hydra.heads) {
      const classMaxHp = head.maxHp / (1 + percentBefore / 100);
      const maxHp = Math.max(1, Math.round(classMaxHp * (1 + percentAfter / 100)));
      head.hp = Math.max(1, Math.min(maxHp, Math.round((head.hp * maxHp) / head.maxHp)));
      head.maxHp = maxHp;
    }
  }
}

/** A hydra is born with her mutations: they change her numbers before the run starts. */
export function applyBirthMutations(state: RunState, mutations: readonly string[], rules: RunRules): void {
  for (const id of mutations) gainMutation(state, id, rules, []);
}

/** The hydra gains a mutation (an event, a marking shrine): it changes her at once, and her heiresses may inherit it. */
export function gainMutation(state: RunState, id: string, rules: RunRules, events: RunEvent[]): void {
  const effects = rules.mutations[id];
  if (!effects) throw new Error(`Unknown mutation "${id}"`);
  if (state.hydra.mutations.includes(id)) return;
  const percentBefore = mutationTotal(state.hydra, rules, 'headMaxHpPercent');
  state.hydra.mutations.push(id);
  applyLasting(state, effects, rules, percentBefore);
  events.push({ type: 'mutationGained', id });
}
