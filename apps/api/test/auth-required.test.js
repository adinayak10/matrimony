'use strict';
/**
 * test/auth-required.test.js (A9.3)
 *
 * Every route on routes/userRoutes.js must answer 401 without a token and
 * with an empty `Authorization: Bearer ` header, and must NOT answer 401
 * with a valid token. Every path on routes/publicLookupRoutes.js must work
 * without a token.
 *
 * Skipped until apps/api/app.js exports createApp() (A9.1).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const harness = require('./helpers/harness');

function routesOf(router) {
  const out = [];
  for (const layer of router.stack || []) {
    if (!layer.route) continue;
    for (const method of Object.keys(layer.route.methods)) {
      if (layer.route.methods[method]) out.push({ method, path: layer.route.path });
    }
  }
  return out;
}

function defineSuite() {
  const factory = require('./helpers/factory');
  let token;
  let userRoutes;
  let publicRoutes;

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    userRoutes = require(path.join(harness.API_ROOT, 'routes', 'userRoutes'));
    publicRoutes = require(path.join(harness.API_ROOT, 'routes', 'publicLookupRoutes'));
    const user = await factory.makeUser();
    token = factory.tokenFor(user);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('user routes reject missing and empty bearer tokens with 401', async () => {
    const routes = routesOf(userRoutes).filter((r) => !r.path.includes(':'));
    assert.ok(routes.length > 20, `expected many user routes, got ${routes.length}`);
    for (const r of routes) {
      const noToken = await harness.request()[r.method](`/api${r.path}`).send({});
      assert.equal(noToken.status, 401, `${r.method.toUpperCase()} ${r.path} without token`);
      assert.equal(noToken.body.code, 'AUTH_REQUIRED', `${r.path} code`);

      const empty = await harness.request()[r.method](`/api${r.path}`).set('Authorization', 'Bearer ').send({});
      assert.equal(empty.status, 401, `${r.method.toUpperCase()} ${r.path} with empty bearer`);
    }
  });

  test('user routes accept a valid token (never 401/403 on identity)', async () => {
    const routes = routesOf(userRoutes).filter((r) => !r.path.includes(':'));
    for (const r of routes) {
      const res = await harness.request()[r.method](`/api${r.path}`).set(factory.bearer(token)).send({});
      assert.notEqual(res.status, 401, `${r.method.toUpperCase()} ${r.path} with token -> ${res.status}`);
    }
  });

  test('public lookups work without a token', async () => {
    const routes = routesOf(publicRoutes);
    assert.ok(routes.length >= 13);
    for (const r of routes) {
      const res = await harness.request()[r.method](`/api${r.path}`).set('Authorization', 'Bearer ').send({});
      assert.notEqual(res.status, 401, `${r.method.toUpperCase()} ${r.path} public`);
      assert.notEqual(res.status, 403, `${r.method.toUpperCase()} ${r.path} public`);
    }
  });

  test('fetchSetting and download-apk stay public (forced-update path)', async () => {
    const res = await harness.request().post('/api/fetchSetting').send({});
    assert.notEqual(res.status, 401);
  });
}

if (harness.suiteReady(test, 'auth-required')) defineSuite();

module.exports = { defineSuite, routesOf };
