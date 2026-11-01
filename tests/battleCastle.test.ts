// M7 in battle: the Eternal Flame in the castle's cathedral (castle.json eternalFlame; GAME_DESIGN.md §5.7). It is
// smothered by the body lying next to it and by Mist on it, keeps Grand Master Vell standing while it burns, and the
// battle is won only once it is out.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { hex, hexDistance, hexEquals } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { applyCommand, bodyDistance, createBattle, createMistCloud, flameHex, hurtEnemy, stepBattle } from '../src/sim/battle';
import type { BattleEvent, BattleSetup, BattleState, Enemy, HeadRecord } from '../src/sim/battle';

const data = loadGameData();
const rules = battleRulesFrom(data);
const flameRules = rules.eternalFlame;

function heads(...classIds: string[]): HeadRecord[] {
  return classIds.map((classId, i) => {
    const maxHp = rules.headClasses[classId]!.maxHp;
    return { id: `h${i + 1}`, name: `Head${i + 1}`, classId, level: 1, hp: maxHp, maxHp };
  });
}

function battle(enemies: string[], headClasses: string[] = [], more: Partial<BattleSetup> = {}): BattleState {
  const s = createBattle({ seed: 3, heads: heads(...headClasses), bodyHp: 500, bodyMaxHp: 500, enemies, firstFreeId: 100, eternalFlame: true, ...more }, rules);
  for (const head of s.heads) head.cooldown = 99999;
  return s;
}

function steps(s: BattleState, ticks: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (let i = 0; i < ticks && !s.outcome; i++) {
    stepBattle(s, rules);
    events.push(...s.events);
  }
  return events;
}

/** Keeps the enemy out of the fight, far from the body and the flame. */
function sideline(enemy: Enemy, at: Hex): void {
  enemy.hex = at;
  enemy.stepFrom = at;
  enemy.stepEndTick = Number.MAX_SAFE_INTEGER;
}

/** A spot for the body's middle with its edge right next to the flame. */
function besideTheFlame(s: BattleState): Hex {
  const at = s.flame!.at;
  return hex(at.q - 1, at.r + 2);
}

const seconds = (n: number) => Math.round(n * rules.ticksPerSecond);

describe('the Eternal Flame', () => {
  it('burns at the top of the board, in the middle, where nobody starts; other battles have none', () => {
    const s = battle(['manAtArms', 'manAtArms', 'manAtArms', 'manAtArms', 'manAtArms', 'manAtArms']);
    expect(s.flame).not.toBeNull();
    expect(hexEquals(s.flame!.at, flameHex(rules))).toBe(true);
    expect(s.flame!.strength).toBe(flameRules.strength);
    expect(s.enemies.every((e) => !hexEquals(e.hex, s.flame!.at))).toBe(true);
    expect(battle(['manAtArms'], [], { eternalFlame: false }).flame).toBeNull();
  });

  it('the battle goes on while it burns, even with the Order gone; the body lying next to it smothers it, and gets burnt', () => {
    const s = battle([]);
    steps(s, 5);
    expect(s.outcome).toBeNull();
    const spot = besideTheFlame(s);
    expect(bodyDistance(spot, s.flame!.at)).toBe(1);
    applyCommand(s, { type: 'moveBody', to: spot }, rules);
    const events = steps(s, seconds(120));
    expect(s.outcome).toBe('won');
    expect(s.flame!.out).toBe(true);
    expect(events.some((e) => e.type === 'flame' && e.what === 'out')).toBe(true);
    expect(s.body.hp).toBeLessThan(500);
    // Nobody steps onto the flame's hex, the body neither.
    expect(hexDistance(s.body.center, s.flame!.at)).toBeGreaterThan(1);
  });

  it('Mist lying on it smothers it; with nothing smothering it, it comes back, but never above its strength', () => {
    const s = battle([]);
    const flame = s.flame!;
    createMistCloud(s, flame.at, rules, 1, seconds(3));
    steps(s, seconds(3));
    const smothered = flame.strength;
    expect(smothered).toBeLessThan(flameRules.strength);
    expect(smothered).toBeCloseTo(flameRules.strength - flameRules.mistCloudPerTick * seconds(3), 0);
    steps(s, seconds(600));
    expect(flame.strength).toBe(flameRules.strength);
    expect(s.outcome).toBeNull();
  });

  it('keeps Grand Master Vell standing at 1 HP and heals him while it burns; once it is out he falls, and the Order is afraid', () => {
    const s = battle(['grandMaster', 'manAtArms']);
    const [master, man] = s.enemies as [Enemy, Enemy];
    sideline(master, hex(-5, 3));
    sideline(man, hex(5, -3));
    const kept = (() => {
      hurtEnemy(s, master, master.maxHp * 2, 'head', 'h1', rules);
      return s.events.some((e) => e.type === 'flameKeeps');
    })();
    expect(kept).toBe(true);
    expect(master.hp).toBe(1);
    expect(s.enemies).toContain(master);
    steps(s, seconds(2));
    expect(master.hp).toBeGreaterThan(1);

    // Put out (Acid Rain, or anything else, douses it all at once here).
    s.flame!.strength = 0.01;
    createMistCloud(s, s.flame!.at, rules, 1, seconds(1));
    const events = steps(s, 1);
    expect(events.some((e) => e.type === 'flame' && e.what === 'out')).toBe(true);
    expect(man.statuses.some((st) => st.id === flameRules.fearStatus)).toBe(true);
    // The Grand Master is not afraid of anything, not even of this.
    expect(master.statuses.some((st) => st.id === flameRules.fearStatus)).toBe(false);
    hurtEnemy(s, master, master.maxHp * 2, 'head', 'h1', rules);
    expect(s.enemies).not.toContain(master);
  });

  it('Acid Rain douses it, wherever it was aimed', () => {
    const s = battle([], ['acidSpitter'], { ultimatesUnlocked: true });
    s.heads[0]!.cooldown = 0;
    applyCommand(s, { type: 'useSkill', headId: 'h1', slot: 2, aim: { kind: 'none' } }, rules);
    const events = steps(s, 1);
    expect(events.some((e) => e.type === 'flame' && e.what === 'doused')).toBe(true);
    expect(s.flame!.strength).toBeCloseTo(flameRules.strength - flameRules.doused, 0);
  });

  it('the same seed and the same orders give the same battle', () => {
    const run = () => {
      const s = battle(['grandMaster', 'knight', 'censerPriest', 'torchbearer', 'manAtArms'], ['biter', 'acidSpitter', 'mistBreather']);
      for (const head of s.heads) head.cooldown = 0;
      applyCommand(s, { type: 'moveBody', to: besideTheFlame(s) }, rules);
      steps(s, seconds(90));
      return { tick: s.tick, body: s.body.hp, flame: s.flame!.strength, enemies: s.enemies.map((e) => [e.typeId, e.hp]) };
    };
    expect(run()).toEqual(run());
  });
});
