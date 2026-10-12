#!/usr/bin/env node
'use strict';
// Icons (D3.30): public/favicon.ico (copy of images/fav.ico),
// public/apple-touch-icon.png (180x180), public/icons/icon-192.png and
// icon-512.png, all from images/logo-bf.png (654x112) letterboxed on the site
// background. sharp first, ImageMagick `convert` second, otherwise the PNGs are
// skipped with a warning (routes/wellKnown.js answers 404 for the touch icon
// until they exist) and the build still exits 0. The favicon copy needs no tool.

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const LOGO = path.join(PUBLIC, 'images', 'logo-bf.png');
const FAV_SRC = path.join(PUBLIC, 'images', 'fav.ico');
const BG = '#fbf8ed';
const TARGETS = [
  { file: 'apple-touch-icon.png', size: 180 },
  { file: 'icons/icon-192.png', size: 192 },
  { file: 'icons/icon-512.png', size: 512 },
];

const warn = (msg) => console.warn(`[icons] ${msg}`);
function tryRequire(name) { try { return require(name); } catch { return null; } }

const newer = (out, src) => {
  try { return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs; } catch { return false; }
};

function hasConvert() {
  try { execFileSync('convert', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; }
}

async function renderWithSharp(sharp, size, out) {
  const inner = Math.round(size * 0.84);
  const logo = await sharp(LOGO).resize({ width: inner, height: inner, fit: 'inside', withoutEnlargement: false }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BG } })
    .composite([{ input: logo, gravity: 'centre' }])
    .png()
    .toFile(out);
}

function renderWithConvert(size, out) {
  const inner = Math.round(size * 0.84);
  execFileSync('convert', [LOGO, '-resize', `${inner}x${inner}`, '-background', BG, '-gravity', 'center', '-extent', `${size}x${size}`, out], { stdio: 'ignore' });
}

async function run() {
  // favicon.ico: plain copy, always possible.
  if (fs.existsSync(FAV_SRC)) {
    const out = path.join(PUBLIC, 'favicon.ico');
    if (!newer(out, FAV_SRC)) fs.copyFileSync(FAV_SRC, out);
  } else warn('images/fav.ico missing; favicon.ico not written');

  if (!fs.existsSync(LOGO)) { warn('images/logo-bf.png missing; PNG icons skipped'); return; }
  const sharp = tryRequire('sharp');
  const convert = !sharp && hasConvert();
  if (!sharp && !convert) { warn('neither sharp nor ImageMagick convert available; PNG icons skipped'); return; }

  let made = 0;
  for (const { file, size } of TARGETS) {
    const out = path.join(PUBLIC, file);
    if (newer(out, LOGO)) continue;
    fs.mkdirSync(path.dirname(out), { recursive: true });
    try {
      if (sharp) await renderWithSharp(sharp, size, out);
      else renderWithConvert(size, out);
      made += 1;
    } catch (err) { warn(`${file}: ${err.message}`); }
  }
  console.log(`[icons] ${made} icon(s) written via ${sharp ? 'sharp' : 'convert'}`);
}

if (require.main === module) {
  run().catch((err) => { console.error('[icons] fatal:', err.message); process.exit(1); });
}

module.exports = { run };
