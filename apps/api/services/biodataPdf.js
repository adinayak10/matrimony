'use strict';
/**
 * services/biodataPdf.js — server-side PDF (and PNG) rendering of biodata
 * HTML with a system Chromium driven by puppeteer-core.
 *
 * Side-effect free at require: no browser, no timers, no fs access until the
 * first render. Configuration (read on every call):
 *   CHROMIUM_PATH          absolute path of the Chromium/Chrome binary; missing or
 *                          not a file -> status() 'unavailable' (renders answer PDF_UNAVAILABLE)
 *   BIODATA_PDF_DISABLED   1/true -> kill switch, same as unavailable
 *
 * Resource rules (a 2-4 GB VPS shared with the site):
 *   - one lazily launched browser, closed after IDLE_MS without work (unref'd timer)
 *   - queue: CONCURRENCY 1 render at a time, MAX_WAITING 4 waiting, a waiter
 *     gives up after WAIT_MS with PDF_BUSY; one render may take RENDER_MS
 *     (worst case 8 + 20 = 28 s, under the web proxy's 30 s)
 *   - launch refused when /proc/meminfo MemAvailable < MIN_MEM_MB (Linux only)
 *   - the browser is relaunched lazily after a disconnect; a render that hits
 *     "Target closed" is retried once on a fresh browser; a close that hangs is
 *     ended with SIGKILL
 *
 *   status()                         'ready' | 'unavailable'
 *   renderPdf({html})                -> {buffer, pages}
 *   renderPng({html, width, scale})  -> PNG Buffer of the first .bd-page (thumbnails)
 *   shutdown()                       close the browser, reject waiters (SIGTERM/SIGINT)
 *   PdfError                         code PDF_UNAVAILABLE | PDF_BUSY, status 503, retryAfter
 *
 * The HTML comes from the kit (K.renderBiodataHtml) with fonts and the photo
 * embedded as data: URIs; every other network request is aborted.
 */
const fs = require('fs');

const CFG = {
  CONCURRENCY: 1,
  MAX_WAITING: 4,
  WAIT_MS: 8000,
  RENDER_MS: 20000,
  IDLE_MS: 60000,
  CLOSE_MS: 5000,
  MIN_MEM_MB: 350,
};

const VIEWPORT = { width: 794, height: 1123 };

const LAUNCH_ARGS = [
  // runs as root under pm2, so Chromium's sandbox cannot start
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
  '--no-zygote',
  '--renderer-process-limit=1',
  '--font-render-hinting=none',
  '--js-flags=--max-old-space-size=96',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-renderer-backgrounding',
  '--disable-component-update',
  '--disable-default-apps',
  '--disable-sync',
  '--disable-breakpad',
  '--disable-client-side-phishing-detection',
  '--disable-domain-reliability',
  '--disable-features=Translate,MediaRouter,OptimizationHints,AutofillServerCommunication',
  '--metrics-recording-only',
  '--mute-audio',
  '--hide-scrollbars',
  // never --single-process: one crashed renderer would take the browser down
];

class PdfError extends Error {
  constructor(code, message) {
    super(message || (code === 'PDF_BUSY' ? 'The PDF service is busy, please retry' : 'PDF download is not available right now'));
    this.name = 'PdfError';
    this.code = code;
    this.status = 503;
    this.retryAfter = code === 'PDF_BUSY' ? 5 : undefined;
  }
}

/* ---------------- configuration ---------------- */

function chromiumPath() {
  return String(process.env.CHROMIUM_PATH || '').trim();
}

function disabled() {
  return /^(1|true|yes|on)$/i.test(String(process.env.BIODATA_PDF_DISABLED || '').trim());
}

function binaryExists(p) {
  try {
    return fs.statSync(p).isFile();
  } catch (_) {
    return false;
  }
}

function status() {
  if (disabled()) return 'unavailable';
  const p = chromiumPath();
  if (!p || !binaryExists(p)) return 'unavailable';
  return 'ready';
}

