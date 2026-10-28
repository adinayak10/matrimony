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
      .send({ user_id: String(B._id), image_id: String(photo._id), photoId: String(photo._id), photo_id: String(photo._id) });
    assert.equal(del.status, 404);
    const main = await harness
      .request()
      .post('/api/setMainProfileImage')
      .set(factory.bearer(tokenA))
      .send({ user_id: String(B._id), image_id: String(photo._id), photoId: String(photo._id), photo_id: String(photo._id) });
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

  // B-C room shared by the tests below (one room per pair: pairKey is unique)
  async function bcRoom() {
    const ChatRoom = require('../models/ChatRoom');
    const key = [String(B._id), String(C._id)].sort().join(':');
    return (await ChatRoom.findOne({ pairKey: key })) || factory.makeRoom(B, C, 'accepted');
  }

  test('fetchProfile of a blocked pair -> 404 both ways, and no visitor row is written', async () => {
    const RecentVisitor = require('../models/RecentVisitor');
    const X = await factory.makeUser({ full_name: 'Xavier X', gender: 'Male' });
    await factory.makeBlock(X, A); // X blocked A
    const asA = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(X._id) });
    assert.equal(asA.status, 404);
    const asX = await harness.request().post('/api/fetchProfile').set(factory.bearer(factory.tokenFor(X))).send({ user_id: String(A._id) });
    assert.equal(asX.status, 404);
    assert.equal(await RecentVisitor.countDocuments({ $or: [{ visitor: A._id, visited: X._id }, { visitor: X._id, visited: A._id }] }), 0);
  });

  test('fetchProfile of an admin-banned member -> 404', async () => {
    const banned = await factory.makeUser({ gender: 'Male', is_block: 1 });
    const res = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(banned._id) });
    assert.equal(res.status, 404);
  });

  test('fetchProfile of a same-gender member -> 404 and no visitor row; own profile still 200', async () => {
    const RecentVisitor = require('../models/RecentVisitor');
    const F = await factory.makeUser({ gender: 'Female' });
    const res = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(F._id) });
    assert.equal(res.status, 404);
    assert.equal(await RecentVisitor.countDocuments({ visitor: A._id, visited: F._id }), 0);
    const self = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(A._id) });
    assert.equal(self.status, 200);
  });

  test('fetchProfile: one visitor row per pair (deduped), chat partner email never returned', async () => {
    const RecentVisitor = require('../models/RecentVisitor');
    const P = await factory.makeUser({ full_name: 'Partner P', gender: 'Male', email: `partner_${Date.now()}@secret.test` });
    await factory.makeRequest(A, P, 'accepted');
    await factory.makeRoom(A, P, 'accepted');
    const first = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(P._id) });
    assert.equal(first.status, 200, JSON.stringify(first.body).slice(0, 200));
    const second = await harness.request().post('/api/fetchProfile').set(factory.bearer(tokenA)).send({ user_id: String(P._id) });
    assert.equal(second.status, 200);
    const rows = await RecentVisitor.find({ visitor: A._id, visited: P._id }).lean();
    assert.equal(rows.length, 1);
    assert.equal(rows[0].count, 1, 'a second view within the hour does not bump the counter');
    const text = JSON.stringify(second.body);
    assert.ok(!text.includes('@secret.test'), "partner's email leaked");
    assert.ok(second.body.data.chatRoom, 'accepted room is described');
    assert.equal(String(second.body.data.chatRoom.userId), String(P._id), 'chatRoom describes the OTHER participant');
    assert.equal(second.body.data.reportStatus, false);
    for (const key of ['"password"', '"device_token"', '"firebase_uid"']) assert.ok(!text.includes(key), `${key} leaked`);
  });

  test('fetchOrGenerateRoom with a blocked user -> 403; userA_id in the body is ignored', async () => {
    const Y = await factory.makeUser({ gender: 'Male' });
    await factory.makeBlock(A, Y);
    const blocked = await harness.request().post('/api/fetchOrGenerateRoom').set(factory.bearer(tokenA)).send({ userA_id: String(A._id), userB_id: String(Y._id) });
    assert.equal(blocked.status, 403);
    const room = await bcRoom();
    const spoof = await harness.request().post('/api/fetchOrGenerateRoom').set(factory.bearer(tokenA)).send({ userA_id: String(B._id), userB_id: String(C._id) });
    assert.ok(!harness.collectIds(spoof.body).has(String(room._id)), "B-C's room must not be returned to A");
  });

  test('deleteRoom hides the room for the caller only and never for a non-participant', async () => {
    const ChatRoom = require('../models/ChatRoom');
    const Q = await factory.makeUser({ gender: 'Male' });
    const mine = await factory.makeRoom(A, Q, 'accepted');
    const res = await harness.request().post('/api/deleteRoom').set(factory.bearer(tokenA)).send({ user_id: String(Q._id) });
    assert.equal(res.status, 200);
    const after = await ChatRoom.findById(mine._id).lean();
    assert.ok(after, 'the room document still exists for the other member');
    assert.deepEqual((after.hiddenFor || []).map(String), [String(A._id)]);
    const rooms = await harness.request().post('/api/fetchUserRooms').set(factory.bearer(tokenA)).send({});
    assert.ok(!harness.collectIds(rooms.body).has(String(mine._id)), 'hidden room is not listed for the caller');
    const theirs = await harness.request().post('/api/fetchUserRooms').set(factory.bearer(factory.tokenFor(Q))).send({});
    assert.ok(harness.collectIds(theirs.body).has(String(mine._id)), 'the other member still sees it');

    const other = await bcRoom();
    await harness.request().post('/api/deleteRoom').set(factory.bearer(tokenA)).send({ my_user_id: String(B._id), user_id: String(C._id) });
    const untouched = await ChatRoom.findById(other._id).lean();
    assert.ok(untouched && !(untouched.hiddenFor || []).length, "B-C's room untouched");
  });
}

if (harness.suiteReady(test, 'idor')) defineSuite();

module.exports = { defineSuite };
