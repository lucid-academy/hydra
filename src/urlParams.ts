// Test and debug parameters read from the page URL:
//   ?seed=123     replay the same run
//   ?scene=title  jump straight to a scene
//   ?debug=1      show the debug overlay
//   ?group=patrol with ?scene=battle: which enemy group to fight
//   ?hp=5         with ?scene=battle: start the test battle with this much body HP (to see a defeat quickly)
//   ?speed=4      battles run this many times faster (for tests)
//   ?near=shrine  with ?scene=map: start next to the nearest object of that kind (shrine, passage, encounter, moisture...)
//   ?reveal=1     show the whole underground map at the start (to look at what the generator made)
//   ?modifiers=wetYear,oldWorkings  run modifiers that shape the world (world.json runModifiers)
//   ?zoom=0.45    zoom of the map camera (with ?reveal=1, 0.45 shows the whole underground at once)
//   ?say=toadWelcome  with ?scene=map: show this dialogue (dialogues.json) at the start; with ?scene=battle, a
//                 Serpent's battle line (e.g. battleFires) is said when the battle starts
//   ?event=titheBox   with ?scene=map: an event site with this event (events.json) right next to the hydra
//   ?flags=hushedSongHeard,surveyChain  with ?scene=map: story flags set from the start (as if those steps were done)
//   ?conditions=warmed  with ?scene=map: conditions on the hydra from the start (world.json conditions), for 5 turns

import { seedFromString } from './sim/rng';

export interface UrlParams {
  /** Seed from the URL, or null if none was given. */
  seed: number | null;
  /** Scene key to start in, or null for the normal flow. */
  scene: string | null;
  debug: boolean;
  /** Enemy group for a test battle, or null for the default. */
  group: string | null;
  /** Body HP at the start of a test battle, or null for full health. */
  hp: number | null;
  /** Battles run this many times faster, or null for normal speed. */
  speed: number | null;
  /** Start the map next to the nearest object of this kind, or null. */
  near: string | null;
  /** Show the whole map at the start. */
  reveal: boolean;
  /** Run modifiers (ids from world.json runModifiers), in the order given. */
  modifiers: string[];
  /** Zoom of the map camera, or null for the usual one. */
  zoom: number | null;
  /** A dialogue to show at the start (or a Serpent's line for a test battle), or null. */
  say: string | null;
  /** An event to put next to the hydra at the start, or null. */
  event: string | null;
  /** Story flags set at the start. */
  flags: string[];
  /** Conditions on the hydra at the start (world.json conditions). */
  conditions: string[];
}

export function parseUrlParams(search: string): UrlParams {
  const params = new URLSearchParams(search);
  const seedText = params.get('seed');
  const scene = params.get('scene');
  const debug = params.get('debug');
  const group = params.get('group');
  /** A comma-separated list, without blanks or repeats. */
  const list = (name: string): string[] => [...new Set((params.get(name) ?? '').split(',').map((m) => m.trim()).filter((m) => m !== ''))];
  const positive = (name: string): number | null => {
    const value = Number(params.get(name) ?? '');
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  return {
    seed: seedText !== null && seedText.trim() !== '' ? seedFromString(seedText) : null,
    scene: scene !== null && scene.trim() !== '' ? scene.trim() : null,
    debug: debug === '1' || debug === 'true',
    group: group !== null && group.trim() !== '' ? group.trim() : null,
    hp: positive('hp'),
    speed: positive('speed'),
    near: params.get('near')?.trim() || null,
    reveal: params.get('reveal') === '1' || params.get('reveal') === 'true',
    modifiers: list('modifiers'),
    zoom: positive('zoom'),
    say: params.get('say')?.trim() || null,
    event: params.get('event')?.trim() || null,
    flags: list('flags'),
    conditions: list('conditions'),
  };
}
