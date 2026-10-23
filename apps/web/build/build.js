#!/usr/bin/env node
'use strict';
// Web build (D4.33-35, integrator conflict #19: runs on every deploy).
//
//   node build/build.js            (package.json: "build": "node build/build.js")
//
//   images   public/images/_r/**                 responsive variants (build/images.js)
//   fonts    public/build/fonts/<name>.<hash>.woff2   Poppins 300-600 + Playfair Display (variable)
//   css      public/build/css/site.<hash>.css    @font-face + purged bootstrap + font-awesome
//                                                + purged animate.css + purged style.css
//                                                + purged responsive.css (mobile layer, last)
//   js       public/build/js/site.<hash>.js      jquery, popper, bootstrap, chosen, slick, custom, esc
//            public/build/js/<extra>.<hash>.js   per-page extras, kept separate
//            public/build/js/biodata-kit.<hash>.js  the shared biodata kit (packages/shared/biodata,
//                                                   K.bundleFiles in bundle order), minified
//            public/build/css/<extra>.<hash>.css per-page stylesheets (biodata pages and builder)
//   manifest public/build/manifest.json          read by utils/assets.js
//   .gz next to every css/js output (nginx gzip_static)
//
// Safe by construction:
// - Every tool (purgecss, clean-css, uglify-js, sharp, @fontsource/poppins) is
//   loaded with tryRequire; a missing one skips its step with a warning and the
//   build still exits 0.
// - The manifest is written last and atomically. Without it the templates fall
//   back to the unhashed legacy files (utils/assets.js, partials/head.ejs), so a
//   skipped or failed build is slower, never broken.
// - Idempotent: outputs are content-hashed, and a second run with unchanged
//   inputs is a no-op (inputs are fingerprinted in public/build/.inputs).

const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');

const ROOT = path.resolve(__dirname, '..');
const PUBLIC = path.join(ROOT, 'public');
const BUILD = path.join(PUBLIC, 'build');
const MANIFEST = path.join(BUILD, 'manifest.json');
const INPUTS = path.join(BUILD, '.inputs');

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

function writeHashed(dir, name, ext, content, { gzip = true } = {}) {
  const h = hash8(content);
  const rel = `${dir}/${name}.${h}.${ext}`;
  const abs = path.join(BUILD, rel);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  if (!fs.existsSync(abs)) fs.writeFileSync(abs, content);
  const gz = `${abs}.gz`;
  if (gzip && !fs.existsSync(gz)) fs.writeFileSync(gz, zlib.gzipSync(content, { level: 9 }));
  return rel;
}

// ---------- CSS ----------
// Classes that exist only at runtime (added by jQuery plugins, Bootstrap JS or
// public/js/custom.js), so PurgeCSS cannot see them in the templates.
// - standard: the class counts as "used"; a selector still needs its other
//   classes to be used (".btn.active" survives only because .btn is used).
// - deep: plugin-generated DOM; any selector that mentions the prefix is kept
//   whole (".chosen-container .chosen-results li.active-result").
const PURGE_SAFELIST = {
  standard: [
    // Bootstrap JS state
    /^show$/, /^showing$/, /^hide$/, /^collapse$/, /^collapsing$/, /^collapsed$/, /^active$/, /^open$/, /^fade$/, /^disabled$/,
    // Bootstrap components that scripts build or toggle
    /^nav$/, /^nav-/, /^navbar/, /^carousel/, /^alert/, /^popover/, /^was-validated$/, /^is-(in)?valid$/, /^(in)?valid-(feedback|tooltip)$/,
    // chat (views/pages/user-chat.ejs builds these in JS)
    /^message/, /^sent$/, /^received$/, /^online/,
    // public/js/custom.js toggles (the animate.css names it adds come from data-ani attributes, which PurgeCSS reads)
    /^act$/, /^anistart$/, /^sav-act$/, /^view-grid$/, /^avilyes$/, /^avilno$/,
  ],
  deep: [/^chosen/, /^slick/, /^fa-/, /^modal/, /^tooltip/, /^bs-/, /^dropdown/],
};

// The live style.min.css carries these nine rules with a doubled selector
// (".hom-top .hom-top .container"), so they have never applied on the live
// site. style.css has the intended single selector. The bundle keeps the LIVE
// rendering: the rules stay switched off until the owner asks for them.
const LIVE_DEAD_SELECTORS = new Set([
  '.hom-top .container', '.all-weddpro .col-md-3', '.all-weddpro .col-md-9', '.plans-ban .container',
  '.plncanl-pop .col-md-12', '.pg-list-1 .col-md-2', '.list-pg-write-rev form .row',
]);

