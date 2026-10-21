'use strict';
/**
 * test/recommendation.test.js (feature expansion A3/A6) — admin matchmaking.
 *
 *   POST   /api/admin/users/:id/recommend   warnings (same gender, gotra) never block;
 *                                           blocked pair 400; duplicate 409
 *   GET    /api/admin/users/:id/recommendations, /api/admin/recommendations
 *   DELETE /api/admin/recommendations/:id   also removes its notifications
 *   POST   /api/fetchRecommendations        member side, privacy-serialized target
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let adminToken;
  let Notification;
  let AdminAuditLog;

  const adminReq = (method, url) => harness.request()[method](url).set(factory.bearer(adminToken));
  const recommend = (userId, body) => adminReq('post', `/api/admin/users/${userId}/recommend`).send(body);
  const fetchRecs = (token, body = {}) => harness.request().post('/api/fetchRecommendations').set(factory.bearer(token)).send(body);

  async function audited(query) {
    for (let i = 0; i < 40; i++) {
      if (await AdminAuditLog.exists(query)) return true;
      await new Promise((r) => setTimeout(r, 25));
    }
    return false;
  }

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    Notification = require('../models/Notification');
    AdminAuditLog = require('../models/AdminAuditLog');
    const admin = await factory.makeUser({ role: 'admin', email: `admin_rec_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('admin only', async () => {
    const u = await factory.makeUser();
    assert.equal((await harness.request().post(`/api/admin/users/${u._id}/recommend`).send({})).status, 401);
    const res = await harness.request().get('/api/admin/recommendations').set(factory.bearer(factory.tokenFor(u)));
    assert.equal(res.status, 403);
  });

  test('recommend -> 201, notification (fromUser = target), member sees a serialized card', async () => {
    const user = await factory.makeUser({ gender: 'Male', full_name: 'Ravi' });
    const target = await factory.makeUser({
      gender: 'Female',
      full_name: 'Sita',
      device_token: 'secret-device-token',
      phone: `9${Date.now()}`.slice(0, 10),
      settings: { mobileVisibility: 'private', emailVisibility: 'private' },
    });
    const res = await recommend(user._id, { targetUserId: String(target._id), note: 'Both teachers in Hyderabad' });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    assert.deepEqual(res.body.data.warnings, []);
    const recId = res.body.data.recommendation._id;

    const notes = await Notification.find({ toUser: user._id, type: 'admin_recommendation' }).lean();
    assert.equal(notes.length, 1);
    assert.equal(String(notes[0].fromUser), String(target._id));
    assert.equal(notes[0].data.recommendationId, recId);
    assert.equal(await Notification.countDocuments({ toUser: target._id }), 0, 'notifyBoth false');

    const mine = await fetchRecs(factory.tokenFor(user), { start: 0, limit: 10 });
    assert.equal(mine.status, 200);
    assert.equal(mine.body.total, 1);
    const row = mine.body.data[0];
    assert.equal(row.note, 'Both teachers in Hyderabad');
    assert.equal(row.relation, 'none');
    assert.equal(String(row.user._id), String(target._id));
    assert.equal(row.user.full_name, 'Sita');
    const raw = JSON.stringify(mine.body);
    assert.ok(!raw.includes('secret-device-token'));
    assert.equal(row.user.email, null);
    assert.equal(row.user.phone, null);
    assert.ok(!('password' in row.user));

    // target does not see it; duplicate -> 409
    assert.equal((await fetchRecs(factory.tokenFor(target))).body.total, 0);
    const dup = await recommend(user._id, { targetUserId: String(target._id) });
    assert.equal(dup.status, 409);
    assert.ok(await audited({ action: 'recommendation.create', targetId: String(user._id) }));
  });

  test('validation: self, bad ids, unknown users', async () => {
    const user = await factory.makeUser();
    assert.equal((await recommend(user._id, {})).status, 400);
    assert.equal((await recommend(user._id, { targetUserId: String(user._id) })).status, 400);
    assert.equal((await recommend(user._id, { targetUserId: String(factory.oid()) })).status, 404);
    assert.equal((await recommend(factory.oid(), { targetUserId: String(user._id) })).status, 404);
    assert.equal((await recommend('nope', { targetUserId: String(user._id) })).status, 404);
  });

  test('blocked pair -> 400; blocked account -> 400', async () => {
    const a = await factory.makeUser({ gender: 'Male' });
    const b = await factory.makeUser({ gender: 'Female' });
    await factory.makeBlock(b, a);
    const res = await recommend(a._id, { targetUserId: String(b._id) });
    assert.equal(res.status, 400);
    assert.equal(res.body.code, 'BLOCKED');
    const banned = await factory.makeUser({ gender: 'Female', is_block: 1 });
    assert.equal((await recommend(a._id, { targetUserId: String(banned._id) })).status, 400);
  });

  test('warnings never block: same gender, gotra conflict (either direction)', async () => {
    const g1 = factory.oid();
    const g2 = factory.oid();
    const m1 = await factory.makeUser({ gender: 'Male' });
    const m2 = await factory.makeUser({ gender: 'Male' });
    const same = await recommend(m1._id, { targetUserId: String(m2._id) });
    assert.equal(same.status, 201);
    assert.deepEqual(same.body.data.warnings, ['same_gender']);

    const groom = await factory.makeUser({ gender: 'Male', gotra: g1 });
    const sameGotra = await factory.makeUser({ gender: 'Female', gotra: g1 });
    const r1 = await recommend(groom._id, { targetUserId: String(sameGotra._id) });
    assert.equal(r1.status, 201);
    assert.deepEqual(r1.body.data.warnings, ['gotra_conflict']);

    // the bride's mother's gotra equals the groom's gotra (her rule's other half)
    const motherSide = await factory.makeUser({ gender: 'Female', gotra: g2, motherGotra: g1 });
    const r2 = await recommend(groom._id, { targetUserId: String(motherSide._id) });
    assert.deepEqual(r2.body.data.warnings, ['gotra_conflict']);

    // groom's mother gotra = bride's gotra
    const groom2 = await factory.makeUser({ gender: 'Male', gotra: factory.oid(), motherGotra: g2 });
    const bride2 = await factory.makeUser({ gender: 'Female', gotra: g2 });
    const r3 = await recommend(groom2._id, { targetUserId: String(bride2._id) });
    assert.deepEqual(r3.body.data.warnings, ['gotra_conflict']);

    const clean = await factory.makeUser({ gender: 'Female', gotra: factory.oid() });
    const r4 = await recommend(groom._id, { targetUserId: String(clean._id) });
    assert.deepEqual(r4.body.data.warnings, []);
  });

  test('notifyBoth notifies the target too; lists; delete removes notifications', async () => {
    const user = await factory.makeUser({ gender: 'Male' });
    const target = await factory.makeUser({ gender: 'Female' });
    const res = await recommend(user._id, { targetUserId: String(target._id), notifyBoth: true });
    assert.equal(res.status, 201);
    const id = res.body.data.recommendation._id;
    const toTarget = await Notification.findOne({ toUser: target._id, type: 'admin_recommendation' }).lean();
    assert.ok(toTarget);
    assert.equal(String(toTarget.fromUser), String(user._id));

    const forUser = await adminReq('get', `/api/admin/users/${user._id}/recommendations`);
    assert.equal(forUser.status, 200);
    assert.equal(forUser.body.data.length, 1);
    assert.equal(forUser.body.data[0].target.full_name, target.full_name);
    assert.deepEqual(Object.keys(forUser.body.pagination).sort(), ['limit', 'page', 'pages', 'total']);

    const all = await adminReq('get', '/api/admin/recommendations?limit=2');
    assert.equal(all.status, 200);
    assert.equal(all.body.data.length, 2);
    assert.ok(all.body.pagination.total >= 6);

    const del = await adminReq('delete', `/api/admin/recommendations/${id}`);
    assert.equal(del.status, 200);
    assert.equal(await Notification.countDocuments({ 'data.recommendationId': id }), 0);
    assert.equal((await adminReq('delete', `/api/admin/recommendations/${id}`)).status, 404);
    assert.equal((await fetchRecs(factory.tokenFor(user))).body.total, 0);
    assert.ok(await audited({ action: 'recommendation.delete' }));
  });

  test('member list hides targets blocked later or banned', async () => {
    const user = await factory.makeUser({ gender: 'Male' });
    const t1 = await factory.makeUser({ gender: 'Female' });
    const t2 = await factory.makeUser({ gender: 'Female' });
    const t3 = await factory.makeUser({ gender: 'Female' });
    for (const t of [t1, t2, t3]) assert.equal((await recommend(user._id, { targetUserId: String(t._id) })).status, 201);
    await factory.makeBlock(user, t1);
    const User = require('../models/User');
    await User.updateOne({ _id: t2._id }, { $set: { is_block: 1 } });
    const res = await fetchRecs(factory.tokenFor(user));
    assert.equal(res.body.total, 1);
    assert.equal(String(res.body.data[0].user._id), String(t3._id));
  });
}

if (harness.suiteReady(test, 'recommendation')) defineSuite();
