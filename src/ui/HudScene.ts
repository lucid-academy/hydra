// Map HUD drawn above the map: turn, moves, body, resources, the Alert bar, conditions, the minimap and the End Turn button.
// Also shows short messages (finds, hints, thresholds, conditions), the shrine and place panels, and the game-over panel
// when the hydra dies.

import * as Phaser from 'phaser';
import { SCREEN } from '../scaling';
import { color, getContext } from '../scenes/context';
import { requireRun, startNewRun } from '../scenes/RunController';
import type { RunController } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';
import { fitScreenCamera } from '../scenes/view';
import { hexKey } from '../sim/hex';
import { FONT } from './fonts';
import type { Hex } from '../sim/hex';
import type { Loot } from '../sim/map';
import { canDoPlaceAction, canWorkThreshold, pendingPlaceTile, pendingThreshold } from '../sim/turn';
import type { RunEvent } from '../sim/turn';
import { Button } from './Button';
import { onKeyDown } from './keys';
import { Minimap } from './Minimap';
import { PlacePanel } from './PlacePanel';
import type { PlacePanelView } from './PlacePanel';
import { ShrinePanel } from './ShrinePanel';
import { exposePlacePanel } from '../testHooks';

const BAR_HEIGHT = 16;
/** Action id of the one thing to do at a threshold (dig, or open it with a head). */
const WORK_THRESHOLD = '__work';
const ALERT_BAR_WIDTH = 100;
/** Where each resource counter starts in the top bar. */
const RESOURCE_X = { muck: 228, moisture: 296, bones: 390 } as const;
const TOAST_MS = 2400;
/** Longer messages stay a little longer: this much per character on top of TOAST_MS. */
const TOAST_MS_PER_CHAR = 25;

export class HudScene extends Phaser.Scene {
  private run!: RunController;
  private info!: Phaser.GameObjects.Text;
  private alertFill!: Phaser.GameObjects.Rectangle;
  private alertValue!: Phaser.GameObjects.Text;
  private endTurnButton!: Button;
  private gameOverPanel!: Phaser.GameObjects.Container;
  private minimap!: Minimap;
  private shrinePanel!: ShrinePanel;
  private placePanel!: PlacePanel;
  private conditionsText!: Phaser.GameObjects.Text;
  private resourceTexts!: Record<'muck' | 'moisture' | 'bones', Phaser.GameObjects.Text>;
  /** Messages on screen now, top to bottom, so new ones go below. */
  private toasts: Phaser.GameObjects.Text[] = [];
  /** What was said after the last action at a place, shown in its panel while the hydra stays there. */
  private placeResult: { at: string; text: string } | null = null;

  constructor() {
    super(SceneKey.Hud);
  }

