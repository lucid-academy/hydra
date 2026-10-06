// The game's typefaces in one place, so a new font is a change here and nowhere else (stage "Wygląd mapy",
// GAME_DESIGN.md §13). For now these are the browser's own fonts, so the game looks a little different on every device.

export const FONT = {
  /** Names and headings: places, shrines and blessings, biomes, the end of a battle, the title screen. */
  title: 'Georgia, serif',
  /** Longer lines read like a book: what a place or a blessing says, Game Over. */
  story: 'Georgia, serif',
  /** Everything small and quick to read: the top bar, head cards, buttons, notices. */
  text: 'monospace',
  /** Lines called out over the battle: a head severed, two growing back, a combo. */
  callout: 'monospace',
} as const;
