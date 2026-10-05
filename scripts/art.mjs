// Imports pictures from art/raw/ into the game (the steps themselves are in scripts/artImport.ts).
// Usage: npm run art                      (every picture in art/raw/)
//        npm run art -- battle_body ...   (only these keys)
// A picture is named after its manifest key: art/raw/battle_body.png. Frames of an animation: <key>_frame1.png,
// <key>_frame2.png, ... The originals in art/raw/ are only read, never changed. Results go to public/images/
// and the manifest gets their paths. Each picture is also made with twice the pixels for the game in HD
// (public/images-hd/, same file name; GAME_DESIGN.md §13). With art/palette.json ({"colors": ["#rrggbb", ...]})
// colours are matched to it.
// A picture uploaded under another name is listed in art/aliases.json ({"file name": "manifest key"}).
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, parse, resolve } from 'node:path';
import sharp from 'sharp';
import { runnerImport } from 'vite';

const RAW = 'art/raw';
const OUT = 'public/images';
const OUT_HD = 'public/images-hd';
/** HD images have this many pixels per pixel of the classic ones (HD_DENSITY in src/scenes/view.ts). */
const HD_DENSITY = 2;
const MANIFEST = 'src/assets/manifest.json';
const PALETTE = 'art/palette.json';
const ALIASES = 'art/aliases.json';
const PICTURE = /\.(png|jpe?g|webp)$/i;

const { module: art } = await runnerImport(resolve('scripts/artImport.ts'), { logLevel: 'warn' });
const wanted = process.argv.slice(2);
const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const palette = existsSync(PALETTE) ? JSON.parse(readFileSync(PALETTE, 'utf8')).colors.map(art.parseHexColor) : null;
const aliases = existsSync(ALIASES) ? JSON.parse(readFileSync(ALIASES, 'utf8')) : {};

// Pictures grouped by key; frames of one animation go together, in order.
const groups = new Map();
for (const name of existsSync(RAW) ? readdirSync(RAW).sort() : []) {
  if (!PICTURE.test(name)) continue;
  const base = parse(name).name;
  const frame = /^(.+)_frame(\d+)$/.exec(base);
  const own = frame ? frame[1] : base;
  const key = typeof aliases[own] === 'string' ? aliases[own] : own;
  const list = groups.get(key) ?? [];
  list.push({ name, order: frame ? Number(frame[2]) : 0 });
  groups.set(key, list);
}

let failed = 0;
const done = [];
mkdirSync(OUT, { recursive: true });
mkdirSync(OUT_HD, { recursive: true });
// The same manifest entries with every size doubled: what the HD images are made to.
const hdEntries = Object.fromEntries(
  Object.entries(manifest.images).map(([key, entry]) => [key, { ...entry, width: entry.width * HD_DENSITY, height: entry.height * HD_DENSITY }]),
);
for (const [key, files] of groups) {
  if (wanted.length > 0 && !wanted.includes(key)) continue;
  if (key.startsWith('key_art')) {
    console.log(`- ${key}: the cover, used for the palette, not imported`);
    continue;
  }
  if (!manifest.images[key]) {
    console.log(`✗ ${files.map((f) => f.name).join(', ')}: no image "${key}" in ${MANIFEST}. Is the file name a manifest key (or listed in ${ALIASES})?`);
    failed++;
    continue;
  }
  if (files.length > 1 && files.some((f) => f.order === 0)) {
    console.log(`✗ ${key}: ${files.map((f) => f.name).join(', ')} are all pictures of it. Keep one, or name animation frames <key>_frame1.png, ...`);
    failed++;
    continue;
  }
  try {
    files.sort((a, b) => a.order - b.order);
    const sources = await Promise.all(files.map((f) => read(join(RAW, f.name))));
    const result = art.importArt(sources, key, manifest.images, palette);
    const hd = art.importArt(sources, key, hdEntries, palette);
    for (const { key: outKey, picture } of hd.images) await save(picture, join(OUT_HD, `${outKey}.png`));
    for (const note of hd.notes) if (!result.notes.includes(note)) result.notes.push(`(HD) ${note}`);
    for (const { key: outKey, picture, frames } of result.images) {
      const file = `images/${outKey}.png`;
      await save(picture, join('public', file));
      const entry = manifest.images[outKey];
      entry.file = file;
      if (frames !== undefined) entry.frames = frames;
      done.push(`✓ ${outKey}: ${files.map((f) => f.name).join(', ')} → public/${file} (${entry.width}×${entry.height}${frames ? `, ${frames} frames` : ''})`);
    }
    for (const note of result.notes) done.push(`  ! ${note}`);
  } catch (error) {
    console.log(`✗ ${key}: ${error instanceof art.ImportError ? error.message : error}`);
    failed++;
  }
}

writeFileSync(MANIFEST, art.formatManifest(manifest));
for (const line of done) console.log(line);
if (groups.size === 0) console.log(`Nothing in ${RAW}/ yet.`);
if (!palette) console.log(`(No ${PALETTE} yet: colours kept as drawn.)`);
if (failed > 0) process.exit(1);

async function save(picture, path) {
  await sharp(Buffer.from(picture.data.buffer), { raw: { width: picture.width, height: picture.height, channels: 4 } })
    .png()
    .toFile(path);
}

async function read(path) {
  const { data, info } = await sharp(path).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { width: info.width, height: info.height, data: new Uint8ClampedArray(data.buffer, data.byteOffset, data.length) };
}
