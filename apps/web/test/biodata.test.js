'use strict';
// Biodata Maker web track (docs/plans/02-biodata-maker.md, Phase 3): routes/biodata.js,
// the biodata views, SEO plumbing (pageMeta, sitemap, robots, url contract, redirects).
//
// The routes run against a fake API on a random loopback port and a stub kit
// (installed in require.cache), so the tests need neither the real API nor a
// finished kit. The builder view belongs to the builder track: a stub view
// that prints the boot payload is rendered instead.
const test = require('node:test');
const { before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const Module = require('node:module');
const ejs = require('ejs');

process.env.NODE_ENV = 'test';
const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');
const REPO = path.resolve(ROOT, '..', '..');

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ID = 'ab'.repeat(12);
const TOKEN = 'a'.repeat(48);
const HOSTILE = '<img src=x onerror=alert(1)>';

const KIT_ROWS = [
  { id: 'premium-traditional', slug: 'premium-traditional', name: { en: 'Premium Traditional', hi: 'x' }, tagline: 'Classic', categories: ['traditional', 'premium'], culture: 'hindu', archetype: 'classic', palettes: ['maroon'], fonts: ['serif'], photoPlacements: ['top'], defaults: { palette: 'maroon' }, thumbnail: '/images/biodata/premium-traditional.webp' },
  { id: 'clean-minimal', slug: 'clean-minimal', name: 'Clean Minimalist', tagline: 'Simple', categories: ['minimal', 'modern'], culture: '', archetype: 'sidebar', palettes: ['slate'], fonts: ['sans'], photoPlacements: ['rail'], defaults: {}, thumbnail: '/images/biodata/clean-minimal.webp' },
  { id: 'photo-focused', slug: 'photo-focused', name: 'Photo Focused', tagline: 'Big photo', categories: ['photo'], culture: '', archetype: 'hero', palettes: ['rose'], fonts: ['sans'], photoPlacements: ['hero'], defaults: {}, thumbnail: '/images/biodata/photo-focused.webp' },
  { id: 'print-bw', slug: 'print-bw', name: 'Printer Friendly', tagline: 'B&W', categories: ['print-friendly'], culture: '', archetype: 'classic', palettes: ['ink'], fonts: ['serif'], photoPlacements: ['top'], defaults: {}, thumbnail: '/images/biodata/print-bw.webp' },
];
const CATEGORIES = [
  { slug: 'traditional', name: 'Traditional', description: 'Classic Indian layouts' },
  { slug: 'modern', name: 'Modern', description: 'Clean contemporary designs' },
  { slug: 'minimal', name: 'Minimal', description: 'Quiet and simple' },
  { slug: 'premium', name: 'Premium', description: 'Ornate designs' },
  { slug: 'photo', name: 'Photo', description: 'Photo first' },
  { slug: 'print-friendly', name: 'Print-friendly', description: 'Black and white' },
];

const kitDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-biodata-kit-'));
fs.writeFileSync(path.join(kitDir, 'a.js'), 'window.BiodataKit = window.BiodataKit || {};');
fs.writeFileSync(path.join(kitDir, 'b.js'), 'window.BiodataKit.ready = true;');
const stubKit = {
  DEFAULT_TEMPLATE: 'premium-traditional',
  fontsDir: kitDir,
  bundleFiles: [path.join(kitDir, 'a.js'), path.join(kitDir, 'b.js')],
  registry: { summary: () => KIT_ROWS.map((r) => ({ ...r })), CATEGORIES },
  fontFaceCss: (families, urlFor) => families.map((f) => `@font-face{font-family:'${f}';src:url(${urlFor(f.replace(/ /g, '') + '.woff2')})}`).join(''),
  previewShell: () => '<!doctype html><html><head><style id="bd-fonts"></style><style id="bd-css"></style></head><body><div id="bd-root"></div><script>window.__bdRepaginate=function(){return 1;};</script></body></html>',
};

// What the fake API answers; tests change it.
const api = {
  calls: [],
  templates: () => ({
    status: true,
    data: [
      { templateId: 'clean-minimal', slug: 'clean-minimal', name: 'Clean Minimalist', tagline: 'Simple', categories: ['minimal', 'modern'], isFeatured: false, order: 1 },
      { templateId: 'premium-traditional', slug: 'premium-traditional', name: 'Premium <Traditional>', tagline: HOSTILE, categories: ['traditional', 'premium'], isFeatured: true, order: 2, thumbnail: 'javascript:alert(1)' },
      { templateId: 'print-bw', slug: 'print-bw', name: 'Printer Friendly', categories: ['print-friendly'], order: 3 },
    ],
    categories: CATEGORIES,
  }),
  config: { status: true, data: { enabled: true, guestDownloads: true, maxPerUser: 10, languages: ['en', 'hi'], shareDefaultDays: 30, pdf: 'ready' } },
  landing: null,
  pages: {},
  published: [],
  documents: { status: true, data: [{ _id: ID, title: 'Priya <script>alert(1)</script>', templateId: 'clean-minimal', status: 'draft', version: 3, updatedAt: '2026-10-20T10:00:00Z', hasPhoto: false, shareActive: true, shareExpiresAt: '2026-11-20T10:00:00Z' }], max: 10 },
  shared: { [TOKEN]: { title: 'Aarav <b>Rathod</b>', templateId: 'clean-minimal', design: { labelLanguage: 'en' }, expiresAt: '2026-11-20T10:00:00Z', html: '<div id="bd-flow"><p class="x">Aarav &lt;b&gt;Rathod&lt;/b&gt;</p><script>evil()</script></div>', css: '.x{color:red}</style><script>evil()</script>', fontFamilies: ['Poppins'] } },
};

function json(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

const fake = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  const auth = req.headers.authorization || '';
  api.calls.push({ path: url.pathname + url.search, auth });
  const p = url.pathname;
  if (p === '/api/auth/me') return auth === 'Bearer good' ? json(res, 200, { user: { _id: 'c'.repeat(24), full_name: 'Test Member', email: 't@example.com' } }) : json(res, 401, { message: 'no' });
  if (p === '/api/blogs/featured') return json(res, 200, { status: true, data: [] });
  if (p === '/api/biodata/templates') return api.templates ? json(res, 200, api.templates()) : json(res, 500, {});
  if (p === '/api/biodata/config') return json(res, 200, api.config);
  if (p === '/api/biodata/pages' && url.searchParams.get('published') === '1') return json(res, 200, { status: true, data: api.published });
  let m = /^\/api\/biodata\/pages\/([a-z0-9-]+)$/.exec(p);
  if (m) {
    const page = m[1] === 'biodata-maker' ? api.landing : api.pages[m[1]];
    return page ? json(res, 200, { status: true, data: page }) : json(res, 404, { status: false, message: 'Not found' });
  }
  if (p === '/api/biodata/documents') return auth === 'Bearer good' ? json(res, 200, api.documents) : json(res, 401, {});
  m = /^\/api\/biodata\/documents\/([a-f0-9]{24})$/.exec(p);
  if (m) {
    if (auth !== 'Bearer good') return json(res, 401, {});
    return m[1] === ID ? json(res, 200, { status: true, data: { _id: ID, title: 'Mine', templateId: 'print-bw', design: {}, data: {}, status: 'draft', version: 3, share: null, photo: null } }) : json(res, 404, { status: false });
  }
  m = /^\/api\/biodata\/shared\/([a-f0-9]{48})$/.exec(p);
  if (m) return api.shared[m[1]] ? json(res, 200, { status: true, data: api.shared[m[1]] }) : json(res, 404, { status: false });
  return json(res, 404, { status: false });
});

