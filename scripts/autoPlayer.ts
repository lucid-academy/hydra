// The automatic player of the balance reports (scripts/balance.ts, scripts/runBalance.ts): what it orders in battle.

import { applyCommand, canHeadReach, skillCooldown, skillInSlot } from '../src/sim/battle';
import type { BattleRules, BattleState, Enemy, SkillAim } from '../src/sim/battle';

/** Lower number = kill first: those who burn stumps shut or would run off with the tithe, then the head hunters. */
function priority(enemy: Enemy, r: BattleRules): number {
  const behavior = r.enemyTypes[enemy.typeId]!.behavior;
  return behavior === 'torchbearer' || behavior === 'collector' ? 0 : behavior === 'headhunter' ? 1 : 2;
}

export function giveFocusOrders(state: BattleState, r: BattleRules): void {
  for (const head of state.heads) {
    const inReach = state.enemies.filter((e) => canHeadReach(state, head, e, r));
    inReach.sort((a, b) => priority(a, r) - priority(b, r) || a.hp - b.hp || a.id - b.id);
    const target = inReach[0];
    if (!target) {
      if (head.orderTargetId !== null) applyCommand(state, { type: 'clearOrder', headId: head.id }, r);
    } else if (head.orderTargetId !== target.id) {
      applyCommand(state, { type: 'attack', headId: head.id, enemyId: target.id }, r);
    }
  }
}

/** Every head uses its two skills when they are ready: at the enemy it is ordered at, its most wounded friend or the first open stump. */
export function useSkills(state: BattleState, r: BattleRules): void {
  for (const head of state.heads) {
    if (head.pendingSkill) continue;
    for (const slot of [0, 1]) {
      const skill = skillInSlot(state, head, slot, r);
      if (!skill || skillCooldown(head, skill.id) > 0) continue;
      const target = state.enemies.find((e) => e.id === head.orderTargetId) ?? state.enemies.find((e) => canHeadReach(state, head, e, r));
      const wounded = [...state.heads].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const stump = state.stumps.find((s) => !s.cauterized);
      let aim: SkillAim | null = null;
      if (skill.target === 'enemy' && target) aim = { kind: 'enemy', enemyId: target.id };
      else if (skill.target === 'hex' && target) aim = { kind: 'hex', at: target.hex };
      else if (skill.target === 'head' && wounded && wounded.hp < wounded.maxHp * 0.6) aim = { kind: 'head', headId: wounded.id };
      else if (skill.target === 'stump' && stump) aim = { kind: 'stump', stumpId: stump.id };
      else if (skill.target === 'none' && target) aim = { kind: 'none' };
      if (aim) {
        applyCommand(state, { type: 'useSkill', headId: head.id, slot, aim }, r);
        break;
      }
    }
  }
}
