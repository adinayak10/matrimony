#!/usr/bin/env node
'use strict';
/**
 * Biodata template thumbnails for the gallery, landing page and admin.
 *
 *   node apps/web/scripts/biodata-thumbnails.js --chromium "<chrome or chromium path>" [--only id1,id2] [--no-og]
 *
 * For every registered template (or the --only list) renders page 1 of the
 * fictional K.sampleData() (alternating male / female sample, with an
 * illustrated placeholder portrait: never a real person) in thumbnail mode
 * through the API's PDF service (same Chromium path as real PDFs), then writes
 *   apps/web/public/images/biodata/<id>.webp      480 px wide, quality 80
 *   apps/web/public/images/biodata/<id>@2x.webp   960 px wide, quality 80
 * and finally the social card
 *   apps/web/public/images/biodata/og-biodata-maker.jpg  1200 x 630
 * (a collage of up to four thumbnails on a rose gradient; skipped with --no-og).
 *
 * --chromium sets CHROMIUM_PATH for this run (or set CHROMIUM_PATH yourself).
 * Local Chrome on Windows: "C:\Program Files\Google\Chrome\Application\chrome.exe".
 */
const fs = require('fs');
const path = require('path');

const K = require('@banjaramatch/shared/biodata');
const sharp = require('sharp');

const OUT_DIR = path.join(__dirname, '..', 'public', 'images', 'biodata');
const NOW = '2026-10-22';
const OG_PICKS = ['premium-traditional', 'royal-heritage', 'photo-focused', 'elegant-floral', 'luxury-maroon-gold', 'hindu-classic'];

function args(argv) {
  const out = { only: null, chromium: null, og: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--chromium') out.chromium = argv[++i];
    else if (a === '--only') out.only = String(argv[++i] || '').split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--no-og') out.og = false;
    else if (a === '--help' || a === '-h') out.help = true;
    else throw new Error(`Unknown argument ${a}`);
  }
  return out;
}

// Illustrated, neutral placeholder portrait (head-and-shoulders silhouette on
// a soft gradient). Rendered by sharp, so the kit gets a plain JPEG data URI.
function portraitSvg(female) {
  const hair = female
    ? '<path d="M240 104c-70 0-114 52-114 126 0 60 12 132-12 200 44 12 82 4 106-20-20-36-28-80-24-120 12 8 28 12 44 12s32-4 44-12c4 40-4 84-24 120 24 24 62 32 106 20-24-68-12-140-12-200 0-74-44-126-114-126z" fill="#59434f"/>'
    : '<path d="M240 108c-60 0-100 40-100 96 0 16 4 28 8 36 8-40 40-60 92-60s84 20 92 60c4-8 8-20 8-36 0-56-40-96-100-96z" fill="#463a44"/>';
  const top = female ? '#f6dfe6' : '#e3e6f1';
  const bottom = female ? '#cdb3cb' : '#b8bfd4';
  const shirt = female ? '#9a6b84' : '#5d6a86';
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="480" height="600" viewBox="0 0 480 600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient>
    <radialGradient id="glow" cx=".3" cy=".18" r=".9"><stop offset="0" stop-color="#fff" stop-opacity=".6"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="480" height="600" fill="url(#bg)"/><rect width="480" height="600" fill="url(#glow)"/>
  <path d="M52 600c8-108 80-170 188-170s180 62 188 170z" fill="${shirt}"/>
  <path d="M206 430l34 46 34-46" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="6" stroke-linejoin="round"/>
  <rect x="206" y="338" width="68" height="96" rx="26" fill="#b98f86"/>
  <ellipse cx="240" cy="252" rx="88" ry="108" fill="#c99f94"/>
  ${hair}
</svg>`);
}

async function portraitDataUrl(female) {
  const jpg = await sharp(portraitSvg(female)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
  return `data:image/jpeg;base64,${jpg.toString('base64')}`;
}

async function writeThumbs(id, png) {
  const sizes = [[480, `${id}.webp`], [960, `${id}@2x.webp`]];
  const files = [];
  for (const [w, name] of sizes) {
    const file = path.join(OUT_DIR, name);
    await sharp(png).resize({ width: w, kernel: 'lanczos3' }).webp({ quality: 80, effort: 6 }).toFile(file);
    files.push(file);
  }
  return files;
}

function ogHtml(thumbs, count, fontUrl) {
  const font = (file, weight) => `@font-face{font-family:'Poppins';font-weight:${weight};src:url("${fontUrl(file)}") format("woff2")}`;
  const cards = thumbs.map((t, i) => {
    const n = thumbs.length;
    const rot = (i - (n - 1) / 2) * 5;
    const x = 560 + i * (n > 3 ? 140 : 170);
    const y = 92 + Math.abs(i - (n - 1) / 2) * 22;
    return `<img class="card" src="${t}" alt="" style="left:${x}px;top:${y}px;transform:rotate(${rot}deg);z-index:${10 + i}">`;
  }).join('');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
${font('poppins-latin-400-normal.woff2', 400)}${font('poppins-latin-600-normal.woff2', 600)}
html,body{margin:0;padding:0;background:#be123c}
.og{position:relative;width:1200px;height:630px;overflow:hidden;font-family:'Poppins',sans-serif;color:#fff;
  background:radial-gradient(circle at 88% 12%,rgba(255,255,255,.22),transparent 38%),radial-gradient(circle at 8% 100%,rgba(245,158,11,.28),transparent 34%),linear-gradient(135deg,#f43f5e 0%,#e11d48 42%,#be123c 100%)}
.ring{position:absolute;border-radius:50%;border:2px solid rgba(255,255,255,.16)}
.copy{position:absolute;left:72px;top:0;bottom:0;width:470px;display:flex;flex-direction:column;justify-content:center}
.tag{display:inline-block;align-self:flex-start;background:rgba(255,255,255,.18);border:1px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 18px;font-size:20px;letter-spacing:.04em}
h1{margin:22px 0 0;font-weight:600;font-size:66px;line-height:1.06;letter-spacing:-.01em}
p{margin:22px 0 0;font-size:24px;line-height:1.5;color:rgba(255,255,255,.92)}
p span{white-space:nowrap}
.dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:#fbbf24;margin:0 12px 4px}
.site{position:absolute;left:72px;bottom:40px;font-size:20px;font-weight:600;letter-spacing:.02em;color:rgba(255,255,255,.9)}
.card{position:absolute;width:300px;border-radius:10px;box-shadow:0 24px 48px rgba(76,5,25,.38),0 4px 10px rgba(76,5,25,.25);background:#fff}
</style></head><body><div class="og">
<div class="ring" style="width:520px;height:520px;right:-140px;top:-170px"></div><div class="ring" style="width:360px;height:360px;left:-120px;bottom:-200px"></div>
<div class="copy"><span class="tag">${count} free templates</span><h1>Free Marriage Biodata Maker</h1>
<p><span>English &amp; Hindi</span><span class="dot"></span><span>Instant PDF</span><span class="dot"></span><span>Print-ready A4</span></p></div>
<div class="site">banjaramatch.com</div>${cards}</div>
<script>window.__bdPaginated = 1;</script></body></html>`;
}

