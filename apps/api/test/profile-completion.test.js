'use strict';
/**
 * test/profile-completion.test.js (feature expansion A0.4/A4/A6) —
 * services/profileCompletion and its persistence from editProfile and
 * fetchProfile, plus the additive card fields (Connections, block list),
 * block_reason privacy, admin profileCreatedBy, getMarriageIntent,
 * fetchHighlightedUsers and the fixed interest-monitor job.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');
const { computeProfileCompletion, REQUIRED_FIELDS } = require('../services/profileCompletion');

test('computeProfileCompletion: empty vs complete, populated refs count as present', () => {
  const empty = computeProfileCompletion({});
  assert.equal(empty.percentage, 0);
  assert.equal(empty.missingFields.length, REQUIRED_FIELDS.length);
  assert.match(empty.suggestion, /your full name/);
  const full = computeProfileCompletion({
    full_name: 'A', dob: new Date('1995-01-01'), gender: 'Male', height: 170, maritalStatus: 'Single',
    location: { country: { _id: 'c', name: 'India' }, state: 's', city: 'x' }, profession: 'p', qualification: 'q', profile: 'uploads/profile_images/a.jpg',
  });
  assert.equal(full.percentage, 100);
  assert.deepEqual(full.missingFields, []);
  const notSpecified = computeProfileCompletion({ full_name: 'Not specified', gender: 'Not specified', height: 0 });
  assert.ok(notSpecified.missingFields.includes('your full name'));
  assert.ok(notSpecified.missingFields.includes('your height'));
});

function defineSuite() {
  const factory = require('./helpers/factory');
  let User;
  let adminToken;
  const call = (t, path, body) => harness.request().post(`/api${path}`).set(factory.bearer(t)).send(body || {});

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    User = require('../models/User');
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    const admin = await factory.makeUser({ role: 'admin', email: `admin_pc_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('editProfile persists profileCompletion', async () => {
    const u = await factory.makeUser({ gender: 'Male' });
    const t = factory.tokenFor(u);
    const res = await call(t, '/editProfile', { bio: 'hello' });
    assert.equal(res.status, 200);
    const pct = res.body.data.profileCompletion.percentage;
    assert.equal(typeof pct, 'number');
    const row = await User.findById(u._id).lean();
    assert.equal(row.profileCompletion.percentage, pct);
    assert.deepEqual(row.profileCompletion.missingFields, res.body.data.profileCompletion.missingFields);
  });

  test('fetchProfile (self and others) refreshes the stored value; others never see it', async () => {
    const u = await factory.makeUser({ gender: 'Female' });
    await User.updateOne({ _id: u._id }, { $set: { 'profileCompletion.percentage': 3, 'profileCompletion.missingFields': ['stale'] } });
    const self = await call(factory.tokenFor(u), '/fetchProfile', { user_id: String(u._id) });
    assert.equal(self.status, 200);
    const expected = self.body.data.profileCompletion.percentage;
    assert.notEqual(expected, 3);
    assert.equal((await User.findById(u._id).lean()).profileCompletion.percentage, expected);

    await User.updateOne({ _id: u._id }, { $set: { 'profileCompletion.percentage': 3 } });
    const viewer = await factory.makeUser({ gender: 'Male' });
    const other = await call(factory.tokenFor(viewer), '/fetchProfile', { user_id: String(u._id) });
    assert.equal(other.status, 200);
    assert.equal(other.body.data.profileCompletion, undefined);
    // fire-and-forget persist: give it a moment
    for (let i = 0; i < 20 && (await User.findById(u._id).lean()).profileCompletion.percentage === 3; i++) await new Promise((r) => setTimeout(r, 25));
    assert.equal((await User.findById(u._id).lean()).profileCompletion.percentage, expected);
  });

  test('block_reason never reaches other members; the admin detail shows it', async () => {
    const u = await factory.makeUser({ gender: 'Female' });
    await User.updateOne({ _id: u._id }, { $set: { block_reason: 'internal note' } });
    const viewer = await factory.makeUser({ gender: 'Male' });
    const res = await call(factory.tokenFor(viewer), '/fetchProfile', { user_id: String(u._id) });
    assert.equal(res.status, 200);
    assert.ok(!JSON.stringify(res.body).includes('internal note'));
    const adminRes = await harness.request().get(`/api/admin/users/${u._id}`).set(factory.bearer(adminToken));
    assert.equal(adminRes.status, 200);
    assert.equal(adminRes.body.data.block_reason, 'internal note');
  });

  test('admin can set profileCreatedBy (validated)', async () => {
    const u = await factory.makeUser();
    const put = (body) => harness.request().put(`/api/admin/users/${u._id}`).set(factory.bearer(adminToken)).send(body);
    assert.equal((await put({ profileCreatedBy: 'stranger' })).status, 400);
    const ok = await put({ profileCreatedBy: 'Sibling' });
    assert.equal(ok.status, 200, JSON.stringify(ok.body));
    assert.equal((await User.findById(u._id).lean()).profileCreatedBy, 'sibling');
  });

  test('Connections card (getInterestList accepted) gains the additive fields', async () => {
    const a = await factory.makeUser({ gender: 'Male' });
    const b = await factory.makeUser({ gender: 'Female', height: 160, maritalStatus: 'Single', is_verified: 1, profileCreatedBy: 'parent', isOnline: true });
    await factory.makeRequest(a, b, 'accepted');
    const res = await call(factory.tokenFor(a), '/getInterestList', { status: 'accepted', start: 1, limit: 10 });
    assert.equal(res.status, 200);
    assert.equal(res.body.total, 1);
    const card = res.body.data[0].user;
    assert.equal(String(card._id), String(b._id));
    assert.equal(card.is_verified, 1);
    assert.equal(card.isOnline, true);
    assert.ok('lastSeen' in card);
    assert.equal(card.maritalStatus, 'Single');
    assert.equal(card.height, 160);
    assert.equal(card.profileCreatedBy, 'parent');
  });

  test('block list cards carry is_verified and profileCreatedBy', async () => {
    const a = await factory.makeUser({ gender: 'Male' });
    const b = await factory.makeUser({ gender: 'Female', is_verified: 1, profileCreatedBy: 'friend' });
    const t = factory.tokenFor(a);
    const blocked = await call(t, '/UserBlockedByUser', { user_id: String(b._id) });
    assert.equal(blocked.body.data.profileCreatedBy, 'friend');
    const list = await call(t, '/fetchBlockedUserList', {});
    assert.equal(list.body.data[0].is_verified, 1);
    assert.equal(list.body.data[0].profileCreatedBy, 'friend');
  });

  test('getMarriageIntent keeps its keys; fetchHighlightedUsers no longer selects is_top_user', async () => {
    const u = await factory.makeUser({ gender: 'Male', isOnline: true });
    const t = factory.tokenFor(u);
    const res = await call(t, '/getMarriageIntent', {});
    assert.equal(res.status, 200);
    for (const k of ['userId', 'sentCount', 'acceptedCount', 'shortlistCount', 'viewsMade', 'viewsReceived', 'rejectedCount', 'rejectionRate', 'totalTimeSpent', 'profileStrength', 'daysRecentlyActive', 'score', 'status']) {
      assert.ok(k in res.body.data, `missing ${k}`);
    }
    assert.equal(res.body.data.daysRecentlyActive, 30);
    await factory.makeUser({ gender: 'Female', is_highlighted: true });
    const h = await call(t, '/fetchHighlightedUsers', {});
    assert.equal(h.status, 200);
    assert.ok(h.body.data.length >= 1);
    for (const row of h.body.data) assert.ok(!('is_top_user' in row));
  });

  test('interest monitor: >=3 recent visits -> one alert per 7 days; honours opt-out', async () => {
    const RecentVisitor = require('../models/RecentVisitor');
    const Notification = require('../models/Notification');
    const runMonitor = require('../services/jobs/interestMonitor');
    const visitor = await factory.makeUser({ gender: 'Male', full_name: 'Keen Visitor' });
    const visited = await factory.makeUser({ gender: 'Female' });
    const optedOut = await factory.makeUser({ gender: 'Female', settings: { notifyOnProfileVisit: false } });
    const stale = await factory.makeUser({ gender: 'Female' });
    const fewVisits = await factory.makeUser({ gender: 'Female' });
    await RecentVisitor.create([
      { visitor: visitor._id, visited: visited._id, count: 3, lastVisitedAt: new Date() },
      { visitor: visitor._id, visited: optedOut._id, count: 5, lastVisitedAt: new Date() },
      { visitor: visitor._id, visited: stale._id, count: 9, lastVisitedAt: new Date(Date.now() - 5 * 86400 * 1000) },
      { visitor: visitor._id, visited: fewVisits._id, count: 2, lastVisitedAt: new Date() },
    ]);
    await runMonitor();
    await runMonitor();
    const count = (u) => Notification.countDocuments({ type: 'interest_detected', toUser: u._id, fromUser: visitor._id });
    assert.equal(await count(visited), 1);
    assert.equal(await count(optedOut), 0);
    assert.equal(await count(stale), 0);
    assert.equal(await count(fewVisits), 0);
  });
}

if (harness.suiteReady(test, 'profile-completion')) defineSuite();
