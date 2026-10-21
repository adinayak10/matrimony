'use strict';
// Route-level tests for the admin server (node:test + supertest).
//
// server.js exports createApp() and only listens when run directly, so the
// whole app is exercised in-process. apiClient.me/login are stubbed; the
// proxy's target (API_INTERNAL_URL) points at a closed port so the "API down"
// paths are real.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.API_INTERNAL_URL = process.env.API_INTERNAL_URL || 'http://127.0.0.1:65530';
process.env.API_PUBLIC_URL = process.env.API_PUBLIC_URL || 'https://api.example.test';
process.env.SESSION_TTL_HOURS = process.env.SESSION_TTL_HOURS || '8';

const fs = require('node:fs');
const request = require('supertest');
const { NAV, ITEMS } = require('../config/nav');
const proxy = require('../routes/proxy');
const legacy = require('../routes/legacy');
const pages = require('../routes/pages');
const { createApp } = require(path.join(__dirname, '..', 'server.js'));

test('nav defines the five groups and every item has key/label/icon/href/match', () => {
  assert.deepEqual(NAV.map((g) => g.group), ['Overview', 'Members', 'Inbox', 'Content', 'System']);
  for (const item of ITEMS) {
    assert.ok(item.key && item.label && item.icon, `${item.key} incomplete`);
    assert.equal(item.href, `/${item.key}`);
    assert.ok(item.match.test(item.href));
  }
  assert.ok(ITEMS.find((i) => i.key === 'users').match.test('/users/64f000000000000000000000'));
  assert.ok(ITEMS.find((i) => i.key === 'blogs').match.test('/blogs/new'));
});

test('proxy allowlist admits admin paths and rejects the user API', () => {
  assert.ok(proxy.isAllowed('/api/admin/users'));
  assert.ok(proxy.isAllowed('/api/admin/blogs/stats'));
  assert.ok(proxy.isAllowed('/api/contact/all'));
  assert.ok(proxy.isAllowed('/api/beta-tester/64f000000000000000000000/status'));
  assert.ok(proxy.isAllowed('/api/city-pages/admin/all'));
  assert.ok(proxy.isAllowed('/api/state-pages/admin/prefill/64f000000000000000000000'));
  assert.ok(proxy.isAllowed('/api/states'));
  assert.ok(proxy.isAllowed('/api/cities'));
  assert.ok(proxy.isAllowed('/api/assignMembership'));
  assert.ok(proxy.isAllowed('/api/admin/community-feedback'));
  assert.ok(proxy.isAllowed('/api/admin/community-feedback/stats'));
  assert.ok(proxy.isAllowed('/api/admin/audit-log/actions'));
  assert.ok(proxy.isAllowed('/api/admin/apk/upload'));
  assert.ok(proxy.isAllowed('/api/admin/broadcast-email/jobs/64f000000000000000000000'));
  assert.ok(proxy.isAllowed('/api/contact/64f000000000000000000000/read'));
  assert.ok(proxy.isAllowed('/api/city-pages/admin/64f000000000000000000000/refresh-stats'));
  // The temporary pre-C3.3 entry is gone: feedback is /api/admin/community-feedback only.
  assert.equal(proxy.isAllowed('/api/auth/community-feedback'), false);
  assert.equal(proxy.isAllowed('/api/auth/community-feedback/64f000000000000000000000'), false);
  assert.equal(proxy.isAllowed('/api/community-feedback/contributors'), false, 'the public list is the website\'s, not the admin proxy\'s');
  assert.equal(proxy.isAllowed('/api/beta-tester/submit'), false);
  assert.equal(proxy.isAllowed('/api/city-pages/banjara-matrimony-hyderabad'), false);
  assert.equal(proxy.isAllowed('/api/deleteUser'), false);
  assert.equal(proxy.isAllowed('/api/editProfile'), false);
  assert.equal(proxy.isAllowed('/api/contact/submit'), false);
  assert.equal(proxy.isAllowed('/api/admin/auth/login'), false);
  assert.equal(proxy.isAllowed('/api/admin/auth/logout'), false);
  assert.equal(proxy.isAllowed('/api/admin/../deleteUser'), false);
  assert.equal(proxy.isAllowed('/api/admin//users'), false);
});

