'use strict';
// /banjara-matrimony-ahmedabad has its own layout (config/cityPageTemplates.js);
// every other city keeps pages/regional-page-city. Rendered from the reviewed
// CMS content in docs/content/regional with stub locals, no network.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

process.env.NODE_ENV = 'test';
const ROOT = path.resolve(__dirname, '..');
const VIEW = path.join(ROOT, 'views', 'pages', 'regional-city-ahmedabad.ejs');
const CONTENT = path.join(ROOT, '..', '..', 'docs', 'content', 'regional', 'banjara-matrimony-ahmedabad.json');

const site = require('../config/site');
const { safeJson, jsonLd } = require('../utils/jsonLd');
const cityPageTemplates = require('../config/cityPageTemplates');
const { uniqueCmsWords, robotsFor } = require('../utils/regionalIndexing');

const content = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));

function pageFixture(extra = {}) {
  return {
    slug: content.slug,
    pageType: 'city',
    isPublished: true,
    city: { _id: 'c1', name: 'Ahmedabad' },
    state: { _id: 's1', name: 'Gujarat' },
    stats: { totalMembers: 1, activeBrides: 1, activeGrooms: 0, verifiedProfiles: 1 },
    sameStateCities: [
      { slug: 'banjara-matrimony-surat', city: { name: 'Surat' } },
      { slug: 'banjara-matrimony-vadodara', city: { name: 'Vadodara' } },
    ],
    ...content.fields,
    ...extra,
  };
}

function render(page, user = null) {
  const img = () => '';
  img.cssUrl = (p) => p;
  return ejs.render(fs.readFileSync(VIEW, 'utf8'), {
    site, safeJson, jsonLd, img, user, page,
    asset: (p) => '/' + String(p).replace(/^\/+/, ''),
    assetHas: () => false,
    assetFileExists: () => false,
    photoUrl: () => '/images/profiles/1.jpg',
    escapeHtml: (s) => String(s),
    metaDefaults: { robots: 'index, follow', ogType: 'website', ogImage: site.defaultImage, canonical: '/x', jsonLd: [] },
    meta: { title: page.metaTitle, description: page.metaDescription, canonical: '/' + page.slug, robots: robotsFor(page), jsonLd: [] },
    regionalIndex: [],
    featuredBlogs: [],
    breadcrumbs: [{ name: 'Gujarat Matrimony', url: '/banjara-matrimony-gujarat' }, { name: 'Ahmedabad Matrimony', url: '/banjara-matrimony-ahmedabad' }],
    GA4_MEASUREMENT_ID: '', DEBUG_MODE: false,
  }, { filename: VIEW });
}

const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('only Ahmedabad has its own template; other cities keep the shared one', () => {
  assert.equal(cityPageTemplates['banjara-matrimony-ahmedabad'], 'pages/regional-city-ahmedabad');
  assert.deepEqual(Object.keys(cityPageTemplates), ['banjara-matrimony-ahmedabad']);
  assert.ok(fs.existsSync(VIEW));
});

test('the reviewed content clears the 300-word index rule', () => {
  const page = pageFixture();
  assert.ok(uniqueCmsWords(page) >= 300, `only ${uniqueCmsWords(page)} unique words`);
  assert.match(robotsFor(page), /^index/);
});

test('renders one H1, every FAQ, the internal links and Service JSON-LD', () => {
  const page = pageFixture();
  const html = render(page);
  assert.equal((html.match(/<h1[\s>]/g) || []).length, 1);
  assert.match(html, /<h1[^>]*>[\s\S]*Ahmedabad[\s\S]*<\/h1>/);
  const faqs = content.fields.faqSection.faqs;
  assert.equal((html.match(/<details/g) || []).length, faqs.length);
  for (const f of faqs) assert.ok(html.includes(ejs.escapeXML(f.question)), f.question);
  for (const href of ['/banjara-matrimony-gujarat', '/banjara-matrimony-surat', '/banjara-matrimony-vadodara', '/banjara-gotra-list', '/banjara-community-history', '/register']) {
    assert.ok(html.includes(`href="${href}"`), `missing link ${href}`);
  }
  const service = ldBlocks(html).find((b) => b['@type'] === 'Service');
  assert.ok(service, 'Service JSON-LD');
  assert.equal(service.areaServed.name, 'Ahmedabad');
  assert.equal(service.areaServed.containedInPlace.name, 'Gujarat');
  assert.doesNotMatch(html, /&amp;amp;/, 'no double-escaped entities');
});

test('CMS text stored with &amp; (admin sanitizer) is shown once-escaped', () => {
  const page = pageFixture({ ctaSection: { heading: 'Brides &amp; grooms in Ahmedabad', benefits: [] } });
  const html = render(page);
  assert.match(html, /Brides &amp; grooms in Ahmedabad/);
  assert.doesNotMatch(html, /&amp;amp;/);
});

test('live stats stay hidden until there are enough members; logged-in users get browse links', () => {
  assert.doesNotMatch(render(pageFixture()), /class="ah-stats"/);
  assert.match(render(pageFixture({ stats: { totalMembers: 120, activeBrides: 60, activeGrooms: 60, verifiedProfiles: 40 } })), /class="ah-stats"/);
  const html = render(pageFixture(), { _id: 'u1', full_name: 'Member' });
  assert.match(html, /href="\/all-profiles\?city=Ahmedabad"/);
  assert.match(html, /class="hero-search" data-guest="0"/);
});
