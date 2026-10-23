'use strict';
/**
 * test/biodata-render.test.js (biodata maker, Phase 2) — services/biodataPdf.
 *
 *   - queue unit tests through _internals (no browser): concurrency 1,
 *     4 waiters, the 5th waiter gets PDF_BUSY, the wait cap, slot release on error
 *   - status(): CHROMIUM_PATH missing/invalid/kill switch
 *   - a REAL render, only when CHROMIUM_PATH points at an existing file:
 *       CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe" npm test -w apps/api
 *     checks %PDF-, X-Biodata-Pages == number of "/Type /Page" objects, a
 *     multi-page result for the kit's long sample, and the HTTP endpoints.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const CHROME = String(process.env.CHROMIUM_PATH || '').trim();
const HAS_CHROME = !!CHROME && fs.existsSync(CHROME);

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-biodata-render-'));
process.env.PRIVATE_UPLOADS_DIR = path.join(TMP, 'private');

const pdf = require('../services/biodataPdf');
const { _internals: Q } = pdf;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
const tick = () => new Promise((r) => setImmediate(r));

test.after(() => fs.rmSync(TMP, { recursive: true, force: true }));

test('queue: one at a time, 4 waiters, the 5th waiter gets PDF_BUSY, FIFO order', async () => {
  Q.reset();
  const order = [];
  const gates = Array.from({ length: 5 }, deferred);
  const runs = gates.map((g, i) =>
    Q.runQueued(async () => {
      order.push(`start${i}`);
      await g.promise;
      order.push(`end${i}`);
      return i;
    })
  );
  await tick();
  assert.deepEqual(Q.state().active, 1);
  assert.equal(Q.state().waiting, 4);
  await assert.rejects(Q.runQueued(async () => 'late'), (err) => err instanceof pdf.PdfError && err.code === 'PDF_BUSY' && err.retryAfter === 5 && err.status === 503);
  for (const g of gates) {
    g.resolve();
    await tick();
    await tick();
  }
  assert.deepEqual(await Promise.all(runs), [0, 1, 2, 3, 4]);
  assert.deepEqual(order, ['start0', 'end0', 'start1', 'end1', 'start2', 'end2', 'start3', 'end3', 'start4', 'end4']);
  assert.equal(Q.state().active, 0);
  assert.equal(Q.state().waiting, 0);
});

test('queue: a waiter gives up after WAIT_MS with PDF_BUSY; errors release the slot', async () => {
  Q.reset();
  const saved = Q.CFG.WAIT_MS;
  Q.CFG.WAIT_MS = 30;
  try {
    const gate = deferred();
    const first = Q.runQueued(() => gate.promise);
    const started = Date.now();
    await assert.rejects(Q.runQueued(async () => 'never'), (err) => err.code === 'PDF_BUSY');
    assert.ok(Date.now() - started >= 25);
    assert.equal(Q.state().waiting, 0, 'timed-out waiter removed');
    gate.resolve('ok');
    assert.equal(await first, 'ok');

    await assert.rejects(Q.runQueued(async () => {
      throw new Error('render blew up');
    }), /render blew up/);
    assert.equal(Q.state().active, 0, 'slot released after an error');
    assert.equal(await Q.runQueued(async () => 42), 42);
  } finally {
    Q.CFG.WAIT_MS = saved;
    Q.reset();
  }
});

test('status(): unavailable without CHROMIUM_PATH, with a bad path, or with the kill switch', () => {
  const saved = { p: process.env.CHROMIUM_PATH, d: process.env.BIODATA_PDF_DISABLED };
  try {
    process.env.CHROMIUM_PATH = '';
    assert.equal(pdf.status(), 'unavailable');
    process.env.CHROMIUM_PATH = path.join(TMP, 'no-such-chrome');
    assert.equal(pdf.status(), 'unavailable');
    process.env.CHROMIUM_PATH = process.execPath;
    process.env.BIODATA_PDF_DISABLED = '';
    assert.equal(pdf.status(), 'ready');
    process.env.BIODATA_PDF_DISABLED = '1';
    assert.equal(pdf.status(), 'unavailable');
  } finally {
    process.env.CHROMIUM_PATH = saved.p === undefined ? '' : saved.p;
    process.env.BIODATA_PDF_DISABLED = saved.d === undefined ? '' : saved.d;
  }
});

test('renderPdf without Chromium rejects PDF_UNAVAILABLE; launch args never use --single-process', async () => {
  const saved = process.env.CHROMIUM_PATH;
  process.env.CHROMIUM_PATH = '';
  try {
    await assert.rejects(pdf.renderPdf({ html: '<p>x</p>' }), (err) => err.code === 'PDF_UNAVAILABLE');
  } finally {
    process.env.CHROMIUM_PATH = saved === undefined ? '' : saved;
  }
  assert.ok(!Q.LAUNCH_ARGS.includes('--single-process'));
  for (const a of ['--no-sandbox', '--disable-dev-shm-usage', '--renderer-process-limit=1', '--font-render-hinting=none']) assert.ok(Q.LAUNCH_ARGS.includes(a), a);
  assert.ok(Q.isTargetClosed(new Error('Protocol error (Page.printToPDF): Target closed')));
  assert.ok(!Q.isTargetClosed(new Error('Something else')));
  assert.equal(typeof Q.memAvailableMb(), 'number');
});

/* ---------------- real Chromium ---------------- */

