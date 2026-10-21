'use strict';
/**
 * test/match-percent.test.js (feature expansion A2/A6) — services/matchScore
 * (pure) and the matchPercent field on fetchUsersList, searchProfiles,
 * getTopDailyMatches and fetchNearbyMatches (+ nearby total and showLocation).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');
const { computeMatchPercent, explainMatch } = require('../services/matchScore');

const YEAR = 365.25 * 24 * 3600 * 1000;
const dobFor = (age) => new Date(Date.now() - (age + 0.5) * YEAR);

test('matchScore: nothing set (or only schema defaults) -> null', () => {
  assert.equal(computeMatchPercent({}, { height: 170 }), null);
  assert.equal(computeMatchPercent({ preferences: {} }, {}), null);
  const defaults = { preferences: { age_range: { min: 18, max: 60 }, height_range: { min: 121, max: 213 }, diet: 'Any', smoke: 'Any', drink: 'Any', manglik: "Don't Know", caste: [], marital_status: [] } };
  assert.equal(computeMatchPercent(defaults, { height: 170 }), null);
});

test('matchScore: weighted share of the set criteria, populated refs and raw ids mix', () => {
  const mongoose = require('mongoose');
  const caste = new mongoose.Types.ObjectId();
  const other = new mongoose.Types.ObjectId();
  const viewer = { preferences: { age_range: { min: 25, max: 30 }, caste: [String(caste)], diet: 'Vegetarian' } };
  // weights: age 2, caste 2, diet 1
  assert.equal(computeMatchPercent(viewer, { dob: dobFor(27), caste: { _id: caste, name: 'X' }, diet: 'Vegetarian' }), 100);
  assert.equal(computeMatchPercent(viewer, { dob: dobFor(27), caste: other, diet: 'Vegetarian' }), 60);
  assert.equal(computeMatchPercent(viewer, { dob: dobFor(40), caste: other, diet: 'Vegan' }), 0);
  assert.equal(computeMatchPercent(viewer, {}), 0, 'unknown values do not match');
  const why = explainMatch(viewer, { dob: dobFor(27), caste, diet: 'Vegan' });
  assert.deepEqual(why.matched.sort(), ['age', 'caste']);
  assert.deepEqual(why.considered.sort(), ['age', 'caste', 'diet']);
});

test("matchScore: 'Never Married' preference accepts a 'Single' profile; manglik", () => {
  const viewer = { preferences: { marital_status: ['Never Married'], manglik: 'No' } };
  assert.equal(computeMatchPercent(viewer, { maritalStatus: 'Single', manglikStatus: 'No' }), 100);
  assert.equal(computeMatchPercent(viewer, { maritalStatus: 'Divorced', manglikStatus: 'No' }), 33);
});

function defineSuite() {
  const factory = require('./helpers/factory');
  let viewer;
  let tok;
  const call = (path, body) => harness.request().post(`/api${path}`).set(factory.bearer(tok)).send(body || {});

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const User = require('../models/User');
    await User.init();
    viewer = await factory.makeUser({
      gender: 'Male',
      full_name: 'Pref Viewer',
      coordinates: { type: 'Point', coordinates: [78.4867, 17.385] },
      preferences: { height_range: { min: 160, max: 180 }, marital_status: ['Never Married'] },
    });
    tok = factory.tokenFor(viewer);
    await factory.makeUser({ gender: 'Female', full_name: 'Perfect Fit', height: 165, maritalStatus: 'Single', coordinates: { type: 'Point', coordinates: [78.49, 17.39] } });
    await factory.makeUser({ gender: 'Female', full_name: 'Half Fit', height: 190, maritalStatus: 'Single', coordinates: { type: 'Point', coordinates: [78.48, 17.38] } });
    await factory.makeUser({ gender: 'Female', full_name: 'Hidden Location', height: 165, maritalStatus: 'Single', settings: { showLocation: false }, coordinates: { type: 'Point', coordinates: [78.487, 17.386] } });
  });
  test.after(async () => {
    await harness.stopAll();
  });

  const byName = (rows) => Object.fromEntries(rows.map((r) => [r.full_name, r]));

  test('fetchUsersList cards carry matchPercent', async () => {
    const res = await call('/fetchUsersList', { page: 1, limit: 20 });
    assert.equal(res.status, 200);
    const m = byName(res.body.data);
    assert.equal(m['Perfect Fit'].matchPercent, 100);
    assert.equal(m['Half Fit'].matchPercent, 67); // height (w1) missed, marital (w2) matched
  });

  test('searchProfiles and getTopDailyMatches carry matchPercent (daily keeps matchScore/matchedOn)', async () => {
    const s = await call('/searchProfiles', { page: 1, limit: 20 });
    assert.equal(s.status, 200);
    assert.equal(byName(s.body.data)['Perfect Fit'].matchPercent, 100);
    const d = await call('/getTopDailyMatches', { limit: 10 });
    assert.equal(d.status, 200);
    const row = byName(d.body.data)['Perfect Fit'];
    assert.equal(row.matchPercent, 100);
    assert.equal(typeof row.matchScore, 'number');
    assert.ok(Array.isArray(row.matchedOn));
  });

  test('a viewer without preferences gets matchPercent null, never a made-up number', async () => {
    const plain = await factory.makeUser({ gender: 'Male' });
    const res = await harness.request().post('/api/fetchUsersList').set(factory.bearer(factory.tokenFor(plain))).send({});
    assert.equal(res.status, 200);
    assert.ok(res.body.data.length > 0);
    for (const card of res.body.data) assert.equal(card.matchPercent, null);
  });

  test('fetchNearbyMatches: matchPercent, total, members with showLocation:false excluded', async () => {
    const res = await call('/fetchNearbyMatches', { radiusKm: 50, page: 1, limit: 1 });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.total, 2);
    assert.equal(res.body.data.length, 1);
    assert.equal(res.body.page, 1);
    const all = await call('/fetchNearbyMatches', { radiusKm: 50, limit: 10 });
    const names = all.body.data.map((u) => u.full_name).sort();
    assert.deepEqual(names, ['Half Fit', 'Perfect Fit']);
    for (const card of all.body.data) assert.equal(typeof card.matchPercent, 'number');
  });
}

if (harness.suiteReady(test, 'match-percent')) defineSuite();
