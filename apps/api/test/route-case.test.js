'use strict';
/**
 * test/route-case.test.js — installed apps call /api/toggleShortList (capital L)
 * while the route is /toggleShortlist. Express matches case-insensitively, so the
 * userRoutes auth guard must too, or the handler runs without a caller (400).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let A;
  let B;
  let tokenA;

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    A = await factory.makeUser({ gender: 'Male', full_name: 'Shortlister' });
    B = await factory.makeUser({ gender: 'Female', full_name: 'Shortlisted' });
    tokenA = factory.tokenFor(A);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('/api/toggleShortList (app spelling) is authenticated and works', async () => {
    const res = await harness.request().post('/api/toggleShortList').set(factory.bearer(tokenA)).send({ user_id: String(B._id) });
    assert.ok([200, 201].includes(res.status), JSON.stringify(res.body));
    assert.equal(res.body.status, true);
  });

  test('/api/toggleShortList without a token -> 401', async () => {
    const res = await harness.request().post('/api/toggleShortList').send({ user_id: String(B._id) });
    assert.equal(res.status, 401);
  });
}

if (harness.suiteReady(test, 'route-case')) defineSuite();

module.exports = { defineSuite };
