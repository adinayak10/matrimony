#!/usr/bin/env node
'use strict';
// Responsive image variants (D4.35).
//
// 1. Template images: every /images/<path>.{jpg,jpeg,png} that a template
//    (views/**/*.ejs) or config/*.js references and that weighs more than
//    MIN_BYTES gets  public/images/_r/<path>-{400,800,1200}.webp (and 1600 for
//    full-bleed sources) plus a same-format fallback, recorded in public/images/_r/manifest.json for
//    utils/img.js (the img() template helper).
// 2. CSS backgrounds: every url(../images/<path>) in public/css/style.css
//    above CSS_MIN_BYTES gets ONE capped-width webp in _r/css/, recorded in
//    public/images/_r/css.json; build/build.js rewrites the url() to it.
//
// Never touched: public/images/blog (a symlink into the shared upload
// directory — blog images are resized by the API on upload, not here) and
// anything that resolves outside public/images. Output only ever goes to
// public/images/_r/ (gitignored, rebuilt on every deploy).
//
// Idempotent: a variant is skipped when it exists and is newer than its
// source, so only the first deploy is slow. sharp is optional; without it the
// step warns and returns (templates and CSS fall back to the originals).

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const IMAGES = path.join(PUBLIC, 'images');
const OUT = path.join(IMAGES, '_r');
const MANIFEST = path.join(OUT, 'manifest.json');
const CSS_MANIFEST = path.join(OUT, 'css.json');
const WIDTHS = [400, 800, 1200];
const HERO_WIDTH = 1600;
const MIN_BYTES = 90 * 1024; // "about 100 KB"
const CSS_MIN_BYTES = 40 * 1024;
const SRC_RE = /\.(jpe?g|png)$/i;
// Always resized, whatever they weigh: the header logo is a 2712 px PNG painted 230 px wide on every page.
const ALWAYS = new Set(['logo-b.png']);
const EXCLUDE = /^(blog|_r)\//;
// Widest a CSS background is ever painted: ornaments are small, cards are a column wide.
// ban-bg is the hero background only up to a 1250 px viewport (above that the slider <img> shows).
const CSS_WIDTHS = [[/^ban-bg\./, 1280], [/^leaf\//, 300], [/^couples\//, 800], [/^icon\//, 800], [/^login-bg\./, 800]];
const CSS_DEFAULT_WIDTH = 1600;

const warn = (msg) => console.warn(`[images] ${msg}`);

function tryRequire(name) {
  try { return require(name); } catch { return null; }
}

const newer = (out, src) => {
  try { return fs.statSync(out).mtimeMs >= fs.statSync(src).mtimeMs; } catch { return false; }
};

function writeJson(file, data) {
  const next = JSON.stringify(data, null, 2) + '\n';
  try { if (fs.readFileSync(file, 'utf8') === next) return; } catch { /* first write */ }
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, next);
  fs.renameSync(tmp, file);
}

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out);
    else if (entry.isFile() && test(entry.name)) out.push(full);
  }
  return out;
}

// A source is usable only when it is a real file inside public/images (no symlink hops).
function sourceFile(rel) {
  if (EXCLUDE.test(rel) || !SRC_RE.test(rel)) return null;
  const abs = path.join(IMAGES, rel);
  try {
    const real = fs.realpathSync(abs);
    if (real !== abs && !real.startsWith(fs.realpathSync(IMAGES) + path.sep)) return null;
    if (path.relative(fs.realpathSync(IMAGES), real).split(path.sep)[0] === 'blog') return null;
    const st = fs.statSync(real);
    return st.isFile() ? { abs, size: st.size } : null;
  } catch { return null; }
}

function templateReferences() {
  const files = [...walk(path.join(ROOT, 'views'), (n) => n.endsWith('.ejs')), ...walk(path.join(ROOT, 'config'), (n) => n.endsWith('.js'))];
  const refs = new Set();
  for (const file of files) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/\/images\/([A-Za-z0-9_\-./]+\.(?:jpe?g|png))/gi)) refs.add(m[1]);
  }
  return [...refs].sort();
}

