// Music written as notes (the trial for Fungal Deeps): a track in src/data/sounds.json may carry `notes`, events
// like { "note": "D3", "at": 4, "beats": 3 }, next to its layers. Before the synth renders the track, each note
// becomes an ordinary layer: a tone at the note's pitch, starting `at` beats in and lasting `beats`, with a soft
// attack. Times are in beats (the track's beatSeconds says how long a beat is), so a melody reads like a score.
// Plain number work, no browser, so it can be tested.

import type { SoundLayer, Wave } from './synth';

export interface NoteEvent {
  /** "A4", "Bb2", "F#3": a letter, b or # if any, then the octave. A4 is 440 Hz. */
  note: string;
  /** When it starts, in beats from the track's start. */
  at: number;
  beats: number;
  /** The note slides to this pitch over its length (a fall, a bend). */
  slideTo?: string;
  wave?: Exclude<Wave, 'noise'>;
  volume?: number;
  /** Seconds to full volume: music swells softly, so the default is slow for long notes. */
  attack?: number;
  wobble?: { hz: number; depth: number };
}

/** How a note turns into a layer when it doesn't say otherwise. */
const NOTE_DEFAULTS = { wave: 'triangle', volume: 0.15, attackShare: 0.25, attackMost: 0.6 } as const;

const STEPS: Readonly<Record<string, number>> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** The pitch of a note name, in Hz: noteHz("A4") is 440. */
export function noteHz(name: string): number {
  const match = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!match) throw new Error(`not a note: "${name}" (write it like "D3", "Bb2" or "F#4")`);
  const step = STEPS[match[1]!]! + (match[2] === '#' ? 1 : match[2] === 'b' ? -1 : 0);
  const midi = (Number(match[3]) + 1) * 12 + step;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** The notes of a track as synth layers, their times turned from beats into seconds. */
export function noteLayers(notes: readonly NoteEvent[], beatSeconds: number): SoundLayer[] {
  return notes.map((event) => {
    const seconds = event.beats * beatSeconds;
    const hz = noteHz(event.note);
    return {
      wave: event.wave ?? NOTE_DEFAULTS.wave,
      from: hz,
      to: event.slideTo !== undefined ? noteHz(event.slideTo) : hz,
      delay: event.at * beatSeconds,
      seconds,
      volume: event.volume ?? NOTE_DEFAULTS.volume,
      attack: event.attack ?? Math.min(NOTE_DEFAULTS.attackMost, seconds * NOTE_DEFAULTS.attackShare),
      wobble: event.wobble,
    };
  });
}
