// Where the game is saved: the browser's localStorage. Reading or writing can fail (a private window, storage full or
// turned off); then the game goes on without saving.

export const SAVE_KEYS = { profile: 'hydra.profile.v1', run: 'hydra.run.v1' } as const;

export function readSaved(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Returns whether it was saved. */
export function writeSaved(key: string, text: string): boolean {
  try {
    window.localStorage.setItem(key, text);
    return true;
  } catch {
    return false;
  }
}

export function removeSaved(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Nothing to do: there is no storage to remove it from.
  }
}
