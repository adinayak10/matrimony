'use strict';
/**
 * test/icebreaker-questions.test.js (feature expansion A3/A6)
 *
 *   services/icebreakerQuestions.js   defaults fallback (<5 active), 5-min cache,
 *                                     invalidate(), idempotent seedDefaults()
 *   /api/admin/icebreaker/*           CRUD, toggle, seed-defaults, stats
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let adminToken;
  let userToken;
  let svc;
  let Q;

  const adminReq = (method, url) => harness.request()[method](url).set(factory.bearer(adminToken));

  test.before(async () => {
    await harness.startDb();
    await harness.getApp();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    svc = require('../services/icebreakerQuestions');
    Q = require('../models/IceBreakerQuestion');
    await Q.init(); // unique sparse key index
    const admin = await factory.makeUser({ role: 'admin', email: `admin_ib_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
    userToken = factory.tokenFor(await factory.makeUser());
  });
  test.after(async () => {
    await harness.stopAll();
  });

  test('models register once: IceBreakerGame.js re-uses IceBreakerQuestion', () => {
    const mongoose = require('mongoose');
    require('../models/IceBreakerGame');
    assert.equal(mongoose.model('IceBreakerQuestion'), Q);
    assert.ok(Q.schema.path('key'));
    assert.ok(Q.schema.path('order'));
    const mod = require('../models/IceBreakerGame');
    assert.equal(typeof mod.IceBreakerQuestionManager, 'function');
  });

  test('empty bank -> the 50 built-in defaults in game shape', async () => {
    svc.invalidate();
    const qs = await svc.getQuestions();
    assert.equal(qs.length, svc.DEFAULT_QUESTIONS.length);
    assert.equal(qs.length, 50);
    assert.deepEqual(Object.keys(qs[0]).sort(), ['id', 'options', 'question']);
    assert.equal(qs[0].id, 'q1');
    assert.equal(svc.currentSource(), 'defaults');
  });

  test('fewer than 5 active -> still defaults; 5 active -> DB questions after invalidate', async () => {
    await Q.create([1, 2, 3, 4].map((i) => ({ question: `Custom ${i}?`, options: ['Yes', 'No'], order: i })));
    svc.invalidate();
    assert.equal((await svc.getQuestions()).length, 50);
    await Q.create({ question: 'Custom 5?', options: ['A', 'B', 'C'], order: 5 });
    // cached for 5 minutes until invalidated
    assert.equal((await svc.getQuestions()).length, 50);
    svc.invalidate();
    const qs = await svc.getQuestions();
    assert.equal(qs.length, 5);
    assert.equal(qs[0].question, 'Custom 1?');
    assert.ok(/^[0-9a-f]{24}$/.test(qs[0].id), 'custom questions use the _id');
    assert.equal(svc.currentSource(), 'db');
    await Q.deleteMany({});
    svc.invalidate();
  });

  test('seedDefaults is idempotent and keeps admin edits', async () => {
    const first = await svc.seedDefaults();
    assert.equal(first.inserted, 50);
    assert.equal(await Q.countDocuments(), 50);
    await Q.updateOne({ key: 'q1' }, { $set: { question: 'Edited by admin?' } });
    const second = await svc.seedDefaults();
    assert.equal(second.inserted, 0);
    assert.equal(await Q.countDocuments(), 50);
    assert.equal((await Q.findOne({ key: 'q1' }).lean()).question, 'Edited by admin?');
    const qs = await svc.getQuestions();
    assert.equal(qs.length, 50);
    assert.equal(qs[0].id, 'q1');
    assert.equal(qs[0].question, 'Edited by admin?');
    const cats = new Set((await Q.find().select('category').lean()).map((q) => q.category));
    assert.ok(cats.size >= 5);
  });

  test('admin auth', async () => {
    assert.equal((await harness.request().get('/api/admin/icebreaker/questions')).status, 401);
    assert.equal((await harness.request().get('/api/admin/icebreaker/questions').set(factory.bearer(userToken))).status, 403);
  });

  test('admin list returns the whole bank unless limit is given', async () => {
    const all = await adminReq('get', '/api/admin/icebreaker/questions');
    assert.equal(all.status, 200);
    assert.equal(all.body.data.length, 50);
    assert.equal(all.body.pagination.total, 50);
    const paged = await adminReq('get', '/api/admin/icebreaker/questions?limit=10&page=2');
    assert.equal(paged.body.data.length, 10);
    assert.equal(paged.body.pagination.page, 2);
    assert.equal(paged.body.data[0].key, 'q11');
    const search = await adminReq('get', '/api/admin/icebreaker/questions?search=edited%20BY');
    assert.equal(search.body.data.length, 1);
  });

  test('admin create/update/toggle/delete invalidate the game cache', async () => {
    assert.equal((await adminReq('post', '/api/admin/icebreaker/questions').send({ question: 'One option?', options: ['Only'] })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/icebreaker/questions').send({ question: 'Seven?', options: ['1', '2', '3', '4', '5', '6', '7'] })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/icebreaker/questions').send({ question: 'Dupes?', options: ['a', 'A'] })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/icebreaker/questions').send({ question: '', options: ['a', 'b'] })).status, 400);
    assert.equal((await adminReq('post', '/api/admin/icebreaker/questions').send({ question: 'Cat?', options: ['a', 'b'], category: 'nope' })).status, 400);

    await svc.getQuestions(); // warm
    const created = await adminReq('post', '/api/admin/icebreaker/questions').send({ question: 'Tea or coffee?', options: 'Tea\nCoffee\nBoth', category: 'lifestyle' });
    assert.equal(created.status, 201, JSON.stringify(created.body));
    assert.deepEqual(created.body.data.options, ['Tea', 'Coffee', 'Both']);
    assert.equal(created.body.data.order, 51);
    const id = created.body.data._id;
    assert.ok((await svc.getQuestions()).some((q) => q.id === id), 'cache invalidated on create');

    const upd = await adminReq('put', `/api/admin/icebreaker/questions/${id}`).send({ question: 'Chai or coffee?' });
    assert.equal(upd.status, 200);
    assert.ok((await svc.getQuestions()).some((q) => q.question === 'Chai or coffee?'));

    const tog = await adminReq('post', `/api/admin/icebreaker/questions/${id}/toggle`).send({});
    assert.equal(tog.body.data.isActive, false);
    assert.ok(!(await svc.getQuestions()).some((q) => q.id === id));

    assert.equal((await adminReq('delete', `/api/admin/icebreaker/questions/${id}`)).status, 200);
    assert.equal((await adminReq('delete', `/api/admin/icebreaker/questions/${id}`)).status, 404);
    assert.equal((await adminReq('put', '/api/admin/icebreaker/questions/bad').send({})).status, 404);
  });

  test('seed-defaults route (both paths) + stats', async () => {
    await Q.deleteOne({ key: 'q2' });
    const seeded = await adminReq('post', '/api/admin/icebreaker/questions/seed-defaults').send({});
    assert.equal(seeded.status, 200);
    assert.equal(seeded.body.data.inserted, 1);
    const alias = await adminReq('post', '/api/admin/icebreaker/seed-defaults').send({});
    assert.equal(alias.body.data.inserted, 0);

    await Q.updateMany({}, { $set: { isActive: false } });
    await Q.updateMany({ key: { $in: ['q1', 'q2', 'q3'] } }, { $set: { isActive: true } });
    const stats = await adminReq('get', '/api/admin/icebreaker/stats');
    assert.equal(stats.status, 200);
    assert.equal(stats.body.data.totalQuestions, 50);
    assert.equal(stats.body.data.activeQuestions, 3);
    assert.equal(stats.body.data.usingDefaults, true);
    assert.deepEqual(Object.keys(stats.body.data.games).sort(), ['completed', 'last7Days', 'total']);
    assert.deepEqual(Object.keys(stats.body.data.live).sort(), ['activeGames', 'queuedPlayers']);
    svc.invalidate();
    assert.equal((await svc.getQuestions()).length, 50, '3 active -> defaults');
  });
}

if (harness.suiteReady(test, 'icebreaker-questions')) defineSuite();
