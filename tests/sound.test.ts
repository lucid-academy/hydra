// M7: sounds made in code (src/audio/synth.ts, src/data/sounds.json) and the player's sound settings.

import { describe, expect, it } from 'vitest';
import { renderSound, soundSeconds } from '../src/audio/synth';
import type { SoundRecipe } from '../src/audio/synth';
import { loadGameData } from '../src/data';
import { SOUND_CUES } from '../src/data/schemas';
import { readSettings, writeSettings } from '../src/save/settings';

const data = loadGameData();
const RATE = 22050;

const peak = (samples: Float32Array) => samples.reduce((m, s) => Math.max(m, Math.abs(s)), 0);

describe('the synth', () => {
  const beep: SoundRecipe = { volume: 1, layers: [{ wave: 'sine', from: 440, to: 440, delay: 0, seconds: 0.1, volume: 1, attack: 0.001 }] };

  it('makes a clip as long as its last layer, starting and ending quiet', () => {
    const late: SoundRecipe = { volume: 1, layers: [...beep.layers, { wave: 'noise', from: 2000, to: 500, delay: 0.2, seconds: 0.3, volume: 0.5, attack: 0.01 }] };
    expect(soundSeconds(late)).toBeCloseTo(0.5);
    const samples = renderSound(late, RATE);
    expect(samples.length).toBe(Math.ceil(0.5 * RATE));
    expect(Math.abs(samples[0]!)).toBeLessThan(0.01);
    expect(Math.abs(samples[samples.length - 1]!)).toBeLessThan(0.01);
    // Silence between the beep and the hiss.
    expect(peak(samples.subarray(Math.floor(0.11 * RATE), Math.floor(0.19 * RATE)))).toBe(0);
  });

  it('a 440 Hz tone crosses zero about 880 times a second', () => {
    const samples = renderSound({ volume: 1, layers: [{ ...beep.layers[0]!, seconds: 1 }] }, RATE);
    let crossings = 0;
    for (let i = 1; i < samples.length / 2; i++) if (Math.sign(samples[i]!) !== Math.sign(samples[i - 1]!)) crossings++;
    expect(crossings / 0.5).toBeGreaterThan(860);
    expect(crossings / 0.5).toBeLessThan(900);
  });

  it("never goes past full scale, and the whole sound's volume scales it", () => {
    const loud: SoundRecipe = { volume: 1, layers: [0, 1, 2, 3].map(() => ({ ...beep.layers[0]!, wave: 'square' as const })) };
    expect(peak(renderSound(loud, RATE))).toBeLessThanOrEqual(1);
    const half = renderSound({ ...beep, volume: 0.5 }, RATE);
    expect(peak(half)).toBeCloseTo(peak(renderSound(beep, RATE)) / 2, 2);
  });

  it('is the same every time (the noise has a fixed seed)', () => {
    const hiss: SoundRecipe = { volume: 1, layers: [{ wave: 'noise', from: 3000, to: 300, delay: 0, seconds: 0.2, volume: 1, attack: 0.01 }] };
    expect(renderSound(hiss, RATE)).toEqual(renderSound(hiss, RATE));
    expect(peak(renderSound(hiss, RATE))).toBeGreaterThan(0.05);
  });

  it('a loop runs on from its end into its start without a jump, and is not quiet at the start', () => {
    const drone: SoundRecipe = {
      volume: 1,
      loop: true,
      layers: [{ wave: 'sine', from: 97, to: 97, delay: 0, seconds: 1.3, volume: 1, attack: 0.01, sustain: true, wobble: { hz: 0.7, depth: 0.5 } }],
    };
    const samples = renderSound(drone, RATE);
    expect(samples.length).toBe(Math.ceil(1.3 * RATE));
    let biggestStep = 0;
    for (let i = 1; i < samples.length; i++) biggestStep = Math.max(biggestStep, Math.abs(samples[i]! - samples[i - 1]!));
    expect(Math.abs(samples[0]! - samples[samples.length - 1]!)).toBeLessThanOrEqual(biggestStep * 1.5);
    expect(peak(samples.subarray(0, Math.floor(0.05 * RATE)))).toBeGreaterThan(0.2);
    // Not looped: the same layer fades out to nothing.
    const once = renderSound({ ...drone, loop: false, layers: [{ ...drone.layers[0]!, sustain: false }] }, RATE);
    expect(Math.abs(once[once.length - 1]!)).toBeLessThan(0.01);
  });

  it('every sound in sounds.json makes a short, audible clip (a background loop, a longer one)', () => {
    for (const [id, sound] of Object.entries(data.sounds.sounds)) {
      const samples = renderSound(sound, RATE);
      expect(samples.length / RATE, id).toBeLessThan(sound.loop ? 15 : 3);
      expect(peak(samples), id).toBeGreaterThan(0.02);
      expect(samples.every((s) => Number.isFinite(s)), id).toBe(true);
    }
  });

  it("the cues name sounds that exist, and the game's moments only", () => {
    for (const [group, cues] of Object.entries(data.sounds.cues)) {
      if (group === '//') continue;
      for (const [cue, id] of Object.entries(cues as Record<string, string>)) {
        expect(data.sounds.sounds, `${group}.${cue}`).toHaveProperty(id);
        expect(SOUND_CUES[group as keyof typeof SOUND_CUES] as readonly string[], group).toContain(cue);
      }
    }
  });

  it('each place has a looped background sound (or none)', () => {
    for (const place of ['underground', 'surface', 'battle'] as const) {
      const id = data.sounds.ambience[place];
      if (id === null) continue;
      expect(data.sounds.sounds, place).toHaveProperty(id);
      expect(data.sounds.sounds[id]!.loop, place).toBe(true);
    }
  });
});

describe('sound settings', () => {
  it('survive being saved, and anything broken or of another format is ignored', () => {
    expect(readSettings(writeSettings({ volume: 0.3, muted: true }))).toEqual({ volume: 0.3, muted: true });
    expect(readSettings(null)).toBeNull();
    expect(readSettings('not json')).toBeNull();
    expect(readSettings(JSON.stringify({ format: 99, volume: 0.3, muted: false }))).toBeNull();
    expect(readSettings(JSON.stringify({ format: 1, volume: 'loud', muted: false }))).toBeNull();
    expect(readSettings(JSON.stringify({ format: 1, volume: 7, muted: false }))).toEqual({ volume: 1, muted: false });
  });
});
