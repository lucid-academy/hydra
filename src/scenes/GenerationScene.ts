// The screen after a hydra dies (GAME_DESIGN.md §12): her page in the Book of Lineages with her epitaph, the mutations
// her heiress inherits (and those lost with her), what her life unlocked for every lineage, and the heiress's name.
// Hatch starts the heiress's life, in a new world.

import * as Phaser from 'phaser';
import { color, getContext } from './context';
import { lineages } from './LineageKeeper';
import { SceneKey } from './sceneKeys';
import { fitScreenCamera } from './view';
import { SCREEN } from '../scaling';
import { exposeButtons, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import { FONT } from '../ui/fonts';
import { onKeyDown } from '../ui/keys';
import { fillText, mutationEffects, mutationName } from '../ui/mutationText';

const HATCH_BUTTON_Y = 330;
const TEXT_WIDTH = 460;

export class GenerationScene extends Phaser.Scene {
  constructor() {
    super(SceneKey.Generation);
  }

  create(): void {
    const { data } = getContext(this);
    const { palette, text, world } = data;
    const words = text.lineages;
    const { width } = SCREEN;
    const keeper = lineages(this);
    const lineage = keeper.lineage();
    const mother = lineage?.chronicle[lineage.chronicle.length - 1];
    fitScreenCamera(this);
    this.scene.stop(SceneKey.Hud);
    if (!lineage || !mother) {
      this.scene.start(SceneKey.Title);
      return;
    }

    this.cameras.main.setBackgroundColor(color(palette.underground.black));
    this.add.image(0, 0, 'title_background').setOrigin(0, 0).setAlpha(0.18);

    // Everything above the button is laid out top to bottom, then centred in the space above it.
    const items: Phaser.GameObjects.Text[] = [];
    let y = 0;
    const put = (content: string, style: Phaser.Types.GameObjects.Text.TextStyle, gapAfter: number): Phaser.GameObjects.Text => {
      const t = this.add.text(width / 2, y, content, { align: 'center', wordWrap: { width: TEXT_WIDTH }, ...style }).setOrigin(0.5, 0);
      items.push(t);
      y += t.height + gapAfter;
      return t;
    };
    put(words.deathHeading.toUpperCase(), { fontFamily: FONT.title, fontSize: '9px', color: palette.order.gold }, 2);
    put(fillText(words.lineageName, { lineage: lineage.name }), { fontFamily: FONT.title, fontSize: '13px', color: '#e8e0d0' }, 12);
    put(mother.name, { fontFamily: FONT.title, fontSize: '22px', color: palette.order.fire }, 2);
    put(fillText(words.lived, { generation: mother.generation, turns: mother.turns }), { fontFamily: FONT.text, fontSize: '9px', color: palette.mist }, 6);
    put(mother.epitaph, { fontFamily: FONT.story, fontSize: '12px', fontStyle: 'italic', color: '#e8e0d0' }, 16);

    put(words.inheritsHeading.toUpperCase(), { fontFamily: FONT.title, fontSize: '9px', color: palette.order.gold }, 4);
    if (lineage.inherited.length === 0) put(words.inheritsNothing, { fontFamily: FONT.story, fontSize: '11px', color: palette.mist }, 4);
    for (const id of lineage.inherited) {
      // "Thick-necked  Head HP +20%": the name, then each effect in green (good) or orange (the catch).
      const parts = [
        this.add.text(0, y, mutationName(data, id), { fontFamily: FONT.title, fontSize: '11px', color: '#e8e0d0' }),
        ...mutationEffects(data, id).map((e) =>
          this.add.text(0, y + 1, e.text, { fontFamily: FONT.text, fontSize: '10px', color: e.good ? palette.underground.bioluminescence : palette.order.orange }),
        ),
      ];
      const gap = 10;
      let x = width / 2 - (parts.reduce((sum, t) => sum + t.width, 0) + gap * (parts.length - 1)) / 2;
      for (const t of parts) {
        t.setX(Math.round(x));
        x += t.width + gap;
      }
      items.push(...parts);
      y += Math.max(...parts.map((t) => t.height)) + 3;
    }
    const lost = mother.mutations.filter((id) => !lineage.inherited.includes(id));
    if (lost.length > 0) put(fillText(words.lostWithHer, { list: lost.map((id) => mutationName(data, id)).join(', ') }), { fontFamily: FONT.text, fontSize: '9px', color: '#7a8478' }, 4);
    y += 8;
    for (const id of keeper.unlockedAtDeath) {
      const modifier = world.runModifiers[id as keyof typeof world.runModifiers];
      if (modifier && typeof modifier === 'object') put(fillText(words.unlocked, { name: modifier.name, text: modifier.text }), { fontFamily: FONT.story, fontSize: '10px', color: palette.order.gold }, 4);
    }
    y += 8;
    put(fillText(words.heiress, { name: lineage.hydraName }), { fontFamily: FONT.title, fontSize: '15px', color: palette.underground.bioluminescence }, 0);

    // Centred in the room above the button (with very many mutations it starts at the top and may run close to it).
    const room = HATCH_BUTTON_Y - 22;
    const shift = Math.max(8, (room - y) / 2);
    for (const item of items) item.y += Math.round(shift);

    const hatch = (): void => {
      keeper.hatch();
      this.scene.start(SceneKey.Map);
    };
    new Button(
      this,
      width / 2,
      HATCH_BUTTON_Y,
      words.hatchButton,
      { width: 150, height: 26, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '12px' },
      hatch,
    );
    onKeyDown(this, (event) => {
      if (event.key === 'Enter' || event.key === ' ') hatch();
    });
    exposeButtons(() => ({ hatch: { x: width / 2, y: HATCH_BUTTON_Y } }));
    markReady(SceneKey.Generation);
  }
}
