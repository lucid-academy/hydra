// Screenshots of key screens for review: opens the built game (dist/) in a headless browser
// and saves PNGs to docs/screens/. Run `npm run build` first. Fails on any browser console error.

import { mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';

const DESKTOP = { width: 1280, height: 720 };

async function tapGame(page, point) {
  const canvas = (await page.locator('canvas').boundingBox()) ?? { x: 0, y: 0, width: 640, height: 360 };
  const scale = canvas.width / 640;
  await page.mouse.click(canvas.x + point.x * scale, canvas.y + point.y * scale);
}

/** Sends the hydra to a hex in reach with the mouse: the first click plans the way, the second sets off. */
async function goTo(page, point) {
  await tapGame(page, point);
  await page.waitForTimeout(150);
  await tapGame(page, point);
}

/** Waits for a panel to open, reading through any dialogue that comes first (e.g. on entering a new biome). */
async function waitForPanel(page) {
  for (let i = 0; i < 60; i++) {
    if (await page.evaluate(() => window.__hydra.placePanel() !== null)) break;
    if (await page.evaluate(() => window.__hydra.dialogue?.() != null)) await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(200);
  }
  await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
}

/** Steps onto the reachable place with this id (it is next to the hydra with ?near=), and waits for its panel. */
async function stepOntoPlace(page, id) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  const target = points.find((p) => p.id === id);
  if (!target) throw new Error(`No ${id} next to the hydra`);
  await goTo(page, target);
  await waitForPanel(page);
  await page.waitForTimeout(300);
}

/** Taps a closed threshold the hydra knows, and waits for its panel. */
async function tapThreshold(page, id) {
  const points = await page.evaluate(() => window.__hydra.inspectableOnScreen());
  const target = points.find((p) => p.id === id);
  if (!target) throw new Error(`No ${id} in sight`);
  await tapGame(page, target);
  await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
  await page.waitForTimeout(300);
}

/** Taps the reachable hex that costs the most to reach, like a player would. */
async function moveFarthest(page) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  if (points.length === 0) throw new Error('No reachable hex to tap');
  const target = points.reduce((a, b) => (b.cost > a.cost ? b : a));
  await goTo(page, target);
  // Walking and the view following, however long the drawing takes.
  await page.waitForFunction(() => !window.__hydra.mapBusy?.(), null, { timeout: 15_000 });
  await page.waitForTimeout(300);
}

/** Waits for the dialogue screen and taps until line `line` of it is shown in full (or its answers are up). */
async function readDialogueTo(page, line) {
  await page.waitForFunction(() => window.__hydra.dialogue?.() != null, null, { timeout: 10_000 });
  for (let i = 0; i < 20; i++) {
    const d = await page.evaluate(() => window.__hydra.dialogue());
    if (d.choices.length > 0 || (d.line >= line && !d.typing)) break;
    await tapGame(page, { x: 320, y: 120 });
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(400);
}

/** Steps onto the event site next to the hydra (?event=), and waits for its panel. */
async function stepOntoEvent(page) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  const target = points.find((p) => p.object === 'event');
  if (!target) throw new Error('No event site next to the hydra');
  await goTo(page, target);
  await waitForPanel(page);
  await page.waitForTimeout(300);
}