let base = '';
let biodata;
let cache;
let server;

before(async () => {
  await new Promise((resolve) => fake.listen(0, '127.0.0.1', resolve));
  process.env.AUTH_SERVER_URL = `http://127.0.0.1:${fake.address().port}`;
  process.env.API_URL = process.env.AUTH_SERVER_URL;

  // Stub kit: the lazy require in routes/biodata.js finds it in the module cache.
  const kitPath = require.resolve('@banjaramatch/shared/biodata');
  const mod = new Module(kitPath);
  mod.filename = kitPath;
  mod.exports = stubKit;
  mod.loaded = true;
  require.cache[kitPath] = mod;

  const express = require('express');
  const cookieParser = require('cookie-parser');
  const assets = require('../utils/assets');
  const { safeJson, jsonLd } = require('../utils/jsonLd');
  cache = require('../utils/apiClient').cache;
  biodata = require('../routes/biodata');

  const stubViews = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-biodata-views-'));
  fs.mkdirSync(path.join(stubViews, 'pages'));
  fs.writeFileSync(path.join(stubViews, 'pages', 'biodata-maker-create.ejs'),
    '<!doctype html><html><head><%- include(\'' + path.join(VIEWS, 'partials', 'head').replace(/\\/g, '/') + '\') %></head><body data-doc="<%= boot.document ? boot.document._id : \'\' %>"><script>window.BM_BIODATA_BOOT = <%- safeJson(boot) %>;</script></body></html>');

  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', [stubViews, VIEWS]);
  Object.assign(app.locals, {
    safeJson, jsonLd, asset: assets.asset, assetHas: assets.has, assetFileExists: assets.publicFileExists,
    photoUrl: require('../utils/photoUrl'), img: require('../utils/img'), site: require('../config/site'), escapeHtml: require('../utils/escapeHtml'),
  });
  app.use(cookieParser());
  app.use('/fonts/biodata', biodata.fonts);
  app.use(require('../middleware/seoDefaults'));
  app.use(biodata);
  app.use((req, res) => res.status(404).type('text/plain').send('404'));
  app.use(require('../middleware/errorHandler'));
  await new Promise((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  if (server) server.close();
  fake.close();
});

beforeEach(() => {
  if (cache) cache.clear();
  api.calls = [];
});

const get = (p, opts = {}) => fetch(base + p, { redirect: 'manual', ...opts });
const asGood = { headers: { Cookie: 'bm_session=good' } };
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
const canonicalOf = (html) => (/<link rel="canonical" href="([^"]+)">/.exec(html) || [])[1];
const robotsOf = (html) => (/<meta name="robots" content="([^"]+)">/.exec(html) || [])[1];
const bootOf = (html) => JSON.parse(/window\.BM_BIODATA_BOOT = (.*?);<\/script>/.exec(html)[1]);

