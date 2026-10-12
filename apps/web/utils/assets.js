'use strict';
// Hashed asset paths from build/build.js's manifest, with an unhashed fallback.
//
//   asset('css/site.css')  -> '/build/css/site.3f9a1c2e.css'   (manifest present)
//                          -> '/css/site.css'                   (no build yet)
//
// Modelled on /var/www/feribazaar.com/website/src/lib/assets.js. A content hash
// in the filename lets nginx serve /build/ as immutable for a year; a deploy
// only invalidates what changed. When the manifest is missing (first deploy
// before `npm run build`, or a build that skipped a step) the unhashed path is
// returned so the page still renders — wrong but visible, not a crash. Pages
// that need the legacy multi-file CSS when nothing is built check isBuilt().
// (D4.33)

const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const BUILD_DIR = path.join(PUBLIC_DIR, 'build');
const MANIFEST = path.join(BUILD_DIR, 'manifest.json');
const PUBLIC_BASE = '/build';

let manifest = {};
let loadedAt = 0;

function load({ force = false } = {}) {
  // Re-read in development so a rebuild shows up without a restart.
  const stale = process.env.NODE_ENV !== 'production' && Date.now() - loadedAt > 1000;
  if (!force && !stale && loadedAt) return manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
  } catch {
    manifest = {};
  }
  loadedAt = Date.now();
  return manifest;
}

const normalise = (src) => String(src || '').replace(/^\.?\//, '');

function asset(src) {
  const key = normalise(src);
  const m = load();
  const hashed = m[key];
  return hashed ? `${PUBLIC_BASE}/${hashed}` : `/${key}`;
}

const has = (src) => Boolean(load()[normalise(src)]);
const isBuilt = () => Object.keys(load()).length > 0;

// Files build/icons.js may or may not have produced (favicon.ico,
// apple-touch-icon.png, icons/*.png). Checked once per process.
const fileCache = new Map();
function publicFileExists(rel) {
  const key = normalise(rel);
  if (!fileCache.has(key)) {
    let ok = false;
    try { ok = fs.statSync(path.join(PUBLIC_DIR, key)).isFile(); } catch { ok = false; }
    fileCache.set(key, ok);
  }
  return fileCache.get(key);
}

module.exports = { asset, has, isBuilt, load, publicFileExists, PUBLIC_DIR, BUILD_DIR, MANIFEST, PUBLIC_BASE };
