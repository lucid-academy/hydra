// Head experience and levels (GAME_DESIGN.md §6.3): heads that live through a won battle, and those that kill in it,
// gather experience and go up levels. A level gives the head more max HP here and more damage in battle
// (levelDamageMultiplier). The numbers are in heads.json "experience".

import type { HeadExperienceRules } from '../battle';
import type { RunEvent, RunRules, RunState } from './types';

/** The level a head has with this much experience (1 with none). */
export function levelForExperience(xp: number, rules: HeadExperienceRules): number {
  return 1 + rules.experienceForLevel.filter((need) => xp >= need).length;
}

/** Experience the head needs for its next level, or null at the top level. */
export function experienceForNextLevel(level: number, rules: HeadExperienceRules): number | null {
  return rules.experienceForLevel[level - 1] ?? null;
}

/** How many times its level-1 max HP a head has at this level. */
function hpMultiplier(level: number, rules: HeadExperienceRules): number {
  return 1 + ((level - 1) * rules.maxHpPercentPerLevel) / 100;
}

/**
 * After a won battle every head still on the hydra gets experience for the battle and for each human it killed or
 * ate. A head that goes up a level grows: its max HP rises, and its HP by as much.
 */
export function gainExperience(state: RunState, kills: Readonly<Record<string, number>>, rules: RunRules, events: RunEvent[]): void {
  const xpRules = rules.experience;
  for (const head of state.hydra.heads) {
    head.xp = (head.xp ?? 0) + xpRules.perBattleWon + xpRules.perKill * (kills[head.id] ?? 0);
    const level = levelForExperience(head.xp, xpRules);
    if (level <= head.level) continue;
    const maxHp = Math.max(1, Math.round((head.maxHp * hpMultiplier(level, xpRules)) / hpMultiplier(head.level, xpRules)));
    head.hp = Math.max(1, Math.min(maxHp, head.hp + (maxHp - head.maxHp)));
    head.maxHp = maxHp;
    head.level = level;
    events.push({ type: 'headLevelled', headId: head.id, name: head.name, level });
  }
}
