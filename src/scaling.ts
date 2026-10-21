// How the game's picture fits the browser window.
// The screen is always laid out in 640×360 units (SCREEN); what changes is how many canvas pixels a unit gets.
// HD (GAME_DESIGN.md §13): the canvas has as many pixels as the window really shows, one per device pixel,
// and the game zooms its cameras to fill it, so art stays sharp and text, light and darkness get the full resolution.

/** The size the screen is laid out in, whatever the resolution it is drawn at. */
export const SCREEN = { width: 640, height: 360 } as const;

/** The canvas gets at most this many pixels per screen unit: a 4K window would cost a lot to draw for little gain. */
export const MAX_HD_SCALE = 4;

export interface CanvasFit {
  /** Size of the canvas in its own pixels. */
  width: number;
  height: number;
  /** How many page pixels one canvas pixel takes (the canvas's CSS zoom). */
  zoom: number;
}

/**
 * The canvas for a window of this size (in page pixels, with `pixelRatio` device pixels per page pixel).
 * The largest 16:9 picture that fits the window, at the device's resolution, but never under 640×360 pixels
 * (on tiny screens, such as a phone held upright, the canvas is shrunk instead of cut off).
 */
export function fitCanvas(windowWidth: number, windowHeight: number, pixelRatio: number): CanvasFit {
  const fit = Math.min(windowWidth / SCREEN.width, windowHeight / SCREEN.height);
  if (!(fit > 0)) return { width: SCREEN.width, height: SCREEN.height, zoom: 1 };
  const ratio = pixelRatio > 0 ? pixelRatio : 1;
  const scale = Math.max(1, Math.min(MAX_HD_SCALE, fit * ratio));
  const width = Math.round(SCREEN.width * scale);
  const height = Math.round(SCREEN.height * scale);
  return { width, height, zoom: (SCREEN.width * fit) / width };
}
