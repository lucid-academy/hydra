// The nine head classes (GAME_DESIGN.md 6.4, 6.9), their skills and the combos between them (6.5).
// Expected numbers come from the data files where they matter, so tuning the data doesn't break these tests.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { battleRulesFrom } from '../src/data/battleRules';
import { hex, hexDistance } from '../src/sim/hex';
import type { Hex } from '../src/sim/hex';
import {
  applyCommand,
  applyStatus,
  bodyDistance,
  createBattle,
  createMistCloud,
  enemyCan,
  hasStatus,
  headAttackSpeed,
  headHex,
  skillInSlot,
  stepBattle,
} from '../src/sim/battle';
import type { BattleRules, BattleState, Enemy, HeadRecord, SkillAim } from '../src/sim/battle';

const data = loadGameData();
const rules = battleRulesFrom(data);
const MIDDLE = hex(0, 0);

function heads(...classIds: string[]): HeadRecord[] {
  return classIds.map((classId, i) => {
    const maxHp = rules.headClasses[classId]!.maxHp;
    return { id: `h${i + 1}`, name: `Head${i + 1}`, classId, level: 1, hp: maxHp, maxHp };
  });
}

function battle(enemies: string[], headClasses: string[], opts: { seed?: number; ultimates?: boolean; r?: BattleRules } = {}): BattleState {
  return createBattle(
    { seed: opts.seed ?? 1, heads: heads(...headClasses), bodyHp: 150, bodyMaxHp: 150, enemies, firstFreeId: 100, ultimatesUnlocked: opts.ultimates ?? false },
    opts.r ?? rules,
  );
}

/** An enemy standing still on a hex (not half-way through a step). */
function place(enemy: Enemy, at: Hex): void {
  enemy.hex = at;
  enemy.stepFrom = at;
  enemy.stepEndTick = 0;
}

/** An enemy that stays where it is and never acts on its own, with plenty of HP. */
function freeze(enemy: Enemy, at: Hex): void {
  place(enemy, at);
  enemy.stepEndTick = Number.MAX_SAFE_INTEGER;
  enemy.hp = enemy.maxHp = 99999;
}

function steps(s: BattleState, ticks: number, r: BattleRules = rules): string[] {
  const combos: string[] = [];
  for (let t = 0; t < ticks && !s.outcome; t++) {
    stepBattle(s, r);
    for (const e of s.events) if (e.type === 'combo') combos.push(e.comboId);
  }
  return combos;
}

/** Orders a skill and lets one tick pass, so it is used. */
function cast(s: BattleState, headId: string, slot: number, aim: SkillAim): string[] {
  applyCommand(s, { type: 'useSkill', headId, slot, aim }, rules);
  return steps(s, 1);
}

/** Rules where heads never attack on their own (cooldowns far away), so a test sees only what it orders. */
function quietRules(): BattleRules {
  const classes = Object.fromEntries(
    Object.entries(rules.headClasses).map(([id, c]) => [id, { ...c, attack: { ...c.attack, cooldownTicks: 99999 } }]),
  );
  return { ...rules, headClasses: classes };
}

/** A battle in which the heads don't attack by themselves: their first attack is after a long while. */
function quiet(enemies: string[], headClasses: string[], ultimates = false): BattleState {
  const s = battle(enemies, headClasses, { ultimates });
  for (const head of s.heads) head.cooldown = 99999;
  return s;
}

