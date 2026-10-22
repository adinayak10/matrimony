'use strict';
/**
 * test/preference-fit.test.js — POST /api/comparePreferencesFit ("Her Partner
 * Preference" on a profile): an unset preference accepts everyone, lifestyle
 * rows read the real smoke/drink/motherTongue fields, heights are ft/in.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');

  async function fit(viewer, owner) {
    const res = await harness
      .request()
      .post('/api/comparePreferencesFit')
      .set(factory.bearer(factory.tokenFor(viewer)))
      .send({ user_id: String(owner._id) });
    assert.equal(res.status, 200, JSON.stringify(res.body).slice(0, 200));
    return Object.fromEntries(res.body.matchList.map((r) => [r.label, r]));
  }

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('no preference set -> every row fits and shows Any', async () => {
    const viewer = await factory.makeUser({ gender: 'Male', height: 170, smoke: 'No', drink: 'No', diet: 'Vegetarian' });
    const owner = await factory.makeUser({ gender: 'Female' });
    const rows = await fit(viewer, owner);
    for (const label of ['Caste', 'Gotra', 'Qualification', 'Profession', 'Income', 'Language', 'Smoking', 'Drinking', 'Diet']) {
      assert.equal(rows[label].isFit, true, `${label} should fit when unset`);
      assert.equal(rows[label].expectedValue, 'Any', `${label} shows Any`);
    }
  });

  test('set preferences compare the real smoke/drink/motherTongue fields; heights in ft/in', async () => {
    const viewer = await factory.makeUser({ gender: 'Male', height: 170, smoke: 'Yes', drink: 'No', motherTongue: 'Lambadi' });
    const owner = await factory.makeUser({
      gender: 'Female',
      preferences: { smoke: 'No', drink: 'No', language: 'lambadi', height_range: { min: 160, max: 180 } },
    });
    const rows = await fit(viewer, owner);
    assert.equal(rows.Smoking.isFit, false);
    assert.equal(rows.Smoking.viewerValue, 'Yes');
    assert.equal(rows.Drinking.isFit, true);
    assert.equal(rows.Language.isFit, true, 'motherTongue matches case-insensitively');
    assert.equal(rows.Height.isFit, true);
    assert.equal(rows.Height.expectedValue, `5'3" to 5'11"`);
    assert.equal(rows.Height.viewerValue, `5'7"`);
  });
}

if (harness.suiteReady(test, 'preference-fit')) defineSuite();
