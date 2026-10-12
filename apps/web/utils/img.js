'use strict';
// <picture> helper for images that build/images.js has resized. (D4.35)
//
//   <%- img('/images/about/3.jpg', { alt: 'Couple', sizes: '(max-width: 600px) 100vw, 600px' }) %>
//   <%- img('/images/ban-bg.jpg', { alt: '…', priority: true, sizes: '100vw' }) %>   LCP image
//
// Options: alt, width, height (default: the source's intrinsic size from the
// manifest), sizes, className, style, eager (loading="eager"; default lazy),
// priority (eager + fetchpriority="high": one image per page, the LCP one),
// skipMedia (media query under which the image is hidden and must not download).
//
// Emits webp + fallback srcsets from public/images/_r/ when the variants
// exist, otherwise a plain <img> for the original — so the helper is safe to
// use before the image step has run (or when sharp is not installed). Every
// attribute value is escaped, which is why the lint allows the `img(` prefix.

const fs = require('node:fs');
const path = require('node:path');
const escapeHtml = require('./escapeHtml');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const MANIFEST = path.join(PUBLIC_DIR, 'images', '_r', 'manifest.json');

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

// 1x1 transparent GIF: what a viewport that never shows the image downloads instead.
const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

function img(src, opts = {}) {
  const { alt = '', width, height, sizes, eager = false, priority = false, className, style, skipMedia } = opts;
  const clean = String(src || '');
  const key = clean.replace(/^\/?images\//, '');
  const entry = load()[key];
  const loading = eager || priority ? 'eager' : 'lazy';
  const fetchpriority = priority ? ' fetchpriority="high"' : '';
  const common = `${attr('alt', alt) || ' alt=""'}${attr('width', width || (entry && entry.width))}${attr('height', height || (entry && entry.height))}${attr('class', className)}${attr('style', style)} loading="${loading}" decoding="async"${fetchpriority}`;

  // skipMedia: a media query under which the image is display:none in the layout
  // (the desktop-only hero slider), so those viewports fetch nothing.
  const skip = skipMedia ? `<source media="${escapeHtml(skipMedia)}" srcset="${BLANK}">` : '';
  if (!entry || !Array.isArray(entry.widths) || !entry.widths.length) {
    const plain = `<img src="${escapeHtml(clean)}"${common}>`;
    return skip ? `<picture>${skip}${plain}</picture>` : plain;
  }
  const base = `/images/_r/${entry.base}`;
  const ext = entry.ext || 'jpg';
  const widths = entry.widths;
  const set = (e) => widths.map((w) => `${base}-${w}.${e} ${w}w`).join(', ');
  const largest = widths[widths.length - 1];
  const sizesAttr = attr('sizes', sizes || `(max-width: ${largest}px) 100vw, ${largest}px`);
  const fallback = `<img src="${escapeHtml(`${base}-${largest}.${ext}`)}" srcset="${escapeHtml(set(ext))}"${sizesAttr}${common}>`;
  if (entry.webp === false) return skip ? `<picture>${skip}${fallback}</picture>` : fallback;
  return `<picture>${skip}<source type="image/webp" srcset="${escapeHtml(set('webp'))}"${sizesAttr}>${fallback}</picture>`;
}

// URL the BUILT stylesheet uses for a CSS background (build/build.js rebaseUrls):
// the capped webp from public/images/_r/css.json when it exists, else the original.
let cssManifest = null;
let cssLoadedAt = 0;
img.cssUrl = function cssUrl(src) {
  const stale = process.env.NODE_ENV !== 'production' && Date.now() - cssLoadedAt > 1000;
  if (!cssManifest || stale) {
    try { cssManifest = JSON.parse(fs.readFileSync(path.join(PUBLIC_DIR, 'images', '_r', 'css.json'), 'utf8')); } catch { cssManifest = {}; }
    cssLoadedAt = Date.now();
  }
  const key = String(src || '').replace(/^\/?images\//, '');
  return cssManifest[key] ? `/images/${cssManifest[key]}` : String(src || '');
};

// Preload hint for the page's LCP image, matching what img(src, { priority: true, sizes }) will request.
img.preload = function preload(src, sizes) {
  const key = String(src || '').replace(/^\/?images\//, '');
  const entry = load()[key];
  if (!entry || !Array.isArray(entry.widths) || !entry.widths.length) {
    return { rel: 'preload', as: 'image', href: String(src || ''), fetchpriority: 'high' };
  }
  const base = `/images/_r/${entry.base}`;
  const e = entry.webp === false ? (entry.ext || 'jpg') : 'webp';
  const largest = entry.widths[entry.widths.length - 1];
  return {
    rel: 'preload',
    as: 'image',
    href: `${base}-${largest}.${e}`,
    type: e === 'webp' ? 'image/webp' : undefined,
    fetchpriority: 'high',
    imagesrcset: entry.widths.map((w) => `${base}-${w}.${e} ${w}w`).join(', '),
    imagesizes: sizes || '100vw',
  };
};

module.exports = img;