const GUIDE = {
  slug: 'marriage-biodata-format',
  kind: 'guide',
  isPublished: true,
  metaTitle: 'Marriage Biodata Format: Sections & Fields | BanjaraMatch',
  metaDescription: 'How to lay out a marriage biodata.',
  h1: 'Marriage Biodata Format ' + HOSTILE,
  intro: '<p>Intro <strong>text</strong></p>',
  contentWords: 640,
  publishedAt: '2026-10-22T00:00:00Z',
  updatedAt: '2026-10-22T00:00:00Z',
  contentBlocks: [
    { type: 'richText', heading: 'Rich ' + HOSTILE, html: '<p>Rich <em>body</em></p>' },
    { type: 'steps', heading: 'Steps', items: ['Personal details. Name and birth ' + HOSTILE, { title: 'Family', text: 'Parents' }] },
    { type: 'checklist', heading: 'Checklist', items: ['Check ' + HOSTILE] },
    { type: 'table', heading: 'Table', rows: [['Field', 'Example'], ['Name', HOSTILE]] },
    { type: 'callout', heading: 'Callout', html: '<p>Note</p>' },
    { type: 'cta', heading: 'Build it', ctaLabel: 'Go ' + HOSTILE, ctaHref: 'javascript:alert(1)' },
  ],
  faqs: [{ question: 'Q1 ' + HOSTILE + '?', answer: 'A1' }, { question: 'Q2?', answer: 'A2' }],
  relatedLinks: [{ label: 'External', href: 'https://evil.example' }, { label: 'Templates', href: '/biodata-maker/templates' }, { label: 'Unpublished guide', href: '/marriage-biodata-in-hindi' }],
};

// ---------------------------------------------------------------------------
// pageMeta
// ---------------------------------------------------------------------------

test('pageMeta: biodata entries, robots, canonical, assets, honest JSON-LD', () => {
  const { pageMeta } = require('../config/pageMeta');
  const landing = pageMeta('biodataMaker');
  assert.equal(landing.canonical, '/biodata-maker');
  assert.doesNotMatch(String(landing.robots || ''), /noindex/);
  assert.equal(landing.ogImage, '/images/biodata/og-biodata-maker.jpg');
  assert.ok(!landing.scripts.some((s) => /biodata-kit|biodata-builder/.test(s)), 'no kit or builder JS on the landing page');
  assert.equal(landing.jsonLd.length, 1);
  const app = landing.jsonLd[0];
  assert.equal(app['@type'], 'WebApplication');
  assert.deepEqual(app.offers, { '@type': 'Offer', price: '0', priceCurrency: 'INR' });
  assert.equal(app.provider['@id'], 'https://www.banjaramatch.com/#organization');
  assert.deepEqual(app.inLanguage, ['en-IN', 'hi-IN']);
  const flat = JSON.stringify(['biodataMaker', 'biodataTemplates', 'biodataBuilder', 'biodataMy', 'biodataShared', 'biodataGuide'].map((k) => pageMeta(k)));
  for (const bad of ['aggregateRating', 'BreadcrumbList', '"Organization"', 'telephone', 'FAQPage', 'Review']) assert.ok(!flat.includes(bad), bad);

  const builder = pageMeta('biodataBuilder');
  assert.equal(builder.robots, 'noindex, follow');
  assert.equal(builder.canonical, '/biodata-maker/create');
  assert.deepEqual(builder.styles, ['css/biodata-builder.css']);
  assert.deepEqual(builder.scripts, ['js/biodata-kit.js', 'js/biodata-cropper.js', 'js/biodata-builder.js']);
  assert.equal(pageMeta('biodataMy').robots, 'noindex, nofollow');
  assert.equal(pageMeta('biodataShared').robots, 'noindex, nofollow');
  assert.equal(pageMeta('biodataShared').noAnalytics, true);
  assert.equal(pageMeta('biodataGuide').brandSuffix, false);
  for (const k of ['biodataMaker', 'biodataTemplates', 'biodataBuilder']) {
    const t = pageMeta(k).title;
    assert.ok((/banjara\s?match/i.test(t) ? t : t + ' | BanjaraMatch').length <= 60, `${k} title too long`);
  }
});

test('pageMeta faq: one biodata Q/A in the FAQPage and the same question in the static faq.ejs block', () => {
  const { pageMeta } = require('../config/pageMeta');
  const qs = pageMeta('faq').jsonLd[0].mainEntity.map((q) => q.name);
  assert.equal(qs.filter((q) => /biodata/i.test(q)).length, 1);
  const src = fs.readFileSync(path.join(VIEWS, 'pages', 'faq.ejs'), 'utf8');
  assert.ok(src.includes(qs.find((q) => /biodata/i.test(q))));
  assert.match(src, /href="\/biodata-maker"/);
});

// ---------------------------------------------------------------------------
// Units
// ---------------------------------------------------------------------------

test('categoryRedirect: known slug -> sub-path, unknown -> bare gallery, none -> null', () => {
  const { categoryRedirect } = biodata;
  assert.equal(categoryRedirect({ category: 'traditional' }, CATEGORIES), '/biodata-maker/templates/traditional');
  assert.equal(categoryRedirect({ category: 'Traditional ' }, CATEGORIES), '/biodata-maker/templates/traditional');
  assert.equal(categoryRedirect({ category: 'nope' }, CATEGORIES), '/biodata-maker/templates');
  assert.equal(categoryRedirect({ category: ['modern', 'x'] }, CATEGORIES), '/biodata-maker/templates/modern');
  assert.equal(categoryRedirect({}, CATEGORIES), null);
});

