'use strict';
/**
 * test/analytics.test.js (feature expansion A3/A6) — /api/admin/analytics/*.
 * Data is created before the first call of each endpoint (60 s cache).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

const DAY = 86400000;

function defineSuite() {
  const factory = require('./helpers/factory');
  let adminToken;
  let userToken;

  const adminGet = (url) => harness.request().get(url).set(factory.bearer(adminToken));

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    const User = require('../models/User');
    const ActivityLog = require('../models/ActivityLog');
    const now = Date.now();

    const admin = await factory.makeUser({ role: 'admin', email: `admin_an_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    const member = await factory.makeUser();
    userToken = factory.tokenFor(member);

    const u1 = await factory.makeUser({ gender: 'Male', profileCompletion: { percentage: 80 } });
    const u2 = await factory.makeUser({ gender: 'Female', profileCompletion: { percentage: 50 } });
    const u3 = await factory.makeUser({ gender: 'Male', profileCompletion: { percentage: 90 }, lastSeen: new Date(now - 3600000) });
    await factory.makeUser({ gender: 'Female', profileCompletion: { percentage: 0 }, isOnline: true, dob: null }); // u4: online, no dob
    const old = await factory.makeUser({ gender: 'Female', profileCompletion: { percentage: 100 } });
    // outside the 30-day cohort: admin, probe member, old
    await User.collection.updateMany({ _id: { $in: [admin._id, member._id, old._id] } }, { $set: { createdAt: new Date(now - 60 * DAY) } });

    await factory.makeRequest(u1, old, 'pending');
    await factory.makeRequest(u3, u2, 'accepted');
    const room = await factory.makeRoom(u3, u2, 'accepted');
    await factory.makeMessage(room, u3, u2, 'namaste');

    await ActivityLog.create([
      { userId: u1._id, timestamp: new Date(now - 2 * 3600000) },
      { userId: u1._id, timestamp: new Date(now - 3 * 3600000) },
      { userId: u2._id, timestamp: new Date(now - 3 * DAY) },
      { userId: old._id, timestamp: new Date(now - 20 * DAY) },
    ]);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('admin only', async () => {
    for (const p of ['funnel', 'activity', 'demographics', 'active']) {
      assert.equal((await harness.request().get(`/api/admin/analytics/${p}`)).status, 401, p);
      assert.equal((await harness.request().get(`/api/admin/analytics/${p}`).set(factory.bearer(userToken))).status, 403, p);
    }
  });

  test('funnel: signup cohort -> 70% profile -> interest -> accepted -> message', async () => {
    const res = await adminGet('/api/admin/analytics/funnel?days=30');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, true);
    const steps = res.body.data.steps;
    assert.deepEqual(steps.map((s) => s.key), ['signups', 'profile_complete_70', 'interest_sent', 'interest_accepted', 'first_message']);
    assert.deepEqual(steps.map((s) => s.count), [4, 2, 2, 2, 1]);
    assert.equal(steps[1].pctOfPrev, 50);
    assert.equal(steps[4].pctOfFirst, 25);
    assert.equal(res.body.data.days, 30);
  });

  test('active: online + ActivityLog + lastSeen, distinct', async () => {
    const res = await adminGet('/api/admin/analytics/active');
    assert.equal(res.status, 200);
    assert.deepEqual(
      { onlineNow: res.body.data.onlineNow, dau: res.body.data.dau, wau: res.body.data.wau, mau: res.body.data.mau },
      { onlineNow: 1, dau: 3, wau: 4, mau: 5 }
    );
  });

  test('activity: one bucket per day, totals match', async () => {
    const res = await adminGet('/api/admin/analytics/activity?days=7');
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.equal(d.labels.length, 7);
    assert.match(d.labels[6], /^\d{4}-\d{2}-\d{2}$/);
    for (const k of ['signups', 'interests', 'accepted', 'shortlists', 'visitors', 'messages']) {
      assert.equal(d.series[k].length, 7, k);
    }
    assert.equal(d.totals.signups, 4);
    assert.equal(d.totals.interests, 2);
    assert.equal(d.totals.accepted, 1);
    assert.equal(d.totals.messages, 1);
    assert.equal(d.totals.shortlists, 0);
    assert.equal(d.range, 7);
    assert.equal(d.days.length, 7);
    assert.equal(d.days[6].date, d.labels[6]);
    assert.deepEqual(Object.keys(d.days[0]).sort(), ['accepted', 'date', 'interests', 'messages', 'shortlists', 'signups', 'visitors']);
    assert.equal(d.days.reduce((a, r) => a + r.signups, 0), 4);
  });

  test('demographics: buckets add up to the member total', async () => {
    const res = await adminGet('/api/admin/analytics/demographics');
    assert.equal(res.status, 200);
    const d = res.body.data;
    assert.equal(d.total, 7);
    assert.equal(d.gender.reduce((a, g) => a + g.count, 0), d.total);
    assert.equal(d.ageBuckets.reduce((a, g) => a + g.count, 0), d.total);
    assert.equal(d.ageBuckets.find((b) => b.key === 'Not specified').count, 1);
    assert.equal(d.ageBuckets.find((b) => b.key === '25-29').count, 6);
    for (const k of ['cities', 'states', 'castes', 'gotras', 'gender', 'maritalStatus', 'profileCreatedBy', 'ageBuckets']) {
      assert.ok(Array.isArray(d[k]), k);
      for (const r of d[k]) assert.ok('_id' in r && 'name' in r && typeof r.count === 'number', k);
    }
  });

  test('days is clamped; bad values fall back to 30', async () => {
    const res = await adminGet('/api/admin/analytics/funnel?days=abc');
    assert.equal(res.body.data.days, 30);
    const big = await adminGet('/api/admin/analytics/activity?days=9999');
    assert.equal(big.body.data.labels.length, 180);
    assert.equal(big.body.data.range, 180);
  });
}

if (harness.suiteReady(test, 'analytics')) defineSuite();
