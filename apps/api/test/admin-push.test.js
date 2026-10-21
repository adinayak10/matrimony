'use strict';
/**
 * test/admin-push.test.js (feature expansion A3/A6) — /api/admin/push/*.
 * Under NODE_ENV=test firebase messaging is a stub that throws, so every
 * send is recorded as failed; the tests check recipients, guards and jobs.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let admin;
  let adminToken;
  let admin2Token;
  let userToken;
  let PushJob;
  let AdminAuditLog;
  let stateId;

  const as = (token) => (method, url) => harness.request()[method](url).set(factory.bearer(token));
  let adminReq;

  async function waitForJob(id) {
    for (let i = 0; i < 50; i++) {
      const job = await PushJob.findById(id).lean();
      if (job && job.status !== 'running') return job;
      await new Promise((r) => setTimeout(r, 50));
    }
    throw new Error('job did not finish');
  }

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    PushJob = require('../models/PushJob');
    AdminAuditLog = require('../models/AdminAuditLog');
    const sign = (u) => jwt.sign({ _id: String(u._id), email: u.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    admin = await factory.makeUser({ role: 'admin', email: `admin_push_${Date.now()}@test.local` });
    adminToken = sign(admin);
    admin2Token = sign(await factory.makeUser({ role: 'admin', email: `admin2_push_${Date.now()}@test.local` }));
    adminReq = as(adminToken);
    userToken = factory.tokenFor(await factory.makeUser());
    stateId = factory.oid();

    // audience: 3 android women, 1 ios woman, 1 man, plus non-recipients
    const old = new Date(Date.now() - 40 * 86400000);
    await factory.makeUser({ gender: 'Female', device_token: 'tok-a1', device_type: 0, lastSeen: new Date(), location: { state: stateId } });
    await factory.makeUser({ gender: 'Female', device_token: 'tok-a2', device_type: 0, lastSeen: old });
    await factory.makeUser({ gender: 'Female', device_token: 'tok-a3', device_type: 0, isOnline: true });
    await factory.makeUser({ gender: 'Female', device_token: 'tok-i1', device_type: 1, lastSeen: new Date() });
    await factory.makeUser({ gender: 'Male', device_token: 'tok-m1', device_type: 0, lastSeen: new Date() });
    await factory.makeUser({ gender: 'Female', device_token: null }); // no token
    await factory.makeUser({ gender: 'Female', device_token: 'tok-b', is_block: 1 }); // blocked
    await factory.makeUser({ gender: 'Female', device_token: 'tok-off', settings: { allowNotifications: false } }); // opted out
  });
  test.after(async () => {
    await harness.stopAll();
  });

  const preview = (filters) => adminReq('post', '/api/admin/push/preview').send({ filters });

  test('auth: no token 401, member token 403; member-side relay does not exist', async () => {
    assert.equal((await harness.request().post('/api/admin/push/preview').send({})).status, 401);
    assert.equal((await as(userToken)('post', '/api/admin/push/broadcast').send({ title: 't', body: 'b' })).status, 403);
    const relay = await as(userToken)('post', '/api/pushNotificationToSingleUser').send({ title: 't', body: 'b' });
    assert.equal(relay.status, 404);
  });

  test('preview counts only reachable members and honours every filter', async () => {
    const all = await preview({});
    assert.equal(all.status, 200);
    assert.equal(all.body.count, 5);
    assert.equal(all.body.data.count, 5);
    assert.equal(all.body.data.max, 2000);
    assert.equal((await preview({ gender: 'Female' })).body.count, 4);
    assert.equal((await preview({ gender: 'Female', platform: 'android' })).body.count, 3);
    assert.equal((await preview({ platform: 'ios' })).body.count, 1);
    assert.equal((await preview({ platform: 'all' })).body.count, 5);
    assert.equal((await preview({ lastSeenDays: 7 })).body.count, 4, 'online counts as seen');
    assert.equal((await preview({ state: String(stateId) })).body.count, 1);
    assert.equal((await preview({ blocked: '1' })).body.count, 5, 'blocked members are never targeted');
    assert.equal((await adminReq('post', '/api/admin/push/preview').send({})).body.count, 5);
    assert.equal((await preview({ verified: true })).body.data.count, 5);
    assert.equal((await preview({ verified: '0' })).body.data.count, 0);
  });

  test('email broadcast preview still works through the extracted buildBroadcastQuery', async () => {
    const res = await adminReq('get', '/api/admin/broadcast-email/preview?gender=Male');
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(typeof res.body.count, 'number');
    const { buildBroadcastQuery } = require('../services/broadcastQuery');
    assert.deepEqual(buildBroadcastQuery({ gender: 'Female', verified: '1', blocked: '0', platform: 'mobile' }), {
      gender: 'Female',
      is_verified: 1,
      is_block: 0,
      last_login_platform: 'mobile',
    });
  });

  test('broadcast validates input, sends to topics and records a job + audit', async () => {
    assert.equal((await adminReq('post', '/api/admin/push/broadcast').send({ body: 'b' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/push/broadcast').send({ title: 't' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/push/broadcast').send({ title: 't', body: 'b', platform: 'web' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/push/broadcast').send({ title: 't', body: 'b', data: { nested: { x: 1 } } })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/push/broadcast').send({ title: 'x'.repeat(101), body: 'b' })).status, 400);

    const res = await adminReq('post', '/api/admin/push/broadcast').send({ title: 'Hello', body: 'World', platform: 'all', data: { type: 'announcement', announcementId: 'abc' } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const job = res.body.data;
    assert.equal(job.mode, 'topic');
    assert.deepEqual(job.results.map((r) => r.topic), ['banjaramatch_android', 'banjaramatch_ios']);
    assert.equal(job.status, 'failed'); // firebase stub in tests
    assert.equal(job.data.type, 'announcement');
    assert.ok(await AdminAuditLog.exists({ action: 'push.broadcast', targetId: String(job._id) }));

    const def = await adminReq('post', '/api/admin/push/broadcast').send({ title: 'Hi', body: 'There' });
    assert.equal(def.body.data.platform, 'all');
    assert.equal(def.body.data.data.type, 'admin_message', 'type is always present');
    // admin page link payload
    await PushJob.deleteMany({ startedBy: admin._id });
    const link = await adminReq('post', '/api/admin/push/broadcast').send({ title: 'Read', body: 'New post', data: { type: 'admin_message', linkType: 'url', url: 'https://banjaramatch.com/blogs/x' } });
    assert.equal(link.status, 200, JSON.stringify(link.body));
    assert.equal(link.body.data.data.linkType, 'url');
    assert.equal(link.body.data.data.url, 'https://banjaramatch.com/blogs/x');
  });

  test('filtered: 0 recipients, confirmCount mismatch, then a real run', async () => {
    const none = await adminReq('post', '/api/admin/push/filtered').send({ filters: { gender: 'Not specified' }, title: 't', body: 'b', confirmCount: 0 });
    assert.equal(none.status, 400);
    assert.equal(none.body.code, 'NO_RECIPIENTS');

    const mismatch = await adminReq('post', '/api/admin/push/filtered').send({ filters: { gender: 'Female' }, title: 't', body: 'b', confirmCount: 3 });
    assert.equal(mismatch.status, 400);
    assert.equal(mismatch.body.code, 'CONFIRM_MISMATCH');
    assert.equal(mismatch.body.total, 4);

    const ok = await adminReq('post', '/api/admin/push/filtered').send({ filters: { gender: 'Female' }, title: 'Hi', body: 'There', confirmCount: 4 });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal(ok.body.data.total, 4);
    const job = await waitForJob(ok.body.data.jobId);
    assert.equal(job.mode, 'filtered');
    assert.equal(job.status, 'completed');
    assert.equal(job.sent + job.failed, 4);
    assert.equal(job.filters.gender, 'Female');
    assert.ok(await AdminAuditLog.exists({ action: 'push.filtered', targetId: String(job._id) }));
  });

  test('test send to one user; 404 for unknown; job recorded but not counted toward the cap', async () => {
    assert.equal((await adminReq('post', '/api/admin/push/user').send({ title: 't', body: 'b' })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/push/user').send({ userId: String(factory.oid()), title: 't', body: 'b' })).status, 404);
    const u = await factory.makeUser({ device_token: null });
    const res = await adminReq('post', '/api/admin/push/user').send({ userId: String(u._id), title: 't', body: 'b' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.ok, false);
    assert.equal(res.body.data.error, 'no_token');
    const job = await PushJob.findById(res.body.data.jobId).lean();
    assert.equal(job.mode, 'user');
    assert.equal(String(job.targetUser), String(u._id));
  });

  test('5 sends per admin per day, then 429 (per admin)', async () => {
    await PushJob.deleteMany({});
    const rows = Array.from({ length: 5 }, () => ({ mode: 'topic', status: 'completed', startedBy: admin._id, title: 't', body: 'b' }));
    await PushJob.create(rows);
    const capped = await adminReq('post', '/api/admin/push/broadcast').send({ title: 'Hi', body: 'There' });
    assert.equal(capped.status, 429);
    assert.equal(capped.body.code, 'DAILY_CAP');
    const cappedFiltered = await adminReq('post', '/api/admin/push/filtered').send({ filters: { platform: 'ios' }, title: 'Hi', body: 'There', confirmCount: 1 });
    assert.equal(cappedFiltered.status, 429);
    // another admin is unaffected
    const other = await as(admin2Token)('post', '/api/admin/push/broadcast').send({ title: 'Hi', body: 'There' });
    assert.equal(other.status, 200);
  });

  test('jobs list: admin envelope, newest first, mode filter', async () => {
    const res = await adminReq('get', '/api/admin/push/jobs?limit=2');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, true);
    assert.equal(res.body.data.length, 2);
    assert.deepEqual(Object.keys(res.body.pagination).sort(), ['limit', 'page', 'pages', 'total']);
    assert.ok(new Date(res.body.data[0].createdAt) >= new Date(res.body.data[1].createdAt));
    const topic = await adminReq('get', '/api/admin/push/jobs?mode=topic');
    assert.ok(topic.body.data.every((j) => j.mode === 'topic'));
  });
}

if (harness.suiteReady(test, 'admin-push')) defineSuite();
