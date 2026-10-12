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
}

if (harness.suiteReady(test, 'interest')) defineSuite();

module.exports = { defineSuite };