test('proxy allowlist admits every feature-expansion admin endpoint (all under /api/admin/)', () => {
  const ID = '64f000000000000000000000';
  for (const p of [
    '/api/admin/verifications', '/api/admin/verifications/stats', `/api/admin/verifications/${ID}`,
    `/api/admin/verifications/${ID}/files/selfie`, `/api/admin/verifications/${ID}/files/document-0`, `/api/admin/verifications/${ID}/files/document-1`,
    `/api/admin/verifications/${ID}/approve`, `/api/admin/verifications/${ID}/reject`, `/api/admin/verifications/${ID}/files`,
    '/api/admin/success-stories', `/api/admin/success-stories/${ID}`, `/api/admin/success-stories/${ID}/status`, `/api/admin/success-stories/${ID}/featured`,
    '/api/admin/announcements', `/api/admin/announcements/${ID}`, `/api/admin/announcements/${ID}/publish`, `/api/admin/announcements/${ID}/archive`,
    '/api/admin/faq-categories', `/api/admin/faq-categories/${ID}`, '/api/admin/faqs', `/api/admin/faqs/${ID}`, '/api/admin/faqs/reorder',
    '/api/admin/push/broadcast', '/api/admin/push/preview', '/api/admin/push/filtered', '/api/admin/push/user', '/api/admin/push/jobs',
    '/api/admin/icebreaker/questions', `/api/admin/icebreaker/questions/${ID}`, `/api/admin/icebreaker/questions/${ID}/toggle`,
    '/api/admin/icebreaker/questions/seed-defaults', '/api/admin/icebreaker/stats',
    '/api/admin/analytics/funnel', '/api/admin/analytics/activity', '/api/admin/analytics/demographics', '/api/admin/analytics/active',
    `/api/admin/users/${ID}/recommend`, `/api/admin/users/${ID}/recommendations`, '/api/admin/recommendations', `/api/admin/recommendations/${ID}`,
    '/api/admin/membership-plans', '/api/admin/dashboard/stats',
  ]) {
    assert.ok(proxy.isAllowed(p), `${p} is not allowed through the proxy`);
  }
  // The member-side endpoints of the same features stay unreachable from the admin host.
  for (const p of ['/api/profileVerification', '/api/fetchVerificationStatus', '/api/submitSuccessStory', '/api/fetchPlatformNotification', '/api/fetchFAQs', '/api/pushNotificationToSingleUser', '/api/fetchRecommendations']) {
    assert.equal(proxy.isAllowed(p), false, `${p} must not be proxied`);
  }
});

test('legacy map covers every old page', () => {
  for (const name of ['dashboard', 'users', 'reports', 'photo-moderation', 'contact-enquiries', 'community-feedback', 'beta-testers', 'banners', 'regional-pages', 'settings', 'apk-manager', 'broadcast-email', 'constants', 'community-data', 'city-pages', 'state-pages', 'login', 'index']) {
    assert.ok(legacy.PAGE_MAP[name], `${name} missing from PAGE_MAP`);
  }
  for (const gone of ['debug', 'flow-test', 'test-auth', 'test-dashboard']) assert.ok(legacy.GONE.has(gone));
});

// ---- Static checks over the source: what an enforced CSP and C5 rely on ----
const ROOT = path.join(__dirname, '..');
const walk = (dir, ext, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, ext, out);
    else if (entry.name.endsWith(ext)) out.push(full);
  }
  return out;
};
const VIEW_FILES = walk(path.join(ROOT, 'views'), '.ejs');
const MODULE_FILES = [...walk(path.join(ROOT, 'public', 'js', 'core'), '.js'), ...walk(path.join(ROOT, 'public', 'js', 'pages'), '.js')];
const rel = (f) => path.relative(ROOT, f);
// EJS tags and JS comments are not markup the browser parses.
const stripEjs = (text) => text.replace(/<%[\s\S]*?%>/g, '');
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const INLINE_HANDLER = /<[a-z][^>]*\son[a-z]+\s*=/i;
const INLINE_STYLE = /<[a-z][^>]*\sstyle\s*=/i;

test('every nav item has a view and a page module, and no page is pending', () => {
  for (const item of ITEMS) {
    assert.ok(fs.existsSync(path.join(ROOT, 'views', 'pages', `${item.key}.ejs`)), `views/pages/${item.key}.ejs missing`);
    assert.ok(fs.existsSync(path.join(ROOT, 'public', 'js', 'pages', `${item.key}.js`)), `public/js/pages/${item.key}.js missing`);
    assert.notEqual(item.pending, true, `${item.key} is still pending`);
  }
  assert.ok(pages.PAGES.has('audit-log'));
  assert.equal(pages.LEGACY, undefined, 'the legacy shim map is gone (C6)');
  assert.equal(pages.MIGRATED, undefined);
});

test('every EJS view compiles', () => {
  const ejs = require('ejs');
  for (const file of VIEW_FILES) {
    assert.doesNotThrow(() => ejs.compile(fs.readFileSync(file, 'utf8'), { filename: file }), `${rel(file)} does not compile`);
  }
});

