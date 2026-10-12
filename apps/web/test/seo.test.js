'use strict';
// Track D stage 2: meta contract, breadcrumbs, index rule, sitemap guards,
// robots.txt. No network: templates are rendered with stub locals.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ejs = require('ejs');

process.env.NODE_ENV = 'test';
const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');

const site = require('../config/site');
const { safeJson, jsonLd } = require('../utils/jsonLd');
const { PAGES, pageMeta } = require('../config/pageMeta');
const { uniqueCmsWords, isIndexable, robotsFor, MIN_UNIQUE_WORDS } = require('../utils/regionalIndexing');

const baseLocals = () => ({
  site, safeJson, jsonLd,
  asset: (p) => '/' + String(p).replace(/^\/+/, ''),
  assetHas: () => false,
  assetFileExists: () => false,
  photoUrl: () => '/images/profiles/1.jpg',
  img: () => '',
  escapeHtml: (s) => String(s),
  metaDefaults: { robots: 'index, follow, max-image-preview:large', ogType: 'website', ogImage: site.defaultImage, canonical: '/x', jsonLd: [] },
  regionalIndex: [],
  user: null,
  GA4_MEASUREMENT_ID: '', DEBUG_MODE: false,
});

const render = (rel, locals) => ejs.render(fs.readFileSync(path.join(VIEWS, rel), 'utf8'), { ...baseLocals(), ...locals }, { filename: path.join(VIEWS, rel) });

const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('every template compiles', () => {
  for (const dir of ['pages', 'partials']) {
    for (const f of fs.readdirSync(path.join(VIEWS, dir))) {
      if (!f.endsWith('.ejs')) continue;
      const p = path.join(VIEWS, dir, f);
      assert.doesNotThrow(() => ejs.compile(fs.readFileSync(p, 'utf8'), { filename: p }), `${dir}/${f} does not compile`);
    }
  }
});