test('guide and share token patterns', () => {
  const { GUIDE_SLUG_RE, GUIDE_ROUTE_RE, SHARE_TOKEN_RE } = biodata;
  for (const s of ['marriage-biodata-format', 'marriage-biodata-in-hindi', 'banjara-biodata-gotra-and-clan']) {
    assert.ok(GUIDE_SLUG_RE.test(s), s);
    assert.ok(GUIDE_ROUTE_RE.test('/' + s), s);
  }
  for (const s of ['banjara-matrimony-telangana', 'banjara-matrimony-biodata-x', 'marriage-biodata-', 'marriage-biodata-x', 'biodata-maker', 'Marriage-biodata-format', 'marriage-biodata-format/x']) {
    assert.ok(!GUIDE_ROUTE_RE.test('/' + s), s);
  }
  assert.ok(SHARE_TOKEN_RE.test(TOKEN));
  for (const t of ['a'.repeat(47), 'A'.repeat(48), 'g'.repeat(48), TOKEN + 'a']) assert.ok(!SHARE_TOKEN_RE.test(t), t);
});

test('normalizeTemplate: own-host thumbnails only, names from {en}, bad ids dropped', () => {
  const n = biodata.normalizeTemplate;
  assert.equal(n({ templateId: 'x y' }, 0), null);
  const r = n({ templateId: 'royal-heritage', name: { en: 'Royal', hi: 'राजसी' }, thumbnail: 'https://evil.example/a.webp', categories: ['premium', 'Bad Slug'] }, 2);
  assert.equal(r.name, 'Royal');
  assert.equal(r.thumbnail, '/images/biodata/royal-heritage.webp');
  assert.deepEqual(r.categories, ['premium']);
  assert.equal(r.order, 2);
});

