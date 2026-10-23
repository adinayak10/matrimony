'use strict';
// Biodata builder shell (views/pages/biodata-maker-create.ejs) and its static
// assets. No network: the view renders with stub locals (contract section 3).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

process.env.NODE_ENV = 'test';
const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');
const VIEW = path.join(VIEWS, 'pages', 'biodata-maker-create.ejs');
const JS = path.join(ROOT, 'public', 'js');

const site = require('../config/site');
const { safeJson, jsonLd } = require('../utils/jsonLd');

const baseLocals = () => ({
  site, safeJson, jsonLd,
  photoUrl: () => '/images/profiles/1.jpg',
  asset: (p) => '/' + String(p).replace(/^\/+/, ''),
  assetHas: () => false,
  assetFileExists: () => false,
  img: Object.assign(() => '', { cssUrl: (p) => p }),
  escapeHtml: (s) => String(s),
  metaDefaults: { robots: 'index, follow, max-image-preview:large', ogType: 'website', ogImage: site.defaultImage, canonical: '/x', jsonLd: [] },
  regionalIndex: [],
  user: null,
  breadcrumbs: [{ name: 'Biodata Maker', url: '/biodata-maker' }, { name: 'Create', url: '/biodata-maker/create' }],
  GA4_MEASUREMENT_ID: '', DEBUG_MODE: false,
});

const meta = {
  title: 'Create your marriage biodata',
  description: 'Free biodata maker.',
  robots: 'noindex, follow',
  canonical: '/biodata-maker/create',
  scripts: ['js/biodata-kit.js', 'js/biodata-cropper.js', 'js/biodata-builder.js'],
  styles: ['css/biodata-builder.css'],
};

const guestBoot = () => ({
  user: null,
  document: null,
  templateId: 'premium-traditional',
  templates: [{ id: 'premium-traditional', name: 'Premium Traditional', categories: ['traditional'] }],
  categories: [{ slug: 'traditional', name: 'Traditional' }],
  config: { enabled: true, guestDownloads: true, maxPerUser: 10, languages: ['en', 'hi'], shareDefaultDays: 30, pdf: 'ready' },
  pdfAvailable: true,
  loginUrl: '/login?returnTo=/biodata-maker/create',
});

const render = (locals) => ejs.render(fs.readFileSync(VIEW, 'utf8'), { ...baseLocals(), meta, ...locals }, { filename: VIEW });

function bootFrom(html) {
  const m = /<script>window\.BM_BIODATA_BOOT = ([\s\S]*?);<\/script>/.exec(html);
  assert.ok(m, 'boot script present');
  return JSON.parse(m[1]);
}

