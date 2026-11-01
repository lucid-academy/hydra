// The Eternal Flame on the battle board, in the castle's cathedral (M7, castle.json eternalFlame). The simulation
// keeps its strength (sim/battle EternalFlame); this draws it: one image (battle_eternal_flame) that flickers in code,
// a warm glow and light that shrink as it is smothered, a bar of its strength over it, and smoke when it goes out.

import * as Phaser from 'phaser';
import type { EternalFlame } from '../sim/battle';
import { LIGHT_TEXTURE, LIGHT_TEXTURE_SIZE } from './mapLight';
import type { Light } from './mapLight';
import { FONT } from '../ui/fonts';

interface Point {
  x: number;
  y: number;
}

/**
 * How it looks (screen units): its fire is this high over its feet; it lights this far round (at full strength,
 * flickering); the glow round the fire is this wide; the bar over it is this wide, this far over the feet; it sways
 * this much (a fraction of its height). Out, it is drawn this dark.
 */
const FLAME_LOOK = {
  fireY: 40,
  light: { radius: 150, strength: 0.6, flicker: 0.12 },
  glow: { size: 70, alpha: 0.65 },
  bar: { width: 30, above: 62 },
  label: { right: 18, above: 50 },
  sway: 0.03,
  outTint: 0x4a4440,
} as const;

export interface FlameDepths {
  standing: number;
  glow: number;
  overlay: number;
}

export class FlameView {
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private readonly bar: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private shown = -1;
  private out = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly feet: Point,
    private readonly colors: { fire: number; ember: number; text: string },
    /** Its line beside it, with {n}: percent of its strength left (castle.json texts flameLine). */
    private readonly line: string,
    depths: FlameDepths,
    shadow: Phaser.GameObjects.Image,
  ) {
    this.sprite = scene.add.image(feet.x, feet.y, 'battle_eternal_flame').setOrigin(0.5, 1).setDepth(depths.standing + feet.y / 1000);
    shadow.setPosition(feet.x, feet.y);
    this.glow = scene.add
      .image(feet.x, feet.y - FLAME_LOOK.fireY, LIGHT_TEXTURE)
      .setScale(FLAME_LOOK.glow.size / LIGHT_TEXTURE_SIZE)
      .setTint(colors.ember)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(depths.glow);
    this.bar = scene.add.graphics().setDepth(depths.overlay);
    this.label = scene.add
      .text(feet.x + FLAME_LOOK.label.right, feet.y - FLAME_LOOK.label.above, '', { fontFamily: FONT.text, fontSize: '9px', color: colors.text, backgroundColor: '#05090acc', padding: { x: 2, y: 0 } })
      .setDepth(depths.overlay);
  }

  /** Where its fire is, for words said over it. */
  get fire(): Point {
    return { x: this.feet.x, y: this.feet.y - FLAME_LOOK.fireY };
  }

  /** Draws it as it is now; returns the light it gives (none once it is out). */
  update(flame: EternalFlame, now: number): Light | null {
    if (flame.out && !this.out) this.goOut();
    this.bar.clear();
    if (this.out) return null;
    const share = Math.max(0, flame.strength / flame.maxStrength);
    const percent = Math.ceil(share * 100);
    if (percent !== this.shown) {
      this.shown = percent;
      this.label.setText(this.line.replace('{n}', String(percent)));
    }
    const flicker = 1 - FLAME_LOOK.light.flicker * (0.5 + 0.5 * Math.sin(now / 70) * Math.sin(now / 29));
    // It sways and shrinks a little as it is smothered (the stone under it does too: placeholder art, one image).
    this.sprite.setScale(1, 1 - FLAME_LOOK.sway * (1 - flicker) * 4 - 0.06 * (1 - share));
    this.glow.setAlpha(FLAME_LOOK.glow.alpha * flicker * (0.35 + 0.65 * share)).setScale((FLAME_LOOK.glow.size * (0.5 + 0.5 * share)) / LIGHT_TEXTURE_SIZE);
    const { width, above } = FLAME_LOOK.bar;
    const x = Math.round(this.feet.x - width / 2);
    const y = Math.round(this.feet.y - above);
    this.bar.fillStyle(0x000000, 0.7);
    this.bar.fillRect(x - 1, y - 1, width + 2, 4);
    this.bar.fillStyle(this.colors.fire);
    this.bar.fillRect(x, y, Math.round(width * share), 2);
    const fire = this.fire;
    return { x: fire.x, y: fire.y, radius: FLAME_LOOK.light.radius * (0.4 + 0.6 * share), color: this.colors.ember, strength: FLAME_LOOK.light.strength * flicker * (0.3 + 0.7 * share) };
  }

  /** Out: the fire is gone and the stone goes dark, with a last wisp of smoke going up. */
  private goOut(): void {
    this.out = true;
    this.glow.destroy();
    this.label.destroy();
    this.sprite.setScale(1).setTint(FLAME_LOOK.outTint);
    const wisp = this.scene.add.image(this.fire.x, this.fire.y, LIGHT_TEXTURE).setScale(0.4).setTint(0x8a8478).setAlpha(0.8).setDepth(this.sprite.depth + 0.001);
    this.scene.tweens.add({ targets: wisp, y: this.fire.y - 40, alpha: 0, scale: 1, duration: 2200, ease: 'Quad.easeOut', onComplete: () => wisp.destroy() });
  }
}