test('shareDocument: kit html/css go into the preview shell, scripts stripped, bridge appended', () => {
  const doc = biodata.shareDocument(api.shared[TOKEN], stubKit);
  assert.match(doc, /<div id="bd-root"><div id="bd-flow">/);
  assert.ok(doc.includes('<style id="bd-css">.x{color:red}\\3c /style>\\3c script>evil()\\3c /script></style>'), 'css "<" escaped');
  assert.match(doc, /<style id="bd-fonts">@font-face\{font-family:'Poppins';src:url\(\/fonts\/biodata\/Poppins\.woff2\)\}<\/style>/);
  assert.doesNotMatch(doc, /evil\(\)<\/script>/);
  assert.match(doc, /bmBiodata:"size"/);
  assert.match(doc, /__bdRepaginate/);
  // Without a shell: a minimal document that still shows the content.
  const bare = biodata.shareDocument(api.shared[TOKEN], null);
  assert.match(bare, /^<!doctype html>/);
  assert.match(bare, /#bd-flow\{display:block!important/);
});

// ---------------------------------------------------------------------------
// Landing
// ---------------------------------------------------------------------------

test('GET /biodata-maker: landing with the API page renders exactly one FAQPage, gallery links, escaping', async () => {
  api.landing = {
    slug: 'biodata-maker', kind: 'landing', isPublished: true, h1: 'Free Marriage Biodata Maker',
    metaTitle: 'Free Marriage Biodata Maker Online with PDF | BanjaraMatch', metaDescription: 'Make a biodata.',
    intro: '<p>Landing intro</p>', contentBlocks: [{ type: 'steps', heading: 'How it works', items: ['Choose a template. Pick one.', 'Add details. Type them.', 'Download. Get the PDF.'] }],
    faqs: [{ question: 'Is it free?', answer: 'Yes.' }, { question: 'Hindi ' + HOSTILE + '?', answer: 'Yes.' }],
    ctaConfig: { heading: 'Ready?', primaryLabel: 'Start', primaryHref: 'javascript:alert(1)' },
    relatedLinks: [{ label: 'Hindi guide', href: '/marriage-biodata-in-hindi' }],
  };
  api.published = [];
  const res = await get('/biodata-maker');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.equal(canonicalOf(html), 'https://www.banjaramatch.com/biodata-maker');
  assert.match(robotsOf(html), /^index, follow/);
  assert.match(html, /<title>Free Marriage Biodata Maker Online with PDF \| BanjaraMatch<\/title>/);
  const blocks = ldBlocks(html);
  assert.equal(blocks.filter((b) => b['@type'] === 'FAQPage').length, 1);
  assert.equal(blocks.filter((b) => b['@type'] === 'FAQPage')[0].mainEntity.length, 2);
  assert.equal(blocks.filter((b) => b['@type'] === 'WebApplication').length, 1);
  assert.equal(blocks.filter((b) => b['@type'] === 'BreadcrumbList').length, 1);
  assert.equal((html.match(/<details/g) || []).length, 2);
  assert.match(html, /<h1 id="bdp-title">Free Marriage Biodata Maker<\/h1>/);
  assert.match(html, /href="\/biodata-maker\/create\?template=premium-traditional"/);
  assert.match(html, /href="\/biodata-maker\/create\?template=clean-minimal"/);
  assert.match(html, /href="\/biodata-maker\/templates\/traditional"/);
  assert.match(html, /href="#templates"/);
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.match(html, /Premium &lt;Traditional&gt;/);
  assert.doesNotMatch(html, /javascript:alert/);
  assert.doesNotMatch(html, /biodata-kit/, 'no kit on the landing page');
  assert.doesNotMatch(html, /href="\/marriage-biodata-in-hindi"/, 'unpublished guide is not linked');
  for (const a of biodata.BIODATA_ARTICLES) assert.ok(html.includes(`href="${a.href}"`), a.href);
  assert.match(html, /<b>Choose a template<\/b>|<h3>Choose a template<\/h3>/);
  assert.match(html, /fictional sample details/);
  assert.match(html, /fetchpriority="high"|bdp-thumb is-missing/);
});

test('GET /biodata-maker: published guides are linked; without API landing the seed copy is used', async () => {
  api.landing = null;
  api.published = [{ slug: 'marriage-biodata-in-hindi', kind: 'guide', metaTitle: 'Hindi | BanjaraMatch', h1: 'Marriage Biodata in Hindi', contentWords: 400 }];
  const html = await (await get('/biodata-maker')).text();
  assert.match(html, /href="\/marriage-biodata-in-hindi"/);
  const faqs = ldBlocks(html).filter((b) => b['@type'] === 'FAQPage');
  assert.ok(faqs.length <= 1);
  let seed = null;
  try { seed = require('@banjaramatch/shared/biodata/content/pages'); } catch { seed = null; }
  const landing = seed && (Array.isArray(seed) ? seed : seed.pages || []).find((p) => p.slug === 'biodata-maker');
  if (landing && landing.faqs && landing.faqs.length) {
    assert.equal(faqs.length, 1);
    assert.equal(faqs[0].mainEntity.length, Math.min(15, landing.faqs.length));
    assert.equal((html.match(/<details/g) || []).length, faqs[0].mainEntity.length);
  }
});

test('landing view without FAQs carries no FAQPage', () => {
  const { pageMeta } = require('../config/pageMeta');
  const site = require('../config/site');
  const { safeJson, jsonLd } = require('../utils/jsonLd');
  const file = path.join(VIEWS, 'pages', 'biodata-landing.ejs');
  const html = ejs.render(fs.readFileSync(file, 'utf8'), {
    site, safeJson, jsonLd, asset: (p) => '/' + p, assetHas: () => false, assetFileExists: () => false,
    photoUrl: () => '', img: Object.assign(() => '', { cssUrl: (p) => p }), escapeHtml: (s) => String(s),
    metaDefaults: { canonical: '/biodata-maker', jsonLd: [] }, regionalIndex: [], user: null,
    meta: pageMeta('biodataMaker', { jsonLd: [] }), breadcrumbs: [{ name: 'Biodata Maker', url: '/biodata-maker' }],
    templates: [], categories: [], page: null, faqs: [], cta: { heading: 'H', text: '', primaryLabel: 'Go', primaryHref: '/biodata-maker/create' },
    relatedLinks: [], guides: [], articles: [], featuredBlogs: [], guestDownloads: true,
  }, { filename: file });
  assert.equal(ldBlocks(html).filter((b) => b['@type'] === 'FAQPage').length, 0);
  assert.equal((html.match(/<details/g) || []).length, 0);
  assert.match(html, /The template gallery is being updated/);
});

// ---------------------------------------------------------------------------
// Gallery
// ---------------------------------------------------------------------------

test('templates gallery: ?category= 301s, category pages, robots by the 300-word rule', async () => {
  let res = await get('/biodata-maker/templates?category=traditional');
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), '/biodata-maker/templates/traditional');
  res = await get('/biodata-maker/templates?category=unknown');
  assert.equal(res.status, 301);
  assert.equal(res.headers.get('location'), '/biodata-maker/templates');

  res = await get('/biodata-maker/templates');
  assert.equal(res.status, 200);
  let html = await res.text();
  assert.equal(canonicalOf(html), 'https://www.banjaramatch.com/biodata-maker/templates');
  assert.match(robotsOf(html), /^index, follow/);
  assert.equal((html.match(/href="\/biodata-maker\/create\?template=/g) || []).length, 3 * 2, 'two links per card (media + button), 3 active templates');
  assert.match(html, /data-bdp-view="phone"/);

  api.pages.traditional = { slug: 'traditional', kind: 'category', isPublished: true, h1: 'Traditional biodata templates', intro: '<p>Long intro</p>', contentWords: 320, faqs: [{ question: 'Which?', answer: 'This.' }] };
  res = await get('/biodata-maker/templates/traditional');
  assert.equal(res.status, 200);
  html = await res.text();
  assert.equal(canonicalOf(html), 'https://www.banjaramatch.com/biodata-maker/templates/traditional');
  assert.match(robotsOf(html), /^index, follow/);
  assert.equal(ldBlocks(html).filter((b) => b['@type'] === 'FAQPage').length, 1);
  assert.match(html, /aria-current="page">Traditional/);
  assert.equal((html.match(/data-cats=/g) || []).length, 1);

  api.pages.traditional.contentWords = 120;
  cache.clear();
  html = await (await get('/biodata-maker/templates/traditional')).text();
  assert.equal(robotsOf(html), 'noindex, follow');

  html = await (await get('/biodata-maker/templates/modern')).text();
  assert.equal(robotsOf(html), 'noindex, follow', 'no published category page');
  assert.equal(ldBlocks(html).filter((b) => b['@type'] === 'FAQPage').length, 0);

  assert.equal((await get('/biodata-maker/templates/nonexistent')).status, 404);
});

test('gallery falls back to the kit registry when the API has no templates', async () => {
  const saved = api.templates;
  api.templates = null;
  try {
    const html = await (await get('/biodata-maker/templates')).text();
    assert.match(html, /href="\/biodata-maker\/create\?template=photo-focused"/);
    assert.match(html, /Premium Traditional/);
  } finally {
    api.templates = saved;
  }
});

// ---------------------------------------------------------------------------
// Builder route (boot payload, contract §3)
// ---------------------------------------------------------------------------

test('GET /biodata-maker/create: guest boot payload, noindex, template validation', async () => {
  let res = await get('/biodata-maker/create?template=clean-minimal&doc=' + ID);
  assert.equal(res.status, 200);
  let html = await res.text();
  assert.equal(robotsOf(html), 'noindex, follow');
  assert.equal(canonicalOf(html), 'https://www.banjaramatch.com/biodata-maker/create');
  assert.match(html, /<body data-doc="">/);
  let boot = bootOf(html);
  assert.deepEqual(Object.keys(boot).sort(), ['categories', 'config', 'document', 'loginUrl', 'pdfAvailable', 'templateId', 'templates', 'user']);
  assert.equal(boot.user, null);
  assert.equal(boot.document, null);
  assert.equal(boot.templateId, 'clean-minimal');
  assert.equal(boot.pdfAvailable, true);
  assert.equal(boot.loginUrl, '/login?returnTo=/biodata-maker/create');
  assert.deepEqual(boot.templates.map((t) => t.id), ['premium-traditional', 'clean-minimal', 'print-bw'], 'kit rows, active only, API order (featured first)');
  assert.ok(boot.templates[0].palettes, 'kit summary fields kept');
  assert.ok(!api.calls.some((c) => c.path.startsWith('/api/biodata/documents')), 'no document fetch for a guest');

  html = await (await get('/biodata-maker/create?template=evil<x>')).text();
  boot = bootOf(html);
  assert.equal(boot.templateId, 'premium-traditional');
});

test('GET /biodata-maker/create?doc=: the owner document is fetched with the session', async () => {
  let html = await (await get('/biodata-maker/create?doc=' + ID, asGood)).text();
  let boot = bootOf(html);
  assert.equal(boot.user.id, 'c'.repeat(24));
  assert.equal(boot.user.name, 'Test Member');
  assert.equal(boot.document._id, ID);
  assert.equal(boot.templateId, 'print-bw', 'document template when no ?template');
  assert.ok(api.calls.some((c) => c.path === '/api/biodata/documents/' + ID && c.auth === 'Bearer good'));
  html = await (await get('/biodata-maker/create?doc=' + 'f'.repeat(24), asGood)).text();
  boot = bootOf(html);
  assert.equal(boot.document, null, 'unknown/not owned -> null');
  html = await (await get('/biodata-maker/create?doc=nope', asGood)).text();
  assert.equal(bootOf(html).document, null);
});

// ---------------------------------------------------------------------------
// My biodatas
// ---------------------------------------------------------------------------

test('GET /biodata-maker/my: login required, list escaped, noindex, member nav', async () => {
  let res = await get('/biodata-maker/my');
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/login');
  res = await get('/biodata-maker/my', asGood);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('cache-control'), /no-store/);
  const html = await res.text();
  assert.equal(robotsOf(html), 'noindex, nofollow');
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(html, /Priya &lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.match(html, /href="\/biodata-maker\/create\?doc=abababababababababababab"/);
  assert.match(html, /href="\/api\/biodata\/documents\/abababababababababababab\/pdf"/);
  assert.match(html, /data-action="duplicate"/);
  assert.match(html, /data-action="delete"/);
  assert.match(html, /data-action="share"/);
  assert.match(html, /href="\/biodata-maker\/my" class="act"/);
  assert.match(html, /1 of 10 saved/);
  assert.match(html, /Shared until/);
});

// ---------------------------------------------------------------------------
// Share view
// ---------------------------------------------------------------------------

test('GET /biodata-maker/s/:token: sandboxed iframe, noindex meta + header, no analytics, escaped', async () => {
  const res = await get('/biodata-maker/s/' + TOKEN);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
  assert.match(res.headers.get('cache-control'), /no-store/);
  assert.equal(res.headers.get('referrer-policy'), 'no-referrer');
  const html = await res.text();
  assert.equal(robotsOf(html), 'noindex, nofollow');
  assert.doesNotMatch(html, /googletagmanager|gtag\('consent'/);
  assert.match(html, /<iframe id="bdpShareFrame"[^>]*sandbox="allow-scripts allow-modals"/);
  assert.doesNotMatch(html, /allow-same-origin/);
  const srcdoc = /srcdoc="([^"]*)"/.exec(html)[1];
  assert.doesNotMatch(srcdoc, /[<>"]/, 'srcdoc is attribute-escaped');
  assert.match(srcdoc, /&lt;div id=&#34;bd-root&#34;&gt;/);
  assert.match(html, /<h1>Aarav &lt;b&gt;Rathod&lt;\/b&gt;<\/h1>/);
  assert.match(html, /href="\/api\/biodata\/shared\/a{48}\/pdf"/);
  assert.match(html, /data-action="print"/);
  assert.match(html, /Made with the BanjaraMatch Biodata Maker/);
  assert.equal(api.calls.filter((c) => c.path === '/api/biodata/shared/' + TOKEN).length, 1);
  // Not cached: a second view asks the API again.
  await (await get('/biodata-maker/s/' + TOKEN)).text();
  assert.equal(api.calls.filter((c) => c.path === '/api/biodata/shared/' + TOKEN).length, 2);
});

test('share view: malformed or unknown token -> 404 noindex', async () => {
  for (const t of ['zzz', '0'.repeat(48)]) {
    const res = await get('/biodata-maker/s/' + t);
    assert.equal(res.status, 404, t);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    const html = await res.text();
    assert.equal(robotsOf(html), 'noindex, nofollow');
    assert.match(html, /This biodata link is not available/);
    assert.doesNotMatch(html, /<iframe/);
  }
  assert.ok(!api.calls.some((c) => c.path === '/api/biodata/shared/zzz'), 'malformed token never reaches the API');
});

// ---------------------------------------------------------------------------
// Guides
// ---------------------------------------------------------------------------

test('guide page: every block type, escaped, Article + one FAQPage, robots and canonical rules', async () => {
  api.pages['marriage-biodata-format'] = GUIDE;
  api.published = [{ slug: 'marriage-biodata-format', kind: 'guide', h1: 'Format', contentWords: 640 }];
  const res = await get('/marriage-biodata-format');
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<title>Marriage Biodata Format: Sections &amp; Fields \| BanjaraMatch<\/title>/);
  assert.equal(canonicalOf(html), 'https://www.banjaramatch.com/marriage-biodata-format');
  assert.match(robotsOf(html), /^index, follow/);
  const blocks = ldBlocks(html);
  assert.equal(blocks.filter((b) => b['@type'] === 'Article').length, 1);
  assert.equal(blocks.filter((b) => b['@type'] === 'FAQPage').length, 1);
  assert.equal(blocks.find((b) => b['@type'] === 'Article').publisher['@id'], 'https://www.banjaramatch.com/#organization');
  assert.doesNotMatch(html, /<img src=x onerror/);
  assert.ok((html.match(/&lt;img src=x onerror=alert\(1\)&gt;/g) || []).length >= 6, 'hostile text appears escaped in h1, headings, items, cells, labels, faq');
  assert.match(html, /<p>Rich <em>body<\/em><\/p>/, 'sanitised richText html is kept');
  assert.match(html, /<ol class="bdp-block-steps">/);
  assert.match(html, /<b>Personal details<\/b>/);
  assert.match(html, /<ul class="bdp-block-check">/);
  assert.match(html, /<thead><tr><th scope="col">Field<\/th>/);
  assert.match(html, /bdp-callout/);
  assert.match(html, /class="bdp-block bdp-ctabox"/);
  assert.doesNotMatch(html, /javascript:alert|evil\.example/);
  assert.doesNotMatch(html, /href="\/marriage-biodata-in-hindi"/, 'unpublished guide not linked');
  assert.equal((html.match(/<details/g) || []).length, 2);
});

test('guide page: thin content is noindex, canonicalOverride wins, wrong kind and unknown slugs 404', async () => {
  api.pages['banjara-biodata-gotra-and-clan'] = { ...GUIDE, slug: 'banjara-biodata-gotra-and-clan', contentWords: 120, canonicalOverride: '/marriage-biodata-format', faqs: [] };
  const html = await (await get('/banjara-biodata-gotra-and-clan')).text();
  assert.equal(robotsOf(html), 'noindex, follow');
  assert.equal(canonicalOf(html), 'https://www.banjaramatch.com/marriage-biodata-format');
  assert.equal(ldBlocks(html).filter((b) => b['@type'] === 'FAQPage').length, 0);
  api.pages['marriage-biodata-landing-x'] = { ...GUIDE, kind: 'category' };
  assert.equal((await get('/marriage-biodata-landing-x')).status, 404);
  assert.equal((await get('/marriage-biodata-nothing-here')).status, 404);
  assert.equal((await get('/banjara-matrimony-telangana')).status, 404, 'regional slugs are not guide routes');
});

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

test('GET /js/biodata-kit.js concatenates the kit bundle (no-store); /fonts/biodata is CORS-open', async () => {
  let res = await get('/js/biodata-kit.js');
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /javascript/);
  assert.equal(res.headers.get('cache-control'), 'no-store');
  const js = await res.text();
  assert.ok(js.indexOf('window.BiodataKit = window.BiodataKit') < js.indexOf('ready = true'));
  fs.writeFileSync(path.join(kitDir, 'test.woff2'), 'x');
  res = await get('/fonts/biodata/test.woff2');
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
  assert.match(res.headers.get('cache-control'), /max-age=2592000/);
});

// ---------------------------------------------------------------------------
// SEO plumbing
// ---------------------------------------------------------------------------

test('sitemap: biodata-maker + templates static entries; create/my/share and biodata-builder absent', () => {
  const { pages, mapBiodataRows } = require('../utils/generateSitemap');
  const locs = pages.map((p) => p.loc);
  assert.ok(locs.includes('biodata-maker'));
  assert.ok(locs.includes('biodata-maker/templates'));
  for (const l of ['biodata-maker/create', 'biodata-maker/my', 'biodata-builder']) assert.ok(!locs.includes(l), l);
  for (const p of pages.filter((x) => x.loc.startsWith('biodata-maker'))) assert.ok(fs.existsSync(path.join(ROOT, p.sourceFile)), p.sourceFile);

  const rows = mapBiodataRows([
    { slug: 'marriage-biodata-format', kind: 'guide', contentWords: 600, updatedAt: '2026-10-20T00:00:00Z' },
    { slug: 'marriage-biodata-in-hindi', kind: 'guide', contentWords: 299 },
    { slug: 'traditional', kind: 'category', contentWords: 300 },
    { slug: 'modern', kind: 'category', contentWords: 10 },
    { slug: 'biodata-maker', kind: 'landing', contentWords: 900 },
    { slug: 'banjara-matrimony-x', kind: 'guide', contentWords: 900 },
    { slug: 'marriage-biodata-format', kind: 'guide', contentWords: 600 },
    null,
  ]);
  assert.deepEqual(rows.map((r) => r.loc), ['marriage-biodata-format', 'biodata-maker/templates/traditional']);
  assert.equal(rows[0].lastmod, '2026-10-20');
});

test('robots.txt disallows the private biodata areas only', () => {
  const txt = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.match(txt, /^Disallow: \/biodata-maker\/my$/m);
  assert.match(txt, /^Disallow: \/biodata-maker\/s\/$/m);
  assert.doesNotMatch(txt, /^Disallow: \/biodata-maker$/m);
  assert.doesNotMatch(txt, /^Disallow: \/biodata-maker\/(create|templates)/m);
});

test('url contract lists the biodata URLs; legacy builder URLs redirect to /biodata-maker', () => {
  const contract = fs.readFileSync(path.join(REPO, 'deploy', 'url-contract.txt'), 'utf8');
  for (const line of [
    'https://www.banjaramatch.com/biodata-maker 200',
    'https://www.banjaramatch.com/biodata-maker/templates 200',
    'https://www.banjaramatch.com/biodata-maker/create 200',
    'https://www.banjaramatch.com/biodata-maker/templates?category=traditional 301',
    'https://www.banjaramatch.com/biodata-maker/my 302',
    `https://www.banjaramatch.com/biodata-maker/s/${'0'.repeat(48)} 404`,
    'https://www.banjaramatch.com/marriage-biodata-format 200',
    'https://www.banjaramatch.com/biodata-builder 301',
    'https://www.banjaramatch.com/biodata-builder.html 301',
  ]) assert.ok(contract.split('\n').includes(line), line);

  const appSrc = fs.readFileSync(path.join(ROOT, 'app.js'), 'utf8');
  for (const f of ['biodata-builder-v2.html', 'biodata-builder-old-24templates.html', 'biodata-builder-backup.html', 'biodata-builder.html']) {
    assert.match(appSrc, new RegExp(`'/${f.replace(/\./g, '\\.')}':\\s*'/biodata-maker'`), f);
  }
  assert.match(appSrc, /app\.use\(require\('\.\/routes\/member'\)\);\napp\.use\(require\('\.\/routes\/biodata'\)\);\nconst indexRoutes/);
  assert.match(appSrc, /app\.use\('\/fonts\/biodata', require\('\.\/routes\/biodata'\)\.fonts\)/);
  const indexSrc = fs.readFileSync(path.join(ROOT, 'routes', 'index.js'), 'utf8');
  assert.match(indexSrc, /router\.get\('\/biodata-builder', \(req, res\) => res\.redirect\(301, '\/biodata-maker'\)\)/);
  assert.doesNotMatch(fs.readFileSync(path.join(VIEWS, 'pages', 'regional-city-ahmedabad.ejs'), 'utf8'), /href="\/biodata-builder"/);
});

test('site links: header, footer, member nav and the HTML sitemap point at the biodata maker', () => {
  const read = (rel) => fs.readFileSync(path.join(VIEWS, rel), 'utf8');
  assert.match(read('partials/header.ejs'), /href="\/biodata-maker">Biodata Maker</);
  assert.match(read('partials/footer.ejs'), /href="\/biodata-maker"/);
  assert.match(read('partials/member-nav.ejs'), /href: '\/biodata-maker\/my'/);
  assert.match(read('pages/sitemap.ejs'), /href="\/biodata-maker"/);
  assert.doesNotMatch(fs.readFileSync(path.join(ROOT, 'public', 'css', 'responsive.css'), 'utf8'), /biodata-builder-section/);
});

// The real kit, when it loads (it is built by another track): its summary rows
// normalise into gallery rows and its preview shell takes the share content.
test('real kit integration (skipped while the kit does not load)', (t) => {
  const kitPath = require.resolve('@banjaramatch/shared/biodata');
  const stub = require.cache[kitPath];
  delete require.cache[kitPath];
  let K = null;
  try { K = require('@banjaramatch/shared/biodata'); } catch (err) { t.skip('kit not loadable: ' + err.message.split('\n')[0]); }
  finally { require.cache[kitPath] = stub; }
  if (!K) return;
  const rows = K.registry.summary().map(biodata.normalizeTemplate).filter(Boolean);
  assert.equal(rows.length, K.registry.summary().length);
  assert.ok(rows.every((r) => r.thumbnail === `/images/biodata/${r.id}.webp`));
  const doc = biodata.shareDocument({ html: '<p id="probe">x</p>', css: '.p{}', fontFamilies: [] }, K);
  assert.match(doc, /<div id="bd-root"[^>]*><p id="probe">x<\/p>/);
  assert.match(doc, /bmBiodata:"size"/);
});
