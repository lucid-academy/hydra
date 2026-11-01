// Placeholder sounds made in code (M7, answer E1): each sound is a few layers, a tone sliding from one pitch to
// another or a hiss of noise, each with its own volume, start and length, mixed into one short clip. The recipes are
// data (src/data/sounds.json); a sound file with the same key in the manifest replaces the recipe.
// Plain number work on a Float32Array (no browser, no Phaser), so it can be tested. Deterministic: the noise comes
// from a fixed seed, so a sound is the same every time.

export type Wave = 'sine' | 'square' | 'triangle' | 'sawtooth' | 'noise';

export interface SoundLayer {
  wave: Wave;
  /** Pitch at the start and at the end, in Hz (it slides between them). For noise: how bright it is (a filter, in Hz). */
  from: number;
  to: number;
  /** When it starts after the sound starts, and how long it lasts, in seconds. */
  delay: number;
  seconds: number;
  /** 0..1. */
  volume: number;
  /** Seconds to rise to full volume; then it fades out to the end. */
  attack: number;
}

export interface SoundRecipe {
  layers: readonly SoundLayer[];
  /** 0..1, for the whole sound. */
  volume: number;
}

/** How long the sound is, in seconds: until its last layer ends. */
export function soundSeconds(recipe: SoundRecipe): number {
  return Math.max(0, ...recipe.layers.map((l) => l.delay + l.seconds));
}

/** The sound as samples (-1..1), mono, at `sampleRate` samples a second. */
export function renderSound(recipe: SoundRecipe, sampleRate: number): Float32Array<ArrayBuffer> {
  const length = Math.max(1, Math.ceil(soundSeconds(recipe) * sampleRate));
  const out = new Float32Array(length);
  recipe.layers.forEach((layer, i) => addLayer(out, layer, recipe.volume, sampleRate, 0x5eed + i * 7919));
  for (let i = 0; i < length; i++) out[i] = Math.max(-1, Math.min(1, out[i]!));
  return out;
}

function addLayer(out: Float32Array, layer: SoundLayer, volume: number, sampleRate: number, seed: number): void {
  const start = Math.floor(layer.delay * sampleRate);
  const count = Math.floor(layer.seconds * sampleRate);
  const attack = Math.max(1, Math.floor(layer.attack * sampleRate));
  let phase = 0;
  let noise = seed >>> 0;
  let filtered = 0;
  for (let i = 0; i < count && start + i < out.length; i++) {
    const t = count > 1 ? i / (count - 1) : 0;
    // The pitch slides evenly in octaves (exponentially in Hz), as the ear hears it.
    const hz = layer.from * Math.pow(layer.to / layer.from, t);
    // Rises over `attack`, then fades to nothing at the end.
    const envelope = Math.min(1, i / attack) * (1 - t) * (1 - t);
    let sample: number;
    if (layer.wave === 'noise') {
      noise = (Math.imul(noise, 1664525) + 1013904223) >>> 0;
      const white = noise / 0x80000000 - 1;
      // A one-pole low-pass filter: the higher `hz`, the brighter the hiss.
      const k = 1 - Math.exp((-2 * Math.PI * hz) / sampleRate);
      filtered += k * (white - filtered);
      sample = filtered * 1.6;
    } else {
      phase = (phase + hz / sampleRate) % 1;
      sample = waveAt(layer.wave, phase);
    }
    out[start + i]! += sample * envelope * layer.volume * volume;
  }
}

function waveAt(wave: Exclude<Wave, 'noise'>, phase: number): number {
  switch (wave) {
    case 'sine':
      return Math.sin(phase * 2 * Math.PI);
    case 'square':
      return phase < 0.5 ? 0.6 : -0.6;
    case 'triangle':
      return 1 - 4 * Math.abs(phase - 0.5);
    case 'sawtooth':
      return (2 * phase - 1) * 0.7;
  }
}
