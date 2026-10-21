// How a mutation is told on screen: its name, its words, and what it changes (good for the hydra or not).

import type { GameData } from '../data';
import type { MUTATION_EFFECTS } from '../data/schemas';

type Effect = (typeof MUTATION_EFFECTS)[number];

export interface MutationEffectText {
  text: string;
  /** Good for the hydra (shown in green), or the catch (in orange). */
  good: boolean;
}

/** What a mutation changes, one item per effect: "Head HP +20%", "Moves −1". */
export function mutationEffects(data: GameData, mutationId: string): MutationEffectText[] {
  const mutation = data.mutations.mutations.find((m) => m.id === mutationId);
  if (!mutation) return [];
  return (Object.entries(mutation.effects) as Array<[Effect, number]>).map(([effect, n]) => ({
    text: data.text.lineages.effects[effect].replace('{n}', n > 0 ? `+${n}` : String(n)),
    // The Alert rising slower is the good kind.
    good: effect === 'alertPercent' ? n < 0 : n > 0,
  }));
}

export function mutationName(data: GameData, mutationId: string): string {
  return data.mutations.mutations.find((m) => m.id === mutationId)?.name ?? mutationId;
}

export function mutationWords(data: GameData, mutationId: string): string {
  return data.mutations.mutations.find((m) => m.id === mutationId)?.text ?? '';
}

/** "{name}" and the like in a text from text.json, filled in. */
export function fillText(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
}
