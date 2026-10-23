import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { lineageRulesFrom, runRulesFrom } from '../src/data/runRules';
import { hexKey } from '../src/sim/hex';
import {
  checkUnlocks,
  currentLineage,
  endLineage,
  generationSeed,
  heritageOf,
  hydraDied,
  inherit,
  modifierFor,
  newProfile,
  remember,
  roman,
  startLineage,
  withNumber,
} from '../src/sim/lineage';
import type { Lineage, LineageRules, Profile } from '../src/sim/lineage';
import { Rng } from '../src/sim/rng';
import { createRun, finishBattle, gainMutation } from '../src/sim/turn';
import type { RunState } from '../src/sim/turn';

const data = loadGameData();
const rules = runRulesFrom(data);
const lineageRules = lineageRulesFrom(data);

/** The living hydra's run, as the game starts it. */
function hatch(profile: Profile, lineage: Lineage): RunState {
  return createRun(generationSeed(lineage), rules, { heritage: heritageOf(profile, lineage) });
}

/** The hydra loses a battle against `groupId` at the first encounter of her map. */
function slay(run: RunState, groupId: string): void {
  const tile = [...run.map.tiles.values()].find((t) => t.object?.kind === 'encounter')!;
  run.pendingBattle = { at: tile.hex, groupId };
  finishBattle(run, { outcome: 'lost', bodyHp: 0, heads: [], newScars: 0, nextId: run.nextId }, rules);
}

/** Every line an epitaph template can become, with {turns} and {biome} filled. */
function couldBe(lines: readonly string[], epitaph: string): boolean {
  return lines.some((l) => new RegExp(`^${l.replace(/[.*+?^$()|[\]\\]/g, '\\$&').replace(/\{\w+\}/g, '.*')}$`).test(epitaph));
}

describe('names', () => {
  it('writes numbers the Roman way', () => {
    expect([1, 2, 3, 4, 9, 14, 40, 90, 400, 1987].map(roman)).toEqual(['I', 'II', 'III', 'IV', 'IX', 'XIV', 'XL', 'XC', 'CD', 'MCMLXXXVII']);
  });

  it('numbers a name that has come before in the lineage', () => {
    expect(withNumber('Mab', ['Mab'])).toBe('Mab');
    expect(withNumber('Mab', ['Mab', 'Orla', 'Mab'])).toBe('Mab II');
    expect(withNumber('Orla', ['Orla', 'Mab', 'Orla', 'Orla'])).toBe('Orla III');
  });

  it('an heiress named after her ancestress gets a number; otherwise a name not used yet', () => {
    const named = (takeAncestorName: number) => {
      const profile = newProfile();
      const r: LineageRules = { ...lineageRules, takeAncestorName };
      const lineage = startLineage(profile, 7, r);
      for (let g = 0; g < 5; g++) {
        const run = hatch(profile, lineage);
        slay(run, 'patrol');
        hydraDied(profile, lineage, run, r);
      }
      return lineage;
    };
    const always = named(1);
    expect(always.names).toEqual(Array(6).fill(always.name));
    expect(always.hydraName).toBe(`${always.name} VI`);
    const never = named(0);
    expect(new Set(never.names).size).toBe(6);
    expect(never.hydraName).toBe(never.names[5]);
  });
});

describe('inheritance', () => {
  it('passes on a random half of the mutations, rounded up, in the order she carried them', () => {
    const rng = new Rng(5);
    expect(inherit([], 0.5, rng)).toEqual([]);
    expect(inherit(['a'], 0.5, rng)).toEqual(['a']);
    expect(inherit(['a', 'b'], 0.5, rng)).toHaveLength(1);
    const five = ['a', 'b', 'c', 'd', 'e'];
    const kept = inherit(five, 0.5, rng);
    expect(kept).toHaveLength(3);
    expect(kept).toEqual(five.filter((id) => kept.includes(id)));
    // Not always the same half.
    const halves = new Set(Array.from({ length: 20 }, () => inherit(five, 0.5, rng).join()));
    expect(halves.size).toBeGreaterThan(1);
  });
});

