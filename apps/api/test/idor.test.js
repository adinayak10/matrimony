'use strict';
/**
 * test/idor.test.js (A9.3) — body ids can never act on another account.
 *
 * Skipped until apps/api/app.js exports createApp() (A9.1).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let A;
  let B;
  let C;
  let tokenA;
  let User;

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    User = require('../models/User');
    A = await factory.makeUser({ full_name: 'Alice A', gender: 'Female' });
    B = await factory.makeUser({ full_name: 'Bob B', gender: 'Male', bio: 'original bio' });
    C = await factory.makeUser({ full_name: 'Carl C', gender: 'Male' });
    tokenA = factory.tokenFor(A);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('editProfile with user_id of another user -> 403 and B unchanged', async () => {
    const res = await harness
      .request()
      .post('/api/editProfile')
      .set(factory.bearer(tokenA))
      .send({ user_id: String(B._id), bio: 'hacked' });
    assert.equal(res.status, 403);
    const b = await User.findById(B._id).lean();
    assert.equal(b.bio, 'original bio');
  });

  test('editProfile ignores is_verified and membership', async () => {
    const planId = factory.oid();
    const res = await harness
      .request()
      .post('/api/editProfile')
      .set(factory.bearer(tokenA))
      .send({ user_id: String(A._id), is_verified: 1, membership: String(planId), membershipPlan: String(planId), bio: 'mine' });
    assert.ok(res.status < 500, `status ${res.status}`);
    const a = await User.findById(A._id).lean();
    assert.equal(a.bio, 'mine');
    assert.equal(a.is_verified, 1); // factory default, unchanged by the request
    assert.equal(a.membershipPlan, null);
  });

  test('deleteUser {user_id: B} under A cannot delete B', async () => {
    const res = await harness.request().post('/api/deleteUser').set(factory.bearer(tokenA)).send({ user_id: String(B._id) });
    assert.notEqual(res.status, 200);
    assert.ok(await User.exists({ _id: B._id }), 'B still exists');
    assert.ok(await User.exists({ _id: A._id }), 'A untouched by a spoofed delete');
  });

  test('fetchMessages on a room A is not part of -> 403', async () => {
    const room = await factory.makeRoom(B, C, 'accepted');
    await factory.makeMessage(room, B, C, 'secret');
    const res = await harness
      .request()
      .post('/api/fetchMessages')
      .set(factory.bearer(tokenA))
      .send({ roomId: String(room._id), my_user_id: String(B._id) });
    assert.equal(res.status, 403);
    assert.ok(!JSON.stringify(res.body).includes('secret'));
  });

  test("deleteUserPhoto / setMainProfileImage on B's photo -> 404", async () => {
    const photo = await factory.makePhoto(B);
    const del = await harness
      .request()
      .post('/api/deleteUserPhoto')
      .set(factory.bearer(tokenA))
      .send({ user_id: String(B._id), photoId: String(photo._id), photo_id: String(photo._id) });
    assert.equal(del.status, 404);
    const main = await harness
      .request()
      .post('/api/setMainProfileImage')
      .set(factory.bearer(tokenA))
      .send({ user_id: String(B._id), photoId: String(photo._id), photo_id: String(photo._id) });
    assert.equal(main.status, 404);
    const UserPhoto = require('../models/UserPhoto');
    assert.ok(await UserPhoto.exists({ _id: photo._id }), "B's photo still exists");
  });

  test("getProfileVisitorSummary {my_user_id: B} returns A's data, not B's", async () => {
    await factory.makeVisit(C, B); // C visited B; nobody visited A
    const res = await harness
      .request()
      .post('/api/getProfileVisitorSummary')
      .set(factory.bearer(tokenA))
      .send({ my_user_id: String(B._id) });
    assert.ok(res.status < 500, `status ${res.status}`);
    const ids = harness.collectIds(res.body);
    assert.ok(!ids.has(String(C._id).toLowerCase()), "C (B's visitor) must not appear in A's summary");
  });
}

if (harness.suiteReady(test, 'idor')) defineSuite();

module.exports = { defineSuite };
