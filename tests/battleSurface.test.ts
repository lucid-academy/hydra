// M4 in battle: battles on the surface (starting in mist, or Exposed), the Censer Priest's censer and the Brazier
// Bearer's braziers, and the heads' answers to them (GAME_DESIGN.md §6.6, §6.9).

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { hex, hexDistance } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import { applyCommand, applyStatus, bodyDistance, createBattle, createMistCloud, isInMist, seize, stepBattle } from '../src/sim/battle';
import type { BattleEvent, BattleSetup, BattleState, Enemy, HeadRecord, SkillAim } from '../src/sim/battle';

const data = loadGameData();
const rules = battleRulesFrom(data);

function heads(...classIds: string[]): HeadRecord[] {
  return classIds.map((classId, i) => {
    const maxHp = rules.headClasses[classId]!.maxHp;
    return { id: `h${i + 1}`, name: `Head${i + 1}`, classId, level: 1, hp: maxHp, maxHp };
  });
}

function battle(enemies: string[], headClasses: string[] = [], more: Partial<BattleSetup> = {}): BattleState {
  const s = createBattle({ seed: 1, heads: heads(...headClasses), bodyHp: 500, bodyMaxHp: 500, enemies, firstFreeId: 100, ...more }, rules);
  // The heads keep still unless a test orders them.
  for (const head of s.heads) head.cooldown = 99999;
  return s;
}

function place(enemy: Enemy, at: Hex): void {
  enemy.hex = at;
  enemy.stepFrom = at;
  enemy.stepEndTick = 0;
}

function steps(s: BattleState, ticks: number): BattleEvent[] {
  const events: BattleEvent[] = [];
  for (let i = 0; i < ticks && !s.outcome; i++) {
    stepBattle(s, rules);
    events.push(...s.events);
  }
  return events;
}

function cast(s: BattleState, headId: string, slot: number, aim: SkillAim): BattleEvent[] {
  applyCommand(s, { type: 'useSkill', headId, slot, aim }, rules);
  return steps(s, 1);
}

const censer = rules.enemyTypes.censerPriest!.censer!;
const braziers = rules.enemyTypes.brazierBearer!.braziers!;
/** Next to the body (which starts in the middle of the board). */
const NEXT_TO_BODY = hex(2, 0);

describe('a battle on the surface', () => {
  it('fought in mist starts with clouds round the body; an Exposed one starts with none, and the heads hit softer', () => {
    const start = rules.surface.startClouds;
    const inMist = battle(['manAtArms'], ['biter'], { surface: { inMist: true, damagePercent: 0 } });
    expect(inMist.clouds).toHaveLength(start.count);
    for (const cloud of inMist.clouds) {
      expect(bodyDistance(inMist.body.center, cloud.center)).toBe(start.fromBody);
      expect(cloud.untilTick).toBe(start.ticks);
    }
    expect(inMist.headDamageMultiplier).toBe(1);

    const exposed = battle(['manAtArms'], ['biter'], { surface: { inMist: false, damagePercent: data.surface.exposed.battleDamagePercent } });
    expect(exposed.clouds).toHaveLength(0);
    expect(exposed.headDamageMultiplier).toBeCloseTo(1 + data.surface.exposed.battleDamagePercent / 100);

    // The same bite, in mist and Exposed.
    const bite = (s: BattleState) => {
      const enemy = s.enemies[0]!;
      place(enemy, NEXT_TO_BODY);
      s.heads[0]!.cooldown = 0;
      const hit = steps(s, 1).find((e) => e.type === 'hit' && e.attacker === 'head');
      return hit && hit.type === 'hit' ? hit.damage : 0;
    };
    const normal = bite(battle(['manAtArms'], ['biter']));
    const weak = bite(exposed);
    expect(weak).toBeGreaterThan(0);
    expect(weak).toBeLessThan(normal);
  });

  it('underground battles are as before: no clouds, full damage', () => {
    const s = battle(['manAtArms'], ['biter']);
    expect(s.clouds).toHaveLength(0);
    expect(s.headDamageMultiplier).toBe(1);
  });
});

