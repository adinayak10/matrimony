#!/usr/bin/env node
'use strict';
// Web build (D4.33-35): one hashed stylesheet, one hashed script bundle,
// self-hosted Poppins, manifest for utils/assets.js, gzip for nginx
// gzip_static, then image variants and icons.
//
//   node build/build.js            (package.json: "build": "node build/build.js")
//
// Every optional dependency (purgecss, clean-css, uglify-js, @fontsource/poppins,
// sharp) is loaded with tryRequire: a missing one skips that step with a
// warning and the build still exits 0, so a deploy never fails before the deps
// are installed. Without the manifest, templates fall back to the unhashed
// legacy files (utils/assets.js), so a skipped build is slower, not broken.

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BUILD = path.join(PUBLIC, 'build');
const MANIFEST = path.join(BUILD, 'manifest.json');

function tryRequire(name) {
  try { return require(name); } catch (err) {
    if (err && err.code === 'MODULE_NOT_FOUND' && String(err.message).includes(`'${name}'`)) return null;
    console.warn(`[build] ${name} failed to load: ${err.message}`);
    return null;
  }
}

const warn = (msg) => console.warn(`[build] ${msg}`);
const read = (rel) => fs.readFileSync(path.join(PUBLIC, rel), 'utf8');
const exists = (rel) => fs.existsSync(path.join(PUBLIC, rel));
const hash8 = (buf) => crypto.createHash('md5').update(buf).digest('hex').slice(0, 8);

function writeHashed(dir, name, ext, content) {
  const h = hash8(content);
  const rel = `${dir}/${name}.${h}.${ext}`;
  const abs = path.join(BUILD, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!fs.existsSync(abs)) fs.writeFileSync(abs, content);
  const gz = `${abs}.gz`;
  if (!fs.existsSync(gz)) fs.writeFileSync(gz, zlib.gzipSync(content, { level: 9 }));
  return rel;
}

// ---------- CSS ----------
const PURGE_SAFELIST = [/^chosen/, /^slick/, /^fa-/, /^show$/, /^collapse/, /^active$/, /^open$/, /^modal/, /^fade/, /^tooltip/, /^bs-/, /^dropdown/, /^nav/, /^message/, /^sent$/, /^received$/, /^online-/, /^alert-/];

function stripLeafRules(css) {
  // The fixed leaf ornaments (.hom-top:before/:after, ~756 KB of PNG on every page).
  const re = /(^|\}|\n)\s*((?:\.hom-top::?(?:before|after)\s*,?\s*(?:\.pg-soon::?(?:before|after))?\s*)+)\{[^}]*\}/g;
  return css.replace(re, '$1');
}

function stripImports(css) {
  return css.replace(/^\s*@import\s+url\([^)]*\)\s*;?\s*$/gm, '');
}

function poppinsFontFace(fontFiles) {
  if (!fontFiles.length) return '';
  return fontFiles.map(({ weight, rel }) =>
    `@font-face{font-family:'Poppins';font-style:normal;font-weight:${weight};font-display:swap;src:url(/build/${rel}) format('woff2');}`).join('\n') + '\n';
}

async function buildCss(manifest, fontFiles) {
  const purgecss = tryRequire('purgecss');
  const CleanCSS = tryRequire('clean-css');
  if (!exists('css/bootstrap.css') || !exists('css/style.css') || !exists('css/font-awesome.min.css')) {
    warn('CSS sources missing under public/css; skipping stylesheet');
    return;
  }
  let bootstrap = read('css/bootstrap.css');
  if (purgecss && purgecss.PurgeCSS) {
    try {
      const [res] = await new purgecss.PurgeCSS().purge({
        content: [path.join(ROOT, 'views', '**', '*.ejs'), path.join(PUBLIC, 'js', '*.js')],
        css: [{ raw: bootstrap }],
        safelist: { standard: PURGE_SAFELIST, deep: PURGE_SAFELIST, greedy: PURGE_SAFELIST },
      });
      bootstrap = res.css;
    } catch (err) { warn(`purgecss failed, using full bootstrap: ${err.message}`); }
  } else warn('purgecss not installed; bootstrap.css left unpurged');

  const style = stripLeafRules(stripImports(read('css/style.css')));
  const fa = read('css/font-awesome.min.css');
  let combined = `${poppinsFontFace(fontFiles)}${bootstrap}\n${fa}\n${style}`;
  if (CleanCSS) {
    const out = new CleanCSS({ level: 1, rebase: false }).minify(combined);
    if (out.errors && out.errors.length) warn(`clean-css: ${out.errors.join('; ')}`);
    else combined = out.styles;
  } else warn('clean-css not installed; stylesheet is concatenated, not minified');
  manifest['css/site.css'] = writeHashed('css', 'site', 'css', combined);
}

