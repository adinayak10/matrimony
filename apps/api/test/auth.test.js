'use strict';
/**
 * test/auth.test.js (A9.3) — auth flows and token checks.
 *
 * Skipped until apps/api/app.js exports createApp() (A9.1).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('firebase-email-login without firebaseToken -> 400', async () => {
    const res = await harness
      .request()
      .post('/api/auth/firebase-email-login')
      .send({ email: 'victim@test.local', firebaseUid: 'x' });
    assert.equal(res.status, 400);
  });

  test('firebase-email-login with a bad token -> 401 (never 200)', async () => {
    const res = await harness
      .request()
      .post('/api/auth/firebase-email-login')
      .send({ email: { $ne: null }, firebaseUid: 'x', firebaseToken: 'bad' });
    assert.ok([400, 401].includes(res.status), `got ${res.status}`);
  });

  test('legacy OTP routes are gone (404/410)', async () => {
    for (const p of ['/api/auth/verify-otp', '/api/auth/request-otp', '/api/auth/firebase-login', '/api/auth/loginWithEmail']) {
      const res = await harness.request().post(p).send({ phone: '9999999999' });
      assert.ok([404, 410].includes(res.status), `${p} -> ${res.status}`);
    }
  });

  test('blocked user token -> 401 ACCOUNT_BLOCKED', async () => {
    const u = await factory.makeUser({ is_block: 1 });
    const res = await harness.request().get('/api/auth/me').set(factory.bearer(factory.tokenFor(u)));
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'ACCOUNT_BLOCKED');
  });

  test('revoked token (tv behind tokenVersion) -> 401 TOKEN_REVOKED', async (t) => {
    const User = require('../models/User');
    if (!User.schema.path('tokenVersion')) {
      t.skip('User.tokenVersion not in schema yet');
      return;
    }
    const u = await factory.makeUser({});
    const old = factory.tokenFor(u, { tv: 0 });
    await User.updateOne({ _id: u._id }, { $set: { tokenVersion: 1 } });
    const res = await harness.request().get('/api/auth/me').set(factory.bearer(old));
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'TOKEN_REVOKED');
  });

  test('token signed with the old public default secret -> 401', async () => {
    const jwt = require('jsonwebtoken');
    const u = await factory.makeUser({});
    const forged = jwt.sign({ _id: String(u._id) }, 'your_jwt_secret');
    const res = await harness.request().get('/api/auth/me').set(factory.bearer(forged));
    assert.equal(res.status, 401);
  });

  test('/api/auth/me with a valid token returns the user without secrets', async () => {
    const u = await factory.makeUser({ password: 'hashhash' });
    const res = await harness.request().get('/api/auth/me').set(factory.bearer(factory.tokenFor(u)));
    assert.equal(res.status, 200);
    const text = JSON.stringify(res.body);
    assert.ok(text.includes(String(u._id)));
    assert.ok(!text.includes('"password"'));
    assert.ok(!text.includes('"device_token"'));
  });

  test('empty Bearer on a user route -> 401 AUTH_REQUIRED', async () => {
    const res = await harness.request().post('/api/fetchUsersList').set('Authorization', 'Bearer ').send({});
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'AUTH_REQUIRED');
  });
}

if (harness.suiteReady(test, 'auth')) defineSuite();

module.exports = { defineSuite };
