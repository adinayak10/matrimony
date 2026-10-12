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

  test('all 11 legacy auth routes answer 410 Gone', async () => {
    const { LEGACY_PATHS } = require('../routes/legacyAuth');
    assert.equal(LEGACY_PATHS.length, 11);
    for (const p of LEGACY_PATHS) {
      const res = await harness.request().post(`/api/auth${p}`).send({ phone: '9999999999', otp: '123456' });
      assert.equal(res.status, 410, `${p} -> ${res.status}`);
      assert.equal(res.body.code, 'GONE');
    }
  });

  test('the legacy handlers and otpStore are gone from the controller', () => {
    const AuthController = require('../controllers/AuthController');
    for (const name of ['checkUser', 'verifyFirebaseOtp', 'verifyFirebaseOtpWithName', 'loginWithEmail', 'registerWithEmail', 'sendOtp', 'requestOtp', 'verifyOtp', 'completeProfile', 'otpStore']) {
      assert.equal(AuthController[name], undefined, `${name} still exported`);
    }
  });

  test('firebase-email-register and firebase-google-login without firebaseToken -> 400', async () => {
    for (const p of ['/api/auth/firebase-email-register', '/api/auth/firebase-google-login']) {
      const res = await harness.request().post(p).send({});
      assert.equal(res.status, 400, `${p} -> ${res.status}`);
    }
  });

  test('a body email/firebaseUid alone never logs anyone in or rewrites the account', async () => {
    const User = require('../models/User');
    const victim = await factory.makeUser({ full_name: 'Real Name', phone: '9000000001', firebase_uid: 'real-uid' });
    for (const p of ['/api/auth/firebase-email-login', '/api/auth/firebase-email-register', '/api/auth/firebase-google-login']) {
      const res = await harness
        .request()
        .post(p)
        .send({ email: victim.email, firebaseUid: 'attacker-uid', firebaseToken: 'not-a-real-token', full_name: 'Hacked', phone: '9111111111' });
      assert.ok([400, 401].includes(res.status), `${p} -> ${res.status}`);
      assert.equal(res.body.token, undefined);
    }
    const after = await User.findById(victim._id).select('firebase_uid full_name phone').lean();
    assert.equal(after.full_name, 'Real Name');
    assert.equal(after.phone, '9000000001');
    assert.equal(after.firebase_uid, 'real-uid');
  });
}

if (harness.suiteReady(test, 'auth')) defineSuite();

module.exports = { defineSuite };
