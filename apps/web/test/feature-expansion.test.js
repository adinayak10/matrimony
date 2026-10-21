'use strict';
// Track C (feature expansion): new pages, shared member nav, dynamic FAQ,
// success-stories JSON-LD, SEO wiring. No network: templates render with stub locals.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ejs = require('ejs');

process.env.NODE_ENV = 'test';
const ROOT = path.resolve(__dirname, '..');
const VIEWS = path.join(ROOT, 'views');

const site = require('../config/site');
const { safeJson, jsonLd, faqPageJsonLd, successStoriesJsonLd } = require('../utils/jsonLd');
const { PAGES, pageMeta } = require('../config/pageMeta');
const photoUrl = require('../utils/photoUrl');

const baseLocals = () => ({
  site, safeJson, jsonLd, photoUrl,
  asset: (p) => '/' + String(p).replace(/^\/+/, ''),
  assetHas: () => false,
  assetFileExists: () => false,
  img: Object.assign(() => '', { cssUrl: (p) => p }),
  escapeHtml: (s) => String(s),
  metaDefaults: { robots: 'index, follow, max-image-preview:large', ogType: 'website', ogImage: site.defaultImage, canonical: '/x', jsonLd: [] },
  regionalIndex: [],
  user: null,
  breadcrumbs: [],
  GA4_MEASUREMENT_ID: '', DEBUG_MODE: false,
});

const member = { _id: 'a'.repeat(24), full_name: 'Test Member', email: 't@example.com', login_type: 2, is_verified: false, settings: {} };
const render = (rel, locals) => ejs.render(fs.readFileSync(path.join(VIEWS, rel), 'utf8'), { ...baseLocals(), ...locals }, { filename: path.join(VIEWS, rel) });
const ldBlocks = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));

test('member-nav: active link, new entries, no Plan link', () => {
  const html = render('partials/member-nav.ejs', { user: member, active: 'saved-searches' });
  for (const href of ['/dashboard', '/daily-matches', '/saved-searches', '/verify-profile', '/user-interests', '/logout']) {
    assert.match(html, new RegExp(`href="${href}"`), href);
  }
  assert.doesNotMatch(html, /\/user-plan/);
  assert.equal((html.match(/class="act"/g) || []).length, 1);
  assert.match(html, /href="\/saved-searches" class="act"/);
});

test('no member view still carries its own copy of the sidebar or a /user-plan link', () => {
  for (const f of fs.readdirSync(path.join(VIEWS, 'pages'))) {
    const src = fs.readFileSync(path.join(VIEWS, 'pages', f), 'utf8');
    assert.doesNotMatch(src, /db-nav-list/, `${f} still has an inline .db-nav-list`);
    assert.doesNotMatch(src, /href="\/user-plan"/, `${f} links /user-plan`);
  }
  assert.ok(!fs.existsSync(path.join(VIEWS, 'pages', 'user-plan.ejs')));
  assert.equal(PAGES.userPlan, undefined);
});

test('pageMeta: success stories indexable, new member pages noindex', () => {
  assert.doesNotMatch(String(pageMeta('successStories').robots || ''), /noindex/);
  for (const k of ['shareSuccessStory', 'verifyProfile', 'dailyMatches', 'savedSearches']) {
    assert.equal(pageMeta(k).robots, 'noindex, nofollow', k);
  }
});

test('success-stories: empty state, CollectionPage JSON-LD, no ratings', () => {
  const meta = pageMeta('successStories', { canonical: '/success-stories', jsonLd: [successStoriesJsonLd([])] });
  const html = render('pages/success-stories.ejs', { meta, stories: [], currentPage: 1, totalPages: 1 });
  assert.match(html, /No stories published yet/);
  assert.match(html, /href="\/share-success-story"/);
  const blocks = ldBlocks(html);
  assert.equal(blocks.filter((b) => b['@type'] === 'CollectionPage').length, 1);
  assert.doesNotMatch(html, /aggregateRating|"Review"/);
});

test('success-stories: cards escape API text and the ItemList numbers by page', () => {
  const stories = [{ _id: '1', groomName: 'Ravi', brideName: 'Sita <b>', story: 'We met <script>x</script>', photo: 'uploads/s.jpg', weddingDate: '2026-02-01', city: 'Pune', publishedAt: '2026-03-01' }];
  const ld = successStoriesJsonLd(stories, { page: 2, pageSize: 12, imageUrl: photoUrl });
  assert.equal(ld.mainEntity.itemListElement[0].position, 13);
  assert.equal(ld.mainEntity.itemListElement[0].item['@type'], 'CreativeWork');
  assert.equal(ld.mainEntity.itemListElement[0].item.image, 'https://api.banjaramatch.com/uploads/s.jpg');
  const html = render('pages/success-stories.ejs', { meta: pageMeta('successStories', { jsonLd: [ld] }), stories, currentPage: 2, totalPages: 3 });
  assert.match(html, /Sita &lt;b&gt;/);
  assert.doesNotMatch(html, /<script>x<\/script>/);
  assert.match(html, /href="\/success-stories"[^>]*rel="prev"/);
  assert.match(html, /href="\/success-stories\?page=3"[^>]*rel="next"/);
});

test('stories router: totalPagesOf reads total/limit or pagination', () => {
  const { totalPagesOf } = require('../routes/stories');
  assert.equal(totalPagesOf({ total: 25, limit: 12 }, 1, 12), 3);
  assert.equal(totalPagesOf({ pagination: { totalPages: 4 } }, 1, 12), 4);
  assert.equal(totalPagesOf({ data: [] }, 1, 0), 1);
  assert.equal(totalPagesOf(null, 2, 12), 3);
});