test('views carry no inline script, event handler or style attribute (CSP is enforced)', () => {
  assert.ok(VIEW_FILES.length >= 20);
  for (const file of VIEW_FILES) {
    const markup = stripEjs(fs.readFileSync(file, 'utf8'));
    assert.doesNotMatch(markup, INLINE_HANDLER, `${rel(file)}: inline on*= handler`);
    assert.doesNotMatch(markup, INLINE_STYLE, `${rel(file)}: style= attribute`);
    assert.doesNotMatch(markup, /<style[\s>]/i, `${rel(file)}: <style> block`);
    assert.doesNotMatch(markup, /javascript:/i, `${rel(file)}: javascript: URL`);
    for (const tag of markup.match(/<script\b[^>]*>/gi) || []) {
      assert.match(tag, /\ssrc=/, `${rel(file)}: inline <script> ${tag}`);
      assert.match(tag, /type="module"/, `${rel(file)}: non-module script ${tag}`);
    }
  }
});

test('browser modules build no inline handler or style attribute and never eval', () => {
  assert.ok(MODULE_FILES.length >= 30);
  for (const file of MODULE_FILES) {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    assert.doesNotMatch(code, INLINE_HANDLER, `${rel(file)}: inline on*= handler in markup`);
    assert.doesNotMatch(code, INLINE_STYLE, `${rel(file)}: style= attribute in markup`);
    assert.doesNotMatch(code, /\bstyle="/, `${rel(file)}: style="" in markup`);
    assert.doesNotMatch(code, /\beval\(|new Function\(|setTimeout\(\s*['"`]/, `${rel(file)}: string evaluation`);
    assert.doesNotMatch(code, /\b(alert|prompt)\(|window\.confirm\(/, `${rel(file)}: native dialog (use core/confirm)`);
    assert.doesNotMatch(code, /localStorage|sessionStorage|document\.cookie/, `${rel(file)}: token/storage access`);
    // every relative import resolves to a file
    for (const m of code.matchAll(/from\s+'(\.{1,2}\/[^']+)'/g)) {
      assert.ok(fs.existsSync(path.resolve(path.dirname(file), m[1])), `${rel(file)}: import ${m[1]} not found`);
    }
  }
});

test('every API path a page module calls is on the proxy allowlist', () => {
  const ID = '64f000000000000000000000';
  let checked = 0;
  for (const file of walk(path.join(ROOT, 'public', 'js', 'pages'), '.js')) {
    const code = stripComments(fs.readFileSync(file, 'utf8'));
    for (const m of code.matchAll(/\bapi(?:Upload)?\(\s*(?:[a-zA-Z]+\s*\?\s*)?(['"`])(\/[^'"`]*)\1/g)) {
      const literal = m[2];
      if (literal.includes('${') && !/^\/[a-z]/.test(literal)) continue;
      const pathname = `/api${literal.replace(/\$\{key\}/g, 'castes').replace(/\$\{[^}]+\}/g, ID)}`;
      assert.ok(proxy.isAllowed(pathname), `${rel(file)}: ${pathname} is not allowed through the proxy`);
      checked += 1;
    }
  }
  assert.ok(checked >= 40, `only ${checked} API calls were found`);
  // Paths built from a variable base (regional pages, community feedback).
  for (const p of ['/api/state-pages/admin/all', `/api/state-pages/admin/${ID}`, '/api/state-pages/admin', `/api/city-pages/admin/${ID}/refresh-stats`,
    '/api/city-pages/admin/all', '/api/city-pages/admin', `/api/admin/community-feedback/${ID}`, '/api/states', '/api/cities']) {
    assert.ok(proxy.isAllowed(p), `${p} is not allowed through the proxy`);
  }
});

test('admin server routes', async (t) => {
  const apiClient = require('../lib/apiClient');
  const requireAdmin = require('../middleware/requireAdmin');

  const ADMIN = { _id: '64f000000000000000000001', email: 'admin@example.test', full_name: 'Test Admin' };
  const originalMe = apiClient.me;
  let meImpl = async () => ({ ok: false, status: 401 });
  apiClient.me = (token) => meImpl(token);
  t.after(() => { apiClient.me = originalMe; });
  t.beforeEach(() => requireAdmin.clearCache());

  const app = createApp();

  await t.test('every nav route redirects to /login?next= without a cookie', async () => {
    for (const item of ITEMS) {
      const res = await request(app).get(item.href);
      assert.equal(res.status, 302, `${item.href} → ${res.status}`);
      assert.equal(res.headers.location, `/login?next=${encodeURIComponent(item.href)}`);
    }
    const detail = await request(app).get('/users/64f000000000000000000000');
    assert.equal(detail.status, 302);
  });

  await t.test('an invalid cookie is cleared and redirected', async () => {
    meImpl = async () => ({ ok: false, status: 401 });
    const res = await request(app).get('/dashboard').set('Cookie', 'admin_session=bad');
    assert.equal(res.status, 302);
    assert.equal(res.headers.location, '/login?next=%2Fdashboard');
    assert.match(String(res.headers['set-cookie']), /admin_session=;/);
  });

  await t.test('every nav route renders 200 inside the layout with exactly one aria-current', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    for (const item of ITEMS) {
      const res = await request(app).get(item.href).set('Cookie', 'admin_session=good');
      assert.equal(res.status, 200, `${item.href} → ${res.status}`);
      const html = res.text;
      assert.match(res.headers['content-type'], /text\/html/, item.href);
      assert.match(html, new RegExp(`<body data-page="${item.key}"`), `${item.href}: layout body`);
      assert.equal((html.match(/aria-current="page"/g) || []).length, 1, `${item.href}: exactly one aria-current`);
      assert.match(html, new RegExp(`<a class="sidebar__link is-active" href="${item.href}" aria-current="page">`), `${item.href}: active nav item`);
      assert.match(html, /<a class="skip-link" href="#main">/, `${item.href}: skip link`);
      assert.match(html, /<main id="main"[^>]*tabindex="-1"/, `${item.href}: main landmark`);
      assert.match(html, /<nav class="sidebar__nav" aria-label="Admin">/, `${item.href}: nav landmark`);
      assert.match(html, /data-sidebar-toggle aria-controls="sidebar" aria-expanded="false"/, `${item.href}: mobile sidebar toggle`);
      assert.match(html, new RegExp(`<h1 class="topbar__title">${item.label}</h1>`), `${item.href}: h1`);
      assert.match(html, new RegExp(`<script type="module" src="/js/pages/${item.key}\\.js\\?v=`), `${item.href}: page module`);
      assert.match(html, /Test Admin/, `${item.href}: signed-in admin`);
      assert.doesNotMatch(html, /soon<\/span>/, `${item.href}: no pending nav tag`);
      // The legacy pages are gone: none of their shims or CDNs may appear.
      assert.doesNotMatch(html, /\/js\/(api|auth|notifications)\.js|css\/style\.css|cdn\.|bootstrap|googleapis/i, `${item.href}: legacy asset`);
      // CSP: nothing inline.
      assert.doesNotMatch(html, INLINE_HANDLER, `${item.href}: inline handler`);
      assert.doesNotMatch(html, INLINE_STYLE, `${item.href}: style attribute`);
      for (const tag of html.match(/<script\b[^>]*>/gi) || []) assert.match(tag, /type="module" src="\/js\//, `${item.href}: ${tag}`);
      // C5: every server-rendered control is labelled, every label points at a control, ids are unique.
      const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
      assert.equal(new Set(ids).size, ids.length, `${item.href}: duplicate id ${ids.find((id, i) => ids.indexOf(id) !== i)}`);
      for (const m of html.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)) assert.ok(ids.includes(m[1]), `${item.href}: label for="${m[1]}" has no control`);
      const labelled = new Set([...html.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
      for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
        const attrs = m[2];
        if (/type="hidden"/.test(attrs)) continue;
        const id = (attrs.match(/\sid="([^"]+)"/) || [])[1];
        assert.ok((id && labelled.has(id)) || /aria-label="/.test(attrs), `${item.href}: unlabelled <${m[1]}${attrs.slice(0, 60)}>`);
      }
      for (const m of html.matchAll(/aria-(?:controls|labelledby|describedby)="([^"]+)"/g)) {
        for (const ref of m[1].split(/\s+/)) assert.ok(ids.includes(ref), `${item.href}: aria reference to missing id "${ref}"`);
      }
      for (const tag of html.match(/<button\b[^>]*>/g) || []) assert.match(tag, /\stype="(button|submit)"/, `${item.href}: button without type ${tag}`);
      for (const tag of html.match(/<img\b[^>]*>/g) || []) assert.match(tag, /\salt="/, `${item.href}: img without alt`);
      for (const tag of html.match(/<table\b[\s\S]*?<\/table>/g) || []) assert.match(tag, /<caption/, `${item.href}: table without caption`);
    }
  });

  await t.test('blog form routes: /blogs/new and /blogs/:id/edit render, a bad id is a 404', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const anon = await request(app).get('/blogs/new');
    assert.equal(anon.status, 302);
    assert.equal(anon.headers.location, '/login?next=%2Fblogs%2Fnew');
    const anonEdit = await request(app).get('/blogs/64f000000000000000000000/edit');
    assert.equal(anonEdit.status, 302);

    const create = await request(app).get('/blogs/new').set('Cookie', 'admin_session=good');
    assert.equal(create.status, 200);
    assert.match(create.text, /data-blog-id=""/);
    assert.match(create.text, /js\/pages\/blog-form\.js/);
    assert.equal((create.text.match(/aria-current="page"/g) || []).length, 1);
    assert.match(create.text, /href="\/blogs" aria-current="page"/, 'Blogs stays highlighted');
    assert.doesNotMatch(create.text, /name="slug"/, 'a new post has no slug field');
    assert.match(create.text, /frozen from then on/);

    const edit = await request(app).get('/blogs/64f000000000000000000000/edit').set('Cookie', 'admin_session=good');
    assert.equal(edit.status, 200);
    assert.match(edit.text, /data-blog-id="64f000000000000000000000"/);
    assert.match(edit.text, /<input[^>]*name="slug"[^>]*readonly/, 'slug is read-only on edit');
    assert.match(edit.text, /The URL is frozen to protect indexed links/);
    assert.match(edit.text, /name="authorName"[^>]*required/, 'a real author name is required');

    const bad = await request(app).get('/blogs/not-an-id/edit').set('Cookie', 'admin_session=good');
    assert.equal(bad.status, 404);
    assert.match(bad.text, /Blog not found/);
  });

  await t.test('page-specific contracts are present in the rendered markup', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const get = async (url) => (await request(app).get(url).set('Cookie', 'admin_session=good')).text;

    const regional = await get('/regional-pages');
    assert.match(regional, /data-tab="states"/);
    assert.match(regional, /data-tab="cities"/);
    assert.match(regional, /city pages are indexed at 300 or more unique words/);

    const master = await get('/master-data');
    for (const key of ['castes', 'gotras', 'clans', 'surname-titles', 'professions', 'qualifications', 'income-ranges', 'interests', 'report-reasons', 'about-options', 'icebreaker-questions']) {
      assert.match(master, new RegExp(`data-tab="${key}"`), `master-data tab ${key}`);
      assert.match(master, new RegExp(`data-md-mount="${key}"`), `master-data panel ${key}`);
    }
    assert.match(master, /data-action="ai-suggest"/);
    assert.match(master, /data-action="seed-icebreaker"/);

    const settings = await get('/settings');
    assert.match(settings, /Matching and security/);
    for (const name of ['appName', 'helpUrl', 'termsUrl', 'privacyPolicyUrl', 'setRoomUsersLimit', 'maxImagesCanBeUploadedInOnePost', 'minuteLimitInCreatingStory',
      'isAdmobOn', 'adBannerAndroid', 'adInterstitialAndroid', 'matching.enforceGotraExogamy', 'security.legacySocketJoin', 'limits.interestDailyCap']) {
      assert.match(settings, new RegExp(`name="${name.replace(/\./g, '\\.')}"`), `settings field ${name}`);
    }
    assert.doesNotMatch(settings, /name="apk/i, 'apk.* is never editable on the settings page');
    assert.match(settings, /name="currentPassword"/);
    assert.match(settings, /minlength="12"/);

    const apk = await get('/apk-manager');
    assert.match(apk, /id="apk-mandatory"[^>]*data-action="mandatory"/);
    assert.match(apk, /name="apkFile"/);

    const broadcast = await get('/broadcast-email');
    for (const name of ['gender', 'minAge', 'maxAge', 'verified', 'blocked', 'platform', 'subject', 'bodyHtml', 'bodyText']) {
      assert.match(broadcast, new RegExp(`name="${name}"`), `broadcast field ${name}`);
    }

    const audit = await get('/audit-log');
    for (const name of ['action', 'targetType', 'targetId', 'from', 'to']) assert.match(audit, new RegExp(`name="${name}"`), `audit filter ${name}`);

    const photos = await get('/photo-moderation');
    assert.match(photos, /<option value="pending" selected>/, 'photo queue defaults to pending (integrator #20)');

    // ---- Feature expansion (Track B) ----
    const verifications = await get('/verifications');
    assert.match(verifications, /<option value="pending" selected>/, 'verification queue defaults to pending');
    for (const name of ['search', 'status', 'documentType']) assert.match(verifications, new RegExp(`name="${name}"`), `verification filter ${name}`);
    for (const k of ['pending', 'approved', 'rejected', 'total']) assert.match(verifications, new RegExp(`data-stat="${k}"`), `verification tile ${k}`);
    assert.match(verifications, /id="verifications-table"/);

    const stories = await get('/success-stories');
    assert.match(stories, /<option value="pending" selected>/, 'story moderation defaults to pending');
    for (const name of ['status', 'featured']) assert.match(stories, new RegExp(`name="${name}"`), `story filter ${name}`);

    const announcements = await get('/announcements');
    assert.match(announcements, /data-action="create"/);
    for (const name of ['status', 'type']) assert.match(announcements, new RegExp(`name="${name}"`), `announcement filter ${name}`);

    const faqPage = await get('/faqs');
    assert.match(faqPage, /data-action="add-faq"/);
    assert.match(faqPage, /data-action="add-category"/);
    assert.match(faqPage, /id="faq-groups"/);

    const push = await get('/push-notifications');
    for (const name of ['title', 'body', 'linkType', 'linkValue', 'mode', 'platform', 'gender', 'state', 'verified', 'lastSeenDays']) {
      assert.match(push, new RegExp(`name="${name}"`), `push field ${name}`);
    }
    assert.match(push, /name="title"[^>]*maxlength="60"/, 'push title is capped at 60');
    assert.match(push, /name="body"[^>]*maxlength="180"/, 'push body is capped at 180');
    assert.match(push, /value="topic" checked/, 'push defaults to the topic mode');
    assert.match(push, /<option value="none" selected>/);
    assert.match(push, /data-action="send-test"/);
    assert.match(push, /data-action="reload-jobs"/);

    const analytics = await get('/analytics');
    assert.match(analytics, /<option value="30" selected>/, 'analytics defaults to 30 days');
    for (const chart of ['funnel', 'activity', 'membership', 'loginTypes']) assert.match(analytics, new RegExp(`data-chart="${chart}"`), `analytics chart ${chart}`);
    for (const k of ['onlineNow', 'dau', 'wau', 'mau']) assert.match(analytics, new RegExp(`data-stat="${k}"`), `analytics tile ${k}`);
    for (const k of ['cities', 'states', 'castes', 'gotras', 'ageBuckets', 'gender']) assert.match(analytics, new RegExp(`data-demo="${k}"`), `analytics demographics ${k}`);
    assert.match(analytics, /Show as table/);

    const dashboard = await get('/dashboard');
    assert.match(dashboard, /href="\/analytics"/, 'dashboard links to analytics');
  });

  await t.test('user detail: new tabs render, every control is labelled, ids are unique', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const res = await request(app).get('/users/64f000000000000000000000').set('Cookie', 'admin_session=good');
    assert.equal(res.status, 200);
    const html = res.text;
    for (const tab of ['profile', 'photos', 'activity', 'blocks', 'reports', 'verification', 'recommend', 'membership']) {
      assert.match(html, new RegExp(`data-tab="${tab}"`), `user tab ${tab}`);
      assert.match(html, new RegExp(`data-panel="${tab}"`), `user panel ${tab}`);
    }
    assert.match(html, /id="recommend-form"/);
    assert.match(html, /name="notifyBoth"/);
    const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(ids).size, ids.length, 'duplicate id on /users/:id');
    const labelled = new Set([...html.matchAll(/<label\b[^>]*\sfor="([^"]+)"/g)].map((m) => m[1]));
    for (const m of html.matchAll(/<(input|select|textarea)\b([^>]*)>/g)) {
      const id = (m[2].match(/\sid="([^"]+)"/) || [])[1];
      assert.ok((id && labelled.has(id)) || /aria-label="/.test(m[2]), `/users/:id: unlabelled <${m[1]}${m[2].slice(0, 60)}>`);
    }
    for (const m of html.matchAll(/aria-(?:controls|labelledby|describedby)="([^"]+)"/g)) {
      for (const ref of m[1].split(/\s+/)) assert.ok(ids.includes(ref), `/users/:id: aria reference to missing id "${ref}"`);
    }
    for (const tag of html.match(/<button\b[^>]*>/g) || []) assert.match(tag, /\stype="(button|submit)"/, `/users/:id: button without type ${tag}`);
    assert.doesNotMatch(html, INLINE_STYLE);
  });

  await t.test('a valid cookie renders a migrated page with the layout', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const res = await request(app).get('/dashboard').set('Cookie', 'admin_session=good');
    assert.equal(res.status, 200);
    assert.match(res.text, /data-page="dashboard"/);
    assert.match(res.text, /Test Admin/);
    assert.match(res.text, /js\/pages\/dashboard\.js/);
    assert.match(res.headers['cache-control'], /no-store/);
    assert.match(res.headers['x-robots-tag'], /noindex/);
    const csp = res.headers['content-security-policy'] || '';
    assert.equal(res.headers['content-security-policy-report-only'], undefined, 'CSP is enforced since C6');
    assert.match(csp, /default-src 'self'/);
    assert.match(csp, /script-src 'self'(;|$)/, 'no unsafe-inline / unsafe-eval for scripts');
    assert.match(csp, /style-src 'self'(;|$)/, 'no unsafe-inline for styles');
    assert.match(csp, /frame-ancestors 'none'/);
    assert.match(csp, /form-action 'self'/);
    assert.match(csp, /object-src 'none'/);
    assert.match(csp, /img-src 'self' data: https:\/\/api\.example\.test https:\/\/www\.banjaramatch\.com/);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|\*/);
    assert.doesNotMatch(res.text, /password/i, 'no password field on an admin page');
  });

  await t.test('the CSP is enforced on every kind of response (login, 404, 301, proxy JSON)', async () => {
    for (const url of ['/login', '/definitely-not-a-page', '/settings.html', '/api/admin/users', '/health']) {
      const res = await request(app).get(url);
      assert.match(res.headers['content-security-policy'] || '', /script-src 'self'/, url);
      assert.equal(res.headers['content-security-policy-report-only'], undefined, url);
    }
  });

  await t.test('no legacy HTML file is served, with or without a session', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const legacyFiles = fs.readdirSync(path.join(ROOT, 'public')).filter((f) => f.endsWith('.html'));
    for (const file of legacyFiles) {
      for (const cookie of ['', 'admin_session=good']) {
        const req = request(app).get(`/${file}`);
        if (cookie) req.set('Cookie', cookie);
        const res = await req;
        assert.ok([301, 404].includes(res.status), `/${file} → ${res.status}`);
        assert.doesNotMatch(res.text || '', /window\.apiRequest|js\/auth\.js/, `/${file} leaked legacy markup`);
      }
    }
    // The old shims stay reachable as static files only until they are deleted; no page loads them.
    const settings = await request(app).get('/settings').set('Cookie', 'admin_session=good');
    assert.equal(settings.status, 200);
    assert.match(settings.text, /data-page="settings"/);
    assert.doesNotMatch(settings.text, /\/js\/auth\.js/);
  });

  await t.test('static assets are served, HTML files in public/ are not', async () => {
    const css = await request(app).get('/css/admin.css');
    assert.equal(css.status, 200);
    assert.match(css.headers['content-type'], /text\/css/);
    const robots = await request(app).get('/robots.txt');
    assert.equal(robots.status, 200);
    assert.match(robots.text, /Disallow: \//);
    // A legacy page must not leak past the gate via the static middleware.
    const leak = await request(app).get('/settings.html');
    assert.equal(leak.status, 301);
    assert.equal(leak.headers.location, '/settings');
  });

  await t.test('API outage renders the 503 page, not a redirect loop', async () => {
    meImpl = async () => { throw new apiClient.ApiUnreachableError('down'); };
    const res = await request(app).get('/users').set('Cookie', 'admin_session=x');
    assert.equal(res.status, 503);
    assert.match(res.text, /API unreachable/);
  });

  await t.test('*.html is a 404 or a 301 from the legacy map', async () => {
    for (const gone of ['debug', 'flow-test', 'test-auth', 'test-dashboard', 'nope']) {
      const res = await request(app).get(`/${gone}.html`);
      assert.equal(res.status, 404, `/${gone}.html → ${res.status}`);
    }
    // Every old page name, as /<name>.html, 301s to its new route (query string kept).
    for (const [name, target] of Object.entries(legacy.PAGE_MAP)) {
      const res = await request(app).get(`/${name}.html`);
      assert.equal(res.status, 301, `/${name}.html → ${res.status}`);
      assert.equal(res.headers.location, target, `/${name}.html`);
      const newPath = target.split('?')[0];
      assert.ok(newPath === '/login' || ITEMS.some((i) => i.href === newPath), `/${name}.html points at ${newPath}, which is not a route`);
    }
    const withQuery = await request(app).get('/city-pages.html?search=pune');
    assert.equal(withQuery.headers.location, '/regional-pages?tab=cities&search=pune');
    const cases = {
      '/': '/dashboard',
      '/login.html': '/login',
      '/users.html': '/users',
      '/dashboard.html': '/dashboard',
      '/constants': '/master-data?tab=castes',
      '/constants.html': '/master-data?tab=castes',
      '/community-data': '/master-data?tab=gotras',
      '/community-data.html': '/master-data?tab=gotras',
      '/city-pages.html': '/regional-pages?tab=cities',
      '/state-pages.html': '/regional-pages?tab=states',
      '/regional-pages.html': '/regional-pages',
      '/apk-manager.html': '/apk-manager',
      '/broadcast-email.html': '/broadcast-email',
      '/banners.html': '/banners',
      '/beta-testers.html': '/beta-testers',
      '/community-feedback.html': '/community-feedback',
      '/contact-enquiries.html': '/contact-enquiries',
      '/settings.html': '/settings',
      '/photo-moderation.html': '/photo-moderation',
      '/reports.html': '/reports',
      '/index.html': '/dashboard',
      '/city-pages': '/regional-pages?tab=cities',
      '/state-pages': '/regional-pages?tab=states',
      '/user-detail?id=64f000000000000000000000': '/users/64f000000000000000000000',
      '/user-detail.html?id=64f000000000000000000000': '/users/64f000000000000000000000',
    };
    for (const [from, to] of Object.entries(cases)) {
      const res = await request(app).get(from);
      assert.equal(res.status, 301, `${from} → ${res.status}`);
      assert.equal(res.headers.location, to, from);
    }
  });

  await t.test('unknown routes render the 404 page', async () => {
    const res = await request(app).get('/definitely-not-a-page');
    assert.equal(res.status, 404);
    assert.match(res.text, /Page not found/);
    assert.match(res.headers['cache-control'], /no-store/);
  });

  await t.test('proxy guard: 401 without cookie, 403 without X-Requested-With, 404 off-allowlist', async () => {
    const noCookie = await request(app).get('/api/admin/users');
    assert.equal(noCookie.status, 401);
    assert.equal(noCookie.body.status, false);
    const csrf = await request(app).post('/api/admin/users/64f000000000000000000000/block').set('Cookie', 'admin_session=good');
    assert.equal(csrf.status, 403);
    const off = await request(app).get('/api/deleteUser').set('Cookie', 'admin_session=good').set('X-Requested-With', 'admin');
    assert.equal(off.status, 404);
    const offPost = await request(app).post('/api/deleteUser').set('Cookie', 'admin_session=good').set('X-Requested-With', 'admin');
    assert.equal(offPost.status, 404);
    const login = await request(app).post('/api/admin/auth/login').set('Cookie', 'admin_session=good').set('X-Requested-With', 'admin');
    assert.equal(login.status, 404, 'login/logout are never proxied');
  });

  await t.test('proxy answers 502 JSON (not HTML) when the API is down', async () => {
    // API_INTERNAL_URL points at a closed port in tests.
    const res = await request(app).get('/api/admin/users').set('Cookie', 'admin_session=good');
    assert.ok([502, 504].includes(res.status), `expected 502/504, got ${res.status}`);
    assert.equal(res.body.status, false);
    assert.match(res.body.message, /unreachable/i);
  });

  await t.test('/health never 5xx', async () => {
    const res = await request(app).get('/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(res.body.app, 'admin');
  });

  await t.test('login page renders and a bad login re-renders with a generic flash', async () => {
    const page = await request(app).get('/login');
    assert.equal(page.status, 200);
    assert.match(page.text, /action="\/auth\/login"/);
    assert.match(page.text, /class="auth-page"/, 'login uses layouts/auth.ejs');
    const originalLogin = apiClient.login;
    apiClient.login = async () => ({ ok: false, status: 401, message: 'nope' });
    try {
      const res = await request(app).post('/auth/login').type('form').send({ email: 'a@b.c', password: 'x', next: '/users' });
      assert.equal(res.status, 401);
      assert.match(res.text, /Invalid email or password/);
      assert.doesNotMatch(String(res.headers['set-cookie'] || ''), /admin_session=\w/);
    } finally { apiClient.login = originalLogin; }
  });

  await t.test('a good login sets the session cookie and redirects to next', async () => {
    const originalLogin = apiClient.login;
    apiClient.login = async () => ({ ok: true, token: 'tok123', admin: ADMIN });
    try {
      const res = await request(app).post('/auth/login').type('form').send({ email: 'a@b.c', password: 'x', next: '/users' });
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/users');
      const cookie = String(res.headers['set-cookie'] || '');
      assert.match(cookie, /admin_session=tok123/);
      assert.match(cookie, /HttpOnly/);
      assert.match(cookie, /SameSite=Strict/);
      assert.match(cookie, /Path=\//);
      assert.doesNotMatch(cookie, /Domain=/);
    } finally { apiClient.login = originalLogin; }
  });

  await t.test('logout clears the cookie and redirects to /login', async () => {
    const originalLogout = apiClient.logout;
    apiClient.logout = async () => ({ ok: true });
    try {
      const res = await request(app).post('/auth/logout').set('Cookie', 'admin_session=good');
      assert.equal(res.status, 302);
      assert.equal(res.headers.location, '/login');
      assert.match(String(res.headers['set-cookie']), /admin_session=;/);
    } finally { apiClient.logout = originalLogout; }
  });
});