  create(): void {
    this.run = requireRun(this);
    fitScreenCamera(this);
    const { palette, text } = getContext(this).data;
    const { width, height } = SCREEN;
    const mono = { fontFamily: FONT.text, fontSize: '10px' };

    // Top bar. Interactive, so taps on it don't reach the map below.
    this.add.rectangle(0, 0, width, BAR_HEIGHT, color(palette.underground.black), 0.85).setOrigin(0, 0).setInteractive();
    this.info = this.add.text(6, 3, '', { ...mono, color: '#d8e4d0' });
    // Resources: a small coloured square and the amount.
    const resourceColors = { muck: '#8a5a2a', moisture: '#3f9fb8', bones: '#d8d0c0' } as const;
    this.resourceTexts = Object.fromEntries(
      (['muck', 'moisture', 'bones'] as const).map((r) => {
        const x = RESOURCE_X[r];
        this.add.rectangle(x, 5, 6, 6, color(resourceColors[r])).setOrigin(0, 0);
        return [r, this.add.text(x + 9, 3, '', { ...mono, color: '#d8e4d0' })];
      }),
    ) as Record<'muck' | 'moisture' | 'bones', Phaser.GameObjects.Text>;

    const alertX = width - ALERT_BAR_WIDTH - 36;
    this.add.text(alertX - 4, 3, text.hud.alert, { ...mono, color: palette.order.gold }).setOrigin(1, 0);
    this.add.rectangle(alertX, 4, ALERT_BAR_WIDTH, 8, 0x000000).setOrigin(0, 0).setStrokeStyle(1, color(palette.order.gold));
    this.alertFill = this.add.rectangle(alertX + 1, 5, 0, 6, color(palette.order.orange)).setOrigin(0, 0);
    this.alertValue = this.add.text(alertX + ALERT_BAR_WIDTH + 4, 3, '', { ...mono, color: palette.order.gold });

    this.endTurnButton = new Button(
      this,
      width - 50,
      height - 20,
      text.hud.endTurn,
      { width: 88, height: 28, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#e8f0e0', fontSize: '12px' },
      () => this.run.endTurn(),
    );
    onKeyDown(this, (event) => {
      if (event.key === 'Enter') this.run.endTurn();
      if (event.key === 'Escape' && this.placePanel.visible) this.run.leavePlace();
    });
    this.conditionsText = this.add.text(6, BAR_HEIGHT + 2, '', { ...mono, fontSize: '9px', color: '#e0c890', backgroundColor: '#05090acc', padding: { x: 3, y: 1 } });

    this.minimap = new Minimap(this, 4, height - 4, this.run, getContext(this).data, (h) => this.lookAt(h));
    this.shrinePanel = new ShrinePanel(this, getContext(this).data, () => this.run.acceptBlessing(), () => this.run.refuseBlessing());
    this.placePanel = new PlacePanel(
      this,
      getContext(this).data,
      (id) => (id === WORK_THRESHOLD ? this.run.workThreshold() : this.run.doPlaceAction(id)),
      () => this.run.leavePlace(),
    );
    this.gameOverPanel = this.createGameOverPanel();
    this.toasts = [];
    this.placeResult = null;
    exposePlacePanel(() => (this.placePanel.visible ? this.placePanel.buttons : null));

    const onChanged = (): void => this.refresh();
    const onEvents = (events: RunEvent[]): void => this.announce(events);
    const onNotice = (id: 'outOfReach'): void => this.toast(text.hud[id], '#c8c0b0');
    this.run.on('changed', onChanged);
    this.run.on('settled', onChanged);
    this.run.on('events', onEvents);
    this.run.on('notice', onNotice);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.run.off('changed', onChanged);
      this.run.off('settled', onChanged);
      this.run.off('events', onEvents);
      this.run.off('notice', onNotice);
    });
    // The world's run modifiers, once per run.
    if (!this.run.modifiersShown) {
      this.run.modifiersShown = true;
      const { runModifiers } = getContext(this).data.world;
      for (const id of this.run.state.map.layout.modifiers) {
        const modifier = runModifiers[id as keyof typeof runModifiers];
        if (modifier && typeof modifier === 'object') this.toast(`${modifier.name}. ${modifier.text}`, '#e0c890');
      }
    }
    // What happened just before this screen opened, e.g. the Bones from the battle that just ended.
    this.announce(this.run.lastEvents);
    this.run.lastEvents = [];
    this.refresh();
  }

  /** Short messages for things worth noticing. */
  private announce(events: readonly RunEvent[]): void {
    const { text, palette, shrines, world } = getContext(this).data;
    const hint = '#a8c8d8';
    const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
    for (const event of events) {
      switch (event.type) {
        case 'collected': {
          const amount = `+${event.amount} ${event.resource === 'muck' ? text.hud.muck : text.hud.moisture}`;
          this.toast(event.rich ? `${text.hud.richDeposit} ${amount}` : amount, '#d8e4d0');
          break;
        }
        case 'remainsFound':
          this.toast(`${world.remains.lines[event.pool]?.[event.line] ?? ''} ${this.lootText(event.loot)}`.trim(), '#d8d0c0');
          break;
        case 'hoardTaken':
          this.toast(`${world.guardedHoard.text} ${this.lootText(event.loot)}`, '#d8d0c0');
          break;
        case 'battleWon':
          if (event.bones > 0) this.toast(`+${event.bones} ${text.hud.bones}`, '#d8d0c0');
          if (event.silenced) this.toast(text.hud.silenced, hint);
          break;
        case 'rested':
          this.toast(text.hud.rested, palette.underground.bioluminescence);
          break;
        case 'blessingAccepted':
          this.toast(shrines.blessings.find((b) => b.id === event.blessingId)?.name ?? event.blessingId, '#7fe0d6');
          break;
        case 'placeAction': {
          const action = world.places[event.placeId]?.actions?.find((a) => a.id === event.actionId);
          const said = [action?.result, this.lootText(event.gain)].filter((part) => part).join(' ');
          // While the hydra stays, its panel says it; carried away, a message does.
          if (this.run.state.pendingPlace && hexKey(this.run.state.pendingPlace) === hexKey(event.at)) this.placeResult = { at: hexKey(event.at), text: said };
          else if (said) this.toast(said, palette.underground.bioluminescence);
          break;
        }
        case 'landmarkSighted':
          this.toast(fill(text.hud.landmarkSighted, { name: world.places[event.placeId]?.name ?? event.placeId }), hint);
          break;
        case 'echoHeard': {
          const line = event.echo.placeId ? world.places[event.echo.placeId]?.echo : world.echoes[event.echo.biome];
          if (line) this.toast(line, hint);
          break;
        }
        case 'draughtFelt': {
          const line = world.thresholds[event.thresholdId]?.hint;
          if (line) this.toast(line, hint);
          break;
        }
        case 'thresholdFound': {
          const threshold = world.thresholds[event.thresholdId];
          if (threshold) this.toast(`${threshold.name}. ${threshold.text}`, '#e8e0d0');
          break;
        }
        case 'thresholdDug': {
          const threshold = world.thresholds[event.thresholdId];
          if (threshold && event.dug < event.needed) {
            this.toast(`${threshold.dig?.progress ?? ''} ${fill(text.place.digProgress, { dug: event.dug, needed: event.needed })}`.trim(), '#d8d0c0');
          }
          break;
        }
        case 'thresholdOpened':
          this.toast(fill(text.hud.thresholdOpened, { name: world.thresholds[event.thresholdId]?.name ?? event.thresholdId }), palette.underground.bioluminescence);
          break;
        case 'conditionStarted': {
          const condition = world.conditions[event.id];
          if (condition) this.toast(`${condition.name}. ${condition.text}`, '#e0c890');
          break;
        }
        case 'conditionEnded':
          this.toast(fill(text.hud.conditionEnded, { name: world.conditions[event.id]?.name ?? event.id }), '#e0c890');
          break;
        default:
          break;
      }
    }
  }

  /** "+5 Muck, +3 Bones" (empty for no loot). */
  private lootText(loot: Loot): string {
    const { text } = getContext(this).data;
    const names = { muck: text.hud.muck, moisture: text.hud.moisture, bones: text.hud.bones } as const;
    return (['muck', 'moisture', 'bones'] as const)
      .filter((kind) => (loot[kind] ?? 0) > 0)
      .map((kind) => `+${loot[kind]} ${names[kind]}`)
      .join(', ');
  }

  private toast(message: string, textColor: string): void {
    const { width } = SCREEN;
    const last = this.toasts[this.toasts.length - 1];
    const label = this.add
      .text(width / 2, last ? last.y + last.height + 2 : BAR_HEIGHT + 6, message, {
        fontFamily: FONT.text,
        fontSize: '10px',
        color: textColor,
        backgroundColor: '#05090acc',
        padding: { x: 5, y: 2 },
        align: 'center',
        wordWrap: { width: width - 120 },
      })
      .setOrigin(0.5, 0)
      .setDepth(80);
    this.toasts.push(label);
    this.tweens.add({
      targets: label,
      alpha: 0,
      delay: TOAST_MS + message.length * TOAST_MS_PER_CHAR,
      duration: 500,
      onComplete: () => {
        this.toasts = this.toasts.filter((t) => t !== label);
        label.destroy();
      },
    });
  }

  private lookAt(h: Hex): void {
    const map = this.scene.get(SceneKey.Map) as unknown as { lookAt?: (h: Hex) => void };
    map.lookAt?.(h);
  }

  /** Shown when the hydra has died: the run is over, start a new one. */
  private createGameOverPanel(): Phaser.GameObjects.Container {
    const { palette, text } = getContext(this).data;
    const { width, height } = SCREEN;
    const panel = this.add.container(width / 2, height / 2);
    // Full-screen dimmer: also blocks taps on the map while the panel is open.
    const dim = this.add.rectangle(0, 0, width, height, 0x000000, 0.7).setInteractive();
    const box = this.add.rectangle(0, 0, 300, 120, color(palette.underground.black)).setStrokeStyle(1, color(palette.order.bannerRed));
    const title = this.add
      .text(0, -32, text.gameOver.title, { fontFamily: FONT.title, fontSize: '16px', color: palette.order.fire })
      .setOrigin(0.5);
    const body = this.add
      .text(0, -6, text.gameOver.body, { fontFamily: FONT.story, fontSize: '11px', color: '#e8e0d0', align: 'center', wordWrap: { width: 270 } })
      .setOrigin(0.5);
    const again = new Button(
      this,
      0,
      32,
      text.gameOver.newRunButton,
      { width: 140, height: 26, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#ffffff', fontSize: '11px' },
      () => {
        // A fresh random seed; Math.random is fine outside sim/.
        startNewRun(this, Math.floor(Math.random() * 1_000_000));
        this.scene.stop();
        this.scene.start(SceneKey.Map);
      },
    );
    panel.add([dim, box, title, body, again]);
    panel.setDepth(100).setVisible(false);
    return panel;
  }

  private refresh(): void {
    const { text, balance, world } = getContext(this).data;
    const { turn, hydra, resources, alert, pendingBattle, pendingShrine, pendingPlace, over, map } = this.run.state;
    this.info.setText(
      `${text.hud.turn} ${turn}  ${text.hud.moves} ${hydra.movementLeft}/${hydra.movementPerTurn}  ` +
        `${text.battle.body} ${Math.ceil(hydra.bodyHp)}/${hydra.bodyMaxHp}`,
    );
    this.resourceTexts.muck.setText(`${text.hud.muck} ${resources.muck}`);
    this.resourceTexts.moisture.setText(`${text.hud.moisture} ${resources.moisture}`);
    this.resourceTexts.bones.setText(`${text.hud.bones} ${resources.bones}`);
    this.conditionsText.setText(hydra.conditions.map((c) => `${world.conditions[c.id]?.name ?? c.id} (${c.turnsLeft})`).join('  '));
    this.conditionsText.setVisible(hydra.conditions.length > 0);
    // Panels wait until the map has finished showing the walk there.
    const shrine = pendingShrine && !this.run.animating ? map.tiles.get(hexKey(pendingShrine))?.object : null;
    this.shrinePanel.show(shrine?.kind === 'shrine' ? shrine.blessingId : null);
    if (!pendingPlace || (this.placeResult && this.placeResult.at !== hexKey(pendingPlace))) this.placeResult = null;
    this.placePanel.show(this.run.animating ? null : this.placeView());
    const share = (alert - balance.alert.min) / (balance.alert.max - balance.alert.min);
    this.alertFill.setSize(Math.round((ALERT_BAR_WIDTH - 2) * share), 6);
    this.alertValue.setText(String(Math.floor(alert)));
    this.endTurnButton.setEnabled(pendingBattle === null && pendingShrine === null && pendingPlace === null && !over);
    this.gameOverPanel.setVisible(over);
    this.minimap.redraw();
  }

  /** What the place panel shows for the place or threshold the hydra is at, or null when there is none. */
  private placeView(): PlacePanelView | null {
    const { text, world, heads } = getContext(this).data;
    const { state, rules } = this.run;
    const className = (classId: string) => heads.classes[classId]?.displayName ?? classId;
    const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
    const why = (reason: string, values: Record<string, string | number> = {}) => fill(text.place.why[reason as keyof typeof text.place.why] ?? reason, values);

    const place = pendingPlaceTile(state);
    if (place) {
      const { placeId } = place.object;
      const data = world.places[placeId];
      if (!data) return null;
      return {
        kind: text.place.kinds[data.type],
        name: data.name,
        text: data.text,
        status: null,
        result: this.placeResult?.text ?? null,
        actions: (rules.places[placeId]?.actions ?? []).map((action) => {
          const label = data.actions?.find((a) => a.id === action.id)?.label ?? action.id;
          const check = canDoPlaceAction(state, action);
          return {
            id: action.id,
            label: action.headClass ? `[${className(action.headClass)}] ${label}` : label,
            enabled: check.can,
            why: check.can
              ? null
              : why(check.why, { class: className(action.headClass ?? ''), turn: state.turn + (check.turnsLeft ?? 0) }),
          };
        }),
      };
    }

    const threshold = pendingThreshold(state);
    if (threshold) {
      const { thresholdId, dug, digsNeeded } = threshold.object;
      const data = world.thresholds[thresholdId];
      if (!data) return null;
      const check = canWorkThreshold(state, rules);
      const headClass = data.open?.headClass ?? null;
      const label = data.dig?.label ?? (data.open ? `[${className(data.open.headClass)}] ${data.open.label}` : null);
      return {
        kind: text.place.kinds.threshold,
        name: data.name,
        text: data.text,
        status: data.dig && dug > 0 ? fill(text.place.digProgress, { dug, needed: digsNeeded }) : null,
        result: null,
        actions: label
          ? [{ id: WORK_THRESHOLD, label, enabled: check.can, why: check.can ? null : why(check.why, { class: className(headClass ?? '') }) }]
          : [],
      };
    }
    return null;
  }
}