describe('the head classes', () => {
  it('there are nine, each with a basic attack, three skills and an ultimate that exist', () => {
    const classes = Object.keys(rules.headClasses);
    expect(classes).toEqual(
      expect.arrayContaining(['biter', 'acidSpitter', 'mistBreather', 'screamer', 'glutton', 'spare', 'strangler', 'tender', 'lantern']),
    );
    for (const cls of Object.values(rules.headClasses)) {
      expect(cls.skills).toHaveLength(3);
      for (const id of cls.skills) expect(rules.skills[id]).toBeDefined();
      expect(rules.skills[cls.ultimate!]?.ultimate).toBe(true);
    }
  });

  it('every head takes two of its three skills into battle; the choice is kept, and can be changed only before the start', () => {
    const s = battle(['manAtArms'], ['biter']);
    const head = s.heads[0]!;
    expect(head.skills).toEqual(rules.headClasses.biter!.skills.slice(0, 2));
    applyCommand(s, { type: 'chooseSkills', headId: 'h1', skills: ['thrash', 'crunch'] }, rules);
    expect(head.skills).toEqual(['thrash', 'crunch']);
    applyCommand(s, { type: 'chooseSkills', headId: 'h1', skills: ['notASkill', 'acidPool'] }, rules);
    expect(head.skills).toEqual(rules.headClasses.biter!.skills.slice(0, 2)); // foreign skills are dropped
    stepBattle(s, rules);
    applyCommand(s, { type: 'chooseSkills', headId: 'h1', skills: ['lockjaw', 'thrash'] }, rules);
    expect(head.skills).toEqual(rules.headClasses.biter!.skills.slice(0, 2));

    const kept = createBattle({ seed: 1, heads: [{ ...heads('biter')[0]!, skills: ['thrash', 'lockjaw'] }], bodyHp: 150, bodyMaxHp: 150, enemies: ['manAtArms'], firstFreeId: 100 }, rules);
    expect(kept.heads[0]!.skills).toEqual(['thrash', 'lockjaw']);
  });

  it('Screamer: its screech Terrifies; a Terrified human runs away, does not fight and stops burning stumps', () => {
    const s = battle(['torchbearer'], ['screamer']);
    const e = s.enemies[0]!;
    place(e, hex(3, 0));
    e.hp = e.maxHp = 99999;
    stepBattle(s, rules);
    expect(hasStatus(e, 'terrified')).toBe(true);
    expect(enemyCan(e, 'canAttack', rules)).toBe(false);
    const before = bodyDistance(s.body.center, e.hex);
    let furthest = before;
    for (let t = 0; t < 30; t++) {
      stepBattle(s, rules);
      furthest = Math.max(furthest, bodyDistance(s.body.center, e.hex));
      expect(s.events.some((ev) => ev.type === 'hit' && ev.attacker === 'enemy')).toBe(false);
    }
    expect(furthest).toBeGreaterThan(before);
  });

  it('Glutton: a human it bites to death is eaten and heals the body', () => {
    const s = battle(['manAtArms'], ['glutton']);
    const e = s.enemies[0]!;
    place(e, hex(2, 0));
    e.stepEndTick = Number.MAX_SAFE_INTEGER;
    e.hp = 1;
    s.body.hp = 100;
    stepBattle(s, rules);
    expect(s.enemies).toHaveLength(0);
    expect(s.events.some((ev) => ev.type === 'devoured')).toBe(true);
    expect(s.body.hp).toBe(100 + rules.headClasses.glutton!.attack.devourHeal);
    expect(s.heads[0]!.meals).toBe(1);
  });

  it('Tender: licks the most wounded head well; with nobody wounded it licks a human', () => {
    const s = battle(['manAtArms'], ['tender', 'biter', 'acidSpitter']);
    freeze(s.enemies[0]!, hex(-5, 4));
    const [, biter, spitter] = s.heads;
    biter!.hp = biter!.maxHp - 20;
    spitter!.hp = 2;
    stepBattle(s, rules);
    expect(spitter!.hp).toBe(2 + rules.headClasses.tender!.attack.healsHeads);
    expect(biter!.hp).toBe(biter!.maxHp - 20);

    const lone = battle(['manAtArms'], ['tender']);
    const e = lone.enemies[0]!;
    freeze(e, hex(3, 0));
    stepBattle(lone, rules);
    expect(e.hp).toBeLessThan(e.maxHp);
  });

  it('Lantern: its flash Entrances; a hit wakes the human; heads leave the entranced alone unless ordered', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['lantern', 'acidSpitter']);
    const [a, b] = s.enemies;
    freeze(a!, hex(3, 0));
    freeze(b!, hex(-4, 0));
    s.heads[1]!.cooldown = 1; // the spitter waits a tick, so the flash lands first
    stepBattle(s, rules);
    expect(hasStatus(a!, 'entranced')).toBe(true);
    stepBattle(s, rules);
    // The spitter turned to the other enemy instead of waking this one.
    expect(s.heads[1]!.targetId).toBe(b!.id);
    expect(hasStatus(a!, 'entranced')).toBe(true);

    // A bite wakes it up. (Not acid: acid on the entranced is Anointing, which keeps the trance.)
    const bite = battle(['manAtArms'], ['biter']);
    const e = bite.enemies[0]!;
    freeze(e, hex(2, 0));
    applyStatus(bite, e, 'entranced', rules, 200);
    applyCommand(bite, { type: 'attack', headId: 'h1', enemyId: e.id }, rules);
    stepBattle(bite, rules);
    expect(hasStatus(e, 'entranced')).toBe(false);
  });

  it('The Spare: nibbles for almost nothing, and once per battle has a Bad Idea that sends every head at one human', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['spare', 'biter']);
    expect(s.badIdea).not.toBeNull();
    const idea = s.badIdea!;
    for (const e of s.enemies) e.hp = e.maxHp = 99999;
    for (const h of s.heads) h.hp = h.maxHp = 99999;
    let seen = 0;
    while (s.tick < idea.untilTick + 2) {
      stepBattle(s, rules);
      for (const ev of s.events) {
        if (ev.type !== 'badIdea') continue;
        seen++;
        expect(s.heads.every((h) => h.orderTargetId === ev.enemyId)).toBe(true);
      }
    }
    expect(seen).toBe(1);
    expect(s.heads.every((h) => h.orderTargetId === null)).toBe(true); // orders back as they were
  });

  it('Strangler: Coil Seizes; the held human stands still and takes 25% more; the grip breaks when the Strangler is hit hard', () => {
    const s = quiet(['manAtArms'], ['strangler']);
    const e = s.enemies[0]!;
    place(e, hex(3, 0));
    e.hp = e.maxHp = 99999;
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id });
    const head = s.heads[0]!;
    expect(hasStatus(e, 'seized')).toBe(true);
    expect(head.holdingId).toBe(e.id);
    expect(headHex(s, head, rules)).toEqual(e.hex); // the neck is out there, wrapped around it
    const at = e.hex;
    steps(s, 10);
    expect(e.hex).toEqual(at);

    // Hitting it: 25% more.
    const before = e.hp;
    s.heads.push({ ...s.heads[0]!, id: 'hx', classId: 'biter', holdingId: null, cooldown: 0, skillCooldowns: {}, buffs: [], twinGroup: null, targetId: null, orderTargetId: e.id });
    stepBattle(s, rules);
    const bite = rules.headClasses.biter!.attack.damage - rules.enemyTypes.manAtArms!.armor;
    expect(before - e.hp).toBeGreaterThanOrEqual(bite * 1.25 - 0.01);
    s.heads = s.heads.filter((h) => h.id !== 'hx');

    // Another human hits the Strangler: the grip breaks.
    const breaksAt = rules.statuses.seized!.breaksWhenHolderTakes!;
    head.hp = 999;
    const other = { ...e, id: 77, hex: hex(4, 0), stepFrom: hex(4, 0), statuses: [], recentHits: [], comboCooldowns: {}, cooldown: 0, hp: 999, maxHp: 999, stepEndTick: 0 };
    s.enemies.push(other);
    for (let t = 0; t < 200 && head.holdingId !== null; t++) stepBattle(s, rules);
    expect(head.holdingId).toBeNull();
    expect(hasStatus(e, 'seized')).toBe(false);
    expect(head.hurtWhileHolding).toBe(0);
    expect(breaksAt).toBeGreaterThan(0);
  });
});