describe('the Censer Priest', () => {
  function priestNextToBody(others: string[] = []): { s: BattleState; priest: Enemy } {
    const s = battle(['censerPriest', ...others], ['mistBreather', 'screamer']);
    const priest = s.enemies[0]!;
    place(priest, NEXT_TO_BODY);
    return { s, priest };
  }

  it('near the fight he stops and swings his censer: the mist round him is gone, his brothers lose their statuses and hit harder', () => {
    const { s, priest } = priestNextToBody(['manAtArms']);
    const brother = s.enemies[1]!;
    place(brother, hex(2, -1));
    applyStatus(s, brother, 'corroded', rules, 400);
    // A small cloud wholly inside his reach, and a big one reaching beyond it.
    createMistCloud(s, hex(3, 0), rules, 1, 400);
    createMistCloud(s, hex(0, 0), rules, 6, 400);
    const events = steps(s, 1);
    expect(events.some((e) => e.type === 'censer' && e.what === 'started')).toBe(true);
    expect(priest.channel?.kind).toBe('censer');

    const swing = steps(s, censer.swingTicks + 1).find((e) => e.type === 'censer' && e.what === 'swung');
    expect(swing).toBeDefined();
    expect(s.clouds.some((c) => c.radius === 1)).toBe(false);
    expect(s.clouds.some((c) => c.radius === 6)).toBe(true);
    // The big cloud has a hole round him while the smoke lasts.
    expect(isInMist(s, priest.hex)).toBe(false);
    expect(isInMist(s, hex(-4, 0))).toBe(true);
    expect(brother.statuses.some((st) => st.id === 'corroded')).toBe(false);
    expect(brother.boost?.multiplier).toBeCloseTo(censer.boostMultiplier);
    steps(s, censer.smokeTicks);
    expect(isInMist(s, priest.hex)).toBe(true);
  });

  it('a blessed blow lands harder', () => {
    const hitOnBody = (blessed: boolean) => {
      const s = battle(['manAtArms']);
      const man = s.enemies[0]!;
      place(man, NEXT_TO_BODY);
      man.cooldown = 0;
      if (blessed) man.boost = { multiplier: censer.boostMultiplier, untilTick: 1000 };
      const hit = steps(s, 1).find((e) => e.type === 'hit' && e.targetKind === 'body');
      return hit && hit.type === 'hit' ? hit.damage : 0;
    };
    expect(hitOnBody(true)).toBeCloseTo(hitOnBody(false) * censer.boostMultiplier);
  });

  it('a stun stops his swing half-way, and the next one waits its full time', () => {
    const { s, priest } = priestNextToBody();
    steps(s, 1);
    expect(priest.channel?.kind).toBe('censer');
    applyStatus(s, priest, 'stunned', rules);
    expect(priest.channel).toBeNull();
    expect(s.events.some((e) => e.type === 'censer' && e.what === 'interrupted')).toBe(true);
    expect(priest.nextChannelTick).toBe(s.tick + censer.everyTicks);
    const events = steps(s, censer.swingTicks + 2);
    expect(events.some((e) => e.type === 'censer' && e.what === 'swung')).toBe(false);
  });

  it('a Strangler holding him keeps him from swinging, and the smoke never prises a neck open', () => {
    const { s, priest } = priestNextToBody(['manAtArms']);
    seize(s, s.heads[0]!, priest, 'seized', 400, rules);
    expect(steps(s, censer.swingTicks + 2).some((e) => e.type === 'censer')).toBe(false);

    // His brother swings over a seized man: the hold stays.
    const other = priestNextToBody(['manAtArms']);
    const man = other.s.enemies[1]!;
    place(man, hex(2, -1));
    seize(other.s, other.s.heads[0]!, man, 'seized', 400, rules);
    steps(other.s, censer.swingTicks + 2);
    expect(man.statuses.some((st) => st.id === 'seized')).toBe(true);
  });

  it('Banshee Wail cracks his censer for the rest of the battle', () => {
    const s = battle(['censerPriest'], ['screamer'], { ultimatesUnlocked: true });
    const priest = s.enemies[0]!;
    place(priest, NEXT_TO_BODY);
    const events = cast(s, 'h1', 2, { kind: 'none' });
    expect(events.some((e) => e.type === 'censer' && e.what === 'cracked')).toBe(true);
    expect(priest.censerCracked).toBe(true);
    // Not afraid any more, and still no swinging.
    priest.statuses = [];
    expect(steps(s, censer.everyTicks * 2).some((e) => e.type === 'censer' && e.what === 'started')).toBe(false);
  });

  it('far from the fight, with nothing for the smoke to do, he walks on', () => {
    const s = battle(['censerPriest']);
    expect(steps(s, 2).some((e) => e.type === 'censer')).toBe(false);
  });
});

