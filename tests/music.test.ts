// Music written as notes (src/audio/music.ts) and the tracks of the biomes (sounds.json music).

import { describe, expect, it } from 'vitest';
import { noteHz, noteLayers } from '../src/audio/music';
import { loadGameData } from '../src/data';

const data = loadGameData();

describe('notes', () => {
  it('a note name is its concert pitch', () => {
    expect(noteHz('A4')).toBeCloseTo(440);
    expect(noteHz('D3')).toBeCloseTo(146.83, 1);
    expect(noteHz('Bb3')).toBeCloseTo(233.08, 1);
    expect(noteHz('F#4')).toBeCloseTo(369.99, 1);
    expect(noteHz('C4')).toBeCloseTo(261.63, 1);
    expect(() => noteHz('H2')).toThrow('not a note');
    expect(() => noteHz('A')).toThrow('not a note');
  });

  it('a note becomes a layer at its beat, with a soft attack no longer than a share of the note', () => {
    const [layer] = noteLayers([{ note: 'A4', at: 4, beats: 2 }], 0.5);
    expect(layer).toMatchObject({ from: 440, to: 440, delay: 2, seconds: 1, wave: 'triangle' });
    expect(layer!.attack).toBeCloseTo(0.25);
    // A long note's attack stops growing, and a slide ends on the other pitch.
    const [slide] = noteLayers([{ note: 'D2', at: 0, beats: 8, slideTo: 'D3' }], 1);
    expect(slide!.attack).toBeCloseTo(0.6);
    expect(slide!.to).toBeCloseTo(noteHz('D3'));
    // What the note spells out wins over the defaults.
    const [own] = noteLayers([{ note: 'C4', at: 1, beats: 1, wave: 'sine', volume: 0.3, attack: 0.02 }], 1);
    expect(own).toMatchObject({ wave: 'sine', volume: 0.3, attack: 0.02 });
  });
});

describe('the music of the biomes', () => {
  it('each biome with music is a real biome and names a looped track that exists', () => {
    for (const [biome, id] of Object.entries(data.sounds.music?.biomes ?? {})) {
      if (biome === '//' || id === null) continue;
      expect(data.biomes.biomes, biome).toHaveProperty(biome);
      expect(data.sounds.sounds, biome).toHaveProperty(id);
      expect(data.sounds.sounds[id]!.loop, biome).toBe(true);
    }
  });
});
