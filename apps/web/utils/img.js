'use strict';
// <picture> helper for images that build/images.js has resized. (D4.35)
//
//   <%- img('/images/blog/x.jpg', { alt: 'Teej', width: 800, height: 450, sizes: '(max-width: 600px) 100vw, 800px' }) %>
//
// Emits webp + jpg srcsets from public/images/_r/ when the variants exist,
// otherwise a plain <img> for the original — so the helper is safe to use
// before the image step has run (or when sharp is not installed). Every
// attribute value is escaped, which is why the lint allows the `img(` prefix.

const fs = require('node:fs');
const path = require('node:path');
const escapeHtml = require('./escapeHtml');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MANIFEST = path.join(PUBLIC_DIR, 'images', '_r', 'manifest.json');
const WIDTHS = [400, 800, 1200];

let manifest = null;
let loadedAt = 0;
function load() {
  const stale = process.env.NODE_ENV !== 'production' && Date.now() - loadedAt > 1000;
  if (manifest && !stale) return manifest;
  try { manifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { manifest = {}; }
  loadedAt = Date.now();
  return manifest;
}

const attr = (name, value) => (value === undefined || value === null || value === '' ? '' : ` ${name}="${escapeHtml(value)}"`);

function img(src, opts = {}) {
  const { alt = '', width, height, sizes, eager = false, className, style } = opts;
  const clean = String(src || '');
  const key = clean.replace(/^\/?images\//, '');
  const entry = load()[key];
  const loading = eager ? 'eager' : 'lazy';
  const fetchpriority = eager ? ' fetchpriority="high"' : '';
  const common = `${attr('alt', alt)}${attr('width', width || (entry && entry.width))}${attr('height', height || (entry && entry.height))}${attr('class', className)}${attr('style', style)} loading="${loading}" decoding="async"${fetchpriority}`;

  if (!entry || !entry.widths || !entry.widths.length) {
    return `<img src="${escapeHtml(clean)}"${common}>`;
  }
  const base = `/images/_r/${entry.base}`;
  const widths = entry.widths.filter((w) => WIDTHS.includes(w));
  const set = (ext) => widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');
  const largest = widths[widths.length - 1];
  const sizesAttr = attr('sizes', sizes || `(max-width: ${largest}px) 100vw, ${largest}px`);
  return `<picture>` +
    `<source type="image/webp" srcset="${escapeHtml(set('webp'))}"${sizesAttr}>` +
    `<img src="${escapeHtml(`${base}-${largest}.jpg`)}" srcset="${escapeHtml(set('jpg'))}"${sizesAttr}${common}>` +
    `</picture>`;
}

module.exports = img;
