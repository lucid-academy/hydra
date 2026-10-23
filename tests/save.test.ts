import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { lineageRulesFrom, runRulesFrom } from '../src/data/runRules';
import { PROFILE_FORMAT, RUN_FORMAT, readProfile, readRun, writeProfile, writeRun } from '../src/save/format';
import { generationSeed, heritageOf, newProfile, startLineage } from '../src/sim/lineage';
import { createRun, endTurn, moveHydra, reachableHexes } from '../src/sim/turn';
import type { RunState } from '../src/sim/turn';
import { hexKey } from '../src/sim/hex';

const data = loadGameData();
const rules = runRulesFrom(data);
const lineageRules = lineageRulesFrom(data);

/** A few turns of play, the same each time: walk to the farthest hex in reach (the first of equals), end the turn. */
function play(state: RunState, turns: number): void {
  for (let t = 0; t < turns && !state.over; t++) {
    if (state.pendingBattle || state.pendingShrine || state.pendingPlace || state.pendingEvent) return;
    const reach = [...reachableHexes(state, rules).entries()].sort((a, b) => b[1].cost - a[1].cost || a[0].localeCompare(b[0]));
    const target = reach[0];
    if (target) moveHydra(state, target[1].path[target[1].path.length - 1]!, rules);
    endTurn(state, rules);
  }
}

describe('the saved run', () => {
  it('comes back the same, and plays on the same', () => {
    const state = createRun(123, rules);
    play(state, 3);
    const loaded = readRun(writeRun({ lineage: 1, generation: 1, state }));
    expect(loaded).not.toBeNull();
    expect(loaded!.lineage).toBe(1);
    expect(loaded!.state).toEqual(state);
    expect(loaded!.state.map.tiles).toBeInstanceOf(Map);
    play(state, 4);
    play(loaded!.state, 4);
    expect(loaded!.state).toEqual(state);
  });

  it('a run of another format, or a broken one, is dropped', () => {
    const state = createRun(5, rules);
    const text = writeRun({ lineage: 1, generation: 1, state });
    expect(readRun(text.replace(`"format":${RUN_FORMAT}`, `"format":${RUN_FORMAT + 1}`))).toBeNull();
    expect(readRun(text.slice(0, text.length / 2))).toBeNull();
    expect(readRun('{"format":1,"lineage":1,"generation":1,"state":{}}')).toBeNull();
    expect(readRun(null)).toBeNull();
  });

  it('is small enough for the browser to keep', () => {
    const state = createRun(123, rules);
    for (const key of state.map.tiles.keys()) state.visibility.set(key, 'remembered');
    // localStorage keeps about 5 MB per site; a run should take a small part of it.
    expect(writeRun({ lineage: 1, generation: 1, state }).length).toBeLessThan(1_000_000);
    expect(state.visibility.get(hexKey(state.map.lair))).toBeDefined();
  });
});

describe('the saved profile', () => {
  it('comes back the same', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 9, lineageRules);
    profile.knowledge.flags.push('heardSerpent');
    profile.unlocked.push('wetYear');
    const run = createRun(generationSeed(lineage), rules, { heritage: heritageOf(profile, lineage) });
    expect(run.hydra.name).toBe(lineage.name);
    expect(readProfile(writeProfile(profile))).toEqual(profile);
  });

  it('a profile of the first format (before eggs) is brought up to date, its book and unlocks kept', () => {
    const profile = newProfile();
    const lineage = startLineage(profile, 9, lineageRules);
    lineage.inherited = ['thickNecked'];
    profile.unlocked.push('wetYear');
    const old = JSON.parse(writeProfile(profile)) as { format: number; profile: { lineages: Array<Record<string, unknown>> } };
    old.format = 1;
    for (const l of old.profile.lineages) {
      delete l.eggs;
      delete l.hiddenEgg;
    }
    const read = readProfile(JSON.stringify(old));
    expect(read).toEqual(profile);
    expect(read?.lineages[0]).toMatchObject({ eggs: null, hiddenEgg: null, inherited: ['thickNecked'] });
  });

  it('a profile of another format, or a broken one, is a fresh start', () => {
    const text = writeProfile(newProfile());
    expect(readProfile(text.replace(`"format":${PROFILE_FORMAT}`, '"format":99'))).toBeNull();
    expect(readProfile(text.replace(`"format":${PROFILE_FORMAT}`, '"format":0'))).toBeNull();
    expect(readProfile('{"format":1,"profile":{"lineages":[{}],"knowledge":{"flags":[],"placesSeen":[]},"unlocked":[]}}')).toBeNull();
    expect(readProfile('not json')).toBeNull();
    expect(readProfile(null)).toBeNull();
  });
});
