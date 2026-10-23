// The screen after a hydra dies (GAME_DESIGN.md §12): her page in the Book of Lineages with her epitaph, what her
// life unlocked for every lineage, and the heiress's name. Then the eggs she left, each with the mutations it
// carries: the player picks the one her heiress hatches from, in a new world. With no egg left the lineage ends,
// unless Old Mother Toad has one hidden (Miraculous Intervention). A lineage from before eggs (an older save) shows
// what the heiress inherits and a Hatch button.

import * as Phaser from 'phaser';
import { color, getContext } from './context';
import { lineages } from './LineageKeeper';
import { SceneKey } from './sceneKeys';
import { fitScreenCamera } from './view';
import { SCREEN } from '../scaling';
import { exposeButtons, markReady } from '../testHooks';
import { Button } from '../ui/Button';
import type { ButtonStyle } from '../ui/Button';
import { FONT } from '../ui/fonts';
import { onKeyDown } from '../ui/keys';
import { fillText, mutationEffects, mutationName } from '../ui/mutationText';

const HATCH_BUTTON_Y = 330;
const TEXT_WIDTH = 460;
const CARD_WIDTH = 96;
const CARD_GAP = 8;

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
    this.add.image(0, 0, 'title_background').setOrigin(0, 0).setAlpha(0.18).setDepth(-2);

    // Everything is laid out top to bottom, then centred in the space above the bottom button.
    const items: Array<Phaser.GameObjects.Components.Transform> = [];
    let y = 0;
    const put = (content: string, style: Phaser.Types.GameObjects.Text.TextStyle, gapAfter: number): Phaser.GameObjects.Text => {
      const t = this.add.text(width / 2, y, content, { align: 'center', wordWrap: { width: TEXT_WIDTH }, ...style }).setOrigin(0.5, 0);
      items.push(t);
      y += t.height + gapAfter;
      return t;
    };
    const heading = (content: string, gapAfter: number) => put(content.toUpperCase(), { fontFamily: FONT.title, fontSize: '9px', color: palette.order.gold }, gapAfter);
    const buttonStyle = (w: number, h: number, fontSize: string): ButtonStyle => ({
      width: w,
      height: h,
      fill: color(palette.underground.deepTeal),
      border: color(palette.underground.bioluminescence),
      textColor: '#ffffff',
      fontSize,
    });

    heading(words.deathHeading, 2);
    put(fillText(words.lineageName, { lineage: lineage.name }), { fontFamily: FONT.title, fontSize: '13px', color: '#e8e0d0' }, 12);
    put(mother.name, { fontFamily: FONT.title, fontSize: '22px', color: palette.order.fire }, 2);
    put(fillText(words.lived, { generation: mother.generation, turns: mother.turns }), { fontFamily: FONT.text, fontSize: '9px', color: palette.mist }, 6);
    put(mother.epitaph, { fontFamily: FONT.story, fontSize: '12px', fontStyle: 'italic', color: '#e8e0d0' }, 12);
    for (const id of keeper.unlockedAtDeath) {
      const modifier = world.runModifiers[id as keyof typeof world.runModifiers];
      if (modifier && typeof modifier === 'object') put(fillText(words.unlocked, { name: modifier.name, text: modifier.text }), { fontFamily: FONT.story, fontSize: '10px', color: palette.order.gold }, 4);
    }
    y += 6;

    /** A card for an egg: its picture, its title and the mutations it carries, each with what it changes. */
    const card = (x: number, title: string, mutations: readonly string[]): { height: number; parts: Phaser.GameObjects.Components.Transform[] } => {
      const top = y;
      const parts: Phaser.GameObjects.Components.Transform[] = [];
      let cy = top + 6;
      const egg = this.add.image(x, cy, 'map_egg').setOrigin(0.5, 0).setScale(3);
      parts.push(egg);
      cy += egg.displayHeight + 4;
      const line = (content: string, style: Phaser.Types.GameObjects.Text.TextStyle, gapAfter: number) => {
        const t = this.add.text(x, cy, content, { align: 'center', wordWrap: { width: CARD_WIDTH - 8 }, ...style }).setOrigin(0.5, 0);
        parts.push(t);
        cy += t.height + gapAfter;
      };
      line(title, { fontFamily: FONT.title, fontSize: '11px', color: '#e8e0d0' }, 4);
      if (mutations.length === 0) line(words.eggNothing, { fontFamily: FONT.story, fontSize: '9px', color: palette.mist }, 2);
      for (const id of mutations) {
        line(mutationName(data, id), { fontFamily: FONT.title, fontSize: '9px', color: '#e8e0d0' }, 0);
        for (const e of mutationEffects(data, id)) line(e.text, { fontFamily: FONT.text, fontSize: '8px', color: e.good ? palette.underground.bioluminescence : palette.order.orange }, 0);
        cy += 3;
      }
      return { height: cy - top + 4, parts };
    };
    /** Cards side by side, centred, all as tall as the tallest, each with a button at the bottom when it has one. */
    const cards = (list: Array<{ title: string; mutations: readonly string[]; button?: { label: string; onPress: () => void } }>): Button[] => {
      const total = list.length * CARD_WIDTH + (list.length - 1) * CARD_GAP;
      const xs = list.map((_, i) => width / 2 - total / 2 + CARD_WIDTH / 2 + i * (CARD_WIDTH + CARD_GAP));
      const made = list.map((c, i) => card(xs[i]!, c.title, c.mutations));
      const height = Math.max(...made.map((m) => m.height)) + (list.some((c) => c.button) ? 24 : 0);
      const buttons: Button[] = [];
      list.forEach((c, i) => {
        const frame = this.add
          .rectangle(xs[i]!, y, CARD_WIDTH, height, color(palette.underground.deepTeal), 0.22)
          .setOrigin(0.5, 0)
          .setStrokeStyle(1, color(palette.underground.bioluminescence), 0.5);
        frame.setDepth(-1);
        items.push(frame, ...made[i]!.parts);
        if (!c.button) return;
        const button = new Button(this, xs[i]!, y + height - 13, c.button.label, buttonStyle(CARD_WIDTH - 16, 16, '10px'), c.button.onPress);
        items.push(button);
        buttons.push(button);
      });
      y += height + 8;
      return buttons;
    };

    const start = (hatch: () => void) => (): void => {
      hatch();
      this.scene.start(SceneKey.Map);
    };
    const probes: Record<string, Button> = {};
    /** The buttons along the bottom, side by side. */
    const bottom: Array<{ key: string; label: string; onPress: () => void }> = [];

    if (lineage.eggs && lineage.eggs.length > 0) {
      // Her eggs: the player chooses the heiress's.
      heading(words.eggsHeading, 2);
      put(words.eggsHint, { fontFamily: FONT.story, fontSize: '10px', color: palette.mist }, 8);
      const choices = lineage.eggs.map((mutations, i) => ({
        title: fillText(words.eggTitle, { n: i + 1 }),
        mutations,
        button: { label: words.eggButton, onPress: start(() => keeper.hatchFromEgg(i)) },
      }));
      cards(choices).forEach((b, i) => (probes[`egg${i + 1}`] = b));
      const carried = new Set(lineage.eggs.flat());
      const lost = mother.mutations.filter((id) => !carried.has(id));
      if (lost.length > 0) put(fillText(words.lostWithHer, { list: lost.map((id) => mutationName(data, id)).join(', ') }), { fontFamily: FONT.text, fontSize: '9px', color: '#7a8478' }, 4);
      put(fillText(words.heiress, { name: lineage.hydraName }), { fontFamily: FONT.title, fontSize: '15px', color: palette.underground.bioluminescence }, 0);
      onKeyDown(this, (event) => {
        const n = Number(event.key);
        if (Number.isInteger(n) && n >= 1 && n <= choices.length) choices[n - 1]!.button.onPress();
        else if ((event.key === 'Enter' || event.key === ' ') && choices.length === 1) choices[0]!.button.onPress();
      });
    } else if (lineage.eggs) {
      // No egg survived: the lineage dies out, unless Old Mother Toad kept one back.
      heading(words.extinctHeading, 2);
      put(fillText(words.extinctText, { lineage: lineage.name }), { fontFamily: FONT.story, fontSize: '11px', color: '#e8e0d0' }, 8);
      const hidden = lineage.hiddenEgg;
      if (hidden) {
        put(fillText(words.hiddenEggText, { name: hidden.mother }), { fontFamily: FONT.story, fontSize: '10px', color: palette.mist }, 8);
        cards([{ title: words.hiddenEggTitle, mutations: hidden.mutations }]);
        put(fillText(words.heiress, { name: lineage.hydraName }), { fontFamily: FONT.title, fontSize: '15px', color: palette.underground.bioluminescence }, 0);
        bottom.push({ key: 'intervene', label: words.interventionButton, onPress: start(() => keeper.intervene()) });
      }
      bottom.push({
        key: 'end',
        label: words.endLineageButton,
        onPress: () => {
          keeper.letLineageEnd();
          this.scene.start(SceneKey.Title);
        },
      });
    } else {
      // An older save: the heiress's inheritance was settled when her mother died.
      heading(words.inheritsHeading, 4);
      if (lineage.inherited.length === 0) put(words.inheritsNothing, { fontFamily: FONT.story, fontSize: '11px', color: palette.mist }, 4);
      for (const id of lineage.inherited) put(mutationName(data, id), { fontFamily: FONT.title, fontSize: '11px', color: '#e8e0d0' }, 3);
      y += 8;
      put(fillText(words.heiress, { name: lineage.hydraName }), { fontFamily: FONT.title, fontSize: '15px', color: palette.underground.bioluminescence }, 0);
      const hatch = start(() => keeper.hatch());
      bottom.push({ key: 'hatch', label: words.hatchButton, onPress: hatch });
      onKeyDown(this, (event) => {
        if (event.key === 'Enter' || event.key === ' ') hatch();
      });
    }

    // Centred in the room above the bottom button, or in the whole screen without one.
    const room = bottom.length > 0 ? HATCH_BUTTON_Y - 22 : SCREEN.height - 8;
    const shift = Math.max(8, (room - y) / 2);
    for (const item of items) item.y += Math.round(shift);

    const buttonWidth = 150;
    bottom.forEach((b, i) => {
      const x = width / 2 + (i - (bottom.length - 1) / 2) * (buttonWidth + 12);
      probes[b.key] = new Button(this, x, HATCH_BUTTON_Y, b.label, buttonStyle(buttonWidth, 26, '12px'), b.onPress);
    });
    exposeButtons(() => Object.fromEntries(Object.entries(probes).map(([key, b]) => [key, { x: b.x, y: b.y }])));
    markReady(SceneKey.Generation);
  }
}
