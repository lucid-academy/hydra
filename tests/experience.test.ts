// Head experience and levels (GAME_DESIGN.md §6.3): heads that live through won battles, and those that kill in them,
// go up levels, with more max HP on the map and more damage in battle.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { hex } from '../src/sim/hex';
import { createBattle, battleResult, levelDamageMultiplier, stepBattle } from '../src/sim/battle';
import type { BattleResult, HeadRecord } from '../src/sim/battle';
import { experienceForNextLevel, finishBattle, levelForExperience, pendingBattleSetup } from '../src/sim/turn';
import type { RunState } from '../src/sim/turn';
import { flatMap, rules, runOn } from './runHelpers';

const data = loadGameData();
const battleRules = battleRulesFrom(data);
const xp = rules.experience;

/** A run with a battle waiting at (1, 0). */
function beforeBattle(): RunState {
  const state = runOn(flatMap(4));
  state.order.nextPatrolTurn = 999;
  state.pendingBattle = { at: hex(1, 0), layer: 'underground', groupId: 'patrol' };
  return state;
}

function won(state: RunState, more: Partial<BattleResult> = {}): BattleResult {
  return { outcome: 'won', bodyHp: state.hydra.bodyHp, heads: [...pendingBattleSetup(state, rules)!.heads], newScars: 0, nextId: state.nextId, ...more };
}

describe('levels', () => {
  it('come with the experience in heads.json, up to the top level', () => {
    expect(levelForExperience(0, xp)).toBe(1);
    expect(levelForExperience(xp.experienceForLevel[0]! - 1, xp)).toBe(1);
    expect(levelForExperience(xp.experienceForLevel[0]!, xp)).toBe(2);
    expect(levelForExperience(1_000_000, xp)).toBe(xp.experienceForLevel.length + 1);
    expect(experienceForNextLevel(1, xp)).toBe(xp.experienceForLevel[0]);
    expect(experienceForNextLevel(xp.experienceForLevel.length + 1, xp)).toBeNull();
  });
});

describe('experience after a battle', () => {
  it('every head that lived through a won battle gets some, and a head that killed gets more', () => {
    const state = beforeBattle();
    const [first, second] = state.hydra.heads;
    finishBattle(state, won(state, { kills: { [first!.id]: 2 } }), rules);
    expect(state.hydra.heads[0]!.xp).toBe(xp.perBattleWon + 2 * xp.perKill);
    expect(state.hydra.heads[1]!.xp).toBe(xp.perBattleWon);
    expect(second!.id).toBe(state.hydra.heads[1]!.id);
  });

  it('a head that goes up a level grows: more max HP, and HP by as much', () => {
    const state = beforeBattle();
    const head = state.hydra.heads[0]!;
    head.xp = xp.experienceForLevel[0]! - 1;
    head.hp = head.maxHp - 5;
    const maxHpBefore = head.maxHp;
    const events = finishBattle(state, won(state), rules);
    const after = state.hydra.heads[0]!;
    expect(after.level).toBe(2);
    const maxHp = Math.round(maxHpBefore * (1 + xp.maxHpPercentPerLevel / 100));
    expect(after.maxHp).toBe(maxHp);
    expect(after.hp).toBe(maxHp - 5);
    expect(events).toContainEqual({ type: 'headLevelled', headId: after.id, name: after.name, level: 2 });
    expect(events.filter((e) => e.type === 'headLevelled')).toHaveLength(1);
  });

  it('a lost battle gives none', () => {
    const state = beforeBattle();
    const heads = state.hydra.heads.map((h) => ({ ...h }));
    finishBattle(state, { outcome: 'lost', bodyHp: 0, heads, newScars: 0, nextId: state.nextId }, rules);
    for (const head of state.hydra.heads) expect(head.xp ?? 0).toBe(0);
  });
});

describe('in battle', () => {
  function heads(level: number): HeadRecord[] {
    const maxHp = battleRules.headClasses.biter!.maxHp;
    return [{ id: 'h1', name: 'Gnash', classId: 'biter', level, hp: maxHp, maxHp }];
  }

  it('a head bites harder for its level', () => {
    const s = createBattle({ seed: 1, heads: heads(3), bodyHp: 100, bodyMaxHp: 100, enemies: [], firstFreeId: 10 }, battleRules);
    expect(levelDamageMultiplier(s.heads[0]!, battleRules)).toBeCloseTo(1 + (2 * xp.damagePercentPerLevel) / 100);
    const plain = createBattle({ seed: 1, heads: heads(1), bodyHp: 100, bodyMaxHp: 100, enemies: [], firstFreeId: 10 }, battleRules);
    expect(levelDamageMultiplier(plain.heads[0]!, battleRules)).toBe(1);
  });

  it('the heads that kill are counted, and their level and experience go back to the map', () => {
    // Too tough to be severed: the kill is its own, not a hatchling's.
    const record = { ...heads(2)[0]!, xp: 25, hp: 1000, maxHp: 1000 };
    const s = createBattle({ seed: 3, heads: [record], bodyHp: 500, bodyMaxHp: 500, enemies: ['manAtArms'], firstFreeId: 10 }, battleRules);
    let firstHit = 0;
    for (let i = 0; i < 20 * 120 && !s.outcome; i++) {
      stepBattle(s, battleRules);
      for (const e of s.events) if (e.type === 'hit' && e.attacker === 'head' && firstHit === 0) firstHit = e.damage;
    }
    expect(s.outcome).toBe('won');
    const bite = battleRules.headClasses.biter!.attack.damage;
    const armor = battleRules.enemyTypes.manAtArms!.armor;
    expect(firstHit).toBeCloseTo(bite * (1 + xp.damagePercentPerLevel / 100) - armor);
    const result = battleResult(s, battleRules);
    expect(result.kills).toEqual({ h1: 1 });
    expect(result.heads[0]).toMatchObject({ level: 2, xp: 25 });
  });
});
