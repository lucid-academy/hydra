// The game's sounds (M7): played by name from any scene (`playSound(scene, 'bite')`). A sound with a file in
// src/data/sounds.json is loaded by the boot scene; the others are made from their recipes (synth.ts) into audio
// buffers when the game starts. The volume and mute are the player's settings, remembered in the browser.
// Under everything, the quiet background of the place (sounds.json ambience) plays round and round, and fades into
// the next place's when the hydra goes somewhere else (`setAmbience(scene, 'surface')`).
// Without Web Audio (an old browser) the game is simply silent.

import * as Phaser from 'phaser';
import type { SoundsData } from '../data/schemas';
import { loadSettings, saveSettings } from '../save';
import type { Settings } from '../save';
import { getContext } from '../scenes/context';
import { renderSound } from './synth';

const REGISTRY_KEY = 'soundBoard';
/** A place's background fades in and out over this many seconds. */
const AMBIENCE_FADE_SECONDS = 1.2;

export type AmbiencePlace = 'underground' | 'surface' | 'battle';

/** The cache key of a sound. */
export const soundKey = (id: string): string => `sound_${id}`;

export class SoundBoard {
  readonly settings: Settings;
  private readonly lastPlayed = new Map<string, number>();
  private ambient: { id: string; sound: Phaser.Sound.BaseSound } | null = null;

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

  /**
   * The background of a place (sounds.json ambience), looped; the one before fades out. null: none. Underground,
   * the biome the hydra is in may have its own.
   */
  ambience(place: AmbiencePlace | null, biome?: string): void {
    const ofBiome = place === 'underground' && biome !== undefined ? this.data.ambience.biomes?.[biome] : undefined;
    const id = ofBiome !== undefined ? ofBiome : place ? this.data.ambience[place] : null;
    if ((this.ambient?.id ?? null) === id) return;
    if (this.ambient) this.fade(this.ambient.sound, 0, true);
    this.ambient = null;
    if (id === null || !this.game.cache.audio.exists(soundKey(id))) return;
    try {
      const sound = this.game.sound.add(soundKey(id), { loop: true, volume: 0 });
      sound.play();
      this.fade(sound, this.data.ambience.volume, false);
      this.ambient = { id, sound };
    } catch {
      // No background, then.
    }
  }

  /** Slides a sound's own volume to `to`; when `thenEnd`, it is thrown away once silent. */
  private fade(sound: Phaser.Sound.BaseSound, to: number, thenEnd: boolean): void {
    if (sound instanceof Phaser.Sound.WebAudioSound) {
      const gain = sound.volumeNode.gain;
      const now = (this.game.sound as Phaser.Sound.WebAudioSoundManager).context.currentTime;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(gain.value, now);
      gain.linearRampToValueAtTime(to, now + AMBIENCE_FADE_SECONDS);
    } else if ('setVolume' in sound && typeof sound.setVolume === 'function') {
      sound.setVolume(to);
    }
    // Real time, not the game's: the sound fades even while the game is paused or the scene is gone.
    if (thenEnd) setTimeout(() => sound.destroy(), AMBIENCE_FADE_SECONDS * 1000 + 100);
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
      const samples = renderSound({ layers: sound.layers, volume: sound.volume, loop: sound.loop ?? false }, context.sampleRate);
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

/** The background sound of a place (sounds.json ambience), from any scene; null: silence. */
export function setAmbience(scene: Phaser.Scene, place: AmbiencePlace | null, biome?: string): void {
  soundBoard(scene, getContext(scene).data.sounds).ambience(place, biome);
}
