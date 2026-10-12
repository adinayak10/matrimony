#!/usr/bin/env node
'use strict';
// Responsive image variants (D4.35): for public/images/{blog,couples,about,gallery}/*.{jpg,jpeg,png}
// write public/images/_r/<dir>/<name>-{400,800,1200}.{webp,jpg} and
// public/images/_r/manifest.json for utils/img.js. Leaf ornaments
// (images/leaf/{1,2,4,9,10,11}.png) are re-encoded to <=300 px webp.
//
// Idempotent: a variant is skipped when it exists and is newer than its
// source, so only the first deploy is slow. sharp is optional; without it the
// step warns and exits 0 (the on-box cwebp/convert fallback is a one-off the
// owner can run by hand — see build/icons.js for the convert pattern).

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const IMAGES = path.join(ROOT, 'public', 'images');
const OUT = path.join(IMAGES, '_r');
const MANIFEST = path.join(OUT, 'manifest.json');
const DIRS = ['blog', 'couples', 'about', 'gallery'];
const WIDTHS = [400, 800, 1200];
const LEAF = ['1', '2', '4', '9', '10', '11'];
const SRC_RE = /\.(jpe?g|png)$/i;

const warn = (msg) => console.warn(`[images] ${msg}`);

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

const newer = (out, src) => {
  try { return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs; } catch { return false; }
};

function readManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return {}; }
}

async function variantsFor(sharp, dir, file, manifest) {
  const src = path.join(IMAGES, dir, file);
  const name = file.replace(SRC_RE, '');
  const base = `${dir}/${name}`;
  const key = `${dir}/${file}`;
  fs.mkdirSync(path.join(OUT, dir), { recursive: true });

  let meta;
  try { meta = await sharp(src).metadata(); } catch (err) { warn(`${key}: unreadable (${err.message})`); return; }
  const widths = WIDTHS.filter((w) => w <= (meta.width || 0)) ;
  if (!widths.length) widths.push(Math.min(WIDTHS[0], meta.width || WIDTHS[0]));

  for (const w of widths) {
    for (const [ext, opts] of [['webp', { quality: 78 }], ['jpg', { quality: 80, mozjpeg: true }]]) {
      const out = path.join(OUT, dir, `${name}-${w}.${ext}`);
      if (newer(out, src)) continue;
      const pipeline = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
      await (ext === 'webp' ? pipeline.webp(opts) : pipeline.jpeg(opts)).toFile(out);
    }
  }
  manifest[key] = { base, widths, width: meta.width || null, height: meta.height || null };
}

async function leaves(sharp) {
  const dir = path.join(IMAGES, 'leaf');
  if (!fs.existsSync(dir)) return;
  fs.mkdirSync(path.join(OUT, 'leaf'), { recursive: true });
  for (const n of LEAF) {
    const src = path.join(dir, `${n}.png`);
    if (!fs.existsSync(src)) continue;
    const out = path.join(OUT, 'leaf', `${n}.webp`);
    if (newer(out, src)) continue;
    await sharp(src).resize({ width: 300, height: 300, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toFile(out);
  }
}

async function run() {
  const sharp = tryRequire('sharp');
  if (!sharp) { warn('sharp not installed; skipping image variants (templates fall back to the originals)'); return; }
  fs.mkdirSync(OUT, { recursive: true });
  const manifest = readManifest();
  let count = 0;
  for (const dir of DIRS) {
    const abs = path.join(IMAGES, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of fs.readdirSync(abs)) {
      if (!SRC_RE.test(file)) continue;
      try { await variantsFor(sharp, dir, file, manifest); count += 1; } catch (err) { warn(`${dir}/${file}: ${err.message}`); }
    }
  }
  // Drop manifest entries whose source is gone.
  for (const key of Object.keys(manifest)) {
    if (!fs.existsSync(path.join(IMAGES, key))) delete manifest[key];
  }
  try { await leaves(sharp); } catch (err) { warn(`leaf re-encode: ${err.message}`); }
  const tmp = `${MANIFEST}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
  fs.renameSync(tmp, MANIFEST);
  console.log(`[images] ${count} sources, ${Object.keys(manifest).length} manifest entries`);
}

if (require.main === module) {
  run().catch((err) => { console.error('[images] fatal:', err.message); process.exit(1); });
}

module.exports = { run };
