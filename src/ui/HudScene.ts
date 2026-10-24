// Map HUD drawn above the map: turn, moves, body, resources, the Alert bar, conditions, the minimap and the End Turn button,
// and at the bottom the hydra's name with the mutations she carries. Also shows short messages (finds, hints,
// thresholds, conditions, mutations, unlocks) and the shrine and place panels. When the hydra dies the map hands over
// to the generation screen.

import * as Phaser from 'phaser';
import { SCREEN } from '../scaling';
import { color, getContext } from '../scenes/context';
import { requireRun } from '../scenes/RunController';
import type { RunController } from '../scenes/RunController';
import { SceneKey } from '../scenes/sceneKeys';
import { fitScreenCamera } from '../scenes/view';
import { hexKey } from '../sim/hex';
import { FONT } from './fonts';
import type { Hex } from '../sim/hex';
import type { Loot } from '../sim/map';
import { canChooseEventOption, canDoPlaceAction, canHatch, canHideEgg, canLayEgg, canOpenSealed, canWorkThreshold, pendingEventRules, pendingPlaceTile, pendingThreshold } from '../sim/turn';
import type { LairCheck } from '../sim/turn';
import type { EventOutcome } from '../sim/turn';
import type { RunEvent } from '../sim/turn';
import { Button } from './Button';
import { onKeyDown } from './keys';
import { Minimap } from './Minimap';
import { PlacePanel } from './PlacePanel';
import type { PlacePanelView } from './PlacePanel';
import { ShrinePanel } from './ShrinePanel';
import { exposePlacePanel } from '../testHooks';
import { fillText, mutationName, mutationWords } from './mutationText';

const BAR_HEIGHT = 16;
/** Action id of the one thing to do at a threshold (dig, or open it with a head). */
const WORK_THRESHOLD = '__work';
/** Action ids of an event's choices: this and the choice's index. */
const EVENT_CHOICE = '__event:';
/** Action ids of the ways to open a sealed threshold: this and the way's index. */
const SEALED_WAY = '__sealed:';
/** Action ids in the lair's panel. */
const LAIR = { rest: '__lair:rest', lay: '__lair:lay', next: '__lair:next', defender: '__lair:defender', scout: '__lair:scout', hide: '__lair:hide' } as const;
const ALERT_BAR_WIDTH = 100;
/** Where each resource counter starts in the top bar. */
const RESOURCE_X = { muck: 228, moisture: 296, bones: 390 } as const;
const TOAST_MS = 2400;
/** Longer messages stay a little longer: this much per character on top of TOAST_MS. */
const TOAST_MS_PER_CHAR = 25;
/** Mutations: messages and the line at the bottom. */
const MUTATION_COLOR = '#c8b0f0';

export class HudScene extends Phaser.Scene {
  private run!: RunController;
  private info!: Phaser.GameObjects.Text;
  private alertFill!: Phaser.GameObjects.Rectangle;
  private alertValue!: Phaser.GameObjects.Text;
  /** Marks of the Alert stages on the bar (order.json), by stage id. */
  private alertMarks: Array<{ id: string; mark: Phaser.GameObjects.Rectangle }> = [];
  private endTurnButton!: Button;
  private minimap!: Minimap;
  /** The hydra's name, generation and mutations, at the bottom. */
  private nameText!: Phaser.GameObjects.Text;
  private shrinePanel!: ShrinePanel;
  private placePanel!: PlacePanel;
  private conditionsText!: Phaser.GameObjects.Text;
  private resourceTexts!: Record<'muck' | 'moisture' | 'bones', Phaser.GameObjects.Text>;
  /** Messages on screen now, top to bottom, so new ones go below. */
  private toasts: Phaser.GameObjects.Text[] = [];
  /** What was said after the last action at a place, shown in its panel while the hydra stays there. */
  private placeResult: { at: string; text: string } | null = null;
  /** The egg looked at in the lair's panel (its place in the lair's list). */
  private selectedEgg = 0;

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
    // Where the Order starts doing more (GAME_DESIGN.md §8): a notch on the bar for each stage.
    const { balance, order } = getContext(this).data;
    this.alertMarks = order.alertStages.map((stage) => {
      const share = (stage.at - balance.alert.min) / (balance.alert.max - balance.alert.min);
      const x = alertX + Math.min(ALERT_BAR_WIDTH - 1, Math.round(ALERT_BAR_WIDTH * share));
      return { id: stage.id, mark: this.add.rectangle(x, 2, 1, 12, color(palette.order.gold)).setOrigin(0.5, 0) };
    });

