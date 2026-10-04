// A tiny window.__hydra object for automated screenshots and smoke tests:
// which scenes have finished drawing, and where on screen the map's clickable hexes are.

export interface ScreenPoint {
  x: number;
  y: number;
  /** Movement points needed to get there. */
  cost: number;
  /** There is an encounter on this hex: walking there starts a battle. */
  encounter: boolean;
  /** Kind of object on this hex (shrine, muck...), or null. */
  object: string | null;
  /** For a place or a threshold: its id (brineLake, saltPlug...). */
  id: string | null;
  /** How many hexes not seen yet would be within sight from there. */
  unexploredNear: number;
}

/** A known closed threshold, or the place the hydra stands on: tapping it opens its panel. */
export interface InspectablePoint {
  x: number;
  y: number;
  object: string;
  id: string;
  /** Hexes from the hydra. */
  distance: number;
}

declare global {
  interface Window {
    __hydra?: {
      readyScenes: string[];
      /** Screen positions (in game pixels, 640×360) of hexes the hydra can reach now. */
      reachableOnScreen?: () => ScreenPoint[];
      /** Screen positions (in game pixels) of thresholds and places a tap would open. */
      inspectableOnScreen?: () => InspectablePoint[];
      /** The open place or threshold panel: where its buttons are (game pixels), or null when none is open. */
      placePanel?: () => { leave: { x: number; y: number }; actions: Array<{ id: string; x: number; y: number; enabled: boolean }> } | null;
      /** Short summary of the current battle; positions in game pixels (640×360). */
      battleSummary?: () => {
        tick: number;
        outcome: string | null;
        paused: boolean;
        enemies: Array<{ id: number; typeId: string; x: number; y: number }>;
        heads: Array<{ id: string; classId: string; x: number; y: number }>;
        /** Ids of the heads the player has picked. */
        selected: string[];
        /** Middle of each head card on screen. */
        cards: Array<{ id: string; x: number; y: number }>;
        /** Enemy each head was ordered to attack (null = none). */
        orders: Record<string, number | null>;
        clouds: number;
        combos: string[];
      };
      /** Short summary of the current run. */
      runSummary?: () => {
        turn: number;
        muck: number;
        moisture: number;
        bones: number;
        alert: number;
        inBattle: boolean;
        /** Standing at a shrine, waiting for Accept or Refuse. */
        atShrine: boolean;
        /** A place's or threshold's panel is open. */
        atPlace: boolean;
        blessings: number;
        explored: number;
        /** Ids of the conditions on the hydra. */
        conditions: string[];
        /** Echoes heard and draughts felt so far. */
        echoes: number;
        draughts: number;
      };
    };
  }
}

function hooks(): NonNullable<Window['__hydra']> {
  window.__hydra ??= { readyScenes: [] };
  return window.__hydra;
}

export function markReady(sceneKey: string): void {
  hooks().readyScenes.push(sceneKey);
}

export function exposeReachable(probe: () => ScreenPoint[]): void {
  hooks().reachableOnScreen = probe;
}

export function exposeInspectable(probe: () => InspectablePoint[]): void {
  hooks().inspectableOnScreen = probe;
}

export function exposeRunSummary(summary: NonNullable<Window['__hydra']>['runSummary']): void {
  hooks().runSummary = summary;
}

export function exposeBattleSummary(summary: NonNullable<Window['__hydra']>['battleSummary']): void {
  hooks().battleSummary = summary;
}

export function exposePlacePanel(probe: NonNullable<Window['__hydra']>['placePanel']): void {
  hooks().placePanel = probe;
}
