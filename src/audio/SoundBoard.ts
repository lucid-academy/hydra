// The game's sounds (M7): played by name from any scene (`playSound(scene, 'bite')`). A sound with a file in
// src/data/sounds.json is loaded by the boot scene; the others are made from their recipes (synth.ts) into audio
// buffers when the game starts. The volume and mute are the player's settings, remembered in the browser.
// Without Web Audio (an old browser) the game is simply silent.

import * as Phaser from 'phaser';
import type { SoundsData } from '../data/schemas';
import { loadSettings, saveSettings } from '../save';
import type { Settings } from '../save';
import { getContext } from '../scenes/context';
import { renderSound } from './synth';

const REGISTRY_KEY = 'soundBoard';

/** The cache key of a sound. */
export const soundKey = (id: string): string => `sound_${id}`;

export class SoundBoard {
  readonly settings: Settings;
  private readonly lastPlayed = new Map<string, number>();

  constructor(
    private readonly game: Phaser.Game,
    private readonly data: SoundsData,
  ) {
    this.settings = loadSettings(data.defaultVolume);
    this.apply();
    this.makeMissing();
  }

  /** Plays a sound by its name in sounds.json (unknown or not ready: nothing). The same sound at most every minGapSeconds. */
  play(id: string): void {
    const key = soundKey(id);
    if (this.settings.muted || !this.game.cache.audio.exists(key)) return;
    const now = this.game.loop.time;
    if (now - (this.lastPlayed.get(id) ?? -Infinity) < this.data.minGapSeconds * 1000) return;
    this.lastPlayed.set(id, now);
    try {
      this.game.sound.play(key);
    } catch {
      // A sound that can't play (audio not unlocked yet, no device) is not worth stopping the game for.
    }
  }

  /** Plays the sound of a moment (sounds.json cues), if it has one. */
  cue<G extends keyof SoundsData['cues']>(group: G, name: string): void {
    const id = (this.data.cues[group] as Record<string, string | undefined>)[name];
    if (id) this.play(id);
  }

  setVolume(volume: number): void {
    this.settings.volume = Math.min(1, Math.max(0, volume));
    this.settings.muted = this.settings.volume === 0;
    this.apply();
    saveSettings(this.settings);
  }

  setMuted(muted: boolean): void {
    this.settings.muted = muted;
    this.apply();
    saveSettings(this.settings);
  }

  private apply(): void {
    this.game.sound.volume = this.settings.volume;
    this.game.sound.mute = this.settings.muted;
  }

  /** Every sound without a file is made from its recipe, as a Web Audio buffer in Phaser's audio cache. */
  private makeMissing(): void {
    const manager = this.game.sound;
    if (!(manager instanceof Phaser.Sound.WebAudioSoundManager)) return;
    const context = manager.context;
    for (const [id, sound] of Object.entries(this.data.sounds)) {
      if (this.game.cache.audio.exists(soundKey(id))) continue;
      const samples = renderSound({ layers: sound.layers, volume: sound.volume }, context.sampleRate);
      const buffer = context.createBuffer(1, samples.length, context.sampleRate);
      buffer.copyToChannel(samples, 0);
      this.game.cache.audio.add(soundKey(id), buffer);
    }
  }
}

/** The game's sounds; made the first time a scene asks (after the boot scene has loaded the sound files). */
export function soundBoard(scene: Phaser.Scene, data: SoundsData): SoundBoard {
  let board = scene.registry.get(REGISTRY_KEY) as SoundBoard | undefined;
  if (!board) {
    board = new SoundBoard(scene.game, data);
    scene.registry.set(REGISTRY_KEY, board);
  }
  return board;
}

/** Plays a sound by its name in sounds.json, from any scene. */
export function playSound(scene: Phaser.Scene, id: string): void {
  soundBoard(scene, getContext(scene).data.sounds).play(id);
}

/** Plays the sound of a moment (sounds.json cues: ui, map or battle), from any scene. */
export function playCue(scene: Phaser.Scene, group: keyof SoundsData['cues'], name: string): void {
  soundBoard(scene, getContext(scene).data.sounds).cue(group, name);
}