function stripLeafRules(css) {
  // The fixed leaf ornaments (.hom-top:before/:after, ~756 KB of PNG on every page).
  const re = /(^|\}|\{|\n)\s*((?:\.(?:hom-top|pg-soon)::?(?:before|after)\s*,?\s*)+)\{[^}]*\}/g;
  return css.replace(re, '$1');
}

function stripImports(css) {
  return css.replace(/^\s*@import\s+url\([^)]*\)\s*;?\s*$/gm, '');
}

function stripLiveDeadRules(css, postcss) {
  if (!postcss) return css;
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    const kept = rule.selectors.filter((s) => !LIVE_DEAD_SELECTORS.has(s.replace(/\s+/g, ' ').trim()));
    if (!kept.length) rule.remove();
    else if (kept.length !== rule.selectors.length) rule.selectors = kept;
  });
  return root.toString();
}

// The bundle lives in /build/css/, the sources in /css/: make every relative
// url() root-absolute, and point heavy backgrounds at the webp that
// build/images.js generated (public/images/_r/css.json).
function rebaseUrls(css, cssImages) {
  return css.replace(/url\(\s*(['"]?)\.\.\/(images|fonts)\/([^'")]+)\1\s*\)/g, (m, q, dir, rest) => {
    if (dir === 'images') {
      const variant = cssImages[rest];
      if (variant) return `url(/images/${variant})`;
      // Theme leftovers that point at pages, not images (leaf/long.html, icon/search.html).
      if (/\.html?$/i.test(rest)) return 'none';
    }
    return `url(${q}/${dir}/${rest}${q})`;
  });
}

const FONT_FACES = [
  { family: 'Poppins', weight: '300', file: 'poppins-latin-300-normal.woff2', pkg: '@fontsource/poppins' },
  { family: 'Poppins', weight: '400', file: 'poppins-latin-400-normal.woff2', pkg: '@fontsource/poppins' },
  { family: 'Poppins', weight: '500', file: 'poppins-latin-500-normal.woff2', pkg: '@fontsource/poppins' },
  { family: 'Poppins', weight: '600', file: 'poppins-latin-600-normal.woff2', pkg: '@fontsource/poppins' },
  // The one display face (headings, --tit-font). Variable font: one file for every weight.
  { family: 'Playfair Display', weight: '400 900', file: 'playfair-display-latin-wght-normal.woff2', pkg: null },
];

function fontFaceCss(fontFiles) {
  return fontFiles.map(({ family, weight, rel }) =>
    `@font-face{font-family:'${family}';font-style:normal;font-weight:${weight};font-display:swap;src:url(/build/${rel}) format('woff2');}`).join('\n') + (fontFiles.length ? '\n' : '');
}

async function purge(purgecss, raw, label, extra = {}) {
  if (!purgecss || !purgecss.PurgeCSS) return raw;
  try {
    const [res] = await new purgecss.PurgeCSS().purge({
      // Globs need forward slashes (on Windows path.join gives backslashes and nothing matches).
      content: [path.join(ROOT, 'views', '**', '*.ejs'), path.join(PUBLIC, 'js', '*.js')].map((p) => p.split(path.sep).join('/')),
      css: [{ raw }],
      safelist: PURGE_SAFELIST,
      ...extra,
    });
    return res.css;
  } catch (err) {
    warn(`purgecss failed on ${label}, using it unpurged: ${err.message}`);
    return raw;
  }
}

async function buildCss(manifest, fontFiles) {
  const purgecss = tryRequire('purgecss');
  const CleanCSS = tryRequire('clean-css');
  const postcss = tryRequire('postcss');
  if (!exists('css/bootstrap.css') || !exists('css/style.css') || !exists('css/font-awesome.min.css')) {
    warn('CSS sources missing under public/css; skipping stylesheet');
    return;
  }
  if (!purgecss) warn('purgecss not installed; stylesheets left unpurged');

  let cssImages = {};
  try { cssImages = JSON.parse(fs.readFileSync(path.join(PUBLIC, 'images', '_r', 'css.json'), 'utf8')); } catch { cssImages = {}; }
  // Only trust variants that are really on disk.
  for (const [k, v] of Object.entries(cssImages)) if (!exists(`images/${v}`)) delete cssImages[k];

  const bootstrap = await purge(purgecss, read('css/bootstrap.css'), 'bootstrap.css');
  // Font Awesome is not purged: icon names arrive from the API and from scripts.
  const fa = read('css/font-awesome.min.css');
  const animate = exists('css/animate.min.css') ? await purge(purgecss, read('css/animate.min.css'), 'animate.min.css', { keyframes: true }) : '';
  let style = stripLeafRules(stripImports(read('css/style.css')));
  try { style = stripLiveDeadRules(style, postcss); } catch (err) { warn(`live-parity pass skipped: ${err.message}`); }
  style = await purge(purgecss, style, 'style.css');
  // Mobile/tablet layer (public/css/responsive.css): loaded last so it wins the
  // cascade over style.css, like the last <link> on the legacy path (partials/head.ejs).
  // dynamicAttributes keeps its [style*="..."] rules, which tame inline styles on phones.
  const responsive = exists('css/responsive.css') ? await purge(purgecss, read('css/responsive.css'), 'responsive.css', { dynamicAttributes: ['style'] }) : '';

  // Same order as the legacy <link> tags: bootstrap, font-awesome, animate, site.
  let combined = rebaseUrls(`${fontFaceCss(fontFiles)}${bootstrap}\n${fa}\n${animate}\n${style}\n${responsive}`, cssImages);
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

// Bundle order matters: jQuery, Popper, Bootstrap, then the plugins custom.js calls.
const SITE_JS = ['js/jquery.min.js', 'js/popper.min.js', 'js/bootstrap.min.js', 'js/select-opt.min.js', 'js/slick.min.js', 'js/custom.js', 'js/esc.js'];
// Page-specific extras stay separate hashed files, keyed by the real source
// path so asset('js/Chart.js') falls back to a file that exists before the first build.
// A third element { minify: true } minifies an extra we own (missing sources are skipped).
const EXTRA_JS = [
  ['js/Chart.js', 'chart'],
  ['js/jquery.validate.min.js', 'jquery.validate'],
  ['js/biodata-builder.js', 'biodata-builder', { minify: true }],
  ['js/biodata-cropper.js', 'biodata-cropper', { minify: true }],
  ['js/biodata-pages.js', 'biodata-pages', { minify: true }],
];
const EXTRA_CSS = [
  ['css/biodata-builder.css', 'biodata-builder'],
  ['css/biodata-pages.css', 'biodata-pages'],
];

// The shared biodata kit (docs/plans/02-biodata-maker-contract.md §1): browser
// files listed by the kit itself, concatenated in order. Served as
// asset('js/biodata-kit.js'); routes/biodata.js serves the same concatenation
// unminified at /js/biodata-kit.js until a build exists.
const SHARED_DIR = (() => {
  try { return path.join(path.dirname(require.resolve('@banjaramatch/shared/package.json')), 'biodata'); } catch { return path.resolve(ROOT, '..', '..', 'packages', 'shared', 'biodata'); }
})();

function kitBundleFiles() {
  try {
    const K = require('@banjaramatch/shared/biodata');
    return Array.isArray(K.bundleFiles) ? K.bundleFiles : [];
  } catch (err) {
    warn(`biodata kit not loadable (${err.message}); js/biodata-kit.js skipped`);
    return [];
  }
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

  const missing = SITE_JS.filter((p) => !exists(p));
  if (missing.length) { warn(`JS sources missing: ${missing.join(', ')}; skipping site bundle`); }
  else {
    const code = SITE_JS.map((p) => {
      const src = read(p);
      return `/* ${p} */\n${p === 'js/custom.js' ? stripPreloader(src) : src}\n;`;
    }).join('\n');
    manifest['js/site.js'] = writeHashed('js', 'site', 'js', minify(code, 'site.js'));
  }
  for (const [src, name, opts] of EXTRA_JS) {
    if (exists(src)) manifest[src] = writeHashed('js', name, 'js', opts && opts.minify ? minify(read(src), src) : read(src));
  }
  const CleanCSS = tryRequire('clean-css');
  for (const [src, name] of EXTRA_CSS) {
    if (!exists(src)) continue;
    let css = read(src);
    if (CleanCSS) {
      const out = new CleanCSS({ level: 1, rebase: false }).minify(css);
      if (out.errors && out.errors.length) warn(`clean-css on ${src}: ${out.errors.join('; ')}; using raw`);
      else css = out.styles;
    }
    manifest[src] = writeHashed('css', name, 'css', css);
  }
  const kitFiles = kitBundleFiles();
  const kitMissing = kitFiles.filter((f) => !fs.existsSync(f));
  if (kitFiles.length && !kitMissing.length) {
    const code = kitFiles.map((f) => `/* ${path.basename(f)} */\n${fs.readFileSync(f, 'utf8')}\n;`).join('\n');
    manifest['js/biodata-kit.js'] = writeHashed('js', 'biodata-kit', 'js', minify(code, 'biodata-kit.js'));
  } else if (kitMissing.length) {
    warn(`biodata kit files missing: ${kitMissing.map((f) => path.basename(f)).join(', ')}; js/biodata-kit.js skipped`);
  }
}

// ---------- Fonts ----------
function fontSource({ file, pkg }) {
  if (pkg) {
    try {
      const fromPkg = path.join(path.dirname(require.resolve(`${pkg}/package.json`)), 'files', file);
      if (fs.existsSync(fromPkg)) return fromPkg;
    } catch { /* package not installed: use the vendored copy */ }
  }
  const vendored = path.join(PUBLIC, 'fonts', file);
  return fs.existsSync(vendored) ? vendored : null;
}

function buildFonts(manifest) {
  const out = [];
  for (const face of FONT_FACES) {
    const src = fontSource(face);
    if (!src) { warn(`${face.file} not found (node_modules or public/fonts); ${face.family} ${face.weight} falls back to system fonts`); continue; }
    const name = face.file.replace(/\.woff2$/, '');
    const rel = writeHashed('fonts', name, 'woff2', fs.readFileSync(src), { gzip: false }); // woff2 is already compressed
    manifest[`fonts/${face.file}`] = rel;
    out.push({ ...face, rel });
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
  for (const dir of ['css', 'js', 'fonts']) {
    const abs = path.join(BUILD, dir);
    if (!fs.existsSync(abs)) continue;
    for (const f of fs.readdirSync(abs)) {
      const full = path.join(abs, f);
      const base = full.endsWith('.gz') ? full.slice(0, -3) : full;
      if (!keep.has(base)) fs.rmSync(full, { force: true });
    }
  }
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

// Fingerprint of everything the css/js/font steps read: path, size, mtime.
function inputsFingerprint() {
  const files = [
    ...walk(path.join(ROOT, 'views')),
    ...walk(path.join(PUBLIC, 'js')),
    ...walk(path.join(PUBLIC, 'css')),
    ...walk(path.join(PUBLIC, 'fonts')),
    ...walk(__dirname),
    ...walk(SHARED_DIR),
    path.join(PUBLIC, 'images', '_r', 'css.json'),
    path.join(ROOT, 'package.json'),
  ].sort();
  const h = crypto.createHash('md5');
  for (const f of files) {
    try { const st = fs.statSync(f); h.update(`${path.relative(ROOT, f)}:${st.size}:${Math.round(st.mtimeMs)}\n`); } catch { h.update(`${f}:missing\n`); }
  }
  for (const name of ['purgecss', 'clean-css', 'uglify-js', 'postcss', '@fontsource/poppins']) {
    try { h.update(`${name}@${require(`${name}/package.json`).version}\n`); } catch { h.update(`${name}@none\n`); }
  }
  return h.digest('hex');
}

function upToDate(fingerprint, previous) {
  try {
    if (fs.readFileSync(INPUTS, 'utf8').trim() !== fingerprint) return false;
  } catch { return false; }
  const outputs = Object.values(previous);
  return outputs.length > 0 && outputs.every((rel) => fs.existsSync(path.join(BUILD, rel)));
}

async function main() {
  const started = Date.now();
  fs.mkdirSync(BUILD, { recursive: true });

  // Images first: the stylesheet points at the background variants they produce.
  // Each of these steps skips itself when its tooling is missing.
  await require('./images').run().catch((err) => warn(`images step failed: ${err.message}`));

  const previous = readManifest();
  const fingerprint = inputsFingerprint();
  if (upToDate(fingerprint, previous) && !process.argv.includes('--force')) {
    console.log('[build] css/js/fonts up to date');
  } else {
    const manifest = {};
    const fontFiles = buildFonts(manifest);
    await buildCss(manifest, fontFiles);
    buildJs(manifest);

    if (manifest['css/site.css'] && manifest['js/site.js']) {
      const tmp = `${MANIFEST}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(manifest, null, 2) + '\n');
      fs.renameSync(tmp, MANIFEST);
      fs.writeFileSync(INPUTS, fingerprint + '\n');
      prune(manifest, previous);
      console.log(`[build] manifest: ${Object.keys(manifest).length} entries`);
    } else {
      // A half manifest would mix hashed and legacy assets; keep whatever was there.
      warn('stylesheet or script bundle not built; manifest left untouched (pages keep using the previous build or the legacy files)');
    }
  }

  await require('./icons').run().catch((err) => warn(`icons step failed: ${err.message}`));

  console.log(`[build] done in ${Date.now() - started} ms`);
}

if (require.main === module) {
  // Exit 0 even on an unexpected error: a failed build must never block a deploy,
  // the site keeps working from the previous manifest or the legacy files.
  main().catch((err) => { console.error('[build] failed (site falls back to the previous build or the legacy files):', err); process.exit(0); });
}

module.exports = { main, stripLeafRules, stripImports, stripPreloader, rebaseUrls, PURGE_SAFELIST };
