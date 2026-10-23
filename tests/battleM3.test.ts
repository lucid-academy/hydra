// M3 in battle: Broodlings fighting for the lair, and the Order's new people (crossbowmen, the Tithe Collector,
// knights, the Master of the Order) and what they do differently.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { hex, hexDistance } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { applyStatus, battleResult, bodyDistance, cauterizeTicksFor, createBattle, createMistCloud, enemyStepTicks, rimHexes, stepBattle } from '../src/sim/battle';
import type { BattleSetup, BattleState, Enemy, HeadRecord } from '../src/sim/battle';

const data = loadGameData();
const rules = battleRulesFrom(data);

function heads(...classIds: string[]): HeadRecord[] {
  return classIds.map((classId, i) => {
    const maxHp = rules.headClasses[classId]!.maxHp;
    return { id: `h${i + 1}`, name: `Head${i + 1}`, classId, level: 1, hp: maxHp, maxHp };
  });
}

function battle(enemies: string[], headClasses: string[] = [], more: Partial<BattleSetup> = {}): BattleState {
  return createBattle({ seed: 1, heads: heads(...headClasses), bodyHp: 500, bodyMaxHp: 500, enemies, firstFreeId: 100, ...more }, rules);
}

function place(enemy: Enemy, at: Hex): void {
  enemy.hex = at;
  enemy.stepFrom = at;
  enemy.stepEndTick = 0;
}

function run(s: BattleState, ticks: number): void {
  for (let i = 0; i < ticks && !s.outcome; i++) stepBattle(s, rules);
}

describe('Broodlings in the battle for the lair', () => {
  it('stand round the body, walk to the Order and bite it; the Order hits them back', () => {
    const s = battle(['manAtArms', 'manAtArms'], [], { allies: 3 });
    for (const e of s.enemies) e.hp = 30;
    expect(s.allies).toHaveLength(3);
    for (const a of s.allies) expect(bodyDistance(s.body.center, a.hex)).toBe(1);
    let bitten = 0;
    let hitBack = 0;
    for (let i = 0; i < 20 * 60 && !s.outcome; i++) {
      stepBattle(s, rules);
      for (const e of s.events) {
        if (e.type === 'hit' && e.attacker === 'ally') bitten++;
        if (e.type === 'hit' && e.targetKind === 'ally') hitBack++;
      }
    }
    expect(bitten).toBeGreaterThan(0);
    expect(hitBack).toBeGreaterThan(0);
    expect(battleResult(s, rules).alliesLeft).toBe(s.allies.length);
  });

  it('one that dies is gone', () => {
    const s = battle(['manAtArms'], [], { allies: 1 });
    const ally = s.allies[0]!;
    const enemy = s.enemies[0]!;
    place(enemy, hex(ally.hex.q + 1, ally.hex.r));
    ally.hp = 1;
    let killed = false;
    for (let i = 0; i < 20 * 10 && !killed; i++) {
      stepBattle(s, rules);
      killed = s.events.some((e) => e.type === 'allyKilled');
    }
    expect(killed).toBe(true);
    expect(s.allies).toEqual([]);
  });

  it('none fight in an ordinary battle', () => {
    expect(battle(['manAtArms']).allies).toEqual([]);
  });
});

describe('the Tithe Collector', () => {
  it('walks up to the body, counts, then runs for the edge and is gone with the tithe', () => {
    const s = battle(['titheCollector']);
    const collector = s.enemies[0]!;
    const events: string[] = [];
    for (let i = 0; i < 20 * 120 && !s.outcome; i++) {
      stepBattle(s, rules);
      for (const e of s.events) if (e.type === 'collected' || e.type === 'escaped') events.push(e.type);
    }
    expect(events).toEqual(['collected', 'escaped']);
    expect(collector.collected).toBe(true);
    expect(s.outcome).toBe('won');
    expect(battleResult(s, rules).tithesTaken).toBe(1);
  });

  it('held where he stands, he never gets away', () => {
    const s = battle(['titheCollector']);
    const collector = s.enemies[0]!;
    collector.collected = true;
    applyStatus(s, collector, 'stunned', rules, 20 * 60);
    run(s, 20 * 30);
    expect(s.enemies).toContain(collector);
    expect(s.tithesTaken).toBe(0);
  });

  it('a stunned collector stops counting', () => {
    const s = battle(['titheCollector']);
    const collector = s.enemies[0]!;
    place(collector, hex(2, 0));
    applyStatus(s, collector, 'stunned', rules, 20 * 60);
    run(s, 20 * 30);
    expect(collector.collectProgress).toBe(0);
  });
});

