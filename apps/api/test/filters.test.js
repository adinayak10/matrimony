'use strict';
/**
 * test/filters.test.js (A9.3) — match lists respect gender, blocks, gotra
 * exogamy, preferences and the limit clamp.
 *
 * Skipped until apps/api/app.js exports createApp() (A9.1).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

const LIST_ENDPOINTS = [
  ['/api/fetchUsersList', { limit: 50 }],
  ['/api/getTopDailyMatches', {}],
  ['/api/fetchNearbyMatches', { lat: 17.385, lng: 78.4867, maxDistanceKm: 500 }],
  ['/api/fetchTrendingProfiles', {}],
  ['/api/searchProfiles', { limit: 50 }],
];

function defineSuite() {
  const factory = require('./helpers/factory');
  const gotraG = factory.oid();
  const gotraH = factory.oid();
  const gotraM = factory.oid();
  const casteX = factory.oid();
  let male; // viewer, gotra G, motherGotra M
  let females = [];
  let blockedF;
  let sameGotraF;
  let motherGotraF;
  let casteF;
  let noGender;
  let token;

  async function post(url, tok, body) {
    return harness
      .request()
      .post(url)
      .set(factory.bearer(tok))
      .send({ my_user_id: 'spoofed', ...body });
  }

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    male = await factory.makeUser({ gender: 'Male', gotra: gotraG, motherGotra: gotraM, preferences: { caste: [casteX] } });
    token = factory.tokenFor(male);
    for (let i = 0; i < 12; i++) {
      females.push(await factory.makeUser({ gender: 'Female', gotra: gotraH }));
    }
    await factory.makeUser({ gender: 'Male', gotra: gotraH }); // other male, must never show
    blockedF = await factory.makeUser({ gender: 'Female', gotra: gotraH, full_name: 'Blocked F' });
    sameGotraF = await factory.makeUser({ gender: 'Female', gotra: gotraG, full_name: 'Same gotra' });
    motherGotraF = await factory.makeUser({ gender: 'Female', gotra: gotraM, full_name: 'Mother gotra' });
    casteF = await factory.makeUser({ gender: 'Female', gotra: gotraH, caste: casteX, full_name: 'Caste match' });
    noGender = await factory.makeUser({ gender: 'Not specified' });
    await factory.makeBlock(male, blockedF);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('Male viewer sees only Female profiles', async () => {
    const res = await post('/api/fetchUsersList', token, { limit: 50 });
    assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
    const rows = harness.listData(res.body);
    assert.ok(rows.length > 0, 'got rows');
    for (const u of rows) assert.equal(u.gender, 'Female');
    const ids = harness.collectIds(res.body);
    assert.ok(!ids.has(String(male._id)), 'self excluded');
  });

  test("'Not specified' viewer gets an empty list, not an error", async () => {
    const res = await post('/api/fetchUsersList', factory.tokenFor(noGender), { limit: 10 });
    assert.equal(res.status, 200);
    assert.equal(res.body.status, true);
    assert.deepEqual(harness.listData(res.body), []);
  });

  test('blocked user is absent from every list endpoint, both directions', async () => {
    const tokenB = factory.tokenFor(blockedF);
    for (const [url, body] of LIST_ENDPOINTS) {
      const asMale = await post(url, token, body);
      assert.ok(asMale.status < 500, `${url} as male -> ${asMale.status}`);
      assert.ok(!harness.collectIds(asMale.body).has(String(blockedF._id)), `${url}: blocked user leaked to blocker`);
      const asBlocked = await post(url, tokenB, body);
      assert.ok(asBlocked.status < 500, `${url} as blocked -> ${asBlocked.status}`);
      assert.ok(!harness.collectIds(asBlocked.body).has(String(male._id)), `${url}: blocker leaked to blocked user`);
    }
  });

  test('same gotra and mother gotra are excluded', async () => {
    for (const [url, body] of LIST_ENDPOINTS) {
      const res = await post(url, token, body);
      const ids = harness.collectIds(res.body);
      assert.ok(!ids.has(String(sameGotraF._id)), `${url}: same gotra leaked`);
      assert.ok(!ids.has(String(motherGotraF._id)), `${url}: mother gotra leaked`);
    }
  });

  test('matchMyPreference with a caste preference returns the matching user', async () => {
    const res = await post('/api/fetchUsersList', token, { limit: 50, matchMyPreference: true });
    assert.equal(res.status, 200);
    const ids = harness.collectIds(res.body);
    assert.ok(ids.has(String(casteF._id)), 'caste match present');
    assert.ok(!ids.has(String(females[0]._id)), 'non-matching caste absent');
  });

  test("limit:'10' string is clamped and paginates", async () => {
    const res = await post('/api/fetchUsersList', token, { limit: '10', page: 1 });
    assert.equal(res.status, 200);
    assert.ok(harness.listData(res.body).length <= 10);
    const big = await post('/api/fetchUsersList', token, { limit: 5000 });
    assert.equal(big.status, 200);
    assert.ok(harness.listData(big.body).length <= 50);
  });

  test('list responses never contain secrets', async () => {
    const res = await post('/api/fetchUsersList', token, { limit: 50 });
    const text = JSON.stringify(res.body);
    for (const key of ['"password"', '"device_token"', '"firebase_uid"', '"tokenVersion"']) {
      assert.ok(!text.includes(key), `${key} leaked`);
    }
  });
}

if (harness.suiteReady(test, 'filters')) defineSuite();

module.exports = { defineSuite, LIST_ENDPOINTS };
