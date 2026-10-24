import { describe, expect, it } from 'vitest';
import { hex } from '../src/sim/hex';
import { acceptBlessing, createRun, endTurn, finishBattle, gainMutation, lookAround, moveHydra, startingHeadCount } from '../src/sim/turn';
import type { Heritage, RunEvent, RunRules, RunState } from '../src/sim/turn';
import { flatMap, rules, runOn, testRules } from './runHelpers';

function heritage(mutations: string[]): Heritage {
  return { generation: 2, name: 'Mab II', lineageName: 'Mab', mutations, flags: [], seen: [], enemyTypesMet: [], placesSeen: [], mother: null };
}

const born = (mutations: string[], seed = 123): RunState => createRun(seed, rules, { heritage: heritage(mutations) });

describe('mutations at birth', () => {
  it('without mutations a hydra hatches as before', () => {
    const plain = createRun(123, rules);
    const heir = born([]);
    expect(heir.hydra.heads).toEqual(plain.hydra.heads);
    expect(heir.map.tiles).toEqual(plain.map.tiles);
    expect(heir.hydra.name).toBe('Mab II');
    expect(heir.generation).toBe(2);
  });

  it('change her numbers before the first turn', () => {
    const plain = createRun(123, rules);
    const long = born(['longBodied', 'slowBlood']);
    expect(long.hydra.movementPerTurn).toBe(plain.hydra.movementPerTurn); // +1 and −1
    expect(long.hydra.movementLeft).toBe(plain.hydra.movementLeft);
    expect(long.hydra.bodyMaxHp).toBe(plain.hydra.bodyMaxHp - 30);
    expect(long.hydra.bodyHp).toBe(long.hydra.bodyMaxHp);
    expect(long.hydra.regeneration).toBe(plain.hydra.regeneration + 6);
    expect(long.hydra.mutations).toEqual(['longBodied', 'slowBlood']);
    expect(long.hydra.inherited).toEqual(['longBodied', 'slowBlood']);

    const thick = born(['thickNecked']);
    thick.hydra.heads.forEach((h, i) => {
      expect(h.maxHp).toBe(Math.round(plain.hydra.heads[i]!.maxHp * 1.2));
      expect(h.hp).toBe(h.maxHp);
    });
  });

  it('can add a head or take one away, never below one or above the limit', () => {
    const plain = createRun(123, rules);
    expect(born(['manyMouthed']).hydra.heads).toHaveLength(plain.hydra.heads.length + 1);
    expect(born(['paranoid']).hydra.heads).toHaveLength(plain.hydra.heads.length - 1);
    expect(born(['paranoid']).hydra.sightRange).toBe(plain.hydra.sightRange + 1);
    const many: RunRules = { ...rules, mutations: { ...rules.mutations, fewer: { startingHeads: -9 }, more: { startingHeads: 99 } } };
    expect(startingHeadCount(['fewer'], many)).toBe(1);
    expect(startingHeadCount(['more'], many)).toBe(rules.maxHeads);
    // Heads still have different names and ids.
    const heads = born(['manyMouthed']).hydra.heads;
    expect(new Set(heads.map((h) => h.name)).size).toBe(heads.length);
    expect(new Set(heads.map((h) => h.id)).size).toBe(heads.length);
  });
});