test('every page uses head.ejs and scripts.ejs (500/503 are standalone)', () => {
  for (const f of fs.readdirSync(path.join(VIEWS, 'pages'))) {
    if (!f.endsWith('.ejs') || f === '500.ejs' || f === '503.ejs') continue;
    const src = fs.readFileSync(path.join(VIEWS, 'pages', f), 'utf8');
    assert.match(src, /include\('\.\.\/partials\/head'\)/, `${f} lacks head.ejs`);
    assert.match(src, /include\('\.\.\/partials\/scripts'\)/, `${f} lacks scripts.ejs`);
    assert.doesNotMatch(src, /<script[^>]*\ssrc=/, `${f} still has a <script src> outside scripts.ejs`);
    assert.doesNotMatch(src, /<title>/, `${f} still has its own <title>`);
    assert.doesNotMatch(src, /(src|href)="(css|js|images)\//, `${f} has a relative asset path`);
  }
});

test('head.ejs: title suffix, description, canonical, robots, one Organization, page JSON-LD', () => {
  const html = render('partials/head.ejs', { meta: pageMeta('faq', { canonical: '/faq' }) });
  assert.match(html, /<title>FAQ - Frequently Asked Questions \| BanjaraMatch<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.banjaramatch\.com\/faq">/);
  assert.match(html, /<meta name="robots" content="index, follow, max-image-preview:large">/);
  assert.match(html, /<meta name="description" content="Answers to common questions/);
  const blocks = ldBlocks(html);
  assert.equal(blocks.filter((b) => b['@type'] === 'Organization').length, 1);
  assert.equal(blocks.filter((b) => b['@type'] === 'FAQPage').length, 1);
  assert.doesNotMatch(html, /maximum-scale/);
  assert.doesNotMatch(html, /hreflang/);
});

test('head.ejs: brand suffix is added only when absent; noindex pages', () => {
  const a = render('partials/head.ejs', { meta: { title: 'Plain title', description: '' } });
  assert.match(a, /<title>Plain title \| BanjaraMatch<\/title>/);
  const b = render('partials/head.ejs', { meta: pageMeta('notFound') });
  assert.match(b, /<meta name="robots" content="noindex, nofollow">/);
  const c = render('partials/head.ejs', { meta: pageMeta('login') });
  assert.match(c, /<meta name="robots" content="noindex, follow">/);
  const d = render('partials/head.ejs', { meta: pageMeta('resetPassword') });
  assert.doesNotMatch(d, /googletagmanager\.com\/gtag/, 'reset-password must not load analytics');
});

test('head.ejs: live titles stay verbatim (brandSuffix: false, "Banjara Match" counts as the brand)', () => {
  const home = render('partials/head.ejs', { meta: pageMeta('home', { canonical: '/' }) });
  assert.match(home, /<title>Banjara Matrimony - Free Matrimonial Site \| Find Banjara Brides &amp; Grooms<\/title>/);
  const app = render('partials/head.ejs', { meta: pageMeta('app') });
  assert.match(app, /<title>Banjara Matrimony App - Find Lambadi Brides &amp; Grooms \| Free Download<\/title>/);
  const lambadi = render('partials/head.ejs', { meta: pageMeta('lambadi') });
  assert.match(lambadi, /<title>Lambadi Matrimony \| Find Lambadi Brides &amp; Grooms — BanjaraMatch<\/title>/);
  assert.doesNotMatch(lambadi, /&amp;amp;/);
  const dash = render('partials/head.ejs', { meta: pageMeta('dashboard') });
  assert.match(dash, /<title>Dashboard - Banjara Match<\/title>/);
  assert.doesNotMatch(JSON.stringify(PAGES), /&amp;|&#\d+;/, 'page meta is plain text; head.ejs escapes it');
});

test('pageMeta: account-deletion has a real title/description/canonical; nested orgs are @id refs', () => {
  const m = pageMeta('accountDeletion');
  assert.equal(m.title, 'Account & Data Deletion Request | BanjaraMatch');
  assert.ok(m.description.length > 40);
  assert.equal(m.canonical, '/account-deletion');
  const json = JSON.stringify(PAGES);
  assert.doesNotMatch(json, /"@type":"Organization"/, 'page JSON-LD must reference the site Organization by @id');
  assert.doesNotMatch(json, /"@type":"BreadcrumbList"/, 'BreadcrumbList comes from partials/breadcrumb.ejs only');
  assert.doesNotMatch(json, /telephone|aggregateRating/i);
  assert.throws(() => pageMeta('nope'));
});

test('breadcrumb.ejs: Home once, JSON-LD list, nothing without crumbs', () => {
  const html = render('partials/breadcrumb.ejs', { breadcrumbs: [{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blogs' }, { name: 'Tips', url: '/blogs/tips' }] });
  assert.equal((html.match(/> ?Home</g) || []).length, 1);
  const [ld] = ldBlocks(html);
  assert.equal(ld['@type'], 'BreadcrumbList');
  assert.deepEqual(ld.itemListElement.map((i) => i.name), ['Home', 'Blog', 'Tips']);
  assert.equal(ld.itemListElement[2].item, 'https://www.banjaramatch.com/blogs/tips');
  assert.match(html, /aria-current="page"/);
  assert.doesNotMatch(html, /itemprop|<style>/);
  assert.equal(render('partials/breadcrumb.ejs', { breadcrumbs: [] }).trim(), '');
});

test('regional-links.ejs renders states with nested cities and nothing when empty', () => {
  const regionalIndex = [{ state: 'Telangana', slug: 'banjara-matrimony-telangana', cities: [{ name: 'Hyderabad', slug: 'banjara-matrimony-hyderabad' }] }];
  const html = render('partials/regional-links.ejs', { regionalIndex, heading: 'By State' });
  assert.match(html, /href="\/banjara-matrimony-telangana"/);
  assert.match(html, /href="\/banjara-matrimony-hyderabad"/);
  assert.match(html, /By State/);
  assert.equal(render('partials/regional-links.ejs', { regionalIndex: [] }).trim(), '');
});

test('index rule: states always indexed, cities need >= 300 unique CMS words', () => {
  assert.equal(MIN_UNIQUE_WORDS, 300);
  const state = { pageType: 'state', state: { name: 'Telangana' }, introSection: { content: 'short' } };
  assert.equal(isIndexable(state), true);
  const thin = { pageType: 'city', city: { name: 'X' }, heroSection: { title: 'Find your match in X' }, metaDescription: 'ignored meta words here' };
  assert.ok(uniqueCmsWords(thin) < 10);
  assert.equal(robotsFor(thin), 'noindex, follow');
  const words = Array.from({ length: 320 }, (_, i) => 'word' + i).join(' ');
  const rich = { pageType: 'city', city: { name: 'X' }, introSection: { content: '<p>' + words + '</p>' } };
  assert.equal(isIndexable(rich), true);
  assert.equal(robotsFor(rich), 'index, follow, max-image-preview:large');
  assert.equal(isIndexable({ ...rich, isPublished: false }), false);
});

test('sitemapFiles: SITEMAP_DIR, atomic write, empty and shrunken outputs refused', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-sitemaps-'));
  const prev = process.env.SITEMAP_DIR;
  process.env.SITEMAP_DIR = dir;
  try {
    const sm = require('../utils/sitemapFiles');
    assert.equal(sm.sitemapDir(), dir);
    const url = (n) => `<url><loc>https://www.banjaramatch.com/p${n}</loc></url>`;
    const xml = (n) => `<?xml version="1.0"?><urlset>${Array.from({ length: n }, (_, i) => url(i)).join('')}</urlset>`;
    assert.equal(sm.writeSitemap('sitemap-main.xml', xml(10), { count: 10 }), true);
    assert.equal(sm.countUrls(path.join(dir, 'sitemap-main.xml')), 10);
    assert.equal(sm.writeSitemap('sitemap-main.xml', xml(0), { count: 0 }), false, 'empty must not overwrite');
    assert.equal(sm.writeSitemap('sitemap-main.xml', xml(4), { count: 4 }), false, 'below 50% must not overwrite');
    assert.equal(sm.writeSitemap('sitemap-main.xml', xml(6), { count: 6 }), true);
    assert.equal(sm.countUrls(path.join(dir, 'sitemap-main.xml')), 6);
    assert.ok(!fs.existsSync(path.join(dir, 'sitemap-main.xml.tmp')));
    assert.equal(sm.escapeXml('a&b<c>"d\''), 'a&amp;b&lt;c&gt;&quot;d&apos;');
  } finally {
    if (prev === undefined) delete process.env.SITEMAP_DIR; else process.env.SITEMAP_DIR = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('sitemapFiles: a symlinked target is written through, the link survives', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-sitemaps-link-'));
  const shared = path.join(dir, 'shared');
  const pub = path.join(dir, 'public');
  fs.mkdirSync(shared);
  fs.mkdirSync(pub);
  fs.writeFileSync(path.join(shared, 'sitemap-main.xml'), '<urlset><url></url></urlset>');
  fs.symlinkSync(path.join(shared, 'sitemap-main.xml'), path.join(pub, 'sitemap-main.xml'));
  fs.symlinkSync(path.join(shared, 'sitemap-blogs.xml'), path.join(pub, 'sitemap-blogs.xml')); // dangling
  const prev = process.env.SITEMAP_DIR;
  process.env.SITEMAP_DIR = pub;
  try {
    const sm = require('../utils/sitemapFiles');
    const xml = '<urlset><url></url><url></url></urlset>';
    assert.equal(sm.writeSitemap('sitemap-main.xml', xml, { count: 2 }), true);
    assert.equal(sm.writeSitemap('sitemap-blogs.xml', xml, { count: 2 }), true);
    for (const f of ['sitemap-main.xml', 'sitemap-blogs.xml']) {
      assert.ok(fs.lstatSync(path.join(pub, f)).isSymbolicLink(), f + ' must stay a symlink');
      assert.equal(fs.readFileSync(path.join(shared, f), 'utf8'), xml);
    }
    assert.deepEqual(fs.readdirSync(shared).sort(), ['sitemap-blogs.xml', 'sitemap-main.xml'], 'no temp file left behind');
    assert.deepEqual(fs.readdirSync(pub).sort(), ['sitemap-blogs.xml', 'sitemap-main.xml']);
  } finally {
    if (prev === undefined) delete process.env.SITEMAP_DIR; else process.env.SITEMAP_DIR = prev;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('index rule: the API contentWords wins; hero/CTA text is not owner prose', () => {
  assert.equal(robotsFor({ pageType: 'city', city: { name: 'X' }, contentWords: 300 }), 'index, follow, max-image-preview:large');
  assert.equal(robotsFor({ pageType: 'city', city: { name: 'X' }, contentWords: 299 }), 'noindex, follow');
  const words = Array.from({ length: 320 }, (_, i) => 'word' + i).join(' ');
  assert.equal(uniqueCmsWords({ pageType: 'city', heroSection: { title: words }, ctaSection: { text: words } }), 0);
  assert.equal(uniqueCmsWords({ pageType: 'city', faqSection: { faqs: [{ question: 'alpha beta', answer: 'beta gamma' }] } }), 3);
});

test('main sitemap list: account-deletion priority 0.1, biodata-builder removed, no logged-in pages', () => {
  const { pages } = require('../utils/generateSitemap');
  const byLoc = Object.fromEntries(pages.map((p) => [p.loc, p]));
  assert.equal(byLoc['account-deletion'].priority, '0.1');
  assert.equal(byLoc['biodata-builder'], undefined);
  for (const loc of ['all-profiles', 'dashboard', 'login', 'user-chat']) assert.equal(byLoc[loc], undefined, loc + ' must not be in the sitemap');
  assert.ok(pages.length >= 19);
});

test('robots.txt: one * group, private areas blocked, AI policy, single sitemap', () => {
  const txt = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  assert.equal((txt.match(/^User-agent: \*$/gm) || []).length, 1);
  for (const p of ['/dashboard', '/all-profiles', '/profile/', '/user-chat', '/thank-you', '/auth/', '/api/', '/socket.io/', '/health', '/deploy-webhook', '/csp-report', '/*?search=', '/*?gender=']) {
    assert.match(txt, new RegExp('^Disallow: ' + p.replace(/[*?/.]/g, '\\$&') + '$', 'm'), 'missing Disallow ' + p);
  }
  assert.doesNotMatch(txt, /Crawl-delay/);
  assert.doesNotMatch(txt, /\*\.html/);
  assert.doesNotMatch(txt, /^Disallow: \/register$/m);
  assert.doesNotMatch(txt, /\?page=|\?category=/);
  for (const bot of ['GPTBot', 'CCBot', 'Google-Extended', 'anthropic-ai', 'SemrushBot', 'AhrefsBot', 'MJ12bot', 'DotBot']) {
    assert.match(txt, new RegExp('User-agent: ' + bot + '\\nDisallow: /'), bot + ' must be blocked');
  }
  for (const bot of ['ChatGPT-User', 'OAI-SearchBot', 'PerplexityBot', 'Claude-User']) {
    assert.match(txt, new RegExp('User-agent: ' + bot + '\\nAllow: /'), bot + ' must be allowed');
  }
  assert.deepEqual(txt.match(/^Sitemap: .*$/gm), ['Sitemap: https://www.banjaramatch.com/sitemap.xml']);
});

test('blog-section.ejs maps API fields and renders nothing without posts', () => {
  const blogs = [{ title: 'T', slug: 's', category: 'Tips', featuredImage: 'images/blog/x.jpg', description: 'D', author: { name: 'A' } }];
  const html = render('partials/blog-section.ejs', { blogs, sectionTitle: 'Articles' });
  assert.match(html, /src="\/images\/blog\/x\.jpg"/);
  assert.match(html, /href="\/blogs\/tips\/s"/);
  assert.match(html, /Tips - A/);
  assert.equal(render('partials/blog-section.ejs', { blogs: [] }).trim(), '');
});