    this.endTurnButton = new Button(
      this,
      width - 50,
      height - 20,
      text.hud.endTurn,
      { width: 88, height: 28, fill: color(palette.underground.deepTeal), border: color(palette.underground.bioluminescence), textColor: '#e8f0e0', fontSize: '12px' },
      () => this.run.endTurn(),
    );
    onKeyDown(this, (event) => {
      if (this.run.talking) return;
      if (event.key === 'Enter') this.run.endTurn();
      if (event.key === 'Escape' && this.placePanel.visible) this.run.leavePlace();
    });
    this.conditionsText = this.add.text(6, BAR_HEIGHT + 2, '', { ...mono, fontSize: '9px', color: '#e0c890', backgroundColor: '#05090acc', padding: { x: 3, y: 1 } });

    this.minimap = new Minimap(this, 4, height - 4, this.run, getContext(this).data, (h) => this.lookAt(h));
    this.shrinePanel = new ShrinePanel(this, getContext(this).data, () => this.run.acceptBlessing(), () => this.run.refuseBlessing());
    this.placePanel = new PlacePanel(
      this,
      getContext(this).data,
      (id) => {
        if (id === WORK_THRESHOLD) this.run.workThreshold();
        else if (id.startsWith('__lair:')) this.lairAction(id);
        else if (id.startsWith(SEALED_WAY)) this.run.openSealed(Number(id.slice(SEALED_WAY.length)));
        else if (id.startsWith(EVENT_CHOICE)) this.run.chooseEventOption(Number(id.slice(EVENT_CHOICE.length)));
        else this.run.doPlaceAction(id);
      },
      () => (this.run.state.pendingEvent ? this.run.closeEvent() : this.run.leavePlace()),
    );
    this.nameText = this.add
      .text(width / 2, height - 6, '', { ...mono, fontSize: '9px', color: MUTATION_COLOR, backgroundColor: '#05090acc', padding: { x: 4, y: 1 }, align: 'center', wordWrap: { width: 300 } })
      .setOrigin(0.5, 1);
    this.toasts = [];
    this.placeResult = null;
    exposePlacePanel(() => (this.placePanel.visible ? this.placePanel.buttons : null));