describe('a lineage', () => {
  it('is named after its first hydra, whose world has the lineage seed', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 123, lineageRules);
    expect(lineageRules.names).toContain(lineage.name);
    expect(lineage.hydraName).toBe(lineage.name);
    expect(lineage.number).toBe(1);
    expect(generationSeed(lineage)).toBe(123);
    expect(currentLineage(profile)).toBe(lineage);
    const run = hatch(profile, lineage);
    expect(run.seed).toBe(123);
    expect(run.generation).toBe(1);
    expect(run.hydra.name).toBe(lineage.name);
    expect(run.lineageName).toBe(lineage.name);
  });

  it('when a hydra dies, she goes into the book and her heiress hatches with half her mutations', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 123, lineageRules);
    const run = hatch(profile, lineage);
    for (const id of ['thickNecked', 'slowBlood', 'echoEared']) gainMutation(run, id, rules, []);
    run.turn = 17;
    slay(run, 'patrol');
    expect(run.deathCause?.groupId).toBe('patrol');

    const entry = hydraDied(profile, lineage, run, lineageRules);
    expect(entry).toMatchObject({ generation: 1, name: lineage.names[0], turns: 17, end: 'slain', mutations: ['thickNecked', 'slowBlood', 'echoEared'] });
    expect(rules.encounterGroupMembers.patrol).toContain(entry.killedBy);
    expect(couldBe(lineageRules.epitaphs.byEnemy[entry.killedBy!] ?? lineageRules.epitaphs.any, entry.epitaph)).toBe(true);
    expect(entry.epitaph).not.toMatch(/[{}]/);
    expect(lineage.chronicle).toEqual([entry]);

    expect(lineage.generation).toBe(2);
    expect(lineage.inherited).toHaveLength(2);
    expect(lineage.mother).toEqual({ name: entry.name, killedBy: entry.killedBy });
    expect(generationSeed(lineage)).not.toBe(123);

    const heir = hatch(profile, lineage);
    expect(heir.generation).toBe(2);
    expect(heir.hydra.name).toBe(lineage.hydraName);
    expect(heir.lineageName).toBe(lineage.name);
    expect(heir.hydra.mutations).toEqual(lineage.inherited);
    expect(heir.hydra.inherited).toEqual(lineage.inherited);
  });

  it('plays out the same from the same seed', () => {
    const play = () => {
      const profile = newProfile();
      const lineage = startLineage(profile, 99, lineageRules);
      for (let g = 0; g < 3; g++) {
        const run = hatch(profile, lineage);
        gainMutation(run, data.mutations.mutations[g]!.id, rules, []);
        gainMutation(run, data.mutations.mutations[g + 3]!.id, rules, []);
        slay(run, 'patrol');
        hydraDied(profile, lineage, run, lineageRules);
      }
      return lineage;
    };
    expect(play()).toEqual(play());
  });

  it('an epitaph is not written twice in a lineage while others are left', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 21, lineageRules);
    const one: LineageRules = { ...lineageRules, epitaphs: { ...lineageRules.epitaphs, byEnemy: {}, any: ['A.', 'B.', 'C.'] } };
    for (let g = 0; g < 4; g++) {
      const run = hatch(profile, lineage);
      slay(run, 'patrol');
      hydraDied(profile, lineage, run, one);
    }
    expect(new Set(lineage.chronicle.slice(0, 3).map((e) => e.epitaph))).toEqual(new Set(['A.', 'B.', 'C.']));
  });

  it('an epitaph without lines for the killer comes from the general ones', () => {
    const profile = newProfile();
    const r: LineageRules = { ...lineageRules, epitaphs: { ...lineageRules.epitaphs, byEnemy: {} } };
    const lineage = startLineage(profile, 3, r);
    const run = hatch(profile, lineage);
    slay(run, 'patrol');
    expect(couldBe(r.epitaphs.any, hydraDied(profile, lineage, run, r).epitaph)).toBe(true);
  });
});

describe('what is remembered', () => {
  const scopes: LineageRules = { ...lineageRules, flagScopes: { ...lineageRules.flagScopes, lifeOnly: 'life' } };

  it('world flags by everyone, lineage flags by her heiresses, flags of her life by nobody', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 5, scopes);
    const run = hatch(profile, lineage);
    run.story.flags.push('heardSerpent', 'ninefoldFriend', 'lifeOnly', 'unlisted');
    slay(run, 'patrol');
    hydraDied(profile, lineage, run, scopes);
    expect(profile.knowledge.flags).toEqual(['heardSerpent']);
    expect(lineage.flags).toEqual(['ninefoldFriend']);
    expect(hatch(profile, lineage).story.flags).toEqual(['heardSerpent', 'ninefoldFriend']);

    // A new lineage keeps world knowledge only.
    endLineage(profile, lineage, null, scopes);
    const next = startLineage(profile, 6, scopes);
    expect(next.number).toBe(2);
    expect(hatch(profile, next).story.flags).toEqual(['heardSerpent']);
  });

  it('dialogues heard and enemies met go to her heiresses; events are once per life', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 5, lineageRules);
    const run = hatch(profile, lineage);
    const dialogue = data.dialogues.dialogues[0]!.id;
    const event = data.events.events[0]!.id;
    run.story.seen.push(dialogue, event);
    run.story.enemyTypesMet.push('manAtArms');
    slay(run, 'patrol');
    hydraDied(profile, lineage, run, lineageRules);
    const heir = hatch(profile, lineage);
    expect(heir.story.seen).toContain(dialogue);
    expect(heir.story.seen).not.toContain(event);
    expect(heir.story.enemyTypesMet).toContain('manAtArms');
  });

  it('places seen by any hydra are known to the world', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 5, lineageRules);
    const run = hatch(profile, lineage);
    const places = [...run.map.tiles.values()].filter((t) => t.object?.kind === 'place');
    const seen = places[0]!;
    const unseen = places.find((t) => t.object?.kind === 'place' && seen.object?.kind === 'place' && t.object.placeId !== seen.object.placeId && !run.visibility.has(hexKey(t.hex)))!;
    run.visibility.set(hexKey(seen.hex), 'remembered');
    remember(profile, lineage, run, lineageRules);
    const id = (t: typeof seen) => (t.object?.kind === 'place' ? t.object.placeId : '');
    expect(profile.knowledge.placesSeen).toContain(id(seen));
    expect(profile.knowledge.placesSeen).not.toContain(id(unseen));
    expect(heritageOf(profile, lineage).placesSeen).toContain(id(seen));
  });
});

