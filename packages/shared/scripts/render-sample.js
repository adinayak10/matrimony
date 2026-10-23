#!/usr/bin/env node
'use strict';
// Dev preview: renders every registered template with the sample data into
// standalone HTML files (fonts via file:// URLs) so they can be opened in
// Chrome or printed with headless Chrome.
//
//   node packages/shared/scripts/render-sample.js [--out <dir>] [--only <templateId>] [--pdf]
//
// Writes per template:
//   sample-<id>.html            sampleData('male'), placeholder photo, English labels
//   sample-<id>-female-hi.html  sampleData('female'), Hindi labels, photo above the name
//   sample-<id>-both.html       English + Hindi labels, no photo
//   sample-<id>-long.html       sampleDataLong() (every field at max length)
//   sample-<id>-thumb.html      thumbnail mode (first page only)
// Default out dir: <os tmp>/biodata-samples. Prints the file list.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const { pathToFileURL } = require('node:url');
const K = require('../biodata');

function arg(name) {
  const i = process.argv.indexOf(name);
  return i > 0 ? process.argv[i + 1] : null;
}

// Tiny PNG encoder for a neutral placeholder portrait (no dependencies).
function crc32(buf) {
  let c; const table = crc32.t || (crc32.t = Array.from({ length: 256 }, (_, n) => {
    c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0;
  }));
  let crc = 0xffffffff;
  for (const b of buf) crc = table[(crc ^ b) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function placeholderPng(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    for (let x = 0; x < w; x++) {
      const t = y / h;
      let r = 196 - 40 * t; let g = 180 - 44 * t; let b = 170 - 40 * t;
      const hx = (x - w / 2) / (w * 0.17); const hy = (y - h * 0.38) / (h * 0.16);
      const sx = (x - w / 2) / (w * 0.42); const sy = (y - h * 1.02) / (h * 0.36);
      if (hx * hx + hy * hy < 1 || (sx * sx + sy * sy < 1 && y > h * 0.62)) { r = 118; g = 92; b = 88; }
      const o = y * (w * 3 + 1) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0)),
  ]);
  return 'data:image/png;base64,' + png.toString('base64');
}

function main() {
  const out = path.resolve(arg('--out') || path.join(os.tmpdir(), 'biodata-samples'));
  const only = arg('--only');
  fs.mkdirSync(out, { recursive: true });
  const fontUrl = (file) => pathToFileURL(path.join(K.fontsDir, file)).href;
  const photo = placeholderPng(240, 300);
  const now = '2026-10-22';
  const written = [];

  for (const def of K.registry.list()) {
    if (only && def.id !== only) continue;
    const variants = [
      ['', { data: K.sampleData('male'), photoUrl: photo, mode: 'preview' }],
      ['-female-hi', { data: K.sampleData('female'), photoUrl: photo, mode: 'preview', design: { labelLanguage: 'hi', photoPlacement: 'top-center' } }],
      ['-both', { data: K.sampleData('male'), mode: 'preview', design: { labelLanguage: 'both', photoPlacement: 'none' } }],
      ['-long', { data: K.sampleDataLong(), photoUrl: photo, mode: 'preview' }],
      ['-thumb', { data: K.sampleData('male'), photoUrl: photo, mode: 'thumbnail' }],
    ];
    for (const [suffix, input] of variants) {
      const html = K.renderBiodataHtml(Object.assign({ templateId: def.id, fontUrl, now }, input));
      const file = path.join(out, `sample-${def.id}${suffix}.html`);
      fs.writeFileSync(file, html);
      written.push(file);
    }
  }
  console.log(written.join('\n'));
}

main();