describe('knights', () => {
  it('charge: faster on the way in, and the first blow lands twice as hard', () => {
    const s = battle(['knight']);
    const knight = s.enemies[0]!;
    const type = rules.enemyTypes.knight!;
    expect(enemyStepTicks(knight, rules)).toBe(Math.round(type.stepTicks * type.charge!.stepMultiplier));
    const blows: number[] = [];
    for (let i = 0; i < 20 * 60 && blows.length < 2; i++) {
      stepBattle(s, rules);
      for (const e of s.events) if (e.type === 'hit' && e.targetKind === 'body') blows.push(e.damage);
    }
    expect(blows[0]).toBe(type.attack.damage * type.charge!.firstHitMultiplier);
    expect(blows[1]).toBe(type.attack.damage);
    expect(enemyStepTicks(knight, rules)).toBe(type.stepTicks);
  });

  it('are not afraid', () => {
    const s = battle(['knight']);
    applyStatus(s, s.enemies[0]!, 'terrified', rules, null);
    expect(s.enemies[0]!.statuses).toEqual([]);
  });
});

describe('crossbowmen', () => {
  it('shoot from afar, and once out of bolts come in close', () => {
    const s = battle(['crossbowman']);
    const bowman = s.enemies[0]!;
    const type = rules.enemyTypes.crossbowman!;
    let shotFrom = 0;
    for (let i = 0; i < 20 * 60 && shotFrom === 0; i++) {
      stepBattle(s, rules);
      if (s.events.some((e) => e.type === 'hit' && e.attacker === 'enemy')) shotFrom = bodyDistance(s.body.center, bowman.hex);
    }
    expect(shotFrom).toBe(type.attack.range);
    bowman.shotsLeft = 0;
    run(s, 20 * 20);
    expect(bodyDistance(s.body.center, bowman.hex)).toBe(1);
  });

  it('see nothing through Mist but what is right next to them', () => {
    const s = battle(['crossbowman']);
    const bowman = s.enemies[0]!;
    place(bowman, hex(5, 0));
    createMistCloud(s, hex(0, 0), rules, 3, 20 * 600);
    bowman.cooldown = 0;
    stepBattle(s, rules);
    expect(s.events.some((e) => e.type === 'hit' && e.attacker === 'enemy')).toBe(false);
    // He comes up close instead.
    run(s, 20 * 10);
    expect(hexDistance(bowman.hex, hex(0, 0))).toBeLessThan(5);
  });
});

describe('the Master of the Order', () => {
  it('burns stumps shut first, and Fireproof Scales make it take longer', () => {
    const plain = battle(['masterOfTheOrder']);
    const scaled = battle(['masterOfTheOrder'], [], { cauterizePercent: 50 });
    const master = (s: BattleState) => s.enemies[0]!;
    expect(rules.enemyTypes.masterOfTheOrder!.behavior).toBe('torchbearer');
    expect(cauterizeTicksFor(scaled, master(scaled), rules)).toBe(Math.round(cauterizeTicksFor(plain, master(plain), rules) * 1.5));
  });

  it('is a boss, and is taken in by neither fear nor false lights', () => {
    const type = rules.enemyTypes.masterOfTheOrder!;
    expect(type.boss).toBe(true);
    expect(type.immuneTo).toEqual(expect.arrayContaining(['terrified', 'entranced']));
  });
});

describe('every new group', () => {
  it('fights to an end without orders', () => {
    for (const group of data.enemies.encounterGroups.filter((g) => g.orderOnly)) {
      for (let seed = 1; seed <= 8; seed++) {
        const s = createBattle({ seed, heads: heads('biter', 'acidSpitter', 'mistBreather'), bodyHp: 150, bodyMaxHp: 150, enemies: group.members, firstFreeId: 100, allies: 2 }, rules);
        run(s, 20 * 600);
        expect(s.outcome, `${group.id}, seed ${seed}`).not.toBeNull();
      }
    }
  });

  it('starts on the edge of the board', () => {
    const rim = rimHexes(rules);
    const s = battle(['knight', 'crossbowman', 'titheCollector', 'masterOfTheOrder']);
    for (const e of s.enemies) expect(rim.some((h) => h.q === e.hex.q && h.r === e.hex.r)).toBe(true);
  });
});