// ---------- JS ----------
function stripPreloader(js) {
  // Preloader fade and the #cry handler from the theme (no-ops once the
  // preloader markup is gone; harmless when already absent).
  return js
    .replace(/^.*#preloader.*$/gm, '')
    .replace(/^.*\$\(["']#cry["']\).*$/gm, '');
}

function buildJs(manifest) {
  const UglifyJS = tryRequire('uglify-js');
  const minify = (code, label) => {
    if (!UglifyJS) return code;
    const out = UglifyJS.minify(code, { compress: false, mangle: false, output: { comments: /^!/ } });
    if (out.error) { warn(`uglify-js failed on ${label}: ${out.error.message}; using raw`); return code; }
    return out.code;
  };
  if (!UglifyJS) warn('uglify-js not installed; JS bundles are concatenated, not minified');

  const parts = ['js/jquery.min.js', 'js/popper.min.js', 'js/bootstrap.min.js', 'js/select-opt.min.js', 'js/slick.min.js', 'js/custom.js', 'js/esc.js'];
  const missing = parts.filter((p) => !exists(p));
  if (missing.length) { warn(`JS sources missing: ${missing.join(', ')}; skipping site bundle`); }
  else {
    const code = parts.map((p) => {
      const src = read(p);
      return `/* ${p} */\n${p === 'js/custom.js' ? stripPreloader(src) : src}\n;`;
    }).join('\n');
    manifest['js/site.js'] = writeHashed('js', 'site', 'js', minify(code, 'site.js'));
  }
  // Per-page extras stay separate (dashboard chart, form validation). Keyed
  // by the real source path so asset('js/Chart.js') falls back to a file that
  // exists before the first build.
  for (const [src, name] of [['js/Chart.js', 'chart'], ['js/jquery.validate.min.js', 'jquery.validate']]) {
    if (!exists(src)) continue;
    manifest[src] = writeHashed('js', name, 'js', read(src));
  }
}

// ---------- Fonts ----------
function buildFonts(manifest) {
  const out = [];
  let dir = null;
  try { dir = path.join(path.dirname(require.resolve('@fontsource/poppins/package.json')), 'files'); } catch { dir = null; }
  if (!dir) { warn('@fontsource/poppins not installed; keeping Google Fonts until it is'); return out; }
  fs.mkdirSync(path.join(BUILD, 'fonts'), { recursive: true });
  for (const weight of ['400', '500', '600']) {
    const file = `poppins-latin-${weight}-normal.woff2`;
    const src = path.join(dir, file);
    if (!fs.existsSync(src)) { warn(`${file} missing in @fontsource/poppins`); continue; }
    const rel = `fonts/${file}`;
    fs.copyFileSync(src, path.join(BUILD, rel));
    manifest[rel] = rel; // already content-stable; the path is versioned by the package
    out.push({ weight, rel });
  }
  return out;
}

// ---------- housekeeping ----------
function readManifest() {
  try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return {}; }
}

// Remove hashed outputs referenced by neither the new nor the previous
// manifest (the previous one may still be served by a process mid-reload).
function prune(current, previous) {
  const keep = new Set([...Object.values(current), ...Object.values(previous)].map((r) => path.join(BUILD, r)));
  for (const dir of ['css', 'js']) {
    const abs = path.join(BUILD, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      const full = path.join(abs, f);
      const base = full.endsWith('.gz') ? full.slice(0, -3) : full;
      if (!keep.has(base)) fs.rmSync(full, { force: true });
    }
  }
}

async function main() {
  const started = Date.now();
  fs.mkdirSync(BUILD, { recursive: true });
  const previous = readManifest();
  const manifest = {};

  const fontFiles = buildFonts(manifest);
  await buildCss(manifest, fontFiles);
  buildJs(manifest);

  if (Object.keys(manifest).length) {
    const tmp = `${MANIFEST}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
    fs.renameSync(tmp, MANIFEST);
    prune(manifest, previous);
    console.log(`[build] manifest: ${Object.keys(manifest).length} entries`);
  } else {
    warn('nothing built; manifest left untouched');
  }

  // Images and icons are independent of the bundle and each skip themselves
  // when their tooling is missing.
  await require('./images').run().catch((err) => warn(`images step failed: ${err.message}`));
  await require('./icons').run().catch((err) => warn(`icons step failed: ${err.message}`));

  console.log(`[build] done in ${Date.now() - started} ms`);
}

if (require.main === module) {
  main().catch((err) => { console.error('[build] fatal:', err); process.exit(1); });
}

module.exports = { main, stripLeafRules, stripImports, stripPreloader };