describe('the Brazier Bearer', () => {
  function bearerNear(headClasses: string[] = ['mistBreather'], more: Partial<BattleSetup> = {}): { s: BattleState; bearer: Enemy } {
    const s = battle(['brazierBearer', 'manAtArms'], headClasses, more);
    const bearer = s.enemies[0]!;
    place(bearer, hex(3, 0));
    place(s.enemies[1]!, hex(-5, 0));
    return { s, bearer };
  }

  function setDown(s: BattleState): void {
    const lit = steps(s, braziers.setDownTicks + 2).find((e) => e.type === 'brazier' && e.what === 'lit');
    expect(lit).toBeDefined();
  }

  it('near the body he sets a brazier down: no mist near it, and the body is slower on its dry ground', () => {
    const { s, bearer } = bearerNear();
    const at = bearer.hex;
    createMistCloud(s, at, rules, 1, 400);
    setDown(s);
    expect(s.braziers).toHaveLength(1);
    expect(s.braziers[0]!.at).toEqual(at);
    expect(bearer.braziersLeft).toBe(braziers.count - 1);
    expect(isInMist(s, at)).toBe(false);

    // The body steps onto the dry ground slower than elsewhere.
    applyCommand(s, { type: 'moveBody', to: hex(1, 0) }, rules);
    s.enemies.forEach((e) => place(e, hex(-6, 6)));
    steps(s, 1);
    expect(s.body.stepEndTick - s.body.stepStartTick).toBe(Math.round(rules.bodyStepTicks * braziers.bodySlowMultiplier));
  });

  it('carries only so many', () => {
    const { s, bearer } = bearerNear();
    for (let i = 0; i < braziers.count + 1; i++) {
      steps(s, braziers.setDownTicks + 2);
      // Moves on, off the dry ground, and waits out his time.
      place(bearer, i % 2 === 0 ? hex(-3, 0) : hex(0, 3));
      bearer.nextChannelTick = 0;
    }
    expect(s.braziers).toHaveLength(braziers.count);
    expect(bearer.braziersLeft).toBe(0);
  });

  it('Douse puts out a brazier next to its target', () => {
    const { s, bearer } = bearerNear(['mistBreather']);
    setDown(s);
    bearer.nextChannelTick = 99999;
    const douse = s.heads[0]!.skills.indexOf('douse');
    const events = cast(s, 'h1', douse >= 0 ? douse : 1, { kind: 'enemy', enemyId: bearer.id });
    expect(events.some((e) => e.type === 'brazier' && e.what === 'out')).toBe(true);
    expect(s.braziers).toHaveLength(0);
  });

  it('Acid Rain puts out every brazier on the board', () => {
    const { s, bearer } = bearerNear(['acidSpitter'], { ultimatesUnlocked: true });
    setDown(s);
    s.braziers.push({ ...s.braziers[0]!, id: 999, at: hex(-4, 2) });
    bearer.nextChannelTick = 99999;
    cast(s, 'h1', 2, { kind: 'none' });
    expect(s.braziers).toHaveLength(0);
  });

  it('a man thrown by Toss knocks a brazier over', () => {
    const { s, bearer } = bearerNear(['strangler']);
    setDown(s);
    bearer.nextChannelTick = 99999;
    const brazier = s.braziers[0]!;
    const man = s.enemies[1]!;
    place(man, hex(3, -3));
    seize(s, s.heads[0]!, man, 'seized', 400, rules);
    // Toss is the Strangler's third skill: take it into battle.
    s.heads[0]!.skills = ['coil', 'toss'];
    // Move the bearer off his brazier, so the man lands on it.
    place(bearer, hex(4, -4));
    cast(s, 'h1', 1, { kind: 'hex', at: brazier.at });
    expect(hexDistance(man.hex, brazier.at)).toBeLessThanOrEqual(1);
    expect(s.braziers).toHaveLength(0);
  });
});
