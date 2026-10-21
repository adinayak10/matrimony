'use strict';
/**
 * test/saved-search.test.js (feature expansion A2/A6) — saved searches CRUD,
 * ownership, the 10-per-member cap, runSavedSearch == searchProfiles, and
 * the saved-search alert job.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let viewer;
  let tok;
  let other;
  let otherTok;

  const call = (t, path, body) => harness.request().post(`/api${path}`).set(factory.bearer(t)).send(body || {});

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    viewer = await factory.makeUser({ gender: 'Male', full_name: 'Searcher' });
    tok = factory.tokenFor(viewer);
    other = await factory.makeUser({ gender: 'Male', full_name: 'Other Searcher' });
    otherTok = factory.tokenFor(other);
    // candidates
    await factory.makeUser({ gender: 'Female', full_name: 'Tall Divorced', height: 175, maritalStatus: 'Divorced' });
    await factory.makeUser({ gender: 'Female', full_name: 'Tall Single', height: 176, maritalStatus: 'Single' });
    await factory.makeUser({ gender: 'Female', full_name: 'Short Single', height: 150, maritalStatus: 'Single' });
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('create validates the name and sanitizes filters', async () => {
    assert.equal((await call(tok, '/createSavedSearch', { filters: {} })).status, 400);
    assert.equal((await call(tok, '/createSavedSearch', { name: 'x'.repeat(61) })).status, 400);
    assert.equal((await call(tok, '/createSavedSearch', { name: 'Bad', filters: 'nope' })).status, 400);
    const res = await call(tok, '/createSavedSearch', {
      name: '  Tall   ones ',
      alertEnabled: true,
      filters: {
        height_range: { min: 170, max: 190 },
        caste: ['not-an-id', String(factory.oid())],
        marital_status: ['Single', 'Alien'],
        isVerify: 'true',
        $where: 'sleep(1000)',
        bogus: 1,
      },
    });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    const row = res.body.data;
    assert.equal(row.name, 'Tall ones');
    assert.equal(row.alertEnabled, true);
    assert.deepEqual(row.filters.height_range, { min: 170, max: 190 });
    assert.equal(row.filters.caste.length, 1);
    assert.deepEqual(row.filters.marital_status, ['Single']);
    assert.equal(row.filters.isVerify, true);
    assert.equal(row.filters.bogus, undefined);
    assert.equal(row.filters.$where, undefined);
  });

  test('fetch lists only my searches; others get 404 on mine', async () => {
    const mine = await call(tok, '/fetchSavedSearches');
    assert.equal(mine.status, 200);
    assert.ok(mine.body.data.length >= 1);
    const id = mine.body.data[0]._id;
    assert.equal((await call(otherTok, '/fetchSavedSearches')).body.data.length, 0);
    assert.equal((await call(otherTok, '/updateSavedSearch', { id, name: 'stolen' })).status, 404);
    assert.equal((await call(otherTok, '/deleteSavedSearch', { id })).status, 404);
    assert.equal((await call(otherTok, '/runSavedSearch', { id })).status, 404);
    assert.equal((await call(tok, '/updateSavedSearch', {})).status, 400);
    assert.equal((await call(tok, '/runSavedSearch', { id: 'x' })).status, 400);
  });

  test('at most 10 saved searches per member', async () => {
    const u = await factory.makeUser({ gender: 'Male' });
    const t = factory.tokenFor(u);
    for (let i = 0; i < 10; i++) {
      assert.equal((await call(t, '/createSavedSearch', { name: `s${i}` })).status, 200);
    }
    const eleventh = await call(t, '/createSavedSearch', { name: 's10' });
    assert.equal(eleventh.status, 409);
    assert.equal(eleventh.body.code, 'LIMIT_REACHED');
  });

  test('runSavedSearch returns the same profiles as searchProfiles, with matchPercent', async () => {
    const created = await call(tok, '/createSavedSearch', { name: 'Tall singles', filters: { height_range: { min: 170, max: 190 }, marital_status: ['Single'] } });
    const id = created.body.data._id;
    const run = await call(tok, '/runSavedSearch', { id, page: 1, limit: 20 });
    assert.equal(run.status, 200);
    assert.equal(run.body.page, 1);
    assert.equal(run.body.limit, 20);
    const names = run.body.data.map((u) => u.full_name);
    assert.deepEqual(names, ['Tall Single']);
    assert.equal(run.body.total, 1);
    assert.ok('matchPercent' in run.body.data[0]);

    const direct = await call(tok, '/searchProfiles', { filters: { height_range: { min: 170, max: 190 }, marital_status: ['Single'] }, page: 1, limit: 20 });
    assert.equal(direct.status, 200);
    assert.deepEqual(direct.body.data.map((u) => String(u._id)), run.body.data.map((u) => String(u._id)));
    assert.equal(direct.body.total, run.body.total);
    assert.ok('matchPercent' in direct.body.data[0]);
  });

  test('update renames, swaps filters and toggles alerts; delete removes', async () => {
    const created = await call(tok, '/createSavedSearch', { name: 'Temp' });
    const id = created.body.data._id;
    assert.equal(created.body.data.alertEnabled, false);
    const upd = await call(tok, '/updateSavedSearch', { id, name: 'Renamed', alertEnabled: true, filters: { recentlyActive: true } });
    assert.equal(upd.status, 200);
    assert.equal(upd.body.data.name, 'Renamed');
    assert.equal(upd.body.data.alertEnabled, true);
    assert.ok(upd.body.data.lastNotifiedAt, 'enabling alerts starts the clock');
    assert.deepEqual(upd.body.data.filters, { recentlyActive: true });
    assert.equal((await call(tok, '/updateSavedSearch', { id, name: '' })).status, 400);
    assert.equal((await call(tok, '/deleteSavedSearch', { id })).status, 200);
    assert.equal((await call(tok, '/deleteSavedSearch', { id })).status, 404);
  });

  test('alert job: one Notification per search per 24 h for profiles created since the last alert', async () => {
    const SavedSearch = require('../models/SavedSearch');
    const Notification = require('../models/Notification');
    const runAlerts = require('../services/jobs/savedSearchAlerts');
    const u = await factory.makeUser({ gender: 'Male', full_name: 'Alert Owner' });
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000);
    const s = await SavedSearch.create({ user: u._id, name: 'Very tall', filters: { height_range: { min: 185, max: 200 } }, alertEnabled: true, lastNotifiedAt: twoDaysAgo });
    const off = await SavedSearch.create({ user: u._id, name: 'Off', filters: { height_range: { min: 185, max: 200 } }, alertEnabled: false, lastNotifiedAt: twoDaysAgo });

    let r = await runAlerts();
    assert.equal(await Notification.countDocuments({ toUser: u._id, type: 'profile_search_alert' }), 0, 'nothing new yet');

    await factory.makeUser({ gender: 'Female', full_name: 'Very Tall New', height: 190 });
    await factory.makeUser({ gender: 'Male', full_name: 'Wrong Gender', height: 190 });
    r = await runAlerts();
    assert.ok(r.notified >= 1);
    const notes = await Notification.find({ toUser: u._id, type: 'profile_search_alert' }).lean();
    assert.equal(notes.length, 1);
    assert.equal(notes[0].data.savedSearchId, String(s._id));
    assert.equal(notes[0].data.count, 1);
    assert.ok((await SavedSearch.findById(s._id).lean()).lastNotifiedAt > twoDaysAgo);
    assert.equal(String((await SavedSearch.findById(off._id).lean()).lastNotifiedAt), String(twoDaysAgo));

    await factory.makeUser({ gender: 'Female', full_name: 'Another Tall', height: 188 });
    await runAlerts();
    assert.equal(await Notification.countDocuments({ toUser: u._id, type: 'profile_search_alert' }), 1, 'once per 24 h');
  });

  test('account deletion removes saved searches', async () => {
    const SavedSearch = require('../models/SavedSearch');
    const { cascadeDeleteUser } = require('../services/userCascade');
    const u = await factory.makeUser({ gender: 'Male' });
    await call(factory.tokenFor(u), '/createSavedSearch', { name: 'mine' });
    const r = await cascadeDeleteUser(u._id, { unlinkFiles: false });
    assert.equal(r.counts.savedSearches, 1);
    assert.equal(await SavedSearch.countDocuments({ user: u._id }), 0);
  });
}

if (harness.suiteReady(test, 'saved-search')) defineSuite();
