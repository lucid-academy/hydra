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

/** Steps onto the reachable place with this id (it is next to the hydra with ?near=), and waits for its panel. */
async function stepOntoPlace(page, id) {
  const points = await page.evaluate(() => window.__hydra.reachableOnScreen());
  const target = points.find((p) => p.id === id);
  if (!target) throw new Error(`No ${id} next to the hydra`);
  await tapGame(page, target);
  await page.waitForFunction(() => window.__hydra.placePanel() !== null, null, { timeout: 5_000 });
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
  const canvas = (await page.locator('canvas').boundingBox()) ?? { x: 0, y: 0, width: 640, height: 360 };
  const scale = canvas.width / 640;
  await page.mouse.click(canvas.x + target.x * scale, canvas.y + target.y * scale);
  await page.waitForTimeout(1200); // walking + camera pan
}

const SHOTS = [
  { name: 'title', query: '?seed=123', viewport: DESKTOP, scene: 'title' },
  { name: 'title-debug', query: '?seed=123&debug=1', viewport: DESKTOP, scene: 'title' },
  { name: 'title-phone-landscape', query: '?seed=123', viewport: { width: 844, height: 390 }, scene: 'title' },
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
    const canvas = (await page.locator('canvas').boundingBox()) ?? { x: 0, y: 0, width: 640, height: 360 };
    const scale = canvas.width / 640;
    await page.mouse.click(canvas.x + shrine.x * scale, canvas.y + shrine.y * scale);
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
  { name: 'battle-phone-landscape', query: '?seed=123&scene=battle&group=patrol', viewport: { width: 844, height: 390 }, scene: 'battle', act: async (page) => {
    await page.keyboard.press('Space');
    await page.waitForTimeout(12_000);
  } },
  { name: 'map-phone-landscape', query: '?seed=123&scene=map', viewport: { width: 844, height: 390 }, scene: 'map' },
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
  { name: 'map-place-phone', query: '?seed=138&scene=map&near=lostSurvey', viewport: { width: 844, height: 390 }, scene: 'map', act: async (page) => stepOntoPlace(page, 'lostSurvey') },
  { name: 'map-landmark', query: '?seed=123&scene=map&near=sunkenOak', viewport: DESKTOP, scene: 'map' },
  // The stage "Wygląd mapy": the same screens in HD (?hd=1), on a desktop and on a phone with 2 device pixels per pixel.
  { name: 'hd-map-start', query: '?seed=123&scene=map&hd=1', viewport: DESKTOP, scene: 'map' },
  { name: 'hd-map-after-moves', query: '?seed=123&scene=map&hd=1', viewport: DESKTOP, scene: 'map', act: async (page) => {
    await moveFarthest(page);
    await moveFarthest(page);
  } },
  { name: 'hd-map-phone-landscape', query: '?seed=123&scene=map&hd=1', viewport: { width: 844, height: 390 }, dpr: 2, scene: 'map' },
  { name: 'hd-map-landmark', query: '?seed=123&scene=map&near=sunkenOak&hd=1', viewport: DESKTOP, scene: 'map' },
  { name: 'hd-world-123', query: '?seed=123&scene=map&reveal=1&zoom=0.45&hd=1', viewport: DESKTOP, scene: 'map' },
  { name: 'hd-battle-start', query: '?seed=123&scene=battle&group=burningDetail&hd=1', viewport: DESKTOP, scene: 'battle', act: async (page) => {
    await page.keyboard.press('1');
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
  for (const shot of SHOTS) {
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