describe('skills', () => {
  it('wait in pause until the game runs, and wait for their target to come within reach', () => {
    const s = quiet(['manAtArms'], ['biter']);
    const e = s.enemies[0]!;
    freeze(e, hex(5, 0));
    applyCommand(s, { type: 'useSkill', headId: 'h1', slot: 0, aim: { kind: 'enemy', enemyId: e.id } }, rules);
    expect(e.hp).toBe(e.maxHp); // nothing happens before the next tick
    steps(s, 5);
    expect(e.hp).toBe(e.maxHp); // out of reach: waiting
    expect(s.heads[0]!.pendingSkill).not.toBeNull();
    freeze(e, hex(3, 0));
    steps(s, 1);
    expect(e.hp).toBeLessThan(e.maxHp);
    expect(s.heads[0]!.pendingSkill).toBeNull();
    expect(s.heads[0]!.skillCooldowns.crunch).toBeGreaterThan(0);
  });

  it('Crunch hits for 2.5x; then it cools down', () => {
    const s = quiet(['manAtArms'], ['biter']);
    const e = s.enemies[0]!;
    freeze(e, hex(2, 0));
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id });
    const expected = rules.headClasses.biter!.attack.damage * 2.5 - rules.enemyTypes.manAtArms!.armor;
    expect(e.maxHp - e.hp).toBe(expected);
    const hp = e.hp;
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id });
    expect(e.hp).toBe(hp);
  });

  it('ultimates work only once the hydra has unlocked them', () => {
    const locked = quiet(['manAtArms'], ['biter']);
    expect(skillInSlot(locked, locked.heads[0]!, 2, rules)).toBeNull();
    const open = quiet(['manAtArms'], ['biter'], true);
    expect(skillInSlot(open, open.heads[0]!, 2, rules)?.id).toBe('frenzy');
    cast(open, 'h1', 2, { kind: 'none' });
    expect(headAttackSpeed(open, open.heads[0]!)).toBe(3);
  });

  it('Thrash throws a human 2 hexes away; into another human, both are Stunned', () => {
    const s = quiet(['manAtArms', 'manAtArms'], ['biter']);
    s.heads[0]!.skills = ['thrash', 'crunch'];
    const [a, b] = s.enemies;
    freeze(a!, hex(2, 0));
    freeze(b!, hex(5, 0));
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(a!.hex).toEqual(hex(4, 0));
    freeze(b!, hex(5, 0));
    a!.stepEndTick = 0;
    freeze(a!, hex(3, 0));
    s.heads[0]!.skillCooldowns = {};
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(a!.hex).toEqual(hex(4, 0));
    expect(hasStatus(a!, 'stunned')).toBe(true);
    expect(hasStatus(b!, 'stunned')).toBe(true);
  });

  it('Yank pulls a human towards the body; Toss throws the held one', () => {
    const s = quiet(['manAtArms', 'manAtArms'], ['strangler']);
    s.heads[0]!.skills = ['yank', 'coil'];
    const [a, b] = s.enemies;
    freeze(a!, hex(5, 0));
    freeze(b!, hex(-2, -3));
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(bodyDistance(s.body.center, a!.hex)).toBe(1);

    s.heads[0]!.skills = ['coil', 'toss'];
    a!.stepEndTick = 0;
    a!.stepEndTick = Number.MAX_SAFE_INTEGER;
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(s.heads[0]!.holdingId).toBe(a!.id);
    cast(s, 'h1', 1, { kind: 'hex', at: hex(5, 0) });
    expect(s.heads[0]!.holdingId).toBeNull();
    expect(hexDistance(a!.hex, hex(2, 0))).toBe(3);
  });

  it('Acid Pool corrodes whoever stands in it; Fog Bank lays a big cloud', () => {
    const s = quiet(['manAtArms', 'manAtArms'], ['acidSpitter', 'mistBreather']);
    const [a, b] = s.enemies;
    freeze(a!, hex(4, 0));
    freeze(b!, hex(-4, 0));
    cast(s, 'h1', 0, { kind: 'hex', at: hex(4, 0) });
    steps(s, 1);
    expect(hasStatus(a!, 'corroded')).toBe(true);
    cast(s, 'h2', 0, { kind: 'hex', at: hex(-3, 0) });
    expect(s.clouds.some((c) => c.radius === 2)).toBe(true);
    steps(s, 1);
    expect(hasStatus(b!, 'soaked')).toBe(true);
  });

  it('Howl Terrifies everyone around the target; Sonic Crack Stuns a wedge; Rally Cry speeds up the others', () => {
    const s = quiet(['manAtArms', 'manAtArms', 'manAtArms'], ['screamer', 'biter']);
    const [a, b, c] = s.enemies;
    freeze(a!, hex(3, 0));
    freeze(b!, hex(4, 0));
    freeze(c!, hex(-4, 0));
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(hasStatus(a!, 'terrified') && hasStatus(b!, 'terrified')).toBe(true);
    expect(hasStatus(c!, 'terrified')).toBe(false);

    cast(s, 'h1', 1, { kind: 'hex', at: hex(-3, 0) });
    expect(hasStatus(c!, 'stunned')).toBe(true);
    expect(hasStatus(a!, 'stunned')).toBe(false);

    s.heads[0]!.skills = ['rallyCry', 'howl'];
    cast(s, 'h1', 0, { kind: 'none' });
    expect(headAttackSpeed(s, s.heads[1]!)).toBeCloseTo(1.25);
    expect(headAttackSpeed(s, s.heads[0]!)).toBe(1);
  });

  it('Gulp swallows only the weak; Regurgitate needs a meal inside', () => {
    const s = quiet(['manAtArms', 'manAtArms'], ['glutton']);
    s.heads[0]!.skills = ['gulp', 'regurgitate'];
    const [a, b] = s.enemies;
    place(a!, hex(2, 0));
    a!.stepEndTick = Number.MAX_SAFE_INTEGER;
    freeze(b!, hex(3, 0));
    cast(s, 'h1', 1, { kind: 'enemy', enemyId: b!.id });
    expect(b!.hp).toBe(b!.maxHp); // no meal yet
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(s.enemies).toContain(a!); // too healthy
    a!.hp = a!.maxHp * 0.2;
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: a!.id });
    expect(s.enemies).not.toContain(a!);
    expect(s.heads[0]!.meals).toBe(1);
    cast(s, 'h1', 1, { kind: 'enemy', enemyId: b!.id });
    expect(b!.hp).toBeLessThan(b!.maxHp);
    expect(hasStatus(b!, 'stunned')).toBe(true);
    expect(s.heads[0]!.meals).toBe(0);
  });

  it('Mend heals a head by 40%; Kiss It Better saves a stump from the torch; Hurry Up makes it regrow sooner; Triplets gives three heads', () => {
    const s = quiet(['torchbearer'], ['tender', 'biter'], true);
    const tb = s.enemies[0]!;
    freeze(tb, hex(-5, 4));
    const biter = s.heads[1]!;
    biter.hp = 1;
    cast(s, 'h1', 0, { kind: 'head', headId: biter.id });
    expect(biter.hp).toBe(1 + biter.maxHp * 0.4);

    s.stumps.push({ id: 900, anchorAngle: 0, regrowAtTick: s.tick + 200, cauterizeProgress: 50, cauterized: false });
    cast(s, 'h1', 1, { kind: 'stump', stumpId: 900 });
    expect(s.stumps[0]!.cauterizeProgress).toBe(0);
    expect(s.stumps[0]!.protectedUntilTick).toBeGreaterThan(s.tick);

    s.heads[0]!.skills = ['hurryUp', 'mend'];
    const before = s.stumps[0]!.regrowAtTick - s.tick;
    cast(s, 'h1', 0, { kind: 'stump', stumpId: 900 });
    expect(s.stumps[0]!.regrowAtTick - s.tick).toBeLessThanOrEqual(Math.ceil(before / 2));

    cast(s, 'h1', 2, { kind: 'none' });
    steps(s, 200);
    expect(s.heads).toHaveLength(2 + 3);
  });

  it('a protected stump is not cauterized', () => {
    const s = quiet(['torchbearer'], ['tender']);
    const tb = s.enemies[0]!;
    tb.hp = tb.maxHp = 99999;
    s.heads[0]!.anchorAngle = Math.PI;
    s.stumps.push({ id: 900, anchorAngle: 0, regrowAtTick: 99999, cauterizeProgress: 0, cauterized: false, protectedUntilTick: 99999 });
    place(tb, hex(2, 0));
    steps(s, rules.enemyTypes.torchbearer!.cauterizeTicks! + 20);
    expect(s.stumps[0]!.cauterized).toBe(false);
  });

  it('Beacon draws humans to the light, where they kneel; Procession draws everyone', () => {
    const s = quiet(['manAtArms', 'manAtArms'], ['lantern'], true);
    const [a, b] = s.enemies;
    place(a!, hex(4, -2));
    place(b!, hex(-5, 2));
    for (const e of s.enemies) e.hp = e.maxHp = 99999;
    cast(s, 'h1', 0, { kind: 'hex', at: hex(4, 0) });
    steps(s, 40);
    expect(hexDistance(a!.hex, hex(4, 0))).toBeLessThanOrEqual(1);
    expect(hasStatus(a!, 'entranced')).toBe(true);
    expect(hexDistance(b!.hex, hex(4, 0))).toBeGreaterThan(3);

    cast(s, 'h1', 2, { kind: 'hex', at: hex(-4, 0) });
    steps(s, 120);
    expect(hexDistance(b!.hex, hex(-4, 0))).toBeLessThanOrEqual(1);
  });

  it('Copycat repeats another head\'s last skill at half strength', () => {
    const s = quiet(['manAtArms'], ['biter', 'spare']);
    const e = s.enemies[0]!;
    freeze(e, hex(2, 0));
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id });
    const crunch = e.maxHp - e.hp;
    const hp = e.hp;
    cast(s, 'h2', 0, { kind: 'none' });
    expect(hp - e.hp).toBeGreaterThan(0);
    expect(hp - e.hp).toBeLessThan(crunch);
  });

  it('Be Adorable stops the humans near the body from fighting', () => {
    const s = quiet(['manAtArms'], ['spare']);
    s.heads[0]!.skills = ['beAdorable', 'copycat'];
    const e = s.enemies[0]!;
    place(e, hex(2, 0));
    cast(s, 'h1', 0, { kind: 'none' });
    expect(hasStatus(e, 'charmed')).toBe(true);
    expect(enemyCan(e, 'canAttack', rules)).toBe(false);
  });
});