function countPages(buf) {
  // "/Type /Page" objects, not the "/Type /Pages" tree node
  const s = buf.toString('latin1');
  return (s.match(/\/Type\s*\/Page(?![s\w])/g) || []).length;
}

function kitReady() {
  try {
    const K = require('@banjaramatch/shared/biodata');
    return typeof K.renderBiodataHtml === 'function' && K.registry.list().length > 0;
  } catch (_) {
    return false;
  }
}

if (!HAS_CHROME || !kitReady()) {
  test.skip(`real Chromium render: ${HAS_CHROME ? 'kit not complete' : 'set CHROMIUM_PATH to a Chrome/Chromium binary'}`, () => {});
} else {
  const harness = require('./helpers/harness');
  test.describe('real Chromium render', { concurrency: false }, () => {
    let K;
    let svc;
    test.before(async () => {
      K = require('@banjaramatch/shared/biodata');
      svc = require('../services/biodataService');
      await harness.startDb();
      await harness.getApp();
    });
    test.after(async () => {
      await pdf.shutdown();
      await harness.stopAll();
    });

    test('short sample: %PDF-, pages == /Type /Page count, fonts embedded', { timeout: 60000 }, async () => {
      const html = svc.renderHtml({ data: K.sampleData(), templateId: K.DEFAULT_TEMPLATE, design: {} });
      const { buffer, pages } = await pdf.renderPdf({ html });
      assert.equal(buffer.subarray(0, 5).toString('latin1'), '%PDF-');
      assert.ok(pages >= 1);
      assert.equal(countPages(buffer), pages);
      assert.match(buffer.toString('latin1'), /\/FontFile2|\/FontFile3|\/FontFile/, 'fonts embedded');
    });

    test('long sample renders to several pages, every template renders', { timeout: 240000 }, async () => {
      const long = typeof K.sampleDataLong === 'function' ? K.sampleDataLong() : null;
      if (long) {
        const html = svc.renderHtml({ data: long, templateId: K.DEFAULT_TEMPLATE, design: {} });
        const { buffer, pages } = await pdf.renderPdf({ html });
        assert.ok(pages >= 2, `long sample gave ${pages} page(s)`);
        assert.equal(countPages(buffer), pages);
      }
      for (const t of K.registry.list()) {
        const html = svc.renderHtml({ data: K.sampleData(), templateId: t.id, design: { labelLanguage: 'both' } });
        const { buffer, pages } = await pdf.renderPdf({ html });
        assert.equal(countPages(buffer), pages, t.id);
      }
    });

    test('renderPng screenshots the first page', { timeout: 60000 }, async () => {
      const html = K.renderBiodataHtml({ data: K.sampleData(), templateId: K.DEFAULT_TEMPLATE, design: {}, mode: 'thumbnail', fontUrl: require('../services/biodataFonts').dataUrlFor });
      const png = await pdf.renderPng({ html, width: 400, scale: 1 });
      assert.equal(png.subarray(1, 4).toString('latin1'), 'PNG');
    });

    test('POST /api/biodata/render returns the PDF with headers; temp dir empty', { timeout: 60000 }, async () => {
      const jpeg = await require('sharp')({ create: { width: 300, height: 400, channels: 3, background: { r: 90, g: 30, b: 50 } } }).jpeg().toBuffer();
      const res = await harness
        .request()
        .post('/api/biodata/render')
        .field('payload', JSON.stringify({ title: 'Aarav Rathod – बायोडाटा', templateId: K.DEFAULT_TEMPLATE, design: { labelLanguage: 'both' }, data: K.sampleData() }))
        .attach('photo', jpeg, { filename: 'p.jpg', contentType: 'image/jpeg' })
        .buffer(true)
        .parse((r, cb) => {
          const chunks = [];
          r.on('data', (c) => chunks.push(c));
          r.on('end', () => cb(null, Buffer.concat(chunks)));
        });
      assert.equal(res.status, 200, res.body && res.body.toString().slice(0, 200));
      assert.equal(res.headers['content-type'], 'application/pdf');
      assert.equal(res.headers['content-disposition'], 'attachment; filename="Aarav-Rathod-biodata.pdf"');
      assert.equal(res.headers['cache-control'], 'no-store');
      assert.equal(res.body.subarray(0, 5).toString('latin1'), '%PDF-');
      assert.equal(String(countPages(res.body)), res.headers['x-biodata-pages']);
      const tmp = path.join(process.env.PRIVATE_UPLOADS_DIR, 'biodata_tmp');
      assert.deepEqual(fs.existsSync(tmp) ? fs.readdirSync(tmp) : [], []);
    });
  });
}
