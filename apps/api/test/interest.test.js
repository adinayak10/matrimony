'use strict';
/**
 * test/interest.test.js (A9.3) — sendInterestRequest rules and block
 * ownership.
 *
 * Skipped until apps/api/app.js exports createApp() (A9.1).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let A;
  let tokenA;

  function send(tok, body) {
    return harness.request().post('/api/sendInterestRequest').set(factory.bearer(tok)).send(body);
  }

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    A = await factory.makeUser({ gender: 'Male', full_name: 'Requester' });
    tokenA = factory.tokenFor(A);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('self interest -> 400', async () => {
    const res = await send(tokenA, { user_id: String(A._id) });
    assert.equal(res.status, 400);
  });

  test('interest to a user who blocked me -> 403', async () => {
    const F = await factory.makeUser({ gender: 'Female' });
    await factory.makeBlock(F, A);
    const res = await send(tokenA, { user_id: String(F._id) });
    assert.equal(res.status, 403);
  });

  test('duplicate interest -> 400 or 409', async () => {
    const F = await factory.makeUser({ gender: 'Female' });
    const first = await send(tokenA, { user_id: String(F._id) });
    assert.equal(first.status, 200, JSON.stringify(first.body).slice(0, 200));
    const second = await send(tokenA, { user_id: String(F._id) });
    assert.ok([400, 409].includes(second.status), `got ${second.status}`);
  });

  test("allowConnections 'nobody' -> 403", async () => {
    const F = await factory.makeUser({ gender: 'Female', settings: { allowConnections: 'nobody' } });
    const res = await send(tokenA, { user_id: String(F._id) });
    assert.equal(res.status, 403);
  });

  test('21st interest within 24 h -> 429', async () => {
    const R = await factory.makeUser({ gender: 'Male', full_name: 'Busy' });
    const tokenR = factory.tokenFor(R);
    for (let i = 0; i < 20; i++) {
      const F = await factory.makeUser({ gender: 'Female' });
      await factory.makeRequest(R, F, 'pending');
    }
    const F21 = await factory.makeUser({ gender: 'Female' });
    const res = await send(tokenR, { user_id: String(F21._id) });
    assert.equal(res.status, 429);
  });

  test('the blocked side cannot lift a block; the row remains', async () => {
    const Block = require('../models/Block');
    const F = await factory.makeUser({ gender: 'Female' });
    await factory.makeBlock(A, F);
    const res = await harness
      .request()
      .post('/api/UserUnblockedByUser')
      .set(factory.bearer(factory.tokenFor(F)))
      .send({ my_user_id: String(F._id), user_id: String(A._id) });
    assert.equal(res.status, 404);
    assert.equal(await Block.countDocuments({ blocker: A._id, blocked: F._id }), 1);
  });

  test('blocking writes one row and removes the pending request', async () => {
    const Block = require('../models/Block');
    const FriendShipRequest = require('../models/FriendShipRequest');
    const F = await factory.makeUser({ gender: 'Female' });
    await factory.makeRequest(F, A, 'pending');
    const res = await harness
      .request()
      .post('/api/UserBlockedByUser')
      .set(factory.bearer(tokenA))
      .send({ user_id: String(F._id) });
    assert.equal(res.status, 200);
    assert.equal(await Block.countDocuments({ $or: [{ blocker: A._id, blocked: F._id }, { blocker: F._id, blocked: A._id }] }), 1);
    assert.equal(await FriendShipRequest.countDocuments({ requester: F._id, recipient: A._id }), 0);
    assert.ok(!JSON.stringify(res.body).includes('"email"'), 'block response carries no contact data');
  });

  test('interest to the same gender -> 400; to a banned member -> 404', async () => {
    const M = await factory.makeUser({ gender: 'Male' });
    assert.equal((await send(tokenA, { user_id: String(M._id) })).status, 400);
    const banned = await factory.makeUser({ gender: 'Female', is_block: 1 });
    assert.equal((await send(tokenA, { user_id: String(banned._id) })).status, 404);
  });

  test("allowConnections 'onlyPremium' is treated as everyone (product is free)", async () => {
    const F = await factory.makeUser({ gender: 'Female', settings: { allowConnections: 'onlyPremium' } });
    const res = await send(tokenA, { user_id: String(F._id) });
    assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
  });

  test('a sent interest row carries pairKey and timestamps', async () => {
    const FriendShipRequest = require('../models/FriendShipRequest');
    const F = await factory.makeUser({ gender: 'Female' });
    assert.equal((await send(tokenA, { user_id: String(F._id) })).status, 200);
    const row = await FriendShipRequest.findOne({ requester: A._id, recipient: F._id }).lean();
    assert.equal(row.pairKey, [String(A._id), String(F._id)].sort().join(':'));
    assert.ok(row.createdAt instanceof Date && row.updatedAt instanceof Date);
    // the reverse direction hits the same pair -> 409, never a second row
    const back = await send(factory.tokenFor(F), { user_id: String(A._id) });
    assert.equal(back.status, 409);
    assert.equal(await FriendShipRequest.countDocuments({ pairKey: row.pairKey }), 1);
  });

  test('reportUser: self 400, unknown reason 400, ok 200, duplicate 409, reportStatus reflects the row', async () => {
    const ReportReason = require('../models/ReportReason');
    const UserReport = require('../models/UserReport');
    await ReportReason.create({ title: 'Fake profile' });
    const F = await factory.makeUser({ gender: 'Female' });
    const report = (body) => harness.request().post('/api/reportUser').set(factory.bearer(tokenA)).send(body);

    assert.equal((await report({ user_id: String(A._id), reason: 'Fake profile' })).status, 400);
    assert.equal((await report({ user_id: String(F._id), reason: 'Not a configured reason' })).status, 400);
    // reportedBy in the body is ignored: the row is written for the token user
    const ok = await report({ user_id: String(F._id), reason: 'Fake profile', my_user_id: String(F._id), reportedBy: String(F._id) });
    assert.equal(ok.status, 200, JSON.stringify(ok.body).slice(0, 200));
    assert.equal(await UserReport.countDocuments({ reportedBy: A._id, reportedUser: F._id }), 1);
    assert.equal((await report({ user_id: String(F._id), reason: 'Fake profile' })).status, 409);
    assert.equal(await UserReport.countDocuments({ reportedUser: F._id }), 1);

    const profile = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(F._id) });
    assert.equal(profile.status, 200);
    assert.equal(profile.body.data.reportStatus, true);
    assert.equal(require('../controllers/UserController').reportStatus, undefined, 'exports.reportStatus was removed');
  });

  test('reportUser: 11th report within 24 h -> 429', async () => {
    const ReportReason = require('../models/ReportReason');
    const UserReport = require('../models/UserReport');
    await ReportReason.updateOne({ title: 'Spam' }, { $set: { title: 'Spam' } }, { upsert: true });
    const R = await factory.makeUser({ gender: 'Male' });
    for (let i = 0; i < 10; i++) {
      await UserReport.create({ reportedBy: R._id, reportedUser: factory.oid(), reason: 'Spam' });
    }
    const F = await factory.makeUser({ gender: 'Female' });
    const res = await harness.request().post('/api/reportUser').set(factory.bearer(factory.tokenFor(R))).send({ user_id: String(F._id), reason: 'Spam' });
    assert.equal(res.status, 429);
  });
}

if (harness.suiteReady(test, 'interest')) defineSuite();

module.exports = { defineSuite };