/** MB of MemAvailable, or Infinity when it cannot be read (non-Linux). */
function memAvailableMb() {
  if (process.platform !== 'linux') return Infinity;
  try {
    const txt = fs.readFileSync('/proc/meminfo', 'utf8');
    const m = /^MemAvailable:\s+(\d+)\s+kB/m.exec(txt);
    return m ? Math.floor(Number(m[1]) / 1024) : Infinity;
  } catch (_) {
    return Infinity;
  }
}

/* ---------------- queue ---------------- */

let active = 0;
const waiting = [];

function releaseSlot() {
  const next = waiting.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(); // the slot passes straight to the next waiter
    return;
  }
  active = Math.max(0, active - 1);
  if (active === 0) scheduleIdleClose();
}

function acquire() {
  cancelIdleClose();
  if (active < CFG.CONCURRENCY) {
    active++;
    return Promise.resolve();
  }
  if (waiting.length >= CFG.MAX_WAITING) return Promise.reject(new PdfError('PDF_BUSY'));
  return new Promise((resolve, reject) => {
    const w = { resolve, reject, timer: null };
    w.timer = setTimeout(() => {
      const i = waiting.indexOf(w);
      if (i >= 0) waiting.splice(i, 1);
      reject(new PdfError('PDF_BUSY'));
    }, CFG.WAIT_MS);
    waiting.push(w);
  });
}

/** Run fn() when a slot is free; the slot is released however fn ends. */
async function runQueued(fn) {
  await acquire();
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    releaseSlot();
  };
  try {
    return await fn();
  } finally {
    release();
  }
}

/* ---------------- browser lifecycle ---------------- */

let browser = null;
let launching = null;
let idleTimer = null;

function cancelIdleClose() {
  if (idleTimer) {
    clearTimeout(idleTimer);
    idleTimer = null;
  }
}

function scheduleIdleClose() {
  cancelIdleClose();
  if (!browser) return;
  idleTimer = setTimeout(() => {
    idleTimer = null;
    if (active === 0 && !waiting.length) closeBrowser().catch(() => {});
  }, CFG.IDLE_MS);
  if (typeof idleTimer.unref === 'function') idleTimer.unref();
}

async function launch() {
  const mem = memAvailableMb();
  if (mem < CFG.MIN_MEM_MB) {
    console.warn(`[biodataPdf] launch refused: MemAvailable ${mem} MB < ${CFG.MIN_MEM_MB} MB`);
    throw new PdfError('PDF_UNAVAILABLE', 'The server is low on memory; please use Print instead');
  }
  // eslint-disable-next-line global-require
  const puppeteer = require('puppeteer-core');
  const b = await puppeteer.launch({
    executablePath: chromiumPath(),
    headless: true,
    args: LAUNCH_ARGS,
    pipe: true,
    handleSIGINT: false,
    handleSIGTERM: false,
    handleSIGHUP: false,
    protocolTimeout: CFG.RENDER_MS + 10000,
    timeout: 15000,
  });
  b.on('disconnected', () => {
    if (browser === b) browser = null;
  });
  return b;
}

async function getBrowser() {
  if (browser && browser.connected !== false) return browser;
  browser = null;
  if (!launching) {
    launching = launch()
      .then((b) => {
        browser = b;
        return b;
      })
      .finally(() => {
        launching = null;
      });
  }
  return launching;
}

async function closeBrowser() {
  cancelIdleClose();
  const b = browser;
  browser = null;
  if (!b) return;
  const proc = typeof b.process === 'function' ? b.process() : null;
  let timer;
  const closed = await Promise.race([
    b.close().then(
      () => true,
      () => false
    ),
    new Promise((r) => {
      timer = setTimeout(() => r(false), CFG.CLOSE_MS);
      if (timer.unref) timer.unref();
    }),
  ]);
  clearTimeout(timer);
  if (!closed && proc && proc.exitCode === null && !proc.killed) {
    try {
      proc.kill('SIGKILL');
    } catch (_) {
      /* already gone */
    }
  }
}

function isTargetClosed(err) {
  const m = String((err && err.message) || '');
  return /Target closed|Session closed|Connection closed|browser has disconnected|Protocol error.*(closed|detached)|Navigating frame was detached/i.test(m);
}

function withTimeout(promise, ms, onTimeout) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        if (onTimeout) onTimeout();
        reject(new PdfError('PDF_UNAVAILABLE', 'PDF rendering timed out; please use Print instead'));
      }, ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

