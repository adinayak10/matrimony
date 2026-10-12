'use strict';
/**
 * test/admin-panel.test.js — the API surface the migrated admin panel relies on
 * (docs/plans/admin-base-ui.md C3.3–C3.8) plus the public contributors list.
 *
 *   GET /api/community-feedback/contributors   public, completed only, safe fields only
 *   /api/admin/community-feedback              admin only; stats; server pagination
 *   /api/admin/constants/*                     409 duplicate, 409 in use, 404 bad id
 *   /api/admin/blogs                           createdBy populate works, slug frozen, real author required
 *   /api/{state,city}-pages/admin/all          a regex metacharacter in ?search is not a 500
 *   PUT /api/admin/settings                    nested objects, allowlist, never apk.*
 *   GET /api/admin/audit-log                   records the mutations above
 */
const test = require('node:test');
const assert = require('node:assert/strict');

// Publishing/deleting a post and editing clans ping the website to rebuild its
// sitemap. Point those pings at a closed port BEFORE anything loads .env
// (dotenv never overrides a variable that is already set), so this suite can
// never reach a running website.
process.env.FRONTEND_URL = 'http://127.0.0.1:9';
process.env.SITEMAP_REGEN_URL = 'http://127.0.0.1:9/none';

const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let admin;
  let adminToken;
  let userToken;
  let CommunityFeedback;
  let Caste;

  const adminGet = (url) => harness.request().get(url).set(factory.bearer(adminToken));
  const adminSend = (method, url, body) => harness.request()[method](url).set(factory.bearer(adminToken)).send(body || {});

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    CommunityFeedback = require('../models/CommunityFeedback');
    Caste = require('../models/Caste');

    admin = await factory.makeUser({ role: 'admin', email: `admin_${Date.now()}@test.local` });
    adminToken = jwt.sign(
      { _id: String(admin._id), email: admin.email, role: 'admin', tv: admin.tokenVersion || 0, aud: 'admin' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '1h' },
    );
    userToken = factory.tokenFor(await factory.makeUser());

    await CommunityFeedback.create([
      { name: 'Ramesh Kumar Naik', email: 'ramesh@private.test', phone: '9000000001', category: 'feature_request', subject: 'Add horoscope matching', message: 'secret body one', status: 'completed', adminNotes: 'internal note', priority: 'medium', implementedAt: new Date() },
      { name: 'Sita', email: 'sita@private.test', category: 'child_safety', subject: 'Safety report', message: 'secret body two', status: 'completed', priority: 'critical' },
      { name: 'Pending Person', email: 'pending@private.test', category: 'bug_report', subject: 'Not done yet', message: 'secret body three', status: 'pending', priority: 'high' },
      { name: 'Rejected Person', email: 'rejected@private.test', category: 'other', subject: 'Rejected idea', message: 'secret body four', status: 'rejected' },
    ]);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('public contributors: no token needed, completed only, never child_safety, safe fields only', async () => {
    const res = await harness.request().get('/api/community-feedback/contributors');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, true);
    assert.equal(res.body.total, 1);
    assert.equal(res.body.data.length, 1);
    const row = res.body.data[0];
    assert.deepEqual(Object.keys(row).sort(), ['category', 'createdAt', 'displayName', 'subject']);
    assert.equal(row.displayName, 'Ramesh N.');
    assert.equal(row.category, 'feature_request');
    assert.equal(row.subject, 'Add horoscope matching');
    const raw = JSON.stringify(res.body);
    for (const leak of ['private.test', '9000000001', 'secret body', 'internal note', 'Safety report', 'Not done yet', 'Rejected idea', 'Kumar', '_id', 'priority']) {
      assert.ok(!raw.includes(leak), `response leaks "${leak}"`);
    }
    assert.match(res.headers['cache-control'] || '', /max-age=300/);
  });

  test('public contributors: limit is clamped and a bad value falls back', async () => {
    const one = await harness.request().get('/api/community-feedback/contributors?limit=1');
    assert.equal(one.status, 200);
    assert.equal(one.body.data.length, 1);
    const junk = await harness.request().get('/api/community-feedback/contributors?limit[$gt]=0&status=pending');
    assert.equal(junk.status, 200);
    assert.equal(junk.body.total, 1, 'query parameters cannot widen the filter');
  });

  test('admin community-feedback: 401 without a token, 403 for a member token', async () => {
    for (const url of ['/api/admin/community-feedback', '/api/admin/community-feedback/stats']) {
      const none = await harness.request().get(url);
      assert.equal(none.status, 401, url);
      const member = await harness.request().get(url).set(factory.bearer(userToken));
      assert.equal(member.status, 403, url);
    }
  });

  test('admin community-feedback: stats, server pagination, child_safety first, PATCH', async () => {
    const stats = await adminGet('/api/admin/community-feedback/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.data.total, 4);
    assert.equal(stats.body.data.completed, 2);
    assert.equal(stats.body.data.pending, 1);
    assert.equal(stats.body.data.rejected, 1);
    assert.equal(stats.body.data.childSafety, 0, 'the only child_safety row is completed');

    const page1 = await adminGet('/api/admin/community-feedback?page=1&limit=2');
    assert.equal(page1.status, 200);
    assert.equal(page1.body.data.length, 2);
    assert.deepEqual(
      { total: page1.body.pagination.total, page: page1.body.pagination.page, pages: page1.body.pagination.pages, limit: page1.body.pagination.limit },
      { total: 4, page: 1, pages: 2, limit: 2 },
    );
    assert.equal(page1.body.data[0].category, 'child_safety');

    const filtered = await adminGet('/api/admin/community-feedback?status=pending&search=pending');
    assert.equal(filtered.body.data.length, 1);
    const id = filtered.body.data[0]._id;

    const bad = await adminSend('patch', `/api/admin/community-feedback/${id}`, { status: 'nonsense' });
    assert.equal(bad.status, 400);
    const ok = await adminSend('patch', `/api/admin/community-feedback/${id}`, { status: 'completed', priority: 'low', adminNotes: 'done' });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.status, 'completed');

    const pub = await harness.request().get('/api/community-feedback/contributors');
    assert.equal(pub.body.total, 2, 'a suggestion marked completed joins the public list');
    assert.ok(pub.body.data.some((r) => r.displayName === 'Pending P.'));
  });

  test('admin constants: create, duplicate is 409, in-use delete is 409 with the count, bad id is 404', async () => {
    const created = await adminSend('post', '/api/admin/constants/castes', { name: 'Test Caste A' });
    assert.equal(created.status, 200);
    const id = created.body.data._id;

    const dup = await adminSend('post', '/api/admin/constants/castes', { name: 'Test Caste A' });
    assert.equal(dup.status, 409);
    assert.equal(dup.body.code, 'DUPLICATE');
    assert.match(dup.body.message, /already exists/);

    const invalid = await adminSend('post', '/api/admin/constants/income-ranges', { name: 'No numbers' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.body.code, 'INVALID');

    await factory.makeUser({ caste: id });
    const inUse = await adminSend('delete', `/api/admin/constants/castes/${id}`);
    assert.equal(inUse.status, 409);
    assert.equal(inUse.body.code, 'IN_USE');
    assert.equal(inUse.body.inUse, 1);
    assert.match(inUse.body.message, /in use by 1/);
    assert.ok(await Caste.findById(id), 'the caste is still there');

    const free = await adminSend('post', '/api/admin/constants/castes', { name: 'Test Caste B' });
    const gone = await adminSend('delete', `/api/admin/constants/castes/${free.body.data._id}`);
    assert.equal(gone.status, 200);

    const notId = await adminSend('delete', '/api/admin/constants/castes/not-an-id');
    assert.equal(notId.status, 404);
  });

  test('admin blogs: a post created by an admin can be listed and fetched (createdBy populate), slug stays frozen', async () => {
    const noAuthor = await adminSend('post', '/api/admin/blogs', { title: 'No Author Post', description: 'd', content: '<p>c</p>' });
    assert.equal(noAuthor.status, 400);
    assert.match(noAuthor.body.message, /author/i);
    const team = await adminSend('post', '/api/admin/blogs', { title: 'Team Post', description: 'd', content: '<p>c</p>', author: JSON.stringify({ name: 'BanjaraMatch Team' }) });
    assert.equal(team.status, 400);

    const created = await adminSend('post', '/api/admin/blogs', {
      title: 'Panel Test Post', description: 'A description', content: '<p>Body</p><script>alert(1)</script>', category: 'Culture',
      status: 'draft', tags: 'a, b', author: JSON.stringify({ name: 'Lakshmi Rathod', role: 'Writer' }), metaTitle: 'Panel Test Post', metaDescription: 'A description',
    });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    const id = created.body.data._id;
    assert.equal(created.body.data.slug, 'panel-test-post');
    assert.ok(!created.body.data.content.includes('<script'), 'content is sanitised');

    const list = await adminGet('/api/admin/blogs?page=1&limit=10&sortBy=createdAt&sortOrder=desc');
    assert.equal(list.status, 200, 'the list must not 500 once a post has createdBy');
    assert.deepEqual(Object.keys(list.body.pagination).sort(), ['currentPage', 'hasMore', 'totalBlogs', 'totalPages']);
    const row = list.body.data.find((b) => String(b._id) === String(id));
    assert.equal(row.createdBy.email, admin.email);
    assert.equal(row.content, undefined, 'the list omits the body');

    const one = await adminGet(`/api/admin/blogs/${id}`);
    assert.equal(one.status, 200);
    assert.equal(one.body.data.author.name, 'Lakshmi Rathod');
    assert.equal(String(one.body.data.createdBy._id), String(admin._id));

    const updated = await adminSend('put', `/api/admin/blogs/${id}`, { title: 'A Completely New Title', slug: 'hijacked', status: 'published' });
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data.slug, 'panel-test-post', 'the slug is frozen');
    assert.equal(updated.body.data.title, 'A Completely New Title');

    const stats = await adminGet('/api/admin/blogs/stats');
    assert.equal(stats.body.data.publishedBlogs, 1);
    const del = await adminSend('delete', `/api/admin/blogs/${id}`);
    assert.equal(del.status, 200);
  });

  test('regional admin lists: a regex metacharacter in ?search is escaped, not a 500', async () => {
    for (const url of ['/api/state-pages/admin/all?search=(', '/api/city-pages/admin/all?search=%5B(*']) {
      const res = await adminGet(url);
      assert.equal(res.status, 200, url);
      assert.deepEqual(res.body.data, []);
      assert.equal(res.body.pagination.total, 0);
    }
    const anon = await harness.request().get('/api/city-pages/admin/all');
    assert.equal(anon.status, 401);
  });

  test('admin settings: nested objects are applied, dotted keys and apk.* are not', async () => {
    const res = await adminSend('put', '/api/admin/settings', {
      appName: 'Banjara Match',
      security: { legacySocketJoin: false },
      matching: { enforceGotraExogamy: true },
      limits: { interestDailyCap: 9999 },
      apk: { isMandatoryUpdate: true, versionCode: 999 },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.appName, 'Banjara Match');
    assert.equal(res.body.data.security.legacySocketJoin, false);
    assert.equal(res.body.data.limits.interestDailyCap, 500, 'clamped to 500');
    assert.notEqual(res.body.data.apk && res.body.data.apk.versionCode, 999, 'apk.* is not settable here');
    assert.notEqual(res.body.data.apk && res.body.data.apk.isMandatoryUpdate, true);

    const onlyApk = await adminSend('put', '/api/admin/settings', { apk: { isMandatoryUpdate: true } });
    assert.equal(onlyApk.status, 400);

    const back = await adminSend('put', '/api/admin/settings', { security: { legacySocketJoin: true } });
    assert.equal(back.body.data.security.legacySocketJoin, true);
  });

  test('audit log lists the mutations above with filters and pagination', async () => {
    // record() is fire-and-forget: give the writes a moment to land
    await new Promise((r) => setTimeout(r, 300));
    const all = await adminGet('/api/admin/audit-log?limit=50');
    assert.equal(all.status, 200);
    assert.ok(all.body.pagination.total >= 4);
    const actions = await adminGet('/api/admin/audit-log/actions');
    for (const a of ['settings.update', 'constant.create', 'constant.delete', 'communityFeedback.update']) {
      assert.ok(actions.body.data.includes(a), `missing action ${a}`);
    }
    const settings = await adminGet('/api/admin/audit-log?targetType=settings&action=settings.update');
    assert.ok(settings.body.data.length >= 1);
    assert.ok(settings.body.data.every((r) => r.action === 'settings.update' && r.targetType === 'settings'));
    assert.equal(String(settings.body.data[0].adminId._id), String(admin._id));
    const future = await adminGet(`/api/admin/audit-log?from=${encodeURIComponent(new Date(Date.now() + 86400000).toISOString())}`);
    assert.equal(future.body.data.length, 0);
    const anon = await harness.request().get('/api/admin/audit-log');
    assert.equal(anon.status, 401);
  });
}

if (harness.suiteReady(test, 'admin-panel')) defineSuite();
