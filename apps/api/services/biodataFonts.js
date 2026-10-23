'use strict';
/**
 * services/biodataFonts.js — the kit's vendored woff2 files as base64 data:
 * URIs, for HTML rendered by Chromium (PDF, thumbnails). No network and no
 * system fonts needed. Files are read once and cached in memory (~400 KB).
 *
 *   dataUrlFor(file)   'data:font/woff2;base64,...' or '' for an unknown/missing file
 *   publicUrlFor(file) '/fonts/biodata/<file>' (the web's static mount, for previews)
 */
const fs = require('fs');
const path = require('path');
const { kit } = require('./biodataKit');

const cache = new Map();
const FILE_RE = /^[A-Za-z0-9._-]+\.woff2$/;

function fontPath(file) {
  if (typeof file !== 'string') return null;
  const base = path.basename(file);
  if (!FILE_RE.test(base)) return null;
  const dir = path.resolve(kit().fontsDir);
  const abs = path.resolve(dir, base);
  return abs.startsWith(dir + path.sep) ? abs : null;
}

function dataUrlFor(file) {
  const key = typeof file === 'string' ? path.basename(file) : '';
  if (cache.has(key)) return cache.get(key);
  const abs = fontPath(key);
  let url = '';
  if (abs) {
    try {
      url = `data:font/woff2;base64,${fs.readFileSync(abs).toString('base64')}`;
    } catch (_) {
      url = '';
    }
  }
  cache.set(key, url);
  return url;
}

function publicUrlFor(file) {
  const base = typeof file === 'string' ? path.basename(file) : '';
  return FILE_RE.test(base) ? `/fonts/biodata/${base}` : '';
}

function clearCache() {
  cache.clear();
}

module.exports = { dataUrlFor, publicUrlFor, fontPath, clearCache };