async function main() {
  const opt = args(process.argv);
  if (opt.help) {
    console.log('Usage: node apps/web/scripts/biodata-thumbnails.js --chromium <path> [--only id1,id2] [--no-og]');
    return;
  }
  if (opt.chromium) process.env.CHROMIUM_PATH = opt.chromium;
  const pdf = require('../../api/services/biodataPdf');
  const { dataUrlFor } = require('../../api/services/biodataFonts');
  if (pdf.status() !== 'ready') {
    throw new Error('Chromium is not available: pass --chromium <path> or set CHROMIUM_PATH (and unset BIODATA_PDF_DISABLED)');
  }

  const all = K.registry.list();
  const unknown = (opt.only || []).filter((id) => !K.registry.get(id));
  if (unknown.length) throw new Error(`Unknown template id(s): ${unknown.join(', ')}`);
  const defs = opt.only ? all.filter((d) => opt.only.includes(d.id)) : all;
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const photos = { male: await portraitDataUrl(false), female: await portraitDataUrl(true) };
  try {
    for (const def of defs) {
      const gender = all.indexOf(def) % 2 ? 'female' : 'male';
      const html = K.renderBiodataHtml({
        templateId: def.id,
        data: K.sampleData(gender),
        photoUrl: photos[gender],
        mode: 'thumbnail',
        fontUrl: dataUrlFor,
        now: NOW,
      });
      const png = await pdf.renderPng({ html, width: 794, scale: 2 });
      const files = await writeThumbs(def.id, png);
      console.log(`${def.id} (${gender}) -> ${files.map((f) => path.relative(process.cwd(), f)).join(', ')}`);
    }

    if (opt.og) {
      const picks = OG_PICKS.filter((id) => fs.existsSync(path.join(OUT_DIR, `${id}@2x.webp`)));
      for (const d of all) {
        if (picks.length >= 4) break;
        if (!picks.includes(d.id) && fs.existsSync(path.join(OUT_DIR, `${d.id}@2x.webp`))) picks.push(d.id);
      }
      const thumbs = [];
      for (const id of picks.slice(0, 4)) {
        const buf = await sharp(path.join(OUT_DIR, `${id}@2x.webp`)).resize({ width: 600 }).jpeg({ quality: 88 }).toBuffer();
        thumbs.push(`data:image/jpeg;base64,${buf.toString('base64')}`);
      }
      const shot = await pdf.renderPng({ html: ogHtml(thumbs, all.length, dataUrlFor), width: 1200, scale: 1 });
      const file = path.join(OUT_DIR, 'og-biodata-maker.jpg');
      await sharp(shot).extract({ left: 0, top: 0, width: 1200, height: 630 }).jpeg({ quality: 86, mozjpeg: true }).toFile(file);
      console.log(`og -> ${path.relative(process.cwd(), file)} (${picks.slice(0, 4).join(', ')})`);
    }
  } finally {
    await pdf.shutdown();
  }
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
