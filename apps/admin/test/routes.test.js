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

const request = require('supertest');
const { NAV, ITEMS } = require('../config/nav');
const proxy = require('../routes/proxy');
const legacy = require('../routes/legacy');
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
  assert.ok(proxy.isAllowed('/api/auth/community-feedback'));
  assert.equal(proxy.isAllowed('/api/deleteUser'), false);
  assert.equal(proxy.isAllowed('/api/editProfile'), false);
  assert.equal(proxy.isAllowed('/api/contact/submit'), false);
  assert.equal(proxy.isAllowed('/api/admin/auth/login'), false);
  assert.equal(proxy.isAllowed('/api/admin/auth/logout'), false);
  assert.equal(proxy.isAllowed('/api/admin/../deleteUser'), false);
  assert.equal(proxy.isAllowed('/api/admin//users'), false);
});

test('legacy map covers every old page', () => {
  for (const name of ['dashboard', 'users', 'reports', 'photo-moderation', 'contact-enquiries', 'community-feedback', 'beta-testers', 'banners', 'regional-pages', 'settings', 'apk-manager', 'broadcast-email', 'constants', 'community-data', 'city-pages', 'state-pages', 'login', 'index']) {
    assert.ok(legacy.PAGE_MAP[name], `${name} missing from PAGE_MAP`);
  }
  for (const gone of ['debug', 'flow-test', 'test-auth', 'test-dashboard']) assert.ok(legacy.GONE.has(gone));
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

  await t.test('a valid cookie renders a migrated page with the layout', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const res = await request(app).get('/dashboard').set('Cookie', 'admin_session=good');
    assert.equal(res.status, 200);
    assert.match(res.text, /data-page="dashboard"/);
    assert.match(res.text, /Test Admin/);
    assert.match(res.text, /js\/pages\/dashboard\.js/);
    assert.match(res.headers['cache-control'], /no-store/);
    assert.match(res.headers['x-robots-tag'], /noindex/);
    assert.match(res.headers['content-security-policy-report-only'] || '', /frame-ancestors 'none'/);
    assert.equal(res.headers['content-security-policy'], undefined, 'CSP must stay report-only until C6');
    assert.doesNotMatch(res.text, /password/i, 'no password field on an admin page');
  });

  await t.test('a valid cookie serves an un-migrated page through the legacy shim', async () => {
    meImpl = async () => ({ ok: true, admin: ADMIN });
    const res = await request(app).get('/settings').set('Cookie', 'admin_session=good');
    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /text\/html/);
    assert.match(res.headers['cache-control'], /no-store/);
    assert.match(res.text, /\/js\/auth\.js/);
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
    const cases = {
      '/': '/dashboard',
      '/login.html': '/login',
      '/users.html': '/users',
      '/dashboard.html': '/dashboard',
      '/constants': '/master-data?tab=castes',
      '/constants.html': '/master-data?tab=castes',
      '/community-data': '/master-data?tab=gotras',
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