describe('combos', () => {
  const comboIds = rules.combos.map((c) => c.id);

  it('all nineteen from GAME_DESIGN.md 6.5 are in combos.json', () => {
    expect(comboIds).toEqual(
      expect.arrayContaining([
        'corrodeAndCrush', 'acidFog', 'smother', 'panicFeast', 'echoScream', 'pincer', 'twinBond', 'holdStill', 'roomService', 'wrungOut',
        'voicesInTheFog', 'brittle', 'pickled', 'slobber', 'rudeAwakening', 'anointing', 'marshLight', 'sanctuary', 'tripletBond',
      ]),
    );
  });

  it('every class sets off at least two combos, and every status has at least two that use it (6.5)', () => {
    // What a class brings to combos: the tags of its attack and skills, its class, the statuses it puts on, its clouds and its lights.
    for (const [id, cls] of Object.entries(rules.headClasses)) {
      if (id === 'spare') continue; // The Spare adds to any combo instead (spareMischief)
      const skills = cls.skills.map((s) => rules.skills[s]!);
      const tags = new Set([...cls.attack.tags, ...skills.flatMap((s) => s.tags)]);
      const statuses = new Set([cls.attack.appliesStatus, ...skills.flatMap((s) => s.effects.flatMap((e) => (e.type === 'status' ? [e.status] : [])))]);
      const makesMist = cls.attack.createsMistCloud || skills.some((s) => s.specials.some((x) => x.type === 'mistCloud'));
      if (makesMist) statuses.add(rules.mistCloud.appliesStatus);
      const lights = skills.some((s) => s.specials.some((x) => x.type === 'beacon'));
      const own = rules.combos.filter(
        (c) =>
          // Twin Bond and Triplet Bond: any heads from one stump.
          (c.conditions.otherHeads !== null && !c.conditions.otherHeads.sameClass && c.conditions.attackTag === null) ||
          (c.conditions.attackTag !== null && tags.has(c.conditions.attackTag)) ||
          c.conditions.headClass === id ||
          (c.conditions.enemyHasStatus !== null && statuses.has(c.conditions.enemyHasStatus)) ||
          (makesMist && c.conditions.enemyInMist === true) ||
          (lights && c.when === 'beaconLit'),
      );
      expect(own.length, id).toBeGreaterThanOrEqual(2);
    }
    for (const status of ['corroded', 'terrified', 'seized', 'entranced', 'soaked']) {
      const users = rules.combos.filter(
        (c) => c.conditions.enemyHasStatus === status || (status === 'terrified' && c.conditions.terrifiedOnBoard) || (status === rules.mistCloud.appliesStatus && c.conditions.enemyInMist),
      );
      expect(users.length, status).toBeGreaterThanOrEqual(2);
    }
  });

  it('Panic Feast: a Glutton eats a weak Terrified human at once', () => {
    const s = battle(['manAtArms'], ['glutton']);
    const e = s.enemies[0]!;
    freeze(e, hex(2, 0));
    e.hp = e.maxHp * 0.3;
    applyStatus(s, e, 'terrified', rules, 200);
    e.stepEndTick = Number.MAX_SAFE_INTEGER;
    expect(steps(s, 1)).toContain('panicFeast');
    expect(s.enemies).toHaveLength(0);
  });

  it('Echo Scream: two Screamers within a second stun everyone around', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['screamer', 'screamer']);
    const [a, b] = s.enemies;
    freeze(a!, hex(3, 0));
    freeze(b!, hex(4, 0));
    for (const h of s.heads) h.orderTargetId = a!.id;
    s.heads[1]!.cooldown = 5;
    expect(steps(s, 10)).toContain('echoScream');
    expect(hasStatus(b!, 'stunned')).toBe(true);
  });

  it('Pincer: two Biters from opposite sides knock their human over', () => {
    const s = battle(['manAtArms'], ['biter', 'biter']);
    const e = s.enemies[0]!;
    freeze(e, hex(0, -2));
    s.heads[0]!.anchorAngle = 0;
    s.heads[1]!.anchorAngle = Math.PI;
    expect(steps(s, 2)).toContain('pincer');
    expect(hasStatus(e, 'stunned')).toBe(true);
    // From the same side: no Pincer.
    const same = battle(['manAtArms'], ['biter', 'biter']);
    freeze(same.enemies[0]!, hex(2, 0));
    same.heads[0]!.anchorAngle = 0;
    same.heads[1]!.anchorAngle = 0.3;
    expect(steps(same, 2)).not.toContain('pincer');
  });

  it('Twin Bond and Triplet Bond: heads from one stump hit harder together; a twin rages or grieves when the other dies', () => {
    const s = battle(['manAtArms'], ['biter', 'biter', 'biter']);
    freeze(s.enemies[0]!, hex(2, 0));
    for (const h of s.heads) {
      h.twinGroup = 7;
      h.anchorAngle = 0;
    }
    const seen = steps(s, 2);
    expect(seen).toContain('twinBond');
    expect(seen).toContain('tripletBond');

    const e = { ...s.enemies[0]!, id: 50, hex: hex(-2, 0), stepFrom: hex(-2, 0), statuses: [], cooldown: 0, stepEndTick: 0 };
    s.enemies.push(e);
    s.heads[0]!.hp = 0.5;
    s.heads[0]!.anchorAngle = Math.PI;
    s.heads[0]!.targetId = e.id;
    s.heads[0]!.orderTargetId = e.id;
    let moods = 0;
    for (let t = 0; t < 60 && moods === 0; t++) {
      stepBattle(s, rules);
      moods += s.events.filter((ev) => ev.type === 'mood').length;
    }
    expect(moods).toBe(2);
    expect(s.heads.every((h) => headAttackSpeed(s, h) !== 1)).toBe(true);
  });

  it('Hold Still: a Biter bites a Seized human for double, and the grip lasts longer', () => {
    const s = battle(['manAtArms'], ['strangler', 'biter']);
    const e = s.enemies[0]!;
    freeze(e, hex(2, 0));
    s.heads[0]!.cooldown = 999;
    s.heads[1]!.cooldown = 3;
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id });
    const until = e.statuses.find((x) => x.id === 'seized')!.untilTick;
    expect(steps(s, 4)).toContain('holdStill');
    expect(e.statuses.find((x) => x.id === 'seized')!.untilTick).toBeGreaterThan(until);
  });

  it('Room Service: a Glutton eats a Seized human under half HP', () => {
    const s = battle(['manAtArms'], ['strangler', 'glutton']);
    const e = s.enemies[0]!;
    place(e, hex(2, 0));
    e.stepEndTick = Number.MAX_SAFE_INTEGER;
    e.hp = e.maxHp * 0.45;
    s.heads[1]!.cooldown = 3;
    s.heads[0]!.cooldown = 999;
    cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id });
    expect(steps(s, 4)).toContain('roomService');
    expect(s.enemies).toHaveLength(0);
  });

  it('Wrung Out: Coil on a Soaked human hurts more, and it is Stunned when let go', () => {
    const s = quiet(['manAtArms'], ['strangler']);
    const e = s.enemies[0]!;
    freeze(e, hex(3, 0));
    createMistCloud(s, e.hex, rules);
    steps(s, 1);
    expect(cast(s, 'h1', 0, { kind: 'enemy', enemyId: e.id })).toContain('wrungOut');
    for (let t = 0; t < 200 && hasStatus(e, 'seized'); t++) stepBattle(s, rules);
    expect(hasStatus(e, 'stunned')).toBe(true);
  });

  it('Voices in the Fog: a scream into a cloud Terrifies everyone in it', () => {
    const s = battle(['manAtArms', 'manAtArms'], ['screamer']);
    const [a, b] = s.enemies;
    freeze(a!, hex(3, 0));
    freeze(b!, hex(4, -1));
    createMistCloud(s, hex(3, 0), rules);
    s.heads[0]!.orderTargetId = a!.id;
    expect(steps(s, 1)).toContain('voicesInTheFog');
    expect(hasStatus(b!, 'terrified')).toBe(true);
  });

  it('Brittle: Sonic Crack on a Corroded human breaks its armor and the shards hurt those nearby', () => {
    const s = quiet(['manAtArms', 'manAtArms'], ['screamer']);
    s.heads[0]!.skills = ['sonicCrack', 'howl'];
    const [a, b] = s.enemies;
    freeze(a!, hex(3, 0));
    freeze(b!, hex(3, -1)); // next to it, but outside the wedge? (it is in the wedge too: hit by the wave, hurt by shards)
    applyStatus(s, a!, 'corroded', rules, 200);
    expect(cast(s, 'h1', 0, { kind: 'hex', at: hex(3, 0) })).toContain('brittle');
    expect(a!.armorBroken).toBe(true);
    expect(b!.hp).toBeLessThan(b!.maxHp);
  });

  it('Pickled: eating a Corroded human heals the body twice as much', () => {
    const s = battle(['manAtArms'], ['glutton']);
    const e = s.enemies[0]!;
    place(e, hex(2, 0));
    e.stepEndTick = Number.MAX_SAFE_INTEGER;
    e.hp = 1;
    e.armorBroken = true;
    applyStatus(s, e, 'corroded', rules, 200);
    s.body.hp = 50;
    expect(steps(s, 1)).toContain('pickled');
    expect(s.body.hp).toBe(50 + 2 * rules.headClasses.glutton!.attack.devourHeal);
  });

  it('Slobber: a lick on a Soaked human makes it slip', () => {
    const s = battle(['manAtArms'], ['tender']);
    const e = s.enemies[0]!;
    freeze(e, hex(2, 0));
    applyStatus(s, e, 'soaked', rules, 200);
    expect(steps(s, 1)).toContain('slobber');
    expect(hasStatus(e, 'stunned')).toBe(true);
  });

  it('Rude Awakening: a scream at an Entranced human Stuns it for long', () => {
    const s = battle(['manAtArms'], ['screamer']);
    const e = s.enemies[0]!;
    freeze(e, hex(3, 0));
    applyStatus(s, e, 'entranced', rules, 200);
    s.heads[0]!.orderTargetId = e.id;
    expect(steps(s, 1)).toContain('rudeAwakening');
    expect(hasStatus(e, 'stunned')).toBe(true);
    expect(hasStatus(e, 'entranced')).toBe(false);
  });

  it('Anointing: acid on an Entranced human keeps it entranced and corrodes it twice as long', () => {
    const s = battle(['manAtArms'], ['acidSpitter']);
    const e = s.enemies[0]!;
    freeze(e, hex(3, 0));
    applyStatus(s, e, 'entranced', rules, 200);
    s.heads[0]!.orderTargetId = e.id;
    expect(steps(s, 1)).toContain('anointing');
    expect(hasStatus(e, 'entranced')).toBe(true);
    const corroded = e.statuses.find((x) => x.id === 'corroded')!;
    expect(corroded.untilTick - s.tick).toBeGreaterThan(rules.statuses.corroded!.durationTicks);
  });

  it('Marsh Light: a Beacon in a cloud reaches further and takes the torch of a Torchbearer who comes', () => {
    const s = quiet(['torchbearer'], ['lantern']);
    const e = s.enemies[0]!;
    place(e, hex(5, -4));
    e.hp = e.maxHp = 99999;
    createMistCloud(s, hex(3, 0), rules);
    expect(cast(s, 'h1', 0, { kind: 'hex', at: hex(3, 0) })).toContain('marshLight');
    expect(s.beacons[0]!.radius).toBe(5);
    steps(s, 60);
    expect(hexDistance(e.hex, hex(3, 0))).toBeLessThanOrEqual(1);
    expect(e.torchOutUntilTick).toBeGreaterThan(s.tick + 1000);
  });

  it('Sanctuary: a Beacon lit while someone is Terrified calls them to the light from anywhere', () => {
    const s = quiet(['manAtArms'], ['lantern']);
    const e = s.enemies[0]!;
    place(e, hex(-1, -3)); // 5 hexes from the light: further than the Beacon's own reach
    e.hp = e.maxHp = 99999;
    applyStatus(s, e, 'terrified', rules, 400);
    expect(cast(s, 'h1', 0, { kind: 'hex', at: hex(3, 0) })).toContain('sanctuary');
    steps(s, 110);
    expect(hexDistance(e.hex, hex(3, 0))).toBeLessThanOrEqual(1);
  });

  it('The Spare in a combo sometimes adds something absurd', () => {
    const r = { ...rules, spareMischief: { ...rules.spareMischief, chance: 1 } };
    const s = battle(['manAtArms'], ['biter', 'spare'], { r });
    const e = s.enemies[0]!;
    freeze(e, hex(-5, 4));
    s.heads[1]!.cooldown = 99999;
    freeze(e, hex(2, 0));
    applyStatus(s, e, 'corroded', r, 200);
    let mischief = 0;
    for (let t = 0; t < 3; t++) {
      stepBattle(s, r);
      mischief += s.events.filter((ev) => ev.type === 'mischief').length;
    }
    expect(mischief).toBeGreaterThan(0);
  });
});