/** Open a page with network locked down, load html, wait for the paginator. */
async function preparePage(b, html, viewport) {
  const page = await b.newPage();
  page.setDefaultTimeout(CFG.RENDER_MS);
  await page.setViewport(viewport);
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (url.startsWith('data:') || url === 'about:blank') req.continue().catch(() => {});
    else req.abort().catch(() => {});
  });
  await page.setContent(String(html), { waitUntil: 'load', timeout: CFG.RENDER_MS });
  await page.waitForFunction('typeof window.__bdPaginated === "number"', { timeout: CFG.RENDER_MS, polling: 50 });
  const pages = await page.evaluate("window.__bdPaginated");
  return { page, pages: Number(pages) || 0 };
}

/**
 * Run job(browser) with the render timeout; one retry on a fresh browser when
 * the target/browser went away. A timeout closes (or kills) the browser.
 */
async function withBrowser(job) {
  if (status() !== 'ready') throw new PdfError('PDF_UNAVAILABLE');
  let attempt = 0;
  for (;;) {
    attempt++;
    try {
      const b = await getBrowser();
      return await withTimeout(job(b), CFG.RENDER_MS, () => {
        closeBrowser().catch(() => {});
      });
    } catch (err) {
      if (err instanceof PdfError) throw err;
      if (attempt === 1 && isTargetClosed(err)) {
        await closeBrowser().catch(() => {});
        continue;
      }
      console.error('[biodataPdf] render failed:', err && err.name, String((err && err.message) || '').slice(0, 160));
      throw new PdfError('PDF_UNAVAILABLE', 'PDF rendering failed; please use Print instead');
    }
  }
}

async function renderPdf({ html } = {}) {
  if (status() !== 'ready') throw new PdfError('PDF_UNAVAILABLE');
  if (!html || typeof html !== 'string') throw new TypeError('renderPdf needs html');
  return runQueued(() =>
    withBrowser(async (b) => {
      const { page, pages } = await preparePage(b, html, VIEWPORT);
      try {
        const out = await page.pdf({
          format: 'A4',
          preferCSSPageSize: true,
          printBackground: true,
          margin: { top: 0, right: 0, bottom: 0, left: 0 },
          timeout: CFG.RENDER_MS,
        });
        return { buffer: Buffer.from(out), pages };
      } finally {
        page.close().catch(() => {});
      }
    })
  );
}

async function renderPng({ html, width = VIEWPORT.width, scale = 1 } = {}) {
  if (status() !== 'ready') throw new PdfError('PDF_UNAVAILABLE');
  if (!html || typeof html !== 'string') throw new TypeError('renderPng needs html');
  const w = Math.max(200, Math.min(2000, Math.round(Number(width) || VIEWPORT.width)));
  const s = Math.max(0.25, Math.min(4, Number(scale) || 1));
  return runQueued(() =>
    withBrowser(async (b) => {
      const { page } = await preparePage(b, html, { width: w, height: Math.round((w * 297) / 210), deviceScaleFactor: s });
      try {
        const el = await page.$('.bd-page');
        const shot = el ? await el.screenshot({ type: 'png' }) : await page.screenshot({ type: 'png' });
        return Buffer.from(shot);
      } finally {
        page.close().catch(() => {});
      }
    })
  );
}

async function shutdown() {
  while (waiting.length) {
    const w = waiting.shift();
    clearTimeout(w.timer);
    w.reject(new PdfError('PDF_UNAVAILABLE', 'The server is restarting'));
  }
  await closeBrowser();
}

/** Test hooks: queue state and a reset. */
const _internals = {
  CFG,
  LAUNCH_ARGS,
  runQueued,
  acquire,
  memAvailableMb,
  isTargetClosed,
  state: () => ({ active, waiting: waiting.length, browser: !!browser, idleTimer: !!idleTimer }),
  reset() {
    while (waiting.length) {
      const w = waiting.shift();
      clearTimeout(w.timer);
    }
    active = 0;
    cancelIdleClose();
  },
};

module.exports = { status, renderPdf, renderPng, shutdown, PdfError, VIEWPORT, _internals };
