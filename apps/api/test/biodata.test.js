'use strict';
/**
 * test/biodata.test.js (biodata maker, Phase 2) — public, guest-render, owner
 * and shared endpoints under /api/biodata.
 *
 * PRIVATE_UPLOADS_DIR points at a scratch dir and CHROMIUM_PATH is emptied
 * BEFORE the app loads: photos land in <tmp>/private/biodata and every PDF
 * request answers 503 PDF_UNAVAILABLE (the real render is in biodata-render.test.js).
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-biodata-'));
const PRIVATE = path.join(TMP, 'private');
process.env.PRIVATE_UPLOADS_DIR = PRIVATE;
process.env.CHROMIUM_PATH = '';
process.env.BIODATA_PDF_DISABLED = '';

const harness = require('./helpers/harness');

function kitAvailable() {
  try {
    const K = require('@banjaramatch/shared/biodata');
    return !!(K && K.schema && K.registry && typeof K.renderBiodataParts === 'function' && K.registry.list().length);
  } catch (_) {
    return false;
  }
}

function defineSuite() {
  const factory = require('./helpers/factory');
  const K = require('@banjaramatch/shared/biodata');
  let jpeg;
  let BiodataDocument;
  let BiodataDocumentVersion;
  let settingsCache;
  let routes;
  const PHOTO_DIR = path.join(PRIVATE, 'biodata');
  const TMP_DIR = path.join(PRIVATE, 'biodata_tmp');
  const listDir = (d) => (fs.existsSync(d) ? fs.readdirSync(d) : []);

  async function member(overrides) {
    const user = await factory.makeUser(overrides);
    return { user, token: factory.tokenFor(user), auth: factory.bearer(factory.tokenFor(user)) };
  }
  const api = () => harness.request();
  const sample = () => K.sampleData();

  async function createDoc(m, body = {}) {
    const res = await api()
      .post('/api/biodata/documents')
      .set(m.auth)
      .send({ title: 'Asha biodata', templateId: K.DEFAULT_TEMPLATE, data: sample(), design: {}, ...body });
    assert.equal(res.status, 201, JSON.stringify(res.body));
    return res.body.data;
  }

  async function setBiodataSettings(values) {
    const Setting = require('../models/settings');
    await factory.ensureSettings();
    const $set = {};
    for (const [k, v] of Object.entries(values)) $set[`biodata.${k}`] = v;
    await Setting.updateMany({}, { $set });
    settingsCache.invalidate();
  }

  test.before(async () => {
    jpeg = await require('sharp')({ create: { width: 64, height: 80, channels: 3, background: { r: 180, g: 40, b: 70 } } }).jpeg().toBuffer();
    await harness.startDb();
    await harness.getApp();
    BiodataDocument = require('../models/BiodataDocument');
    BiodataDocumentVersion = require('../models/BiodataDocumentVersion');
    settingsCache = require('../services/settingsCache');
    routes = require('../routes/biodataRoutes');
    await BiodataDocument.init();
  });
  test.after(async () => {
    await harness.stopAll();
    fs.rmSync(TMP, { recursive: true, force: true });
  });
  test.afterEach(async () => {
    await setBiodataSettings({ enabled: true, guestDownloads: true, maxPerUser: 10, shareDefaultDays: 30, languages: ['en', 'hi'] });
  });

  /* ---------------- auth ---------------- */

  test('every member path answers 401 without a token or with an empty bearer', async () => {
    assert.ok(routes.MEMBER_PATHS.length >= 16, `member paths: ${routes.MEMBER_PATHS.length}`);
    const id = String(factory.oid());
    for (const [method, p] of routes.MEMBER_PATHS) {
      const url = `/api/biodata${p.replace(':id', id).replace(':v', '1')}`;
      const none = await api()[method](url).send({});
      assert.equal(none.status, 401, `${method} ${url}`);
      const empty = await api()[method](url).set('Authorization', 'Bearer ').send({});
      assert.equal(empty.status, 401, `${method} ${url} empty bearer`);
    }
  });

  test('public paths need no token', async () => {
    const paths = routes.PUBLIC_PATHS.map(([m, p]) => `${m} ${p}`);
    for (const want of ['get /config', 'get /templates', 'get /pages', 'get /pages/:slug', 'post /render', 'get /shared/:token']) {
      assert.ok(paths.includes(want), want);
    }
    const cfg = await api().get('/api/biodata/config');
    assert.equal(cfg.status, 200);
    assert.deepEqual(Object.keys(cfg.body.data).sort(), ['enabled', 'guestDownloads', 'languages', 'maxPerUser', 'pdf', 'shareDefaultDays']);
    assert.equal(cfg.body.data.pdf, 'unavailable');
    assert.match(cfg.headers['cache-control'], /max-age=60/);

    const t = await api().get('/api/biodata/templates');
    assert.equal(t.status, 200);
    assert.equal(t.body.data.length, K.registry.list().length);
    const row = t.body.data[0];
    for (const k of ['templateId', 'slug', 'name', 'tagline', 'description', 'categories', 'category', 'tags', 'culture', 'archetype', 'thumbnail', 'isFeatured', 'order']) {
      assert.ok(k in row, `template row has ${k}`);
    }
    assert.ok(!('isActive' in row) && !('overrides' in row), 'admin fields stay private');
    assert.ok(Array.isArray(t.body.categories) && t.body.categories.every((c) => typeof c.count === 'number'));

    const health = await api().get('/health');
    assert.equal(health.body.pdf, 'unavailable');
  });

  /* ---------------- documents ---------------- */

  test('create, read, list, update with version bump and snapshot', async () => {
    const m = await member();
    const doc = await createDoc(m);
    assert.equal(doc.version, 1);
    assert.equal(doc.photo, null);
    assert.equal(doc.share, null);
    for (const k of ['_id', 'title', 'templateId', 'design', 'data', 'status', 'version', 'createdAt', 'updatedAt', 'lastRenderedAt', 'photo', 'share']) assert.ok(k in doc, k);

    const list = await api().get('/api/biodata/documents').set(m.auth);
    assert.equal(list.status, 200);
    assert.equal(list.body.max, 10);
    assert.deepEqual(Object.keys(list.body.data[0]).sort(), ['_id', 'hasPhoto', 'shareActive', 'shareExpiresAt', 'status', 'templateId', 'title', 'updatedAt', 'version'].sort());

    const data = sample();
    data.personal.about = 'Line one of about.\nLine two of about.';
    const put = await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ data, ifVersion: 1 });
    assert.equal(put.status, 200, JSON.stringify(put.body));
    assert.equal(put.body.data.version, 2);
    assert.equal(put.body.data.data.personal.about, 'Line one of about.\nLine two of about.', 'newlines kept in textareas');

    // same content again: no new version
    const same = await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ data, ifVersion: 2 });
    assert.equal(same.body.data.version, 2);
    // status only: no version bump
    const st = await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ status: 'completed' });
    assert.equal(st.body.data.status, 'completed');
    assert.equal(st.body.data.version, 2);

    // stale ifVersion
    const stale = await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ title: 'x', ifVersion: 1 });
    assert.equal(stale.status, 409);
    assert.equal(stale.body.code, 'VERSION_CONFLICT');
    assert.equal(stale.body.version, 2);

    assert.equal(await BiodataDocumentVersion.countDocuments({ document: doc._id }), 2);
  });

  test('HTML is stripped from names; hostile strings never stored as tags', async () => {
    const m = await member();
    const data = sample();
    data.personal.fullName = '<b>Asha</b> <img src=x onerror=alert(1)>Naik';
    const doc = await createDoc(m, { data, title: '<script>alert(1)</script>My <i>biodata</i>' });
    assert.ok(!/[<>]/.test(doc.data.personal.fullName), doc.data.personal.fullName);
    assert.match(doc.data.personal.fullName, /Asha/);
    assert.ok(!/[<>]/.test(doc.title), doc.title);
  });

  test('validation codes', async () => {
    const m = await member();
    const post = (body) => api().post('/api/biodata/documents').set(m.auth).send({ data: sample(), ...body });

    const tpl = await post({ templateId: 'no-such-template' });
    assert.equal(tpl.status, 400);
    assert.equal(tpl.body.code, 'UNKNOWN_TEMPLATE');

    const key = await post({ design: { colour: 'red' } });
    assert.equal(key.status, 400);
    assert.equal(key.body.code, 'UNKNOWN_DESIGN_KEY');

    const data = sample();
    data.custom = { personal: Array.from({ length: 7 }, (_, i) => ({ id: `c${i}`, label: { en: `Field ${i}`, hi: '' }, value: 'v' })) };
    const many = await post({ data });
    assert.equal(many.status, 400);
    assert.equal(many.body.code, 'TOO_MANY_CUSTOM_FIELDS');

    const bad = sample();
    bad.personal.maritalStatus = 'it-is-complicated';
    const en = await post({ data: bad });
    assert.equal(en.status, 400);
    assert.equal(en.body.code, 'VALIDATION_ERROR');

    const notObj = await post({ data: 'nope' });
    assert.equal(notObj.status, 400);

    const big = sample();
    big.custom = {};
    big.personal.about = 'x'.repeat(600);
    big.sectionTitles = {};
    const huge = await api()
      .post('/api/biodata/documents')
      .set(m.auth)
      .send({ data: { ...big, hiddenFields: Array.from({ length: 5000 }, (_, i) => `personal.f${i}`) } });
    assert.notEqual(huge.status, 500);
  });

  test('owner isolation: another member gets 404 everywhere and sees nothing', async () => {
    const a = await member();
    const b = await member();
    const doc = await createDoc(a);
    const id = doc._id;
    const probes = [
      ['get', `/documents/${id}`],
      ['put', `/documents/${id}`],
      ['delete', `/documents/${id}`],
      ['post', `/documents/${id}/duplicate`],
      ['get', `/documents/${id}/versions`],
      ['get', `/documents/${id}/versions/1`],
      ['post', `/documents/${id}/versions/1/restore`],
      ['get', `/documents/${id}/photo`],
      ['delete', `/documents/${id}/photo`],
      ['get', `/documents/${id}/pdf`],
      ['post', `/documents/${id}/share`],
      ['post', `/documents/${id}/share/rotate`],
    ];
    for (const [method, p] of probes) {
      const res = await api()[method](`/api/biodata${p}`).set(b.auth).send({ title: 'stolen', enabled: true });
      assert.equal(res.status, 404, `${method} ${p}`);
      assert.ok(!JSON.stringify(res.body).includes('Aarav'), `${p} leaks data`);
    }
    const list = await api().get('/api/biodata/documents').set(b.auth);
    assert.equal(list.body.data.length, 0);
    const still = await BiodataDocument.findById(id).lean();
    assert.equal(still.title, 'Asha biodata');
    assert.equal(still.shareToken, undefined);
    const badId = await api().get('/api/biodata/documents/not-an-id').set(a.auth);
    assert.equal(badId.status, 404);
  });

  test('cap comes from settings: LIMIT_REACHED at biodata.maxPerUser', async () => {
    await setBiodataSettings({ maxPerUser: 2 });
    const m = await member();
    const first = await createDoc(m);
    await createDoc(m);
    const third = await api().post('/api/biodata/documents').set(m.auth).send({ data: sample() });
    assert.equal(third.status, 409);
    assert.equal(third.body.code, 'LIMIT_REACHED');
    assert.equal(third.body.max, 2);
    const dup = await api().post(`/api/biodata/documents/${first._id}/duplicate`).set(m.auth).send({});
    assert.equal(dup.status, 409);
    const cfg = await api().get('/api/biodata/config');
    assert.equal(cfg.body.data.maxPerUser, 2);
  });

  test('25 content saves keep the newest 20 versions; restore makes a new version', async () => {
    const m = await member();
    const doc = await createDoc(m);
    let version = 1;
    for (let i = 0; i < 25; i++) {
      const res = await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ title: `Draft ${i}`, ifVersion: version });
      assert.equal(res.status, 200, JSON.stringify(res.body));
      version = res.body.data.version;
    }
    assert.equal(version, 26);
    const versions = await api().get(`/api/biodata/documents/${doc._id}/versions`).set(m.auth);
    assert.equal(versions.status, 200);
    assert.equal(versions.body.data.length, 20);
    assert.equal(versions.body.data[0].version, 26);
    assert.equal(versions.body.data[19].version, 7);
    assert.equal(versions.body.current, 26);
    assert.equal((await api().get(`/api/biodata/documents/${doc._id}/versions/3`).set(m.auth)).status, 404, 'pruned');

    const v10 = await api().get(`/api/biodata/documents/${doc._id}/versions/10`).set(m.auth);
    assert.equal(v10.status, 200);
    assert.equal(v10.body.data.title, 'Draft 8');
    assert.ok(v10.body.data.data.personal);

    const restored = await api().post(`/api/biodata/documents/${doc._id}/versions/10/restore`).set(m.auth).send({});
    assert.equal(restored.status, 200);
    assert.equal(restored.body.data.title, 'Draft 8');
    assert.equal(restored.body.data.version, 27);
    const latest = await BiodataDocumentVersion.findOne({ document: doc._id }).sort({ version: -1 }).lean();
    assert.equal(latest.reason, 'restore');
    assert.equal(await BiodataDocumentVersion.countDocuments({ document: doc._id }), 20);
  });

  /* ---------------- photo ---------------- */

  test('photo upload, replace, stream, delete; non-image rejected with no file left', async () => {
    const m = await member();
    const doc = await createDoc(m);
    const before = listDir(PHOTO_DIR).length;

    const notImg = await api()
      .post(`/api/biodata/documents/${doc._id}/photo`)
      .set(m.auth)
      .attach('photo', Buffer.from('not really a jpeg'), { filename: 'x.jpg', contentType: 'image/jpeg' });
    assert.equal(notImg.status, 400);
    assert.equal(notImg.body.code, 'INVALID_IMAGE');
    assert.equal(listDir(PHOTO_DIR).length, before, 'no file left after a rejected upload');

    const pdfMime = await api()
      .post(`/api/biodata/documents/${doc._id}/photo`)
      .set(m.auth)
      .attach('photo', Buffer.from('%PDF-1.4'), { filename: 'x.pdf', contentType: 'application/pdf' });
    assert.equal(pdfMime.status, 400);
    assert.equal(listDir(PHOTO_DIR).length, before);

    const up = await api().post(`/api/biodata/documents/${doc._id}/photo`).set(m.auth).attach('photo', jpeg, { filename: 'me.jpg', contentType: 'image/jpeg' });
    assert.equal(up.status, 200, JSON.stringify(up.body));
    assert.equal(up.body.data.photo.width, 64);
    assert.match(up.body.data.photo.url, new RegExp(`^/api/biodata/documents/${doc._id}/photo`));
    const stored = await BiodataDocument.findById(doc._id).lean();
    assert.match(stored.photo.file, /^[0-9a-f-]+\.jpg$/, 'basename only');
    assert.ok(fs.existsSync(path.join(PHOTO_DIR, stored.photo.file)));
    assert.ok(!fs.existsSync(path.join(process.cwd(), 'uploads', stored.photo.file)), 'never under uploads/');

    const stream = await api().get(`/api/biodata/documents/${doc._id}/photo`).set(m.auth).buffer(true);
    assert.equal(stream.status, 200);
    assert.equal(stream.headers['content-type'], 'image/jpeg');
    assert.equal(stream.headers['cache-control'], 'private, no-store');
    assert.equal(stream.headers['x-content-type-options'], 'nosniff');
    assert.match(stream.headers['x-robots-tag'], /noindex/);

    const replace = await api().post(`/api/biodata/documents/${doc._id}/photo`).set(m.auth).attach('photo', jpeg, { filename: 'me2.jpg', contentType: 'image/jpeg' });
    assert.equal(replace.status, 200);
    const replaced = await BiodataDocument.findById(doc._id).lean();
    assert.notEqual(replaced.photo.file, stored.photo.file);
    assert.ok(!fs.existsSync(path.join(PHOTO_DIR, stored.photo.file)), 'old photo unlinked');
    assert.ok(fs.existsSync(path.join(PHOTO_DIR, replaced.photo.file)));

    const del = await api().delete(`/api/biodata/documents/${doc._id}/photo`).set(m.auth);
    assert.equal(del.status, 200);
    assert.equal(del.body.data.photo, null);
    assert.ok(!fs.existsSync(path.join(PHOTO_DIR, replaced.photo.file)));
    assert.equal((await api().get(`/api/biodata/documents/${doc._id}/photo`).set(m.auth)).status, 404);
    assert.equal(listDir(PHOTO_DIR).length, before);
  });

  test('duplicate copies data and the photo file, share off; delete removes versions and photo', async () => {
    const m = await member();
    const doc = await createDoc(m);
    await api().post(`/api/biodata/documents/${doc._id}/photo`).set(m.auth).attach('photo', jpeg, { filename: 'me.jpg', contentType: 'image/jpeg' });
    await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true, days: 7 });
    const original = await BiodataDocument.findById(doc._id).lean();

    const dup = await api().post(`/api/biodata/documents/${doc._id}/duplicate`).set(m.auth).send({});
    assert.equal(dup.status, 201, JSON.stringify(dup.body));
    assert.equal(dup.body.data.title, 'Asha biodata (copy)');
    assert.equal(dup.body.data.share, null);
    assert.equal(dup.body.data.version, 1);
    assert.deepEqual(dup.body.data.data, original.data);
    const copy = await BiodataDocument.findById(dup.body.data._id).lean();
    assert.notEqual(copy.photo.file, original.photo.file);
    assert.ok(fs.existsSync(path.join(PHOTO_DIR, copy.photo.file)));
    assert.equal((await BiodataDocumentVersion.findOne({ document: copy._id }).lean()).reason, 'duplicate');

    const del = await api().delete(`/api/biodata/documents/${doc._id}`).set(m.auth);
    assert.equal(del.status, 200);
    assert.equal(await BiodataDocument.countDocuments({ _id: doc._id }), 0);
    assert.equal(await BiodataDocumentVersion.countDocuments({ document: doc._id }), 0);
    assert.ok(!fs.existsSync(path.join(PHOTO_DIR, original.photo.file)));
    assert.ok(fs.existsSync(path.join(PHOTO_DIR, copy.photo.file)), 'the copy keeps its own file');
  });

  /* ---------------- pdf / guest render ---------------- */

  function renderReq(payload, { auth, photo } = {}) {
    let r = api().post('/api/biodata/render');
    if (auth) r = r.set(auth);
    r = r.field('payload', typeof payload === 'string' ? payload : JSON.stringify(payload));
    if (photo) r = r.attach('photo', photo, { filename: 'p.jpg', contentType: 'image/jpeg' });
    return r;
  }

  test('guest render: 503 PDF_UNAVAILABLE without Chromium, validation first, temp dir empty afterwards', async () => {
    const payload = { title: 'Guest', templateId: K.DEFAULT_TEMPLATE, design: {}, data: sample() };
    const res = await renderReq(payload, { photo: jpeg });
    assert.equal(res.status, 503);
    assert.equal(res.body.code, 'PDF_UNAVAILABLE');
    assert.deepEqual(listDir(TMP_DIR), [], 'temp upload removed');

    const badJson = await renderReq('{not json', { photo: jpeg });
    assert.equal(badJson.status, 400);
    assert.equal(badJson.body.code, 'VALIDATION_ERROR');
    const unknown = await renderReq({ ...payload, templateId: 'nope' }, { photo: jpeg });
    assert.equal(unknown.body.code, 'UNKNOWN_TEMPLATE');
    const designKey = await renderReq({ ...payload, design: { evil: 1 } });
    assert.equal(designKey.body.code, 'UNKNOWN_DESIGN_KEY');
    const missing = await api().post('/api/biodata/render').field('x', '1');
    assert.equal(missing.status, 400);
    const tooBig = await renderReq(JSON.stringify(payload) + ' '.repeat(300 * 1024));
    assert.equal(tooBig.status, 413);
    assert.deepEqual(listDir(TMP_DIR), [], 'temp dir empty after every failure');

    // BIODATA_PDF_DISABLED wins even with a real file as CHROMIUM_PATH
    process.env.CHROMIUM_PATH = process.execPath;
    process.env.BIODATA_PDF_DISABLED = '1';
    try {
      const off = await renderReq(payload);
      assert.equal(off.status, 503);
      assert.equal(off.body.code, 'PDF_UNAVAILABLE');
    } finally {
      process.env.CHROMIUM_PATH = '';
      process.env.BIODATA_PDF_DISABLED = '';
    }

    const m = await member();
    const doc = await createDoc(m);
    const owner = await api().get(`/api/biodata/documents/${doc._id}/pdf`).set(m.auth);
    assert.equal(owner.status, 503);
    assert.equal(owner.body.code, 'PDF_UNAVAILABLE');
    const ownerPost = await api().post(`/api/biodata/documents/${doc._id}/pdf`).set(m.auth).send({});
    assert.equal(ownerPost.status, 503);
  });

  test('guestDownloads off: guests 403 (nothing uploaded), members still pass the gate', async () => {
    await setBiodataSettings({ guestDownloads: false });
    const payload = { title: 'Guest', templateId: K.DEFAULT_TEMPLATE, design: {}, data: sample() };
    const guest = await renderReq(payload, { photo: jpeg });
    assert.equal(guest.status, 403);
    assert.equal(guest.body.code, 'GUEST_DOWNLOADS_OFF');
    assert.deepEqual(listDir(TMP_DIR), []);
    const m = await member();
    const asMember = await renderReq(payload, { auth: m.auth });
    assert.equal(asMember.status, 503, 'member reaches the renderer (no Chromium here)');
  });

  test('biodata.enabled=false: 503 FEATURE_DISABLED except config and pages', async () => {
    await setBiodataSettings({ enabled: false });
    const m = await member();
    assert.equal((await api().get('/api/biodata/config')).body.data.enabled, false);
    assert.equal((await api().get('/api/biodata/pages')).status, 200);
    const t = await api().get('/api/biodata/templates');
    assert.equal(t.status, 503);
    assert.equal(t.body.code, 'FEATURE_DISABLED');
    assert.equal((await api().get('/api/biodata/documents').set(m.auth)).body.code, 'FEATURE_DISABLED');
    assert.equal((await renderReq({ data: sample() })).body.code, 'FEATURE_DISABLED');
    assert.equal((await api().get('/api/biodata/documents')).status, 401, 'auth still first');
  });

  /* ---------------- sharing ---------------- */

  test('share on / view / rotate / off / expired / malformed; contact hidden unless shareContact', async () => {
    const m = await member();
    const doc = await createDoc(m);
    await api().post(`/api/biodata/documents/${doc._id}/photo`).set(m.auth).attach('photo', jpeg, { filename: 'me.jpg', contentType: 'image/jpeg' });

    const badDays = await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true, days: 5 });
    assert.equal(badDays.status, 400);
    const rotateOff = await api().post(`/api/biodata/documents/${doc._id}/share/rotate`).set(m.auth).send({});
    assert.equal(rotateOff.status, 409);

    const on = await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true, days: 30 });
    assert.equal(on.status, 200, JSON.stringify(on.body));
    const token = on.body.data.share.token;
    assert.match(token, /^[a-f0-9]{48}$/);
    assert.equal(on.body.data.shareUrl, `https://www.banjaramatch.com/biodata-maker/s/${token}`);
    const days = (new Date(on.body.data.share.expiresAt) - Date.now()) / 86400000;
    assert.ok(days > 29.9 && days < 30.1, `expires in ${days} days`);

    const view = await api().get(`/api/biodata/shared/${token}`);
    assert.equal(view.status, 200);
    assert.equal(view.headers['x-robots-tag'], 'noindex, nofollow');
    assert.equal(view.headers['cache-control'], 'no-store');
    assert.deepEqual(Object.keys(view.body.data).sort(), ['css', 'design', 'expiresAt', 'fontFamilies', 'html', 'templateId', 'title']);
    assert.ok(view.body.data.html.length > 100);
    assert.ok(view.body.data.html.includes('Aarav'), 'name is shown');
    assert.ok(!view.body.data.html.includes('98765'), 'phone hidden by default');
    assert.ok(!view.body.data.html.includes('rathod.family@example.com'), 'email hidden by default');
    assert.ok(view.body.data.html.includes(`/api/biodata/shared/${token}/photo`), 'photo through the token route');
    assert.equal(view.body.data.data, undefined, 'raw data is never returned');

    const photoRes = await api().get(`/api/biodata/shared/${token}/photo`).buffer(true);
    assert.equal(photoRes.status, 200);
    assert.equal(photoRes.headers['cache-control'], 'private, no-store');
    assert.equal(photoRes.headers['x-robots-tag'], 'noindex, nofollow');
    const sharedPdf = await api().get(`/api/biodata/shared/${token}/pdf`);
    assert.equal(sharedPdf.status, 503);

    // views counted (fire-and-forget)
    for (let i = 0; i < 40 && !((await BiodataDocument.findById(doc._id).lean()).shareViews >= 1); i++) await new Promise((r) => setTimeout(r, 25));
    assert.ok((await BiodataDocument.findById(doc._id).lean()).shareViews >= 1);

    // shareContact shows the contact section
    await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ design: { shareContact: true } });
    const withContact = await api().get(`/api/biodata/shared/${token}`);
    assert.ok(withContact.body.data.html.includes('98765'), 'phone shown when shareContact');

    // enabling again keeps the token
    const again = await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true, days: 90 });
    assert.equal(again.body.data.share.token, token);

    const rotated = await api().post(`/api/biodata/documents/${doc._id}/share/rotate`).set(m.auth).send({});
    assert.equal(rotated.status, 200);
    const token2 = rotated.body.data.share.token;
    assert.notEqual(token2, token);
    const old = await api().get(`/api/biodata/shared/${token}`);
    assert.equal(old.status, 404);
    assert.equal((await api().get(`/api/biodata/shared/${token2}`)).status, 200);

    // the owner view carries the share
    const ownerView = await api().get(`/api/biodata/documents/${doc._id}`).set(m.auth);
    assert.equal(ownerView.body.data.share.token, token2);

    // expired
    await BiodataDocument.updateOne({ _id: doc._id }, { $set: { shareExpiresAt: new Date(Date.now() - 1000) } });
    const expired = await api().get(`/api/biodata/shared/${token2}`);
    const unknown = await api().get(`/api/biodata/shared/${'0'.repeat(48)}`);
    const malformed = await api().get('/api/biodata/shared/NOT-A-TOKEN');
    const upper = await api().get(`/api/biodata/shared/${token2.toUpperCase()}`);
    for (const r of [expired, unknown, malformed, upper]) {
      assert.equal(r.status, 404);
      assert.equal(r.body.message, expired.body.message, 'one message for every miss');
      assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow');
    }
    assert.equal((await api().get(`/api/biodata/shared/${token2}/photo`)).status, 404);

    // re-enable after expiry issues a fresh token
    const fresh = await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true });
    assert.notEqual(fresh.body.data.share.token, token2);
    const daysDefault = (new Date(fresh.body.data.share.expiresAt) - Date.now()) / 86400000;
    assert.ok(daysDefault > 29.9 && daysDefault < 30.1, 'default days from settings');

    const off = await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: false });
    assert.equal(off.body.data.share, null);
    assert.equal((await api().get(`/api/biodata/shared/${fresh.body.data.share.token}`)).status, 404);
    const row = await BiodataDocument.findById(doc._id).lean();
    assert.equal(row.shareToken, undefined);
  });

  test('share prune job clears expired tokens and stale temp files', async () => {
    const m = await member();
    const doc = await createDoc(m);
    await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true, days: 7 });
    await BiodataDocument.updateOne({ _id: doc._id }, { $set: { shareExpiresAt: new Date(Date.now() - 60000) } });
    fs.mkdirSync(TMP_DIR, { recursive: true });
    const stale = path.join(TMP_DIR, 'stale.bin');
    fs.writeFileSync(stale, 'x');
    const old = new Date(Date.now() - 2 * 3600 * 1000);
    fs.utimesSync(stale, old, old);
    const prune = require('../services/jobs/biodataSharePrune');
    const r = await prune();
    assert.ok(r.expiredShares >= 1);
    assert.equal(r.tmpFiles, 1);
    assert.equal((await BiodataDocument.findById(doc._id).lean()).shareToken, undefined);
    assert.ok(!fs.existsSync(stale));
  });

  /* ---------------- cascade + logs ---------------- */

  test('account cascade removes biodata rows and private photo files', async () => {
    const m = await member();
    const doc = await createDoc(m);
    await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ title: 'Second' });
    await api().post(`/api/biodata/documents/${doc._id}/photo`).set(m.auth).attach('photo', jpeg, { filename: 'me.jpg', contentType: 'image/jpeg' });
    const file = (await BiodataDocument.findById(doc._id).lean()).photo.file;
    assert.ok(fs.existsSync(path.join(PHOTO_DIR, file)));
    const { cascadeDeleteUser } = require('../services/userCascade');
    const dry = await cascadeDeleteUser(m.user._id, { dryRun: true });
    assert.equal(dry.counts.biodataDocuments, 1);
    assert.equal(dry.counts.biodataVersions, 2);
    const r = await cascadeDeleteUser(m.user._id);
    assert.equal(r.counts.biodataDocuments, 1);
    assert.equal(r.counts.biodataVersions, 2);
    assert.equal(await BiodataDocument.countDocuments({ user: m.user._id }), 0);
    assert.equal(await BiodataDocumentVersion.countDocuments({ user: m.user._id }), 0);
    assert.ok(!fs.existsSync(path.join(PHOTO_DIR, file)));
  });

  test('a forced 500 logs neither the share token nor biodata content', async () => {
    const m = await member();
    const data = sample();
    data.personal.fullName = 'Zorawar Secretname';
    const doc = await createDoc(m, { data });
    const on = await api().post(`/api/biodata/documents/${doc._id}/share`).set(m.auth).send({ enabled: true, days: 7 });
    const token = on.body.data.share.token;

    const lines = [];
    const orig = { error: console.error, warn: console.warn, log: console.log };
    const capture = (...args) => lines.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a, Object.getOwnPropertyNames(a || {})))).join(' '));
    const realFind = BiodataDocument.findOneAndUpdate;
    BiodataDocument.findOneAndUpdate = () => {
      throw new Error(`E11000 duplicate key error dup key: { shareToken: "${token}" } value "Zorawar Secretname" ${token}`);
    };
    console.error = capture;
    console.warn = capture;
    console.log = capture;
    let res;
    let res2;
    try {
      const changed = sample();
      changed.personal.fullName = 'Zorawar Secretname Two';
      res = await api().put(`/api/biodata/documents/${doc._id}`).set(m.auth).send({ data: changed });
      res2 = await api().post(`/api/biodata/documents/${doc._id}/share/rotate`).set(m.auth).send({});
    } finally {
      BiodataDocument.findOneAndUpdate = realFind;
      console.error = orig.error;
      console.warn = orig.warn;
      console.log = orig.log;
    }
    assert.equal(res.status, 500);
    assert.equal(res2.status, 500);
    assert.ok(!JSON.stringify(res.body).includes('Secretname'));
    assert.ok(lines.length >= 2, 'the failures were logged');
    const all = lines.join('\n');
    assert.ok(!all.includes(token), 'token not logged');
    assert.ok(!all.includes('Secretname'), 'data not logged');
  });
}

if (harness.suiteReady(test, 'biodata')) {
  if (kitAvailable()) defineSuite();
  else test.skip('biodata: @banjaramatch/shared/biodata kit not complete yet', () => {});
}