const SHOTS = [
  { name: 'title', query: '?seed=123', viewport: DESKTOP, scene: 'title' },
  { name: 'title-debug', query: '?seed=123&debug=1', viewport: DESKTOP, scene: 'title' },
  { name: 'title-phone-landscape', query: '?seed=123', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'title' },
  { name: 'map-start', query: '?seed=123&scene=map&debug=1', viewport: DESKTOP, scene: 'map' },
  { name: 'map-after-moves', query: '?seed=123&scene=map&debug=1', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await moveFarthest(page);
    await moveFarthest(page);
  } },
  { name: 'map-shrine', query: '?seed=123&scene=map&near=shrine', viewport: DESKTOP, scene: 'map', act: async (page) => {
    // Step onto the shrine like a player: its blessing comes up.
    const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
    const shrine = points.find((p) => p.object === 'shrine');
    if (!shrine) throw new Error('No shrine next to the hydra');
    await goTo(page, shrine);
    await page.waitForTimeout(900);
  } },
  { name: 'battle-start', query: '?seed=123&scene=battle&group=burningDetail', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('1'); // battles start paused; select the first head
  } },
  { name: 'battle-fight', query: '?seed=123&scene=battle&group=burningDetail&debug=1', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space'); // start the battle
    await page.waitForTimeout(16_000);
  } },
  { name: 'battle-combo', query: '?seed=123&scene=battle&group=burningDetail', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    // Like a player: send every head at the same enemy, start, and wait for the first combo to land.
    const { heads, enemies } = await page.evaluate(() => window.__hydra.battleSummary());
    const canvas = (await page.locator('canvas').boundingBox()) ?? { x: 0, y: 0, width: 640, height: 360 };
    const scale = canvas.width / 640;
    for (let i = 0; i < heads.length; i++) {
      await page.keyboard.press(String(i + 1));
      await page.mouse.click(canvas.x + enemies[0].x * scale, canvas.y + enemies[0].y * scale);
    }
    await page.keyboard.press('Space');
    await page.waitForFunction(() => window.__hydra.battleSummary().combos.length > 0, null, { timeout: 90_000 });
    await page.waitForTimeout(250);
  } },
  { name: 'battle-phone-landscape', query: '?seed=123&scene=battle&group=patrol', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(12_000);
  } },
  { name: 'map-phone-landscape', query: '?seed=123&scene=map', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map' },
  // M2c: whole worlds at a glance (map revealed and zoomed out), with and without run modifiers.
  { name: 'world-123', query: '?seed=123&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-7', query: '?seed=7&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-2026', query: '?seed=2026&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-146-rare', query: '?seed=146&scene=map&reveal=1&zoom=0.45', viewport: DESKTOP, scene: 'map' },
  { name: 'world-123-modifiers', query: '?seed=123&scene=map&reveal=1&zoom=0.45&modifiers=wetYear,myceliumBloom,oldWorkings', viewport: DESKTOP, scene: 'map' },
  { name: 'map-reveal-close', query: '?seed=123&scene=map&reveal=1&near=saltPlug', viewport: DESKTOP, scene: 'map' },
  { name: 'map-threshold', query: '?seed=123&scene=map&near=saltPlug', viewport: DESKTOP, scene: 'map', act: async (page) => tapThreshold(page, 'saltPlug') },
  { name: 'map-place', query: '?seed=123&scene=map&near=brineLake', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await stepOntoPlace(page, 'brineLake');
    const panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]); // drink
    await page.waitForTimeout(400);
  } },
  { name: 'map-place-phone', query: '?seed=138&scene=map&near=lostSurvey', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map', act: async (page) => stepOntoPlace(page, 'lostSurvey') },
  // A travel plan, as in Heroes: one click on a hex several turns away shows the way and how many turns it takes.
  { name: 'map-journey', query: '?seed=123&scene=map&reveal=1', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await tapGame(page, { x: 450, y: 238 });
    await page.waitForTimeout(300);
  } },
  { name: 'map-landmark', query: '?seed=123&scene=map&near=sunkenOak', viewport: DESKTOP, scene: 'map' },
  // M5: dialogues (Old Mother Toad, heads, the Serpent, an answer to pick) and events.
  { name: 'dialogue-toad', query: '?seed=123&scene=map', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await tapGame(page, { x: 590, y: 340 }); // End Turn in the lair: Old Mother Toad speaks
    await readDialogueTo(page, 1);
  } },
  { name: 'dialogue-heads', query: '?seed=123&scene=map&say=biomeOldCrypts', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 1) },
  { name: 'dialogue-serpent', query: '?seed=123&scene=map&say=serpentFirst', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 0) },
  { name: 'dialogue-choice', query: '?seed=123&scene=map&say=toadSerpent', viewport: DESKTOP, scene: 'map', act: async (page) => readDialogueTo(page, 99) },
  { name: 'dialogue-phone', query: '?seed=123&scene=map&say=afterFirstWin', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map', act: async (page) => readDialogueTo(page, 0) },
  { name: 'map-event-site', query: '?seed=123&scene=map&near=event', viewport: DESKTOP, scene: 'map' },
  { name: 'event-panel', query: '?seed=123&scene=map&event=noviceChecklist', viewport: DESKTOP, scene: 'map', act: stepOntoEvent },
  { name: 'event-result', query: '?seed=123&scene=map&event=titheBox', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await stepOntoEvent(page);
    const panel = await page.evaluate(() => window.__hydra.placePanel());
    await tapGame(page, panel.actions[0]); // break it open
    await page.waitForTimeout(400);
  } },
  { name: 'battle-serpent', query: '?seed=123&scene=battle&group=patrol&say=battleSmall', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(1500);
  } },
];

const OUT_DIR = 'docs/screens';
await mkdir(OUT_DIR, { recursive: true });

const server = await preview({ preview: { port: 4173, strictPort: false }, logLevel: 'warn' });
const baseUrl = server.resolvedUrls?.local[0] ?? 'http://localhost:4173/';
// Software WebGL, because the server has no graphics card.
const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

const errors = [];
try {
  // `npm run shots -- map world` takes only the shots whose names start with one of these words.
  const only = process.argv.slice(2);
  for (const shot of SHOTS.filter((s) => only.length === 0 || only.some((word) => s.name.startsWith(word)))) {
    const page = await browser.newPage({ viewport: shot.viewport, deviceScaleFactor: shot.dpr ?? 1 });
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(`[${shot.name}] ${msg.text()}`);
    });
    page.on('pageerror', (err) => errors.push(`[${shot.name}] ${err.message}`));

    await page.goto(new URL(shot.query, baseUrl).href);
    await page.waitForFunction((scene) => window.__hydra?.readyScenes.includes(scene), shot.scene, { timeout: 15_000 });
    await page.waitForTimeout(500); // let the first frames render
    if (shot.act) await shot.act(page);
    await page.screenshot({ path: `${OUT_DIR}/${shot.name}.png` });
    console.log(`saved ${OUT_DIR}/${shot.name}.png`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

if (errors.length > 0) {
  console.error('Browser errors:\n' + errors.join('\n'));
  process.exit(1);
}