describe('battles with every class', () => {
  const everyone = { ...rules, hatchlingClassPool: Object.keys(rules.headClasses) };

  it('stay deterministic with skills, holds and beacons', () => {
    const play = () => {
      const s = battle(['manAtArms', 'torchbearer', 'headhunter', 'manAtArms', 'torchbearer'], ['strangler', 'lantern', 'tender', 'screamer', 'spare', 'glutton'], { seed: 11, ultimates: true, r: everyone });
      for (let t = 0; t < 20 * 60 && !s.outcome; t++) {
        if (t % 40 === 5) {
          for (const head of s.heads) {
            const target = s.enemies[0];
            const skill = skillInSlot(s, head, t % 3, everyone);
            if (!skill || !target) continue;
            const aim: SkillAim =
              skill.target === 'enemy' ? { kind: 'enemy', enemyId: target.id }
              : skill.target === 'hex' ? { kind: 'hex', at: target.hex }
              : skill.target === 'head' ? { kind: 'head', headId: s.heads[0]!.id }
              : skill.target === 'stump' ? (s.stumps[0] ? { kind: 'stump', stumpId: s.stumps[0].id } : { kind: 'none' })
              : { kind: 'none' };
            applyCommand(s, { type: 'useSkill', headId: head.id, slot: t % 3, aim }, everyone);
          }
        }
        stepBattle(s, everyone);
      }
      return JSON.stringify(s);
    };
    expect(play()).toBe(play());
  });

  it('every group ends against a hydra of any three classes', () => {
    const classes = Object.keys(rules.headClasses);
    let n = 0;
    for (const group of data.enemies.encounterGroups) {
      for (let i = 0; i < classes.length; i++) {
        const trio = [classes[i]!, classes[(i + 3) % classes.length]!, classes[(i + 5) % classes.length]!];
        const s = battle([...group.members], trio, { seed: 100 + n++, r: everyone });
        steps(s, 20 * 600, everyone);
        expect(s.outcome, `${group.id} vs ${trio.join(', ')}`).not.toBeNull();
        expect(s.heads.length).toBeLessThanOrEqual(rules.maxHeads);
        for (const e of s.enemies) expect(bodyDistance(s.body.center, e.hex)).toBeGreaterThan(0);
      }
    }
  }, 120_000);

  it('humans never stand on the body or on each other, whatever is done to them', () => {
    const s = battle(['manAtArms', 'manAtArms', 'headhunter', 'torchbearer', 'manAtArms', 'manAtArms'], ['strangler', 'biter', 'lantern', 'screamer'], { seed: 5, ultimates: true, r: everyone });
    for (const e of s.enemies) e.hp = e.maxHp = 99999;
    s.body.hp = s.body.maxHp = 99999;
    for (let t = 0; t < 20 * 40; t++) {
      if (t % 20 === 0) {
        const target = s.enemies[t % s.enemies.length]!;
        for (const head of s.heads) {
          for (const slot of [0, 1]) {
            const skill = skillInSlot(s, head, slot, everyone)!;
            const aim: SkillAim = skill.target === 'enemy' ? { kind: 'enemy', enemyId: target.id } : skill.target === 'hex' ? { kind: 'hex', at: target.hex } : { kind: 'none' };
            if (skill.target === 'head' || skill.target === 'stump') continue;
            applyCommand(s, { type: 'useSkill', headId: head.id, slot, aim }, everyone);
          }
        }
      }
      stepBattle(s, everyone);
      const keys = s.enemies.map((e) => `${e.hex.q},${e.hex.r}`);
      expect(new Set(keys).size).toBe(keys.length);
      for (const e of s.enemies) expect(bodyDistance(s.body.center, e.hex)).toBeGreaterThan(0);
    }
    void MIDDLE;
  });
});