test('builder view: page rules (head/scripts partials, no script src, no title, absolute assets)', () => {
  const src = fs.readFileSync(VIEW, 'utf8');
  assert.match(src, /include\('\.\.\/partials\/head'\)/);
  assert.match(src, /include\('\.\.\/partials\/scripts'\)/);
  assert.doesNotMatch(src, /<script[^>]*\ssrc=/);
  assert.doesNotMatch(src, /<title>/);
  assert.doesNotMatch(src, /(src|href)="(css|js|images)\//);
});

test('builder view: guest shell ids, empty data-doc, scripts in contract order', () => {
  const html = render({ boot: guestBoot() });
  assert.match(html, /<main id="bdm-app" class="bdm is-loading" data-doc="" data-owner="0" data-pdf="1"/);
  for (const id of ['bdm-title', 'bdm-status', 'bdm-notices', 'bdm-steps', 'bdm-editor', 'bdm-panel', 'bdm-preview', 'bdm-viewport', 'bdm-scaler', 'bdm-frame', 'bdm-live', 'bdm-toasts', 'bdm-menu']) {
    assert.match(html, new RegExp(`id="${id}"`), id);
  }
  assert.match(html, /<iframe id="bdm-frame"[^>]*title="Biodata preview"/);
  assert.match(html, /<body class="bdm-page">/);
  assert.match(html, /<link rel="stylesheet" href="\/css\/biodata-builder\.css">/);
  const order = ['/js/biodata-kit.js', '/js/biodata-cropper.js', '/js/biodata-builder.js'].map((s) => html.indexOf(`<script defer src="${s}"`));
  assert.ok(order.every((i) => i > 0), 'all three builder scripts are emitted');
  assert.ok(order[0] < order[1] && order[1] < order[2], 'kit, cropper, builder order');
  assert.ok(html.indexOf('window.BM_BIODATA_BOOT') < order[0], 'boot payload precedes the deferred scripts');
  assert.match(html, /<meta name="robots" content="noindex, follow">/);
  assert.match(html, /Download PDF/);
  assert.match(html, /<noscript>/);
});

test('builder view: boot JSON round-trips and cannot break out of its <script>', () => {
  const boot = guestBoot();
  boot.document = {
    _id: '65f0c0ffee0000000000abcd', title: '</script><script>alert(1)</script>', templateId: 'premium-traditional',
    design: {}, data: { personal: { fullName: 'A "quoted" <b>name</b> &   line' } }, version: 3, photo: null, share: null,
  };
  boot.user = { id: 'u1', name: '<img src=x onerror=alert(1)>' };
  const html = render({ boot, user: { _id: 'u1', full_name: 'Test' } });
  assert.doesNotMatch(html, /<\/script><script>alert\(1\)/);
  assert.doesNotMatch(html, /<img src=x onerror/);
  const parsed = bootFrom(html);
  assert.deepEqual(parsed, JSON.parse(JSON.stringify(boot)));
  assert.match(html, /data-doc="65f0c0ffee0000000000abcd" data-owner="1"/);
});

test('builder view: data-doc attribute is escaped; pdf unavailable relabels the export button', () => {
  const boot = guestBoot();
  boot.user = { id: 'u1', name: 'X' };
  boot.document = { _id: '"><svg onload=alert(1)>', title: 't' };
  boot.pdfAvailable = false;
  const html = render({ boot });
  assert.doesNotMatch(html, /data-doc="">/);
  assert.match(html, /data-doc="&#34;&gt;&lt;svg onload=alert\(1\)&gt;"/);
  assert.match(html, /data-pdf="0"/);
  assert.match(html, /<span class="bdm-export-label">Print \/ Save as PDF<\/span>/);
});

test('builder view: renders without a boot object (route error fallback)', () => {
  const html = render({});
  assert.match(html, /window\.BM_BIODATA_BOOT = \{\};/);
  assert.match(html, /data-doc=""/);
});

test('builder view: accessibility attributes on stepper, tabs, preview and toolbar', () => {
  const html = render({ boot: guestBoot() });
  assert.match(html, /<div id="bdm-steps" class="bdm-steps__list" role="tablist" aria-label="Steps"/);
  assert.match(html, /role="progressbar" aria-labelledby="bdm-steps-count" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"/);
  assert.match(html, /<div class="bdm-mtabs" role="tablist" aria-label="Builder view">/);
  assert.match(html, /role="tab" id="bdm-mtab-edit"[^>]*aria-selected="true" aria-controls="bdm-editor" tabindex="0"/);
  assert.match(html, /role="tab" id="bdm-mtab-preview"[^>]*aria-selected="false" aria-controls="bdm-preview" tabindex="-1"/);
  assert.match(html, /id="bdm-panel" class="bdm-panel" role="tabpanel"/);
  assert.match(html, /id="bdm-status" class="bdm-status" role="status" aria-live="polite"/);
  assert.match(html, /id="bdm-live" class="bdm-sr" aria-live="polite"/);
  assert.match(html, /<label class="bdm-sr" for="bdm-title">Biodata title<\/label>/);
  assert.match(html, /role="toolbar" aria-label="Biodata actions"/);
  assert.match(html, /aria-haspopup="menu" aria-expanded="false" aria-controls="bdm-menu"/);
  // Every icon-only button has an accessible name.
  for (const m of html.matchAll(/<button[^>]*class="bdm-iconbtn[^"]*"[^>]*>/g)) assert.match(m[0], /aria-label="[^"]+"/, m[0]);
  // Decorative SVGs are hidden from assistive tech.
  const main = html.slice(html.indexOf('<main id="bdm-app"'), html.indexOf('</main>'));
  for (const m of main.matchAll(/<svg[^>]*>/g)) assert.match(m[0], /aria-hidden="true"/, m[0]);
});

test('builder scripts: one preview innerHTML sink marked raw-ok; no alert/confirm; ES2017 syntax only', () => {
  const builder = fs.readFileSync(path.join(JS, 'biodata-builder.js'), 'utf8');
  const cropper = fs.readFileSync(path.join(JS, 'biodata-cropper.js'), 'utf8');
  const sinks = builder.split('\n').map((l, i) => ({ l, i })).filter(({ l }) => /\.(inner|outer)HTML\s*=|insertAdjacentHTML/.test(l));
  assert.equal(sinks.length, 1, 'exactly one innerHTML sink (the preview root)');
  const lines = builder.split('\n');
  assert.match(lines[sinks[0].i - 1], /raw-ok:/);
  assert.match(sinks[0].l, /root\.innerHTML = parts\.body/);
  assert.doesNotMatch(cropper, /innerHTML|insertAdjacentHTML/);
  for (const src of [builder, cropper]) {
    assert.doesNotMatch(src, /\bwindow\.(confirm|alert|prompt)\(|(^|[^.\w])(confirm|alert|prompt)\(/m, 'custom dialogs only');
    assert.doesNotMatch(src, /\?\.|\?\?/, 'no optional chaining / nullish coalescing (ES2017)');
    assert.doesNotMatch(src, /^\s*(import|export)\s/m, 'no modules');
  }
  assert.match(builder, /credentials: 'same-origin'/);
  assert.match(builder, /bm:biodata:v1/);
  assert.doesNotThrow(() => new Function(builder));
  assert.doesNotThrow(() => new Function(cropper));
});
