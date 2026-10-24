// Test and debug parameters read from the page URL:
//   ?seed=123     replay the same run
//   ?scene=title  jump straight to a scene
//   ?debug=1      show the debug overlay
//   ?group=patrol with ?scene=battle: which enemy group to fight
//   ?hp=5         with ?scene=battle: start the test battle with this much body HP (to see a defeat quickly)
//   ?allies=3     with ?scene=battle: the test battle is the battle for the lair, with this many Broodlings
//   ?speed=4      battles run this many times faster (for tests)
//   ?near=shrine  with ?scene=map: start next to the nearest object of that kind (shrine, passage, encounter, moisture...),
//                 place or threshold (brineLake, saltPlug...), or marking shrine (mark)
//   ?reveal=1     show the whole underground map at the start (to look at what the generator made)
//   ?modifiers=wetYear,oldWorkings  run modifiers that shape the world (world.json runModifiers)
//   ?zoom=0.45    zoom of the map camera (with ?reveal=1, 0.45 shows the whole underground at once)
//   ?say=toadWelcome  with ?scene=map: show this dialogue (dialogues.json) at the start; with ?scene=battle, a
//                 Serpent's battle line (e.g. battleFires) is said when the battle starts
//   ?event=titheBox   with ?scene=map: an event site with this event (events.json) right next to the hydra
//   ?flags=hushedSongHeard,surveyChain  with ?scene=map: story flags set from the start (as if those steps were done)
//   ?conditions=warmed  with ?scene=map: conditions on the hydra from the start (world.json conditions), for 5 turns
//   ?alert=60     with ?scene=map: the Alert at the start (the Order hears of the stages it passes after End Turn)
//   ?units=patrol,messenger  with ?scene=map: the Order's people of these kinds 2–3 hexes from the hydra, in sight
//   ?ancestors=3  the lineage has already lost this many hydras (each with a mutation, slain by the Order), so the
//                 hydra is an heiress: with ?scene=map her map, ?scene=generation the screen after the last death,
//                 ?scene=book the Book of Lineages
//   ?eggs=3       with ?ancestors=: the eggs the last of them left (0: none, so the lineage dies out); 1 if not given
//   ?hidden=1     with ?ancestors=: Old Mother Toad has an egg of the lineage hidden
//   ?heads=strangler,lantern,tender  with ?scene=battle: the test battle's heads, by class (heads.json)
//   ?level=3      with ?scene=battle: the test battle's heads are this level
//   ?ults=1       ultimate skills (key E) can be used in battle
// A URL with any of these but seed, debug, speed and zoom is a test: the saved game is neither loaded nor saved
// (testUrl). ?seed= alone picks the world of a lineage started from the title.

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
  /** Broodlings in a test battle (the battle for the lair), or null for an ordinary battle. */
  allies: number | null;
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
  /** The Alert at the start, or null for the usual. */
  alert: number | null;
  /** Kinds of the Order's units to put near the hydra at the start. */
  units: string[];
  /** Hydras of the lineage that have already died, or null. */
  ancestors: number | null;
  /** Eggs the last ancestor left, or null for the usual one. */
  eggs: number | null;
  /** The lineage has a hidden egg. */
  hidden: boolean;
  /** Head classes for a test battle (empty = the usual heads). */
  heads: string[];
  /** Level of the test battle's heads (null = as they are). */
  level: number | null;
  /** Ultimate skills can be used in battle. */
  ults: boolean;
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
    allies: positive('allies') === null ? null : Math.floor(positive('allies')!),
    speed: positive('speed'),
    near: params.get('near')?.trim() || null,
    reveal: params.get('reveal') === '1' || params.get('reveal') === 'true',
    modifiers: list('modifiers'),
    zoom: positive('zoom'),
    say: params.get('say')?.trim() || null,
    event: params.get('event')?.trim() || null,
    flags: list('flags'),
    conditions: list('conditions'),
    alert: positive('alert'),
    units: list('units'),
    ancestors: positive('ancestors') === null ? null : Math.floor(positive('ancestors')!),
    eggs: (params.get('eggs') ?? '').trim() !== '' && Number.isFinite(Number(params.get('eggs'))) && Number(params.get('eggs')) >= 0 ? Math.floor(Number(params.get('eggs'))) : null,
    hidden: params.get('hidden') === '1' || params.get('hidden') === 'true',
    heads: (params.get('heads') ?? '').split(',').map((h) => h.trim()).filter((h) => h !== ''),
    level: positive('level') === null ? null : Math.floor(positive('level')!),
    ults: params.get('ults') === '1' || params.get('ults') === 'true',
  };
}

/**
 * A test URL: it starts somewhere other than the title, or changes the run. Such a game is played without touching
 * the saved one: nothing is loaded and nothing is saved.
 */
export function testUrl(params: UrlParams): boolean {
  return (
    (params.scene !== null && params.scene !== 'title') ||
    params.near !== null ||
    params.event !== null ||
    params.say !== null ||
    params.flags.length > 0 ||
    params.conditions.length > 0 ||
    params.alert !== null ||
    params.units.length > 0 ||
    params.reveal ||
    params.modifiers.length > 0 ||
    params.group !== null ||
    params.hp !== null ||
    params.allies !== null ||
    params.ancestors !== null ||
    params.eggs !== null ||
    params.hidden ||
    params.heads.length > 0 ||
    params.level !== null ||
    params.ults
  );
}
