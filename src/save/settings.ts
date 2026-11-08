// The player's settings (M7): the sound's volume and whether it is muted. Kept in the browser apart from the saved
// game, with a format number like the saves, so a new version of the game never trips over old settings. They are
// kept on test URLs too: they change nothing in the game itself.

import { readSaved, writeSaved } from './storage';

export const SETTINGS_KEY = 'hydra.settings.v1';
export const SETTINGS_FORMAT = 1;

export interface Settings {
  /** 0..1. */
  volume: number;
  muted: boolean;
  /** The map's view the player chose (GAME_DESIGN.md §5.9), or null for the usual one of the screen. */
  mapView: MapView | null;
}

export type MapView = 'near' | 'far';

/** The settings in `text`, or null when there are none or they are of another format or broken. */
export function readSettings(text: string | null): Settings | null {
  if (text === null) return null;
  try {
    const saved: unknown = JSON.parse(text);
    if (typeof saved !== 'object' || saved === null) return null;
    const { format, volume, muted, mapView } = saved as Record<string, unknown>;
    if (format !== SETTINGS_FORMAT || typeof volume !== 'number' || !Number.isFinite(volume) || typeof muted !== 'boolean') return null;
    // Settings saved before the Big World have no view yet.
    return { volume: Math.min(1, Math.max(0, volume)), muted, mapView: mapView === 'near' || mapView === 'far' ? mapView : null };
  } catch {
    return null;
  }
}

export function writeSettings(settings: Settings): string {
  return JSON.stringify({ format: SETTINGS_FORMAT, ...settings });
}

export function loadSettings(defaultVolume: number): Settings {
  return readSettings(readSaved(SETTINGS_KEY)) ?? { volume: defaultVolume, muted: false, mapView: null };
}

export function saveSettings(settings: Settings): void {
  writeSaved(SETTINGS_KEY, writeSettings(settings));
}