function cssReferences() {
  const file = path.join(PUBLIC, 'css', 'style.css');
  if (!fs.existsSync(file)) return [];
  const refs = new Set();
  for (const m of fs.readFileSync(file, 'utf8').matchAll(/url\(\s*['"]?\.\.\/images\/([A-Za-z0-9_\-./]+\.(?:jpe?g|png))['"]?\s*\)/gi)) refs.add(m[1]);
  return [...refs].sort();
}

async function variantsFor(sharp, rel, manifest) {
  const src = path.join(IMAGES, rel);
  const isPng = /\.png$/i.test(rel);
  const ext = isPng ? 'png' : 'jpg';
  const base = rel.replace(SRC_RE, '');
  fs.mkdirSync(path.dirname(path.join(OUT, base)), { recursive: true });

  const meta = await sharp(src).metadata();
  const srcWidth = meta.width || 0;
  const widths = WIDTHS.filter((w) => w <= srcWidth);
  // Full-bleed desktop heroes (sources 1600 px or wider) keep one large candidate;
  // a source that sits between two steps (1004 px) keeps its own width so dense screens stay sharp.
  if (srcWidth >= HERO_WIDTH) widths.push(HERO_WIDTH);
  else if (srcWidth > widths[widths.length - 1] * 1.15) widths.push(srcWidth);
  if (!widths.length) widths.push(srcWidth || WIDTHS[0]);

  for (const w of widths) {
    for (const format of ['webp', ext]) {
      const out = path.join(OUT, `${base}-${w}.${format}`);
      if (newer(out, src)) continue;
      const pipeline = sharp(src).rotate().resize({ width: w, withoutEnlargement: true });
      if (format === 'webp') await pipeline.webp({ quality: 78 }).toFile(out);
      else if (format === 'png') await pipeline.png({ compressionLevel: 9, palette: true, quality: 85 }).toFile(out);
      else await pipeline.jpeg({ quality: 80, mozjpeg: true }).toFile(out);
    }
  }
  // Offer webp only when it is the smaller encoding (grainy photos can come out larger).
  const total = (format) => widths.reduce((n, w) => n + fs.statSync(path.join(OUT, `${base}-${w}.${format}`)).size, 0);
  manifest[rel] = { base, ext, widths, webp: total('webp') < total(ext), width: srcWidth || null, height: meta.height || null };
}

async function cssVariant(sharp, rel, size, cssManifest) {
  const src = path.join(IMAGES, rel);
  const cap = (CSS_WIDTHS.find(([re]) => re.test(rel)) || [null, CSS_DEFAULT_WIDTH])[1];
  const outRel = `css/${rel.replace(SRC_RE, '')}.webp`;
  const out = path.join(OUT, outRel);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  if (!newer(out, src)) {
    await sharp(src).rotate().resize({ width: cap, withoutEnlargement: true }).webp({ quality: 72 }).toFile(out);
  }
  // Only worth pointing the stylesheet at it when it is actually smaller.
  if (fs.statSync(out).size < size) cssManifest[rel] = `_r/${outRel}`;
}

async function run() {
  const sharp = tryRequire('sharp');
  if (!sharp) { warn('sharp not installed; skipping image variants (templates and CSS fall back to the originals)'); return; }
  fs.mkdirSync(OUT, { recursive: true });

  const manifest = {};
  let count = 0;
  for (const rel of templateReferences()) {
    const file = sourceFile(rel);
    if (!file || (file.size < MIN_BYTES && !ALWAYS.has(rel))) continue;
    try { await variantsFor(sharp, rel, manifest); count += 1; } catch (err) { warn(`${rel}: ${err.message}`); }
  }

  const cssManifest = {};
  let cssCount = 0;
  for (const rel of cssReferences()) {
    const file = sourceFile(rel);
    if (!file || file.size < CSS_MIN_BYTES) continue;
    try { await cssVariant(sharp, rel, file.size, cssManifest); cssCount += 1; } catch (err) { warn(`css ${rel}: ${err.message}`); }
  }

  writeJson(MANIFEST, manifest);
  writeJson(CSS_MANIFEST, cssManifest);
  console.log(`[images] ${count} template image(s), ${cssCount} CSS background(s)`);
}

if (require.main === module) {
  run().catch((err) => { console.error('[images] fatal:', err.message); process.exit(1); });
}

module.exports = { run, templateReferences, cssReferences, CSS_MANIFEST, MANIFEST };
