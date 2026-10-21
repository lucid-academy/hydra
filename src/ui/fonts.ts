// The game's typefaces in one place, so a new font is a change here and nowhere else (stage "Wygląd mapy").
// The game writes in the "Księga" fonts (GAME_DESIGN.md §13): IM Fell English SC, Alegreya and Alegreya Sans,
// loaded from public/fonts/ (OFL, licences beside the files, CREDITS.md).

export interface Fonts {
  /** Names and headings: places, shrines and blessings, biomes, the end of a battle, the title screen. */
  title: string;
  /** Longer lines read like a book: what a place or a blessing says, Game Over. */
  story: string;
  /** Everything small and quick to read: the top bar, head cards, buttons, notices. */
  text: string;
  /** Lines called out over the battle: a head severed, two growing back, a combo. */
  callout: string;
}

export const FONT: Fonts = {
  title: "'IM Fell English SC', Georgia, serif",
  story: 'Alegreya, Georgia, serif',
  text: "'Alegreya Sans', sans-serif",
  callout: "'IM Fell English SC', Georgia, serif",
};

/** The font files, each a face of a family. */
const BOOK_FACES = [
  { family: 'IM Fell English SC', file: 'fonts/IMFellEnglishSC-Regular.ttf', style: 'normal' },
  { family: 'Alegreya', file: 'fonts/Alegreya-Regular.ttf', style: 'normal' },
  { family: 'Alegreya', file: 'fonts/Alegreya-Italic.ttf', style: 'italic' },
  { family: 'Alegreya Sans', file: 'fonts/AlegreyaSans-Regular.ttf', style: 'normal' },
] as const;

/**
 * Loads the fonts. Resolves when they can be drawn (the first scene waits, because a text keeps the font it was made
 * with); if a file fails to load, the texts fall back to the browser's own fonts named after them.
 */
export async function loadFonts(): Promise<void> {
  try {
    await Promise.all(
      BOOK_FACES.map(async ({ family, file, style }) => {
        const face = new FontFace(family, `url(${file})`, { style });
        document.fonts.add(await face.load());
      }),
    );
  } catch (error) {
    console.warn('A font failed to load; the game uses the browser’s own fonts instead.', error);
  }
}