describe('a mutation gained in her life', () => {
  it('is felt at once, and only once', () => {
    const state = runOn(flatMap(5));
    const before = { ...state.hydra, heads: state.hydra.heads.map((h) => ({ ...h })) };
    const events: RunEvent[] = [];
    gainMutation(state, 'longBodied', testRules, events);
    expect(events).toEqual([{ type: 'mutationGained', id: 'longBodied' }]);
    expect(state.hydra.movementPerTurn).toBe(before.movementPerTurn + 1);
    expect(state.hydra.movementLeft).toBe(before.movementLeft + 1);
    expect(state.hydra.bodyMaxHp).toBe(before.bodyMaxHp - 30);
    gainMutation(state, 'longBodied', testRules, events);
    expect(state.hydra.movementPerTurn).toBe(before.movementPerTurn + 1);
    expect(state.hydra.mutations).toEqual(['longBodied']);
    expect(() => gainMutation(state, 'nonsense', testRules, [])).toThrow(/nonsense/);
  });

  it('heads grow by the change, keeping their share of HP; heads grown later get it too', () => {
    const state = runOn(flatMap(5));
    const head = state.hydra.heads[0]!;
    const classMaxHp = head.maxHp;
    head.hp = Math.round(classMaxHp / 2);
    gainMutation(state, 'thickNecked', testRules, []);
    expect(head.maxHp).toBe(Math.round(classMaxHp * 1.2));
    expect(head.hp).toBe(Math.round((Math.round(classMaxHp / 2) * head.maxHp) / classMaxHp));
    // Many-mouthed on top: +20% −15% of the class's HP.
    gainMutation(state, 'manyMouthed', testRules, []);
    expect(head.maxHp).toBe(Math.round(classMaxHp * 1.05));
    expect(state.hydra.heads).toHaveLength(3); // more heads only at birth

    // A head grown in the lair has the mutation too.
    state.hydra.scars = 1;
    endTurn(state, testRules);
    const grown = state.hydra.heads.slice(3);
    expect(grown.length).toBeGreaterThan(0);
    for (const h of grown) expect(h.maxHp).toBe(Math.round(testRules.headMaxHp[h.classId]! * 1.05));
  });

  it('heads grown in battle get it as well', () => {
    const state = runOn(flatMap(4, (tiles) => {
      tiles.get('1,0')!.object = { kind: 'encounter', groupId: 'patrol', tier: 1 };
    }));
    gainMutation(state, 'thickNecked', testRules, []);
    moveHydra(state, hex(1, 0), testRules);
    const heads = state.hydra.heads.map((h) => ({ ...h }));
    const classMaxHp = testRules.headMaxHp.biter!;
    const grown = { id: 'h99', name: 'New', classId: 'biter', level: 1, hp: classMaxHp, maxHp: classMaxHp };
    finishBattle(state, { outcome: 'won', bodyHp: 50, heads: [...heads, grown], newScars: 0, nextId: 100 }, testRules);
    expect(state.hydra.heads.find((h) => h.id === 'h99')!.maxHp).toBe(Math.round(classMaxHp * 1.2));
    // Heads she already had keep what the battle left them (and gain experience for it).
    expect(state.hydra.heads.slice(0, 3)).toEqual(heads.map((h) => ({ ...h, xp: testRules.experience.perBattleWon })));
  });

  it('Bog-scented: the Alert rises slower', () => {
    const plain = runOn(flatMap(6));
    const scented = runOn(flatMap(6));
    gainMutation(scented, 'bogScented', testRules, []);
    plain.visibility = new Map();
    scented.visibility = new Map();
    for (const s of [plain, scented]) for (const key of s.map.tiles.keys()) if (key !== '3,0') s.visibility.set(key, 'remembered');
    moveHydra(plain, hex(2, 0), testRules);
    moveHydra(scented, hex(2, 0), testRules);
    expect(plain.alert).toBeGreaterThan(0);
    expect(scented.alert).toBeCloseTo(plain.alert * 0.75);
  });

  it("Hoarder's Gut: more Muck from a deposit", () => {
    const state = runOn(flatMap(4, (tiles) => {
      tiles.get('1,0')!.object = { kind: 'muck', amount: 10, rich: false };
    }));
    gainMutation(state, 'hoardersGut', testRules, []);
    const events = moveHydra(state, hex(1, 0), testRules);
    expect(state.resources.muck).toBe(13);
    expect(events).toContainEqual({ type: 'collected', resource: 'muck', amount: 13, rich: false, at: hex(1, 0) });
  });

  it('Echo-eared: echoes are heard from further away', () => {
    const heard = (mutations: string[]) => {
      const state = runOn(flatMap(9, (tiles) => {
        // A wall all around the lair, so nothing beyond it is seen.
        for (const [key, t] of tiles) if (t.hex.q === 2) tiles.set(key, { ...t, terrain: 'rock' });
      }));
      state.visibility = new Map();
      state.map = { ...state.map, layout: { ...state.map.layout, echoSources: [{ at: hex(6, 0), placeId: 'test', biome: 'lairSwamp' }] } };
      for (const id of mutations) gainMutation(state, id, testRules, []);
      const events: RunEvent[] = [];
      lookAround(state, testRules, events);
      return events.some((e) => e.type === 'echoHeard');
    };
    expect(testRules.echoRange).toBeLessThan(6);
    expect(testRules.echoRange + (testRules.mutations.echoEared?.echoRange ?? 0)).toBeGreaterThanOrEqual(6);
    expect(heard([])).toBe(false);
    expect(heard(['echoEared'])).toBe(true);
  });
});

describe('marking shrines', () => {
  function markedRun(): RunState {
    for (let seed = 1; seed < 200; seed++) {
      const state = createRun(seed, rules);
      if ([...state.map.tiles.values()].some((t) => t.object?.kind === 'shrine' && t.object.mark)) return state;
    }
    throw new Error('no marking shrine in 200 seeds');
  }

  it('now and then one shrine of a deeper ring offers a mutation she does not carry', () => {
    let marked = 0;
    for (let seed = 1; seed <= 100; seed++) {
      const state = createRun(seed, rules);
      const marks = [...state.map.tiles.values()].filter((t) => t.object?.kind === 'shrine' && t.object.mark);
      expect(marks.length).toBeLessThanOrEqual(1);
      for (const t of marks) {
        expect(rules.marks.rings).toContain(t.ring);
        expect(t.region).toBe('ring');
        if (t.object?.kind === 'shrine') expect(Object.keys(rules.mutations)).toContain(t.object.mark);
      }
      marked += marks.length;
    }
    expect(marked).toBeGreaterThan(20);
    expect(marked).toBeLessThan(60);
  });

  it('accepting the mark gives the mutation instead of the blessing', () => {
    const state = markedRun();
    const tile = [...state.map.tiles.values()].find((t) => t.object?.kind === 'shrine' && t.object.mark)!;
    const shrine = tile.object as { kind: 'shrine'; blessingId: string; used: boolean; mark?: string };
    state.pendingShrine = tile.hex;
    const events = acceptBlessing(state, rules);
    expect(events).toEqual([
      { type: 'markAccepted', mutationId: shrine.mark },
      { type: 'mutationGained', id: shrine.mark },
    ]);
    expect(state.hydra.mutations).toEqual([shrine.mark]);
    expect(state.hydra.blessings).toEqual([]);
    expect(shrine.used).toBe(true);
    expect(state.pendingShrine).toBeNull();
  });

  it('a mark never offers what she already carries', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const all = Object.keys(rules.mutations);
      const state = createRun(seed, rules, { heritage: heritage(all.slice(0, all.length - 1)) });
      for (const t of state.map.tiles.values()) {
        if (t.object?.kind === 'shrine' && t.object.mark) expect(t.object.mark).toBe(all[all.length - 1]);
      }
    }
  });
});
