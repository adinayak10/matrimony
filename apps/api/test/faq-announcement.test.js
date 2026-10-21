'use strict';
/**
 * test/faq-announcement.test.js (feature expansion A3/A6)
 *
 *   POST /api/fetchFAQs, GET /api/faqs          public; numeric 1-based ids (FaqCategoriesModel)
 *   /api/admin/faq-categories, /api/admin/faqs  CRUD, reorder, 409 while a category has faqs
 *   POST /api/fetchPlatformNotification         rows shaped for notification_model.dart
 *   /api/admin/announcements                    CRUD, publish {sendPush}, archive, expiry, platform
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

// audit writes are fire-and-forget; poll briefly
async function audited(query) {
  const AdminAuditLog = require('../models/AdminAuditLog');
  for (let i = 0; i < 40; i++) {
    if (await AdminAuditLog.exists(query)) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return false;
}

function defineSuite() {
  const factory = require('./helpers/factory');
  let adminToken;
  let userToken;
  let iosToken;
  let PushJob;

  const adminReq = (method, url) => harness.request()[method](url).set(factory.bearer(adminToken));
  const fetchPlatform = (token, body = {}) => harness.request().post('/api/fetchPlatformNotification').set(factory.bearer(token)).send(body);

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    PushJob = require('../models/PushJob');
    const admin = await factory.makeUser({ role: 'admin', email: `admin_fa_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    userToken = factory.tokenFor(await factory.makeUser({ device_type: 0 }));
    iosToken = factory.tokenFor(await factory.makeUser({ device_type: 1 }));
  });
  test.after(async () => {
    await harness.stopAll();
  });

  /* ---------------- FAQ ---------------- */

  test('FAQ starts empty (no seeded content); both public paths work without a token', async () => {
    const get = await harness.request().get('/api/faqs');
    assert.equal(get.status, 200);
    assert.deepEqual(get.body.data, []);
    assert.match(get.headers['cache-control'] || '', /public, max-age=300/);
    const post = await harness.request().post('/api/fetchFAQs').set('Authorization', 'Bearer ').send({});
    assert.equal(post.status, 200);
    assert.equal(post.body.status, true);
    assert.deepEqual(post.body.data, []);
  });

  test('FAQ admin CRUD + public shape with numeric ids', async () => {
    assert.equal((await harness.request().get('/api/admin/faq-categories').set(factory.bearer(userToken))).status, 403);
    assert.equal((await adminReq('post', '/api/admin/faq-categories').send({ title: '' })).status, 400);

    const c1 = await adminReq('post', '/api/admin/faq-categories').send({ title: 'Account' });
    const c2 = await adminReq('post', '/api/admin/faq-categories').send({ title: 'Privacy' });
    const c3 = await adminReq('post', '/api/admin/faq-categories').send({ title: 'Empty one' });
    assert.equal(c1.status, 201);
    assert.ok(c2.body.data.order > c1.body.data.order);

    assert.equal((await adminReq('post', '/api/admin/faqs').send({ category: c1.body.data._id, question: 'Q?' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/faqs').send({ category: '000000000000000000000000', question: 'Q?', answer: 'A' })).status, 400);

    const f1 = await adminReq('post', '/api/admin/faqs').send({ category: c1.body.data._id, question: 'How do I sign up?', answer: 'Use Google.' });
    const f2 = await adminReq('post', '/api/admin/faqs').send({ category: c1.body.data._id, question: 'Can I delete my account?', answer: 'Yes, in Settings.' });
    const f3 = await adminReq('post', '/api/admin/faqs').send({ category: c2.body.data._id, question: 'Who sees my photo?', answer: 'You choose.' });
    const hidden = await adminReq('post', '/api/admin/faqs').send({ category: c2.body.data._id, question: 'Hidden?', answer: 'x', isActive: false });
    for (const r of [f1, f2, f3, hidden]) assert.equal(r.status, 201, JSON.stringify(r.body));

    const pub = await harness.request().post('/api/fetchFAQs').send({});
    const cats = pub.body.data;
    assert.equal(cats.length, 2, 'empty category is left out');
    assert.equal(cats[0].id, 1);
    assert.equal(cats[1].id, 2);
    assert.equal(typeof cats[0].id, 'number');
    assert.equal(cats[0]._id, c1.body.data._id);
    assert.equal(cats[0].title, 'Account');
    assert.equal(cats[0].is_deleted, 0);
    assert.deepEqual(cats[0].faqs.map((f) => f.id), [1, 2]);
    assert.deepEqual(cats[1].faqs.map((f) => f.id), [3]);
    assert.ok(cats[0].faqs.every((f) => f.faqs_type_id === 1 && typeof f.faqs_type_id === 'number'));
    assert.equal(cats[1].faqs[0].faqs_type_id, 2);
    assert.equal(cats[0].faqs[0]._id, f1.body.data._id);
    assert.equal(cats[0].faqs[0].question, 'How do I sign up?');
    assert.ok(!JSON.stringify(pub.body).includes('Hidden?'));

    // reorder inside Account
    const bad = await adminReq('post', '/api/admin/faqs/reorder').send({ ids: ['nope'] });
    assert.equal(bad.status, 400);
    const ro = await adminReq('post', '/api/admin/faqs/reorder').send({ ids: [f2.body.data._id, f1.body.data._id] });
    assert.equal(ro.status, 200);
    const after = await harness.request().get('/api/faqs');
    assert.equal(after.body.data[0].faqs[0].question, 'Can I delete my account?');

    // update + delete
    const upd = await adminReq('put', `/api/admin/faqs/${f3.body.data._id}`).send({ answer: 'Only connections, if you choose.' });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.data.answer, 'Only connections, if you choose.');

    const cats2 = await adminReq('get', '/api/admin/faq-categories');
    assert.equal(cats2.status, 200);
    assert.equal(cats2.body.data.find((c) => c._id === c1.body.data._id).faqCount, 2);
    assert.ok(cats2.body.pagination);

    const byCat = await adminReq('get', `/api/admin/faqs?category=${c2.body.data._id}`);
    assert.equal(byCat.body.data.length, 2);

    const conflict = await adminReq('delete', `/api/admin/faq-categories/${c2.body.data._id}`);
    assert.equal(conflict.status, 409);
    await adminReq('delete', `/api/admin/faqs/${f3.body.data._id}`);
    await adminReq('delete', `/api/admin/faqs/${hidden.body.data._id}`);
    assert.equal((await adminReq('delete', `/api/admin/faq-categories/${c2.body.data._id}`)).status, 200);
    assert.equal((await adminReq('put', `/api/admin/faq-categories/${c3.body.data._id}`).send({ title: 'Renamed' })).body.data.title, 'Renamed');
    assert.equal((await adminReq('delete', '/api/admin/faqs/000000000000000000000000')).status, 404);

    assert.ok(await audited({ action: 'faq.reorder' }));
    assert.ok(await audited({ action: 'faqCategory.delete' }));
  });

  /* ---------------- Announcements ---------------- */

  test('announcement validation', async () => {
    assert.equal((await adminReq('post', '/api/admin/announcements').send({})).status, 400);
    assert.equal((await adminReq('post', '/api/admin/announcements').send({ title: 'T', body: 'B', type: 'promo' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/announcements').send({ title: 'T', body: 'B', platform: 'web' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/announcements').send({ title: 'T', body: 'B', linkUrl: 'javascript:alert(1)' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/announcements').send({ title: 'T', body: 'B', expiresAt: 'soon' })).status, 400);
  });

  test('draft is hidden; publish shows it with the app row shape; archive hides it', async () => {
    const created = await adminReq('post', '/api/admin/announcements').send({ title: 'New feature', body: 'Saved searches are here.', type: 'update', linkUrl: '/saved-searches' });
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, 'draft');
    const id = created.body.data._id;

    let res = await fetchPlatform(userToken, { start: 0, limit: 20 });
    assert.equal(res.status, 200);
    assert.ok(!res.body.data.some((r) => r._id === id));

    const pub = await adminReq('post', `/api/admin/announcements/${id}/publish`).send({ sendPush: false });
    assert.equal(pub.status, 200);
    assert.equal(pub.body.data.status, 'published');
    assert.equal(pub.body.data.pushJob, null);

    res = await fetchPlatform(userToken, { start: '0', limit: '20' });
    const row = res.body.data.find((r) => r._id === id);
    assert.ok(row);
    assert.equal(row.type, 'update');
    assert.equal(row.title, 'New feature');
    assert.equal(row.content, 'Saved searches are here.');
    assert.equal(row.linkUrl, '/saved-searches');
    assert.equal(row.toUser, null);
    assert.equal(row.fromUser, null);
    assert.equal(row.isRead, true);
    assert.deepEqual(row.data, {});
    assert.ok(row.createdAt && row.updatedAt);
    assert.equal(typeof res.body.total, 'number');

    const arch = await adminReq('post', `/api/admin/announcements/${id}/archive`).send({});
    assert.equal(arch.status, 200);
    res = await fetchPlatform(userToken);
    assert.ok(!res.body.data.some((r) => r._id === id));
    assert.ok(await audited({ action: 'announcement.archive', targetId: id }));
  });

  test('expired and other-platform announcements are hidden; start is an offset', async () => {
    const Announcement = require('../models/Announcement');
    await Announcement.deleteMany({});
    const now = Date.now();
    await Announcement.create([
      { title: 'Old', body: 'expired', status: 'published', publishedAt: new Date(now - 5000), expiresAt: new Date(now - 1000) },
      { title: 'iOS only', body: 'ios', platform: 'ios', status: 'published', publishedAt: new Date(now - 4000) },
      { title: 'Android only', body: 'android', platform: 'android', status: 'published', publishedAt: new Date(now - 3000) },
      { title: 'All A', body: 'a', status: 'published', publishedAt: new Date(now - 2000), expiresAt: new Date(now + 86400000) },
      { title: 'All B', body: 'b', status: 'published', publishedAt: new Date(now - 1000) },
    ]);
    const android = await fetchPlatform(userToken);
    assert.deepEqual(android.body.data.map((r) => r.title), ['All B', 'All A', 'Android only']);
    const ios = await fetchPlatform(iosToken);
    assert.deepEqual(ios.body.data.map((r) => r.title), ['All B', 'All A', 'iOS only']);
    const web = await fetchPlatform(userToken, { platform: 'web' });
    assert.deepEqual(web.body.data.map((r) => r.title), ['All B', 'All A']);
    const page2 = await fetchPlatform(userToken, { start: 1, limit: 1 });
    assert.deepEqual(page2.body.data.map((r) => r.title), ['All A']);
    assert.equal(page2.body.total, 3);

    const adminList = await adminReq('get', '/api/admin/announcements?status=expired');
    assert.equal(adminList.status, 200);
    assert.deepEqual(adminList.body.data.map((r) => r.title), ['Old']);
    assert.equal(adminList.body.data[0].displayStatus, 'expired');
    assert.equal(adminList.body.pagination.total, 1);
  });

  test('publish with sendPush stores pushResult and a PushJob; expired cannot be published', async () => {
    const created = await adminReq('post', '/api/admin/announcements').send({ title: 'Maintenance', body: 'Short downtime tonight.', type: 'maintenance', platform: 'android' });
    const id = created.body.data._id;
    const pub = await adminReq('post', `/api/admin/announcements/${id}/publish`).send({ sendPush: true });
    assert.equal(pub.status, 200, JSON.stringify(pub.body));
    assert.ok(pub.body.data.pushResult);
    assert.ok(pub.body.data.pushJob);
    assert.equal(pub.body.data.pushJob.mode, 'topic');
    assert.equal(pub.body.data.pushJob.source, 'announcement');
    assert.deepEqual(pub.body.data.pushJob.results.map((r) => r.topic), ['banjaramatch_android']);
    const job = await PushJob.findById(pub.body.data.pushJob._id).lean();
    assert.equal(job.data.type, 'announcement');
    assert.equal(job.data.announcementId, id);

    const exp = await adminReq('post', '/api/admin/announcements').send({ title: 'Gone', body: 'x', expiresAt: new Date(Date.now() - 60000).toISOString() });
    const r = await adminReq('post', `/api/admin/announcements/${exp.body.data._id}/publish`).send({});
    assert.equal(r.status, 400);

    const got = await adminReq('get', `/api/admin/announcements/${id}`);
    assert.equal(got.status, 200);
    const upd = await adminReq('put', `/api/admin/announcements/${id}`).send({ title: 'Maintenance (updated)' });
    assert.equal(upd.body.data.title, 'Maintenance (updated)');
    assert.equal((await adminReq('delete', `/api/admin/announcements/${id}`)).status, 200);
    assert.equal((await adminReq('get', `/api/admin/announcements/${id}`)).status, 404);
  });
}

if (harness.suiteReady(test, 'faq-announcement')) defineSuite();
