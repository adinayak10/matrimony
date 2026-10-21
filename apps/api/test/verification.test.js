'use strict';
/**
 * test/verification.test.js (feature expansion A1/A6) — profile verification:
 * member submit/status, private file storage, admin queue (list, stats, file
 * stream, approve, reject, delete files), the retention purge job, the user
 * cascade, the admin verify toggle, and POST /api/uploadFile (chat images).
 *
 * PRIVATE_UPLOADS_DIR and the cwd (multer's relative uploads/ dir) point at a
 * scratch directory BEFORE the app loads, so nothing touches the repo.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'bm-verify-'));
const PRIVATE = path.join(TMP, 'private');
const CWD = path.join(TMP, 'cwd');
fs.mkdirSync(CWD, { recursive: true });
process.env.PRIVATE_UPLOADS_DIR = PRIVATE;
process.chdir(CWD);

const harness = require('./helpers/harness');

function defineSuite() {
  const factory = require('./helpers/factory');
  let jpeg;
  let adminToken;
  let Verification;
  let Notification;
  let User;
  const VDIR = path.join(PRIVATE, 'verification');

  const listFiles = () => (fs.existsSync(VDIR) ? fs.readdirSync(VDIR) : []);

  function submit(token, { documents = 1, selfie = true, fields = {} } = {}) {
    let req = harness.request().post('/api/profileVerification').set(factory.bearer(token));
    const f = { full_name: 'Asha Naik', document_type: 'Aadhaar Card', ...fields };
    for (const [k, v] of Object.entries(f)) if (v !== undefined) req = req.field(k, v);
    for (let i = 0; i < documents; i++) req = req.attach('document', jpeg, { filename: `doc${i}.jpg`, contentType: 'image/jpeg' });
    if (selfie) req = req.attach('selfie', jpeg, { filename: 'selfie.jpg', contentType: 'image/jpeg' });
    return req;
  }
  const status = (token) => harness.request().post('/api/fetchVerificationStatus').set(factory.bearer(token)).send({});
  const adminGet = (url) => harness.request().get(url).set(factory.bearer(adminToken));
  const adminPost = (url, body) => harness.request().post(url).set(factory.bearer(adminToken)).send(body || {});

  test.before(async () => {
    jpeg = await require('sharp')({ create: { width: 48, height: 48, channels: 3, background: { r: 200, g: 120, b: 60 } } }).jpeg().toBuffer();
    await harness.startDb();
    await harness.getApp();
    Verification = require('../models/Verification');
    Notification = require('../models/Notification');
    User = require('../models/User');
    await Verification.init();
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../config/env');
    const admin = await factory.makeUser({ role: 'admin', email: `admin_v_${Date.now()}@test.local` });
    adminToken = jwt.sign({ _id: String(admin._id), email: admin.email, role: 'admin', tv: 0, aud: 'admin' }, JWT_SECRET, { algorithm: 'HS256', expiresIn: '1h' });
  });
  test.after(async () => {
    await harness.stopAll();
    process.chdir(os.tmpdir());
    fs.rmSync(TMP, { recursive: true, force: true });
  });

  test('status of an unverified member: canSubmit, no request yet', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const res = await status(factory.tokenFor(u));
    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_verified, 0);
    assert.equal(res.body.data.canSubmit, true);
    assert.equal(res.body.data.latest, null);
    assert.equal(res.body.data.verifiedAt, null);
  });

  test('bad submissions are 400 and leave no files behind', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const tok = factory.tokenFor(u);
    const before = listFiles().length;
    assert.equal((await submit(tok, { selfie: false })).status, 400);
    assert.equal((await submit(tok, { documents: 0 })).status, 400);
    assert.equal((await submit(tok, { fields: { full_name: '' } })).status, 400);
    assert.equal((await submit(tok, { fields: { document_type: '' } })).status, 400);
    const bogus = await harness.request().post('/api/profileVerification').set(factory.bearer(tok))
      .field('full_name', 'Asha').field('document_type', 'PAN')
      .attach('document', Buffer.from('not an image at all'), { filename: 'x.jpg', contentType: 'image/jpeg' })
      .attach('selfie', jpeg, { filename: 's.jpg', contentType: 'image/jpeg' });
    assert.equal(bogus.status, 400);
    assert.equal(bogus.body.code, 'INVALID_IMAGE');
    const three = await submit(tok, { documents: 3 });
    assert.equal(three.status, 400);
    assert.equal(listFiles().length, before);
    assert.equal(await Verification.countDocuments({ user: u._id }), 0);
  });

  test('a spoofed user_id is 403 and the upload is discarded', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const other = await factory.makeUser();
    const before = listFiles().length;
    const res = await submit(factory.tokenFor(u), { fields: { user_id: String(other._id) } });
    assert.equal(res.status, 403);
    assert.equal(listFiles().length, before);
  });

  test('valid submit -> pending; files only in the private dir; second submit 409; verified member 400', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const tok = factory.tokenFor(u);
    const before = listFiles().length;
    const res = await submit(tok, { documents: 2, fields: { user_id: String(u._id) } });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'pending');
    assert.ok(res.body.data._id && res.body.data.submittedAt);
    assert.equal(listFiles().length, before + 3);
    const row = await Verification.findById(res.body.data._id).lean();
    assert.equal(row.documentFiles.length, 2);
    for (const name of [...row.documentFiles, row.selfieFile]) {
      assert.match(name, /^[0-9a-f-]{36}\.jpg$/);
      assert.ok(fs.existsSync(path.join(VDIR, name)));
    }
    assert.ok(!fs.existsSync(path.join(CWD, 'uploads', 'profile_images', row.selfieFile)));

    const again = await submit(tok);
    assert.equal(again.status, 409);
    assert.equal(again.body.code, 'PENDING_EXISTS');

    const st = await status(tok);
    assert.equal(st.body.data.canSubmit, false);
    assert.equal(st.body.data.latest.status, 'pending');
    assert.equal(st.body.data.latest.documentType, 'Aadhaar Card');

    const verified = await factory.makeUser({ is_verified: 1 });
    const v = await submit(factory.tokenFor(verified));
    assert.equal(v.status, 400);
    assert.equal(v.body.code, 'ALREADY_VERIFIED');
  });

  test('admin routes need an admin token', async () => {
    const u = await factory.makeUser();
    assert.equal((await harness.request().get('/api/admin/verifications')).status, 401);
    const asUser = await harness.request().get('/api/admin/verifications').set(factory.bearer(factory.tokenFor(u)));
    assert.ok([401, 403].includes(asUser.status));
  });

  test('admin list/stats/detail/file stream; rows never expose stored names', async () => {
    const u = await factory.makeUser({ is_verified: 0, full_name: 'Queue Person' });
    const sub = await submit(factory.tokenFor(u), { fields: { full_name: 'Queue Person' } });
    const id = sub.body.data._id;

    const list = await adminGet('/api/admin/verifications?status=pending&search=Queue');
    assert.equal(list.status, 200);
    assert.ok(list.body.pagination.total >= 1);
    const row = list.body.data.find((r) => String(r._id) === String(id));
    assert.ok(row, 'submitted row is listed');
    assert.deepEqual(row.files, ['selfie', 'document-0']);
    assert.equal(row.user.full_name, 'Queue Person');
    assert.ok(!JSON.stringify(list.body).includes('.jpg'), 'no stored file names');

    const byUser = await adminGet(`/api/admin/verifications?userId=${u._id}&limit=20`);
    assert.equal(byUser.status, 200);
    assert.equal(byUser.body.data.length, 1);
    assert.equal(String(byUser.body.data[0].user._id), String(u._id));
    assert.equal((await adminGet('/api/admin/verifications?userId=nope')).status, 400);

    const stats = await adminGet('/api/admin/verifications/stats');
    assert.equal(stats.status, 200);
    assert.ok(stats.body.data.pending >= 1);
    assert.equal(typeof stats.body.data.verifiedUsers, 'number');

    const detail = await adminGet(`/api/admin/verifications/${id}`);
    assert.equal(detail.status, 200);
    assert.ok(Array.isArray(detail.body.data.history));

    const file = await adminGet(`/api/admin/verifications/${id}/files/selfie`).buffer(true);
    assert.equal(file.status, 200);
    assert.match(file.headers['content-type'], /image\/jpeg/);
    assert.equal(file.headers['cache-control'], 'private, no-store');
    assert.ok(file.body.length > 100);
    assert.equal((await adminGet(`/api/admin/verifications/${id}/files/document-0`)).status, 200);
    assert.equal((await adminGet(`/api/admin/verifications/${id}/files/document-1`)).status, 404);
    assert.equal((await adminGet(`/api/admin/verifications/${id}/files/..%2F..%2Fetc`)).status, 404);
    assert.equal((await adminGet('/api/admin/verifications/not-an-id')).status, 404);
  });

  test('approve verifies the member, notifies, and is not repeatable', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const tok = factory.tokenFor(u);
    const id = (await submit(tok)).body.data._id;
    const res = await adminPost(`/api/admin/verifications/${id}/approve`);
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.data.status, 'approved');
    const fresh = await User.findById(u._id).lean();
    assert.equal(fresh.is_verified, 1);
    assert.ok(fresh.verifiedAt instanceof Date);
    assert.equal(await Notification.countDocuments({ toUser: u._id, type: 'verification_approved' }), 1);
    assert.equal((await adminPost(`/api/admin/verifications/${id}/approve`)).status, 409);
    const st = await status(tok);
    assert.equal(st.body.data.is_verified, 1);
    assert.equal(st.body.data.canSubmit, false);
    assert.ok(st.body.data.verifiedAt);
  });

  test('reject needs a reason, notifies, and the member may submit again', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const tok = factory.tokenFor(u);
    const id = (await submit(tok)).body.data._id;
    assert.equal((await adminPost(`/api/admin/verifications/${id}/reject`, {})).status, 400);
    const res = await adminPost(`/api/admin/verifications/${id}/reject`, { reason: 'Selfie is blurry' });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.status, 'rejected');
    assert.equal(await Notification.countDocuments({ toUser: u._id, type: 'verification_rejected' }), 1);
    assert.equal((await User.findById(u._id).lean()).is_verified, 0);
    const st = await status(tok);
    assert.equal(st.body.data.latest.status, 'rejected');
    assert.equal(st.body.data.latest.reason, 'Selfie is blurry');
    assert.equal(st.body.data.canSubmit, true);
    assert.equal((await submit(tok)).status, 200);
  });

  test('DELETE files: 409 while pending, removes files once reviewed', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const id = (await submit(factory.tokenFor(u))).body.data._id;
    const row = await Verification.findById(id).lean();
    const del = () => harness.request().delete(`/api/admin/verifications/${id}/files`).set(factory.bearer(adminToken));
    assert.equal((await del()).status, 409);
    await adminPost(`/api/admin/verifications/${id}/reject`, { reason: 'Document unreadable' });
    const res = await del();
    assert.equal(res.status, 200);
    assert.equal(res.body.data.removed, 2);
    assert.deepEqual(res.body.data.files, []);
    assert.ok(!fs.existsSync(path.join(VDIR, row.selfieFile)));
    assert.ok((await Verification.findById(id).lean()).filesPurgedAt);
    assert.equal((await adminGet(`/api/admin/verifications/${id}/files/selfie`)).status, 404);
  });

  test('purge job deletes files of requests reviewed before the retention window only', async () => {
    const purge = require('../services/jobs/verificationFilePurge');
    const oldU = await factory.makeUser({ is_verified: 0 });
    const newU = await factory.makeUser({ is_verified: 0 });
    const oldId = (await submit(factory.tokenFor(oldU))).body.data._id;
    const newId = (await submit(factory.tokenFor(newU))).body.data._id;
    await adminPost(`/api/admin/verifications/${oldId}/reject`, { reason: 'old' });
    await adminPost(`/api/admin/verifications/${newId}/reject`, { reason: 'new' });
    await Verification.updateOne({ _id: oldId }, { $set: { reviewedAt: new Date(Date.now() - 40 * 86400 * 1000) } });
    const oldRow = await Verification.findById(oldId).lean();
    const newRow = await Verification.findById(newId).lean();
    const r = await purge({ retentionDays: 30 });
    assert.ok(r.requests >= 1);
    assert.ok(!fs.existsSync(path.join(VDIR, oldRow.selfieFile)));
    assert.ok(fs.existsSync(path.join(VDIR, newRow.selfieFile)));
    assert.ok((await Verification.findById(oldId).lean()).filesPurgedAt);
    assert.equal((await Verification.findById(newId).lean()).filesPurgedAt, null);
  });

  test('admin verify toggle closes a pending request and notifies', async () => {
    const u = await factory.makeUser({ is_verified: 0 });
    const id = (await submit(factory.tokenFor(u))).body.data._id;
    const res = await adminPost(`/api/admin/users/${u._id}/verify`, { verify: true });
    assert.equal(res.status, 200);
    assert.equal(res.body.data.is_verified, 1);
    assert.equal((await Verification.findById(id).lean()).status, 'approved');
    assert.equal(await Notification.countDocuments({ toUser: u._id, type: 'verification_approved' }), 1);
    const off = await adminPost(`/api/admin/users/${u._id}/verify`, { verify: false });
    assert.equal(off.body.data.is_verified, 0);
    assert.equal((await User.findById(u._id).lean()).verifiedAt, null);
  });

  test('account deletion removes verification rows and their files', async () => {
    const { cascadeDeleteUser } = require('../services/userCascade');
    const u = await factory.makeUser({ is_verified: 0 });
    const id = (await submit(factory.tokenFor(u))).body.data._id;
    const row = await Verification.findById(id).lean();
    const r = await cascadeDeleteUser(u._id, { uploadsDir: path.join(CWD, 'uploads') });
    assert.equal(r.counts.verifications, 1);
    assert.equal(await Verification.countDocuments({ user: u._id }), 0);
    assert.ok(!fs.existsSync(path.join(VDIR, row.selfieFile)));
  });

  test('POST /api/uploadFile stores one re-encoded image and returns its uploads/ path', async () => {
    const u = await factory.makeUser();
    const tok = factory.tokenFor(u);
    const res = await harness.request().post('/api/uploadFile').set(factory.bearer(tok))
      .attach('uploadFile', jpeg, { filename: 'chat.png', contentType: 'image/png' });
    assert.equal(res.status, 200, JSON.stringify(res.body));
    assert.equal(res.body.status, true);
    assert.match(res.body.data, /^uploads\/profile_images\/[0-9a-f-]{36}\.jpg$/);
    assert.ok(fs.existsSync(path.join(CWD, res.body.data)));

    assert.equal((await harness.request().post('/api/uploadFile').set(factory.bearer(tok)).send({})).status, 400);
    const wrongField = await harness.request().post('/api/uploadFile').set(factory.bearer(tok))
      .attach('photo', jpeg, { filename: 'a.jpg', contentType: 'image/jpeg' });
    assert.equal(wrongField.status, 400);
    const pdf = await harness.request().post('/api/uploadFile').set(factory.bearer(tok))
      .attach('uploadFile', Buffer.from('%PDF-1.4'), { filename: 'a.pdf', contentType: 'application/pdf' });
    assert.equal(pdf.status, 400);
    assert.equal((await harness.request().post('/api/uploadFile').attach('uploadFile', jpeg, 'a.jpg')).status, 401);
  });
}

if (harness.suiteReady(test, 'verification')) defineSuite();