describe('ending a lineage', () => {
  it('writes the living hydra into the book as the last of her line', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 8, lineageRules);
    const run = hatch(profile, lineage);
    run.turn = 4;
    endLineage(profile, lineage, run, lineageRules);
    expect(lineage.ended).toBe(true);
    expect(currentLineage(profile)).toBeNull();
    expect(lineage.chronicle).toHaveLength(1);
    expect(lineage.chronicle[0]).toMatchObject({ generation: 1, name: lineage.name, end: 'ended', killedBy: null, turns: 4 });
    expect(couldBe(lineageRules.epitaphs.ended, lineage.chronicle[0]!.epitaph)).toBe(true);
    // Ending it again changes nothing.
    endLineage(profile, lineage, run, lineageRules);
    expect(lineage.chronicle).toHaveLength(1);
  });

  it('an heiress who never hatched is not written down', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 8, lineageRules);
    const run = hatch(profile, lineage);
    slay(run, 'patrol');
    hydraDied(profile, lineage, run, lineageRules);
    endLineage(profile, lineage, run, lineageRules);
    expect(lineage.chronicle.map((e) => e.end)).toEqual(['slain']);
  });
});

describe('unlocks', () => {
  it('a challenge met unlocks its run modifier for the account, once', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 11, lineageRules);
    const run = hatch(profile, lineage);
    expect(checkUnlocks(profile, lineage, run, lineageRules)).toEqual([]);
    expect(modifierFor(profile, lineage, lineageRules)).toBeNull();

    run.story.flags.push('heardMycelium');
    expect(checkUnlocks(profile, lineage, run, lineageRules)).toEqual(['myceliumBloom']);
    expect(checkUnlocks(profile, lineage, run, lineageRules)).toEqual([]);

    run.deepestRing = 3;
    expect(checkUnlocks(profile, lineage, run, lineageRules)).toEqual(['oldWorkings']);

    slay(run, 'patrol');
    hydraDied(profile, lineage, run, lineageRules);
    expect(checkUnlocks(profile, lineage, hatch(profile, lineage), lineageRules)).toEqual(['wetYear']);
    expect(profile.unlocked).toEqual(['myceliumBloom', 'oldWorkings', 'wetYear']);
  });

  it('every generation gets one unlocked modifier or a normal year, the same for the same generation', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 11, lineageRules);
    profile.unlocked.push('wetYear', 'myceliumBloom', 'oldWorkings');
    const picks = new Set<string | null>();
    for (let g = 0; g < 40; g++) {
      const pick = modifierFor(profile, lineage, lineageRules);
      if (pick !== null) expect(profile.unlocked).toContain(pick);
      expect(modifierFor(profile, lineage, lineageRules)).toBe(pick);
      picks.add(pick);
      lineage.generation += 1;
    }
    expect(picks).toContain(null);
    expect(picks.size).toBeGreaterThan(2);
  });

  it('with one modifier unlocked, not every year is that one', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 5, lineageRules);
    profile.unlocked.push('wetYear');
    let wet = 0;
    for (let g = 0; g < 200; g++, lineage.generation++) if (modifierFor(profile, lineage, lineageRules) === 'wetYear') wet++;
    expect(wet).toBeGreaterThan(60);
    expect(wet).toBeLessThan(140);
    expect(modifierFor(profile, lineage, { ...lineageRules, normalYearWeight: 0 })).toBe('wetYear');
  });
});
