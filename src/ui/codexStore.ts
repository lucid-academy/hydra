// The combo codex: which combos the player has ever set off (GAME_DESIGN.md 6.5: found combos are listed by name,
// the rest as "???"). It outlives runs, so it lives in the browser's storage under its own key, with a format version.
// Storage can be missing or blocked (private windows): then the codex simply starts empty each time.

const KEY = 'hydra.codex.v1';
const VERSION = 1;

interface CodexFile {
  version: number;
  combos: string[];
}

export function discoveredCombos(): Set<string> {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const file = JSON.parse(raw) as Partial<CodexFile>;
    if (file.version !== VERSION || !Array.isArray(file.combos)) return new Set();
    return new Set(file.combos.filter((id): id is string => typeof id === 'string'));
  } catch {
    return new Set();
  }
}

/** Notes a combo as found. Returns true if it is new to the codex. */
export function discoverCombo(id: string): boolean {
  const known = discoveredCombos();
  if (known.has(id)) return false;
  known.add(id);
  try {
    const file: CodexFile = { version: VERSION, combos: [...known] };
    window.localStorage.setItem(KEY, JSON.stringify(file));
  } catch {
    // No storage: the combo still counts as new for this battle.
  }
  return true;
}
