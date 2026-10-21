'use strict';
/**
 * test/compatibility.test.js (feature expansion A2/A6) — Guna Milan now
 * requires a token, takes the viewer from it, refuses blocked pairs; and
 * editProfile validates the horoscope/manglik/profile fields it feeds on.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let A;
  let B;
  let tokA;

  const guna = (t, body) => {
    const r = harness.request().post('/api/compatibility/guna-milan');
    return (t ? r.set(factory.bearer(t)) : r).send(body || {});
  };
  const edit = (t, body) => harness.request().post('/api/editProfile').set(factory.bearer(t)).send(body);

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    A = await factory.makeUser({ gender: 'Male', horoscope: { rashi: 'Mesha', nakshatra: 'Ashwini' }, manglikStatus: 'No' });
    B = await factory.makeUser({ gender: 'Female', horoscope: { rashi: 'Simha', nakshatra: 'Magha' }, manglikStatus: 'Yes' });
    tokA = factory.tokenFor(A);
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('guna-milan without a token -> 401', async () => {
    const res = await guna(null, { my_user_id: String(A._id), user_id: String(B._id) });
    assert.equal(res.status, 401);
  });

  test('bad / self user_id -> 400', async () => {
    assert.equal((await guna(tokA, {})).status, 400);
    assert.equal((await guna(tokA, { user_id: 'abc' })).status, 400);
    assert.equal((await guna(tokA, { user_id: String(A._id) })).status, 400);
    assert.equal((await guna(tokA, { user_id: String(factory.oid()) })).status, 404);
  });

  test('valid pair: unchanged shape plus breakdown/verdict; viewer is the token user', async () => {
    const C = await factory.makeUser({ gender: 'Male', horoscope: { rashi: 'Kanya', nakshatra: 'Hasta' } });
    // my_user_id points at C, but the token says A: A's horoscope must be used
    const res = await guna(tokA, { my_user_id: String(C._id), user_id: String(B._id) });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const d = res.body.data;
    assert.equal(d.available, true);
    assert.ok(Array.isArray(d.kootas) && d.kootas.length === 2);
    assert.equal(typeof d.totalPoints, 'number');
    assert.equal(typeof d.maxPoints, 'number');
    assert.equal(typeof d.percentage, 'number');
    assert.deepEqual(d.manglikStatus, { viewer: 'No', match: 'Yes' });
    assert.equal(d.breakdown.length, d.kootas.length);
    assert.deepEqual(Object.keys(d.breakdown[0]).sort(), ['koota', 'label', 'max', 'points']);
    assert.equal(typeof d.verdict, 'string');
    // Mesha -> Simha is a trine (4/4), Ashwini (Deva) vs Magha (Rakshasa) 0/4
    assert.equal(d.totalPoints, 4);
  });

  test('missing horoscope -> available:false, verdict null', async () => {
    const D = await factory.makeUser({ gender: 'Female' });
    const res = await guna(tokA, { user_id: String(D._id) });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.available, false);
    assert.equal(res.body.data.verdict, null);
    assert.deepEqual(res.body.data.breakdown, []);
  });

  test('blocked pair (either direction) -> 403 BLOCKED', async () => {
    const E = await factory.makeUser({ gender: 'Female', horoscope: { rashi: 'Tula' } });
    await factory.makeBlock(E, A);
    const res = await guna(tokA, { user_id: String(E._id) });
    assert.equal(res.status, 403);
    assert.equal(res.body.code, 'BLOCKED');
  });

  test('editProfile validates horoscope keys and values', async () => {
    const U = await factory.makeUser({ gender: 'Male' });
    const t = factory.tokenFor(U);
    assert.equal((await edit(t, { horoscope: { rashi: 'Pluto' } })).status, 400);
    assert.equal((await edit(t, { horoscope: { nakshatra: 'Sirius' } })).status, 400);
    assert.equal((await edit(t, { horoscope: '{not json' })).status, 400);
    assert.equal((await edit(t, { horoscope: { birthPlace: 'x'.repeat(200) } })).status, 400);
    const ok = await edit(t, { horoscope: JSON.stringify({ rashi: 'Mesha', nakshatra: 'Ashwini', birthTime: '06:30', birthPlace: 'Hyderabad', isAdmin: true }) });
    assert.equal(ok.status, 200, JSON.stringify(ok.body).slice(0, 300));
    const User = require('../models/User');
    const row = await User.findById(U._id).lean();
    assert.deepEqual(row.horoscope, { birthTime: '06:30', birthPlace: 'Hyderabad', rashi: 'Mesha', nakshatra: 'Ashwini' });
    // empty string clears one key, others stay
    assert.equal((await edit(t, { horoscope: { rashi: '' } })).status, 200);
    const after = await User.findById(U._id).lean();
    assert.equal(after.horoscope.rashi, '');
    assert.equal(after.horoscope.nakshatra, 'Ashwini');
  });

  test('editProfile validates manglikStatus, horoscopeRequired, profileCreatedBy, bloodGroup, languages', async () => {
    const User = require('../models/User');
    const U = await factory.makeUser({ gender: 'Female' });
    const t = factory.tokenFor(U);
    assert.equal((await edit(t, { manglikStatus: 'Maybe' })).status, 400);
    assert.equal((await edit(t, { horoscopeRequired: 'sometimes' })).status, 400);
    assert.equal((await edit(t, { profileCreatedBy: 'boss' })).status, 400);
    assert.equal((await edit(t, { bloodGroup: 'Z+' })).status, 400);
    assert.equal((await edit(t, { known_languages: [1, 2] })).status, 400);
    const res = await edit(t, {
      manglikStatus: 'Partial',
      horoscopeRequired: 'true',
      profileCreatedBy: 'Parent',
      bloodGroup: 'o+',
      mother_tongue: 'Gor Boli',
      known_languages: 'Telugu, Hindi,Telugu',
    });
    assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 300));
    const row = await User.findById(U._id).lean();
    assert.equal(row.manglikStatus, 'Partial');
    assert.equal(row.horoscopeRequired, true);
    assert.equal(row.profileCreatedBy, 'parent');
    assert.equal(row.bloodGroup, 'O+');
    assert.equal(row.motherTongue, 'Gor Boli');
    assert.deepEqual(row.knownLanguages, ['Telugu', 'Hindi']);
    assert.equal(res.body.data.profileCreatedBy, 'parent');
  });
}

if (harness.suiteReady(test, 'compatibility')) defineSuite();
