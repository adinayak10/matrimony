'use strict';
/**
 * test/success-story.test.js (feature expansion A3/A6) — member submit, public
 * list, admin moderation of success stories.
 *
 *   POST /api/submitSuccessStory, /api/fetchMySuccessStories   authenticate
 *   GET  /api/success-stories(/:id)                            public, published only, no PII
 *   /api/admin/success-stories                                 adminAuth, audited
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const harness = require('./helpers/harness');

// 1x1 PNG
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');
const STORY = 'We met on BanjaraMatch and our families got along from the very first visit.';
const PUBLIC_KEYS = ['_id', 'brideName', 'city', 'groomName', 'isFeatured', 'photo', 'publishedAt', 'story', 'weddingDate'].sort();

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
  let SuccessStory;
  let Notification;
  let adminToken;
  let userToken;
  const createdPhotos = [];

  const adminReq = (method, url) => harness.request()[method](url).set(factory.bearer(adminToken));

  async function newMember(overrides = {}) {
    const u = await factory.makeUser(overrides);
    return { user: u, token: factory.tokenFor(u) };
  }

  function submit(token, fields, withPhoto = false) {
    const r = harness.request().post('/api/submitSuccessStory').set(factory.bearer(token));
    for (const [k, v] of Object.entries(fields)) r.field(k, String(v));
    if (withPhoto) r.attach('photo', PNG, { filename: 'us.png', contentType: 'image/png' });
    return r;
  }

  const base = { groom_name: 'Ravi', bride_name: 'Sita', story: STORY, wedding_date: '2025-02-14', city: 'Hyderabad' };

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    SuccessStory = require('../models/SuccessStory');
    Notification = require('../models/Notification');
    const admin = await factory.makeUser({ role: 'admin', email: `admin_ss_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    userToken = factory.tokenFor(await factory.makeUser());
  });
  test.after(async () => {
    const rows = SuccessStory ? await SuccessStory.find({ photo: { $ne: null } }).select('photo').lean() : [];
    for (const p of [...createdPhotos, ...rows.map((r) => r.photo)]) {
      try {
        fs.unlinkSync(path.resolve(process.cwd(), p));
      } catch (_) {
        /* gone */
      }
    }
    await harness.stopAll();
  });

  test('member routes need a token; {} bodies answer 400/200, never 500', async () => {
    for (const p of ['/submitSuccessStory', '/fetchMySuccessStories', '/fetchPlatformNotification', '/fetchRecommendations']) {
      const res = await harness.request().post(`/api${p}`).send({});
      assert.equal(res.status, 401, p);
      assert.equal(res.body.code, 'AUTH_REQUIRED', p);
      const empty = await harness.request().post(`/api${p}`).set('Authorization', 'Bearer ').send({});
      assert.equal(empty.status, 401, `${p} empty bearer`);
    }
    const s = await harness.request().post('/api/submitSuccessStory').set(factory.bearer(userToken)).send({});
    assert.equal(s.status, 400);
    for (const p of ['/fetchMySuccessStories', '/fetchPlatformNotification', '/fetchRecommendations']) {
      const res = await harness.request().post(`/api${p}`).set(factory.bearer(userToken)).send({});
      assert.equal(res.status, 200, p);
      assert.ok(Array.isArray(res.body.data), p);
    }
  });

  test('submit validates fields', async () => {
    const { token } = await newMember();
    const short = await submit(token, { ...base, story: 'too short' });
    assert.equal(short.status, 400);
    const noGroom = await submit(token, { ...base, groom_name: '' });
    assert.equal(noGroom.status, 400);
    const badDate = await submit(token, { ...base, wedding_date: 'not-a-date' });
    assert.equal(badDate.status, 400);
  });

  test('partner must be an accepted connection', async () => {
    const a = await newMember({ gender: 'Male' });
    const b = await newMember({ gender: 'Female' });
    const notYet = await submit(a.token, { ...base, partner_user_id: String(b.user._id) });
    assert.equal(notYet.status, 400);
    assert.equal(notYet.body.code, 'NOT_CONNECTED');

    await factory.makeRequest(a.user, b.user, 'pending');
    const pending = await submit(a.token, { ...base, partner_user_id: String(b.user._id) });
    assert.equal(pending.status, 400);

    const FR = require('../models/FriendShipRequest');
    await FR.updateOne({ requester: a.user._id, recipient: b.user._id }, { $set: { status: 'accepted' } });
    const ok = await submit(a.token, { ...base, partner_user_id: String(b.user._id) });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    const doc = await SuccessStory.findById(ok.body.data._id).lean();
    assert.equal(String(doc.partnerUser), String(b.user._id));

    // the partner sees it in their own list too
    const mine = await harness.request().post('/api/fetchMySuccessStories').set(factory.bearer(b.token)).send({});
    assert.equal(mine.body.data.length, 1);
    assert.equal(mine.body.data[0].status, 'pending');
  });

  test('submit with photo -> pending, invisible publicly; publish -> public, notified, no PII', async () => {
    const m = await newMember({ email: `story_owner_${Date.now()}@secret.test` });
    const res = await submit(m.token, base, true);
    assert.equal(res.status, 201, JSON.stringify(res.body));
    const id = res.body.data._id;
    assert.equal(res.body.data.status, 'pending');
    assert.match(res.body.data.photo, /^uploads\/profile_images\/[0-9a-f-]+\.(jpg|png)$/);
    createdPhotos.push(res.body.data.photo);
    assert.ok(fs.existsSync(path.resolve(process.cwd(), res.body.data.photo)));

    let list = await harness.request().get('/api/success-stories');
    assert.equal(list.status, 200);
    assert.ok(!list.body.data.some((r) => r._id === id));
    assert.equal((await harness.request().get(`/api/success-stories/${id}`)).status, 404);

    const approve = await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'approved' });
    assert.equal(approve.status, 200);
    list = await harness.request().get('/api/success-stories');
    assert.ok(!list.body.data.some((r) => r._id === id), 'approved is not public yet');

    const pub = await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'published' });
    assert.equal(pub.status, 200);
    assert.ok(pub.body.data.publishedAt);

    list = await harness.request().get('/api/success-stories?page=1&limit=12');
    assert.equal(list.status, 200);
    assert.match(list.headers['cache-control'] || '', /max-age=300/);
    const row = list.body.data.find((r) => r._id === id);
    assert.ok(row);
    assert.deepEqual(Object.keys(row).sort(), PUBLIC_KEYS);
    assert.equal(list.body.page, 1);
    assert.equal(list.body.limit, 12);
    assert.ok(list.body.total >= 1);
    const raw = JSON.stringify(list.body);
    assert.ok(!raw.includes('secret.test'));
    assert.ok(!raw.includes(String(m.user._id)), 'submitter id leaked');

    const one = await harness.request().get(`/api/success-stories/${id}`);
    assert.equal(one.status, 200);
    assert.deepEqual(Object.keys(one.body.data).sort(), PUBLIC_KEYS);

    const notes = await Notification.find({ toUser: m.user._id, type: 'success_story_published' }).lean();
    assert.equal(notes.length, 1);
    // publishing again does not notify twice
    await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'published' });
    assert.equal(await Notification.countDocuments({ toUser: m.user._id, type: 'success_story_published' }), 1);

    assert.ok(await audited({ action: 'successStory.published', targetId: id }));
  });

  test('featured only for published; featured=1 filter', async () => {
    const m = await newMember();
    const res = await submit(m.token, base);
    const id = res.body.data._id;
    const early = await adminReq('patch', `/api/admin/success-stories/${id}/featured`).send({ isFeatured: true });
    assert.equal(early.status, 400);
    await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'published' });
    const bad = await adminReq('patch', `/api/admin/success-stories/${id}/featured`).send({ isFeatured: 'yes' });
    assert.equal(bad.status, 400);
    const ok = await adminReq('patch', `/api/admin/success-stories/${id}/featured`).send({ isFeatured: true });
    assert.equal(ok.status, 200);
    assert.equal(ok.body.data.isFeatured, true);
    const feat = await harness.request().get('/api/success-stories?featured=1');
    assert.ok(feat.body.data.length >= 1);
    assert.ok(feat.body.data.every((r) => r.isFeatured === true));
    assert.equal(feat.body.data[0]._id, id);
  });

  test('reject needs a reason; the member sees it', async () => {
    const m = await newMember();
    const res = await submit(m.token, base);
    const id = res.body.data._id;
    const noReason = await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'rejected' });
    assert.equal(noReason.status, 400);
    const badStatus = await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'live' });
    assert.equal(badStatus.status, 400);
    const ok = await adminReq('patch', `/api/admin/success-stories/${id}/status`).send({ status: 'rejected', reason: 'Please add both names' });
    assert.equal(ok.status, 200);
    const mine = await harness.request().post('/api/fetchMySuccessStories').set(factory.bearer(m.token)).send({});
    assert.equal(mine.body.data[0].status, 'rejected');
    assert.equal(mine.body.data[0].rejectionReason, 'Please add both names');
  });

  test('3 submissions per day, then 429', async () => {
    const m = await newMember();
    for (let i = 0; i < 3; i++) {
      const r = await submit(m.token, base);
      assert.equal(r.status, 201);
    }
    const fourth = await submit(m.token, base, true);
    assert.equal(fourth.status, 429);
    assert.equal(fourth.body.code, 'DAILY_CAP');
  });

  test('plain text is stored as typed (no HTML entities)', async () => {
    const m = await newMember();
    const r = await submit(m.token, { ...base, groom_name: 'Ravi & Co', story: `${STORY} <3 "forever"` });
    assert.equal(r.status, 201);
    assert.equal(r.body.data.groomName, 'Ravi & Co');
    assert.ok(r.body.data.story.endsWith('<3 "forever"'));
  });

  test('admin list/get/create/update/delete; envelope; audit; non-admin 403', async () => {
    const forbidden = await harness.request().get('/api/admin/success-stories').set(factory.bearer(userToken));
    assert.equal(forbidden.status, 403);
    assert.equal((await harness.request().get('/api/admin/success-stories')).status, 401);

    const list = await adminReq('get', '/api/admin/success-stories?status=all&limit=5');
    assert.equal(list.status, 200);
    assert.equal(list.body.status, true);
    assert.ok(Array.isArray(list.body.data));
    assert.deepEqual(Object.keys(list.body.pagination).sort(), ['limit', 'page', 'pages', 'total']);
    assert.ok(list.body.data.length <= 5);
    assert.ok(list.body.data.every((r) => 'status' in r));

    const pendingOnly = await adminReq('get', '/api/admin/success-stories');
    assert.ok(pendingOnly.body.data.every((r) => r.status === 'pending'));

    const created = await adminReq('post', '/api/admin/success-stories')
      .field('groomName', 'Arjun')
      .field('brideName', 'Meera')
      .field('story', STORY)
      .attach('photo', PNG, { filename: 'a.png', contentType: 'image/png' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.equal(created.body.data.status, 'approved');
    const id = created.body.data._id;
    const oldPhoto = created.body.data.photo;
    assert.ok(oldPhoto);

    const upd = await adminReq('put', `/api/admin/success-stories/${id}`).send({ city: 'Warangal', groomName: 'Arjun N' });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.data.city, 'Warangal');
    assert.equal(upd.body.data.groomName, 'Arjun N');
    assert.equal(upd.body.data.brideName, 'Meera');
    const badUpd = await adminReq('put', `/api/admin/success-stories/${id}`).send({ story: 'short' });
    assert.equal(badUpd.status, 400);

    const got = await adminReq('get', `/api/admin/success-stories/${id}`);
    assert.equal(got.status, 200);
    assert.equal((await adminReq('get', '/api/admin/success-stories/nope')).status, 404);

    const del = await adminReq('delete', `/api/admin/success-stories/${id}`);
    assert.equal(del.status, 200);
    assert.ok(!fs.existsSync(path.resolve(process.cwd(), oldPhoto)), 'photo file removed');
    assert.equal(await SuccessStory.countDocuments({ _id: id }), 0);
    assert.ok(await audited({ action: 'successStory.delete', targetId: id }));
    assert.ok(await audited({ action: 'successStory.create', targetId: id }));
  });

  test('a non-image upload is rejected and nothing is stored', async () => {
    const m = await newMember();
    const before = await SuccessStory.countDocuments({ submittedBy: m.user._id });
    const r = harness.request().post('/api/submitSuccessStory').set(factory.bearer(m.token));
    for (const [k, v] of Object.entries(base)) r.field(k, v);
    const res = await r.attach('photo', Buffer.from('not an image at all'), { filename: 'x.png', contentType: 'image/png' });
    assert.equal(res.status, 400);
    assert.equal(await SuccessStory.countDocuments({ submittedBy: m.user._id }), before);
  });
}

if (harness.suiteReady(test, 'success-story')) defineSuite();