test('faq: data-driven categories replace the static list and the FAQPage block', () => {
  const cats = [{ title: 'Accounts', faqs: [{ question: 'How do I <reset>?', answer: 'Line one\nLine two' }] }];
  const meta = { ...pageMeta('faq'), jsonLd: [faqPageJsonLd(cats)] };
  const head = render('partials/head.ejs', { meta });
  const faqBlocks = ldBlocks(head).filter((b) => b['@type'] === 'FAQPage');
  assert.equal(faqBlocks.length, 1);
  assert.equal(faqBlocks[0].mainEntity.length, 1);
  assert.equal(faqBlocks[0].mainEntity[0].name, 'How do I <reset>?');
  const html = render('pages/faq.ejs', { meta, faqCategories: cats, featuredBlogs: [] });
  assert.match(html, /How do I &lt;reset&gt;\?/);
  assert.doesNotMatch(html, /Is BanjaraMatch really free\?/);
  assert.equal(ldBlocks(html).filter((b) => b['@type'] === 'FAQPage').length, 1);
});

test('faq: static fallback when the API has no FAQs', () => {
  const html = render('pages/faq.ejs', { meta: pageMeta('faq'), faqCategories: [], featuredBlogs: [] });
  assert.match(html, /Is BanjaraMatch really free\?/);
  assert.equal(ldBlocks(html).filter((b) => b['@type'] === 'FAQPage').length, 1);
});

test('verify-profile: none / pending / rejected / verified states', () => {
  const base = { meta: pageMeta('verifyProfile'), user: member, statusError: false, documentTypes: ['Aadhaar Card'] };
  const none = render('pages/verify-profile.ejs', { ...base, verification: { is_verified: false, canSubmit: true, latest: null } });
  assert.match(none, /Not verified yet/);
  assert.match(none, /id="vpForm"/);
  assert.match(none, /capture="user"/);
  assert.match(none, /<option value="Aadhaar Card">/);
  const pending = render('pages/verify-profile.ejs', { ...base, verification: { is_verified: false, canSubmit: false, latest: { status: 'pending', submittedAt: '2026-10-01' } } });
  assert.match(pending, /Under review/);
  assert.doesNotMatch(pending, /id="vpForm"/);
  const rejected = render('pages/verify-profile.ejs', { ...base, verification: { is_verified: false, canSubmit: true, latest: { status: 'rejected', reason: 'Blurry <photo>' } } });
  assert.match(rejected, /Blurry &lt;photo&gt;/);
  assert.match(rejected, /id="vpForm"/);
  const verified = render('pages/verify-profile.ejs', { ...base, verification: { is_verified: true, verifiedAt: '2026-09-01', latest: null } });
  assert.match(verified, /Your profile is verified/);
  assert.doesNotMatch(verified, /id="vpForm"/);
});

test('daily-matches, saved-searches, share-success-story render with and without data', () => {
  const dm = render('pages/daily-matches.ejs', { meta: pageMeta('dailyMatches'), user: member, loadError: false, matches: [{ _id: 'b'.repeat(24), full_name: 'Asha', matchScore: 25, matchPercent: 80, matchedOn: ['age match', 'caste match', 'same city', 'income'] }] });
  assert.match(dm, /80% match/);
  assert.equal((dm.match(/<span>(age match|caste match|same city|income)<\/span>/g) || []).length, 3);
  assert.match(render('pages/daily-matches.ejs', { meta: pageMeta('dailyMatches'), user: member, loadError: false, matches: [] }), /No matches yet/);

  const ss = render('pages/saved-searches.ejs', { meta: pageMeta('savedSearches'), user: member, loadError: false, searches: [{ _id: 'c'.repeat(24), name: 'Pune <25>', alertEnabled: true, filters: { age_range: { min: 22, max: 28 }, caste: ['x'], isVerify: true } }] });
  assert.match(ss, /Pune &lt;25&gt;/);
  assert.match(ss, /Age 22–28 · 1 caste · Verified only/);
  assert.match(ss, /href="\/all-profiles\?saved=c{24}"/);

  const share = render('pages/share-success-story.ejs', { meta: pageMeta('shareSuccessStory'), user: member, loadError: false, myStories: [{ groomName: 'A', brideName: 'B', status: 'rejected', reason: 'Too short' }] });
  assert.match(share, /Not approved/);
  assert.match(share, /Too short/);
  assert.match(share, /id="storyConsent"/);
});

test('SEO wiring: sitemap lists /success-stories, robots blocks the member pages', () => {
  const { pages } = require('../utils/generateSitemap');
  assert.ok(pages.some((p) => p.loc === 'success-stories'));
  for (const loc of ['daily-matches', 'saved-searches', 'verify-profile', 'share-success-story']) {
    assert.ok(!pages.some((p) => p.loc === loc), loc + ' must not be in the sitemap');
  }
  const txt = fs.readFileSync(path.join(ROOT, 'robots.txt'), 'utf8');
  for (const p of ['/daily-matches', '/saved-searches', '/verify-profile', '/share-success-story', '/connections']) {
    assert.match(txt, new RegExp('^Disallow: ' + p + '$', 'm'), p);
  }
});

test('session middleware and api helpers are shared modules', () => {
  const session = require('../middleware/session');
  for (const fn of ['readSession', 'optionalUser', 'ensureAuth', 'redirectIfAuthenticated', 'checkProfileCompletion']) {
    assert.equal(typeof session[fn], 'function', fn);
  }
  const { listOf, upstreamStatus } = require('../utils/apiHelpers');
  assert.deepEqual(listOf({ data: [1] }), [1]);
  assert.deepEqual(listOf(null), []);
  assert.equal(upstreamStatus({ response: { status: 404 } }), 404);
});
