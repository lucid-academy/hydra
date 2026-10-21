// What a new generation finds (GAME_DESIGN.md §12): Old Mother Toad and her mother's voice greet her, dialogues heard
// by the lineage are not said again, and the world shows her places no hydra has seen yet.

import { describe, expect, it } from 'vitest';
import { loadGameData } from '../src/data';
import { runRulesFrom } from '../src/data/runRules';
import { generateUnderground } from '../src/sim/map';
import type { UndergroundGeneratorSettings } from '../src/sim/map';
import { conditionsHold, createRun, gainMutation } from '../src/sim/turn';
import type { DialogueRules, Heritage, RunRules } from '../src/sim/turn';

const data = loadGameData();
const rules = runRulesFrom(data);

function dialogue(over: Partial<DialogueRules> & { id: string }): DialogueRules {
  return { trigger: 'newGeneration', priority: 0, once: true, conditions: {}, lines: [{ speaker: 'toad', text: 'Hm.' }], setFlags: [], choices: [], ...over };
}

function withStory(story: Partial<RunRules['story']>): RunRules {
  return { ...rules, story: { ...rules.story, dialogues: [], ...story } };
}

function heiress(over: Partial<Heritage> = {}): Heritage {
  return {
    generation: 3,
    name: 'Mab II',
    lineageName: 'Mab',
    mutations: ['thickNecked'],
    flags: [],
    seen: [],
    enemyTypesMet: [],
    placesSeen: [],
    mother: { name: 'Orla', killedBy: 'headhunter' },
    ...over,
  };
}

describe('a new generation', () => {
  it('is greeted, with her name, her lineage, her mother and what she inherited in the lines', () => {
    const r = withStory({
      dialogues: [dialogue({ id: 'greet', lines: [{ speaker: 'toad', text: '{name} of the Line of {lineage}. {mother} had your {mutation}.' }] })],
    });
    const state = createRun(5, r, { heritage: heiress() });
    expect(state.story.dialogues).toHaveLength(1);
    expect(state.story.dialogues[0]!.lines[0]!.text).toBe('Mab II of the Line of Mab. Orla had your Thick-necked.');
    expect(state.story.seen).toContain('greet');
  });

  it('the first hydra of a lineage has no mother to speak of', () => {
    const r = withStory({ dialogues: [dialogue({ id: 'greet', lines: [{ speaker: 'toad', text: '{mother}.' }] })] });
    expect(createRun(5, r, { heritage: heiress({ generation: 1, mother: null }) }).story.dialogues).toEqual([]);
    expect(createRun(5, r).story.dialogues).toEqual([]);
  });

  it('a line of the ancestress is said in her mother\'s name, and only to an heiress', () => {
    const asleep = dialogue({ id: 'dream', trigger: 'ancestorInSleep', lines: [{ speaker: 'ancestor', text: 'Mind the torches, {name}.' }] });
    const always = withStory({ dialogues: [asleep], ancestorVoiceChance: 1 });
    const line = createRun(5, always, { heritage: heiress() }).story.dialogues[0]!.lines[0]!;
    expect(line).toEqual({ speaker: 'ancestor', name: 'Orla', classId: null, text: 'Mind the torches, Mab II.' });
    expect(createRun(5, withStory({ dialogues: [asleep], ancestorVoiceChance: 0 }), { heritage: heiress() }).story.dialogues).toEqual([]);
    expect(createRun(5, always, { heritage: heiress({ mother: null }) }).story.dialogues).toEqual([]);
  });

  it('her mother\'s killer, her generation and her mutations can pick the lines', () => {
    const state = createRun(5, rules, { heritage: heiress() });
    const facts = { mother: 'Orla', motherKilledBy: 'headhunter', inherited: ['thickNecked'] };
    expect(conditionsHold(state, { motherKilledBy: ['headhunter'] }, facts)).toBe(true);
    expect(conditionsHold(state, { motherKilledBy: ['torchbearer'] }, facts)).toBe(false);
    expect(conditionsHold(state, { motherKilledBy: ['headhunter'] }, { ...facts, motherKilledBy: null })).toBe(false);
    expect(conditionsHold(state, { minGeneration: 3, maxGeneration: 3 })).toBe(true);
    expect(conditionsHold(state, { minGeneration: 4 })).toBe(false);
    expect(conditionsHold(state, { maxGeneration: 2 })).toBe(false);
    expect(conditionsHold(state, { mutations: ['thickNecked'] })).toBe(true);
    expect(conditionsHold(state, { mutations: ['paranoid'] })).toBe(false);
    gainMutation(state, 'paranoid', rules, []);
    expect(conditionsHold(state, { mutations: ['thickNecked', 'paranoid'] })).toBe(true);
    expect(conditionsHold(state, { inheritedAtLeast: 1 }, facts)).toBe(true);
    expect(conditionsHold(state, { inheritedAtLeast: 2 }, facts)).toBe(false);
  });

  it('a dialogue the lineage has heard is not said again', () => {
    const r = withStory({ dialogues: [dialogue({ id: 'greet' }), dialogue({ id: 'again', once: false })] });
    const state = createRun(5, r, { heritage: heiress({ seen: ['greet'] }) });
    expect(state.story.dialogues.map((d) => d.id)).toEqual(['again']);
  });

  it('the dialogues in the data greet every heiress, whoever killed her mother', () => {
    for (const killedBy of [...Object.keys(data.enemies.types), null]) {
      const state = createRun(5, rules, { heritage: heiress({ mother: { name: 'Orla', killedBy } }) });
      expect(state.story.dialogues.length, `killed by ${killedBy}`).toBeGreaterThan(0);
      for (const d of state.story.dialogues) for (const l of d.lines) expect(l.text).not.toMatch(/[{}]/);
    }
  });
});

describe('the world remembers', () => {
  const settings = rules.generator;
  const locations = (biome: string) => settings.places.filter((p) => p.type === 'location' && p.biome === biome).map((p) => p.id);
  const placed = (s: UndergroundGeneratorSettings, seed: number) =>
    [...generateUnderground(seed, s, rules.terrain).tiles.values()].flatMap((t) => (t.object?.kind === 'place' ? [t.object.placeId] : []));

  it('a place no hydra has seen is picked before one the world knows', () => {
    const pool = locations('fungalDeeps');
    expect(pool.length).toBeGreaterThanOrEqual(2);
    const one = { ...settings, locationsPerBiome: [1, 1] as [number, number] };
    const remembered = { ...one, placesSeen: [pool[0]!] };
    let seenBefore = 0;
    for (let seed = 1; seed <= 40; seed++) {
      if (placed(one, seed).includes(pool[0]!)) seenBefore++;
      expect(placed(remembered, seed)).not.toContain(pool[0]);
    }
    expect(seenBefore).toBeGreaterThan(0);
  });

  it('rare places the world knows come up less often', () => {
    const rare = settings.places.filter((p) => p.type === 'rare').map((p) => p.id);
    const never = { ...settings, placesSeen: rare, seenRarePlaceChance: 0 };
    const same = { ...settings, placesSeen: rare, seenRarePlaceChance: 1 };
    let rareBefore = 0;
    for (let seed = 1; seed <= 40; seed++) {
      const plain = generateUnderground(seed, settings, rules.terrain);
      rareBefore += plain.layout.rarePlaces.length;
      expect(generateUnderground(seed, never, rules.terrain).layout.rarePlaces).toEqual([]);
      expect(generateUnderground(seed, same, rules.terrain).layout.rarePlaces).toEqual(plain.layout.rarePlaces);
    }
    expect(rareBefore).toBeGreaterThan(0);
  });
});
