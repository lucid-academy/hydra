// Where things are inside the battle graphics and on the battle board.
// Real art has to follow the same numbers, so they are also listed in docs/ASSETS.md.

/** A board tile: a squashed hex seen from a slant (the top face) with its earth wall below. */
export const TILE = { width: 42, faceHeight: 36, wallHeight: 10 };

/** Distance between neighbouring hex centres in a row, and between rows, in screen pixels. */
export const HEX_COLUMN_WIDTH = 42;
export const HEX_ROW_HEIGHT = 27;

/** The body image: where the middle of its seven-hex footprint is, from the image's left and top edges. */
export const BODY_FOOT = { x: 72, y: 70 };

/**
 * The necks leave the body on an oval round the crown of the mound: its middle this far above the middle of the
 * footprint, its half-width and its half-depth (screen pixels). A neck leaves it on the side its head looks to.
 */
export const NECK_RING = { above: 40, halfWidth: 34, halfDepth: 14 };

/** Soldiers stand with their feet this many pixels below the centre of their hex. */
export const FEET_BELOW_HEX_CENTER = 5;

/**
 * The flame of a soldier's torch (battle_enemy_torchbearer), from the bottom middle of the image: this far towards the
 * way the soldier faces (the image faces right) and this far up. The light of the torch shines from here.
 */
export const TORCH_FLAME = { x: 10, y: 32 };

/**
 * The lower jaw (battle_head_jaw, battle_head_<class>_jaw) hangs under the head image, both centred on the same point:
 * its top edge overlaps the head's bottom edge by this many pixels. 3 closes the mouth of the first GPT head: the
 * teeth interlock. A class's own head can need another number.
 */
export const JAW_OVERLAP = 3;
export const JAW_OVERLAP_BY_CLASS: Readonly<Record<string, number>> = {
  // Moss hangs below the Biter's mouth, so the bottom of its image is well under the mouth's line.
  biter: 11,
};