    const onChanged = (): void => this.refresh();
    const onEvents = (events: RunEvent[]): void => this.announce(events);
    const onNotice = (id: 'outOfReach' | 'noWayThere' | 'journeyWaits'): void => this.toast(text.hud[id], '#c8c0b0');
    const onUnlocked = (ids: string[]): void => this.announceUnlocks(ids);
    this.run.on('changed', onChanged);
    this.run.on('settled', onChanged);
    this.run.on('events', onEvents);
    this.run.on('notice', onNotice);
    this.run.on('unlocked', onUnlocked);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.run.off('changed', onChanged);
      this.run.off('settled', onChanged);
      this.run.off('events', onEvents);
      this.run.off('notice', onNotice);
      this.run.off('unlocked', onUnlocked);
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
        case 'tunnelBored':
          this.toast(fill(text.hud.tunnelBored, { direction: this.directionWord(this.run.state.hydra.position, event.at) }), palette.order.orange);
          break;
        case 'boreFailed':
          this.toast(text.hud.boreFailed, '#c8c0b0');
          break;
        case 'burned':
          this.toast(fill(text.hud.burned, { n: -event.amount }), palette.order.orange);
          break;
        case 'tunnelCooled':
          this.toast(text.hud.tunnelCooled, '#c8c0b0');
          break;
        case 'eggLaid':
          this.placeResult = { at: hexKey(this.run.state.map.lair), text: getContext(this).data.brood.texts.laid };
          break;
        case 'eggHidden':
          this.placeResult = { at: hexKey(this.run.state.map.lair), text: getContext(this).data.brood.texts.hidden };
          break;
        case 'hatchingStarted': {
          const index = this.run.state.lair.eggs.findIndex((e) => e.id === event.eggId);
          const turns = this.run.rules.brood.hatchTurns;
          this.placeResult = { at: hexKey(this.run.state.map.lair), text: fill(getContext(this).data.brood.texts.hatchingStarted, { n: index + 1, turns }) };
          break;
        }
        case 'hatched': {
          const words = getContext(this).data.brood.texts;
          this.toast(event.role === 'scout' ? words.hatchedScout : words.hatched, palette.underground.bioluminescence);
          break;
        }
        case 'scoutKilled':
          this.toast(getContext(this).data.brood.texts.scoutKilled, palette.order.orange);
          break;
        case 'eggsBroken':
          this.toast(fill(getContext(this).data.brood.texts.eggsBroken, { n: event.count }), palette.order.orange);
          break;
        case 'expeditionSent': {
          const { order } = getContext(this).data;
          this.toast(event.kind === 'greatBurning' ? order.greatBurning.sent : order.expeditions.sent, palette.order.orange);
          break;
        }
        case 'lairRaided': {
          const { siege } = getContext(this).data.order;
          this.toast(event.killed === 'defender' ? siege.killedDefender : siege.brokeEgg, palette.order.orange);
          break;
        }
        case 'actBegins':
          this.toast(fill(getContext(this).data.order.greatBurning.beaten, { act: event.act }), palette.order.fire);
          break;
        case 'orderArrived':
          if (event.kind === 'patrol') this.toast(getContext(this).data.order.patrols.arrived, palette.order.gold);
          break;
        case 'messengerSent':
          this.toast(getContext(this).data.order.messengers.sent, palette.order.gold);
          break;
        case 'messengerEscaped':
          this.toast(`${getContext(this).data.order.messengers.escaped} ${fill(text.hud.messengerEscaped, { n: event.alert })}`, palette.order.orange);
          break;
        case 'messengerEaten': {
          const line = getContext(this).data.order.messengers.eatenLines[event.line] ?? '';
          this.toast(`${line} ${fill(text.hud.messengerEaten, { bones: event.bones, alert: event.alert > 0 ? `+${event.alert}` : event.alert })}`.trim(), '#d8d0c0');
          break;
        }
        case 'alertStage': {
          const stage = getContext(this).data.order.alertStages.find((s) => s.id === event.stageId);
          if (stage) this.toast(stage.text, palette.order.orange);
          break;
        }
        case 'headLevelled':
          this.toast(fill(text.hud.headLevelled, { name: event.name, level: event.level }), palette.underground.bioluminescence);
          break;
        case 'titheTaken': {
          const { tithe } = getContext(this).data.order;
          const list = this.lootText(event).replace(/\+/g, '') || tithe.nothing;
          this.toast(`${fill(tithe.taken, { list })} ${tithe.receipt}`, palette.order.gold);
          break;
        }
        case 'mutationGained': {
          const data = getContext(this).data;
          this.toast(fillText(text.lineages.mutationGained, { name: mutationName(data, event.id), text: mutationWords(data, event.id) }), MUTATION_COLOR);
          break;
        }
        default:
          break;
      }
    }
  }

  /** Run modifiers unlocked for every lineage by what this hydra did. */
  private announceUnlocks(ids: readonly string[]): void {
    const { text, world } = getContext(this).data;
    for (const id of ids) {
      const modifier = world.runModifiers[id as keyof typeof world.runModifiers];
      if (modifier && typeof modifier === 'object') this.toast(fillText(text.lineages.unlocked, { name: modifier.name, text: modifier.text }), getContext(this).data.palette.order.gold);
    }
  }

  /** What an event's outcome did besides its words: "+12 Muck. Alert +4." (empty for nothing). */
  private effectsText(o: EventOutcome): string {
    const { text, heads, world } = getContext(this).data;
    const effects = text.event.effects;
    const signed = (n: number) => (n > 0 ? `+${n}` : String(n));
    const fill = (template: string, values: Record<string, string>) => template.replace(/\{(\w+)\}/g, (all, name: string) => values[name] ?? all);
    const names = { muck: text.hud.muck, moisture: text.hud.moisture, bones: text.hud.bones } as const;
    const loot = (['muck', 'moisture', 'bones'] as const).filter((k) => o.loot[k] !== 0).map((k) => `${signed(o.loot[k])} ${names[k]}`);
    const parts = [
      loot.join(', '),
      o.alert !== 0 ? fill(effects.alert, { n: signed(o.alert) }) : '',
      o.bodyHp !== 0 ? fill(effects.bodyHp, { n: signed(o.bodyHp) }) : '',
      o.headsHp !== 0 ? fill(effects.headsHp, { n: signed(o.headsHp) }) : '',
      o.condition ? (world.conditions[o.condition.id]?.name ?? o.condition.id) : '',
      o.newHead ? fill(effects.newHead, { name: heads.classes[o.newHead]?.displayName ?? o.newHead }) : '',
      o.reveal > 0 ? effects.reveal : '',
      o.battle ? effects.battle : '',
      o.mutation ? fill(effects.mutation, { name: mutationName(getContext(this).data, o.mutation) }) : '',
    ].filter((part) => part);
    return parts.map((part) => (/[.!?]$/.test(part) ? part : `${part}.`)).join(' ');
  }

  /** Which way `to` lies from `from` on the screen (north is up), as a word from text.json hud.directions. */
  private directionWord(from: Hex, to: Hex): string {
    const { directions } = getContext(this).data.text.hud;
    const x = to.q - from.q + (to.r - from.r) / 2;
    const y = ((to.r - from.r) * Math.sqrt(3)) / 2;
    const names = [directions.east, directions.southEast, directions.south, directions.southWest, directions.west, directions.northWest, directions.north, directions.northEast];
    return names[(Math.round(Math.atan2(y, x) / (Math.PI / 4)) + 8) % 8]!;
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
    const shrine = pendingShrine && !this.run.animating && !this.run.talking ? map.tiles.get(hexKey(pendingShrine))?.object : null;
    this.shrinePanel.show(shrine?.kind === 'shrine' ? (shrine.mark ? { mark: shrine.mark } : { blessingId: shrine.blessingId }) : null);
    if (!pendingPlace || (this.placeResult && this.placeResult.at !== hexKey(pendingPlace))) this.placeResult = null;
    this.placePanel.show(this.run.animating || this.run.talking ? null : this.placeView());
    const share = (alert - balance.alert.min) / (balance.alert.max - balance.alert.min);
    this.alertFill.setSize(Math.round((ALERT_BAR_WIDTH - 2) * share), 6);
    this.alertValue.setText(String(Math.floor(alert)));
    // A stage the Order has reached is marked in fire.
    const { palette } = getContext(this).data;
    for (const { id, mark } of this.alertMarks) {
      const reached = this.run.state.order.stagesReached.includes(id);
      mark.setFillStyle(color(reached ? palette.order.fire : palette.order.gold), reached ? 1 : 0.7);
    }
    const lairPanel = pendingPlace !== null && hexKey(pendingPlace) === hexKey(map.lair);
    this.endTurnButton.setEnabled(pendingBattle === null && pendingShrine === null && (pendingPlace === null || lairPanel) && this.run.state.pendingEvent === null && !this.run.talking && !over);
    const data = getContext(this).data;
    const name = fillText(text.lineages.hudName, { name: hydra.name, generation: this.run.state.generation });
    this.nameText.setText([name, ...hydra.mutations.map((id) => mutationName(data, id))].join('  ·  ')).setVisible(hydra.name !== '');
    this.minimap.redraw();
  }

  private lairAction(id: string): void {
    const { eggs } = this.run.state.lair;
    const egg = eggs[Math.min(this.selectedEgg, eggs.length - 1)];
    if (id === LAIR.rest) this.run.endTurn();
    else if (id === LAIR.lay) this.run.layEgg();
    else if (id === LAIR.next) {
      this.selectedEgg = eggs.length > 0 ? (this.selectedEgg + 1) % eggs.length : 0;
      this.refresh();
    } else if (egg && (id === LAIR.defender || id === LAIR.scout)) this.run.hatchEgg(egg.id, id === LAIR.defender ? 'defender' : 'scout');
    else if (egg && id === LAIR.hide) this.run.hideEgg(egg.id);
  }

  /** The lair's panel: the eggs (one looked at closely), the Broodlings, and what can be done with them. */
  private lairView(): PlacePanelView {
    const data = getContext(this).data;
    const words = data.brood.texts;
    const { state, rules } = this.run;
    const { eggs, defenders, scouts } = state.lair;
    const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
    this.selectedEgg = Math.max(0, Math.min(this.selectedEgg, eggs.length - 1));
    const egg = eggs[this.selectedEgg];
    const n = this.selectedEgg + 1;
    const mutations = egg && egg.mutations.length > 0 ? egg.mutations.map((id) => mutationName(data, id)).join(', ') : words.noMutations;
    const eggLine = !egg
      ? words.noEggs
      : egg.hatching
        ? fill(words.eggHatching, { n, role: words.roles[egg.hatching.role], turns: Math.max(0, egg.hatching.onTurn - state.turn), mutations })
        : fill(words.egg, { n, mutations });
    const status = [
      eggs.length > 0 ? fill(words.eggs, { n: eggs.length }) : '',
      eggLine,
      fill(words.broodlings, { defenders, scouts: scouts.length }),
      state.lair.eggHidden ? words.keptHidden : '',
    ]
      .filter((p) => p)
      .join(' ');
    const lay = canLayEgg(state, rules);
    const hatch = egg ? canHatch(state, egg.id) : { can: false as const, why: 'noEgg' as const };
    const hide = egg ? canHideEgg(state, egg.id) : { can: false as const, why: 'noEgg' as const };
    const cost = this.lootText(rules.brood.eggCost).replace(/\+/g, '');
    const why = (check: LairCheck) => (check.can ? null : check.why === 'cost' ? data.text.event.cantAfford : check.why === 'notInLair' ? null : words[check.why]);
    return {
      kind: words.kind,
      name: words.name,
      text: words.text,
      status,
      result: this.placeResult?.text ?? null,
      leave: data.text.place.leaveButton,
      actions: [
        { id: LAIR.lay, label: `${words.lay} (${cost})`, enabled: lay.can, why: why(lay) },
        ...(eggs.length > 1 ? [{ id: LAIR.next, label: words.nextEgg, enabled: true, why: null }] : []),
        { id: LAIR.defender, label: fill(words.hatchDefender, { n }), enabled: hatch.can, why: why(hatch) },
        { id: LAIR.scout, label: fill(words.hatchScout, { n }), enabled: hatch.can, why: why(hatch) },
        { id: LAIR.hide, label: fill(words.hide, { n }), enabled: hide.can, why: why(hide) },
        { id: LAIR.rest, label: words.rest, enabled: true, why: null },
      ],
    };
  }

  /** What the place panel shows for the place, threshold or event the hydra is at, or null when there is none. */
  private placeView(): PlacePanelView | null {
    const { text, world, heads } = getContext(this).data;
    const { state, rules } = this.run;
    const className = (classId: string) => heads.classes[classId]?.displayName ?? classId;
    const conditionName = (id: string) => world.conditions[id]?.name ?? id;
    const fill = (template: string, values: Record<string, string | number>) => template.replace(/\{(\w+)\}/g, (all, name: string) => String(values[name] ?? all));
    const why = (reason: string, values: Record<string, string | number> = {}) => fill(text.place.why[reason as keyof typeof text.place.why] ?? reason, values);

    const event = pendingEventRules(state, rules);
    if (event && state.pendingEvent) {
      const { result } = state.pendingEvent;
      const { event: words } = text;
      const priced = (cost: Loot) => this.lootText(cost).replace(/\+/g, '');
      const outcome = result ? (result.success ? event.choices[result.choice]!.success : event.choices[result.choice]!.failure!) : null;
      return {
        kind: event.quest ? fill(words.questKind, { quest: event.quest }) : words.kind,
        name: event.title,
        text: event.text,
        status: null,
        result: outcome ? [outcome.text, this.effectsText(outcome)].filter((part) => part).join(' ') : null,
        leave: result ? words.continueButton : null,
        actions: result
          ? []
          : event.choices.map((choice, i) => {
              const check = canChooseEventOption(state, rules, i);
              const cost = priced(choice.cost);
              const label = [
                choice.needsHead ? `[${className(choice.needsHead)}]` : '',
                choice.needsCondition ? `[${conditionName(choice.needsCondition)}]` : '',
                choice.text,
                cost ? fill(words.cost, { cost }) : '',
                choice.chance !== null ? words.gamble : '',
              ]
                .filter((part) => part)
                .join(' ');
              return {
                id: `${EVENT_CHOICE}${i}`,
                label,
                enabled: check.can,
                why: check.can
                  ? null
                  : check.why === 'cost'
                    ? words.cantAfford
                    : why(check.why, { class: className(choice.needsHead ?? ''), condition: conditionName(choice.needsCondition ?? '') }),
              };
            }),
      };
    }

    if (state.pendingPlace && hexKey(state.pendingPlace) === hexKey(state.map.lair)) return this.lairView();

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
        leave: text.place.leaveButton,
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
      if (data.sealed) {
        // A step of a mini quest: each way needs something found along it, and says what is missing.
        return {
          kind: text.place.kinds.threshold,
          name: data.name,
          text: data.text,
          status: null,
          result: null,
          leave: text.place.leaveButton,
          actions: data.sealed.ways.map((way, i) => {
            const can = canOpenSealed(state, rules, i).can;
            return { id: `${SEALED_WAY}${i}`, label: way.label, enabled: can, why: can ? null : way.missing };
          }),
        };
      }
      const check = canWorkThreshold(state, rules);
      const headClass = data.open?.headClass ?? null;
      const label = data.dig?.label ?? (data.open ? `[${className(data.open.headClass)}] ${data.open.label}` : null);
      return {
        kind: text.place.kinds.threshold,
        name: data.name,
        text: data.text,
        status: data.dig && dug > 0 ? fill(text.place.digProgress, { dug, needed: digsNeeded }) : null,
        result: null,
        leave: text.place.leaveButton,
        actions: label
          ? [{ id: WORK_THRESHOLD, label, enabled: check.can, why: check.can ? null : why(check.why, { class: className(headClass ?? '') }) }]
          : [],
      };
    }
    return null;
  }
}
