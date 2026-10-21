'use strict';
/**
 * controllers/admin/pushController.js — admin push notifications (feature expansion A3).
 *
 *   POST /api/admin/push/broadcast {title, body, platform, data?}         FCM topics
 *   POST /api/admin/push/preview   {filters}                    -> {count}
 *   POST /api/admin/push/filtered  {filters, title, body, data?, confirmCount}
 *   POST /api/admin/push/user      {userId, title, body, data?}           test send
 *   GET  /api/admin/push/jobs?page&limit&mode
 *
 * Broadcast + filtered sends (incl. announcement pushes) share a cap of
 * PUSH_MAX_PER_DAY per admin per rolling 24 h; filtered reaches at most
 * PUSH_MAX_RECIPIENTS members and needs confirmCount == the current count.
 * Every send is a PushJob and is audited. There is deliberately no member-
 * facing "push to a user" endpoint (it would be an open relay).
 */
const mongoose = require('mongoose');
const User = require('../../models/User');
const PushJob = require('../../models/PushJob');
const push = require('../../services/push');
const { buildBroadcastQuery } = require('../../services/broadcastQuery');
const { record: audit } = require('../../services/auditLog');
const { text } = require('../SuccessStoryController');

const PUSH_MAX_RECIPIENTS = 2000;
const PUSH_MAX_PER_DAY = 5;
const TITLE_MAX = 100;
const BODY_MAX = 500;
const PLATFORMS = ['all', 'android', 'ios'];
const DATA_KEY_RE = /^[A-Za-z][A-Za-z0-9_]{0,39}$/;

/* ---------- validation ---------- */

/** -> { error } | { data } ; string-able primitives only, `type` always present. */
function readData(raw, defaultType = 'admin_message') {
  if (raw === undefined || raw === null || raw === '') return { data: { type: defaultType } };
  if (typeof raw !== 'object' || Array.isArray(raw)) return { error: 'data must be an object' };
  const keys = Object.keys(raw);
  if (keys.length > 20) return { error: 'data may have at most 20 keys' };
  const data = {};
  for (const k of keys) {
    if (k === 'title' || k === 'body') continue;
    if (!DATA_KEY_RE.test(k)) return { error: `data key "${k.slice(0, 40)}" is not allowed` };
    const v = raw[k];
    if (v === null || v === undefined) continue;
    if (!['string', 'number', 'boolean'].includes(typeof v)) return { error: `data.${k} must be a string, number or boolean` };
    const s = String(v);
    if (s.length > 500) return { error: `data.${k} is too long` };
    data[k] = s;
  }
  if (!data.type) data.type = defaultType;
  return { data };
}

/** -> { error } | { title, body, data } */
function readMessage(b, defaultType) {
  const body = b || {};
  const title = text(body.title, TITLE_MAX + 1);
  const msg = text(body.body, BODY_MAX + 1);
  if (!title) return { error: 'title is required' };
  if (title.length > TITLE_MAX) return { error: `title must be at most ${TITLE_MAX} characters` };
  if (!msg) return { error: 'body is required' };
  if (msg.length > BODY_MAX) return { error: `body must be at most ${BODY_MAX} characters` };
  const d = readData(body.data, defaultType);
  if (d.error) return { error: d.error };
  return { title, body: msg, data: d.data };
}

/**
 * Member filter for pushes: the email broadcast filter (gender, minAge, maxAge,
 * verified, platform mobile|web) plus state, city, lastSeenDays and platform
 * android|ios (device_type 1 = iOS). Never blocked members, only members with a
 * device token who have not turned notifications off.
 */
function buildPushQuery(filters) {
  const f = filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {};
  const { platform, state, city, lastSeenDays, blocked, ...rest } = f; // eslint-disable-line no-unused-vars
  const query = buildBroadcastQuery({ ...rest, platform: ['mobile', 'web'].includes(platform) ? platform : undefined });
  query.is_block = 0;
  query.device_token = { $exists: true, $nin: [null, ''] };
  query['settings.allowNotifications'] = { $ne: false };
  if (platform === 'ios') query.device_type = 1;
  else if (platform === 'android') query.device_type = { $ne: 1 };
  if (state && mongoose.isValidObjectId(state)) query['location.state'] = new mongoose.Types.ObjectId(String(state));
  if (city && mongoose.isValidObjectId(city)) query['location.city'] = new mongoose.Types.ObjectId(String(city));
  const days = parseInt(lastSeenDays, 10);
  if (Number.isFinite(days) && days > 0) {
    const since = new Date(Date.now() - Math.min(days, 365) * 86400000);
    query.$or = [{ isOnline: true }, { lastSeen: { $gte: since } }];
  }
  return query;
}

function cleanFilters(filters) {
  const f = filters && typeof filters === 'object' && !Array.isArray(filters) ? filters : {};
  const out = {};
  for (const k of ['gender', 'minAge', 'maxAge', 'verified', 'platform', 'state', 'city', 'lastSeenDays']) {
    if (f[k] !== undefined && f[k] !== null && f[k] !== '') out[k] = typeof f[k] === 'object' ? undefined : f[k];
  }
  return out;
}

/* ---------- shared helpers (announcement publish uses them too) ---------- */

async function sendsToday(adminId) {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  return PushJob.countDocuments({ startedBy: adminId, mode: { $in: ['topic', 'filtered'] }, createdAt: { $gte: since }, status: { $ne: 'failed' } });
}

/** -> null when under the cap, else a 429 body */
async function dailyCapError(adminId) {
  if ((await sendsToday(adminId)) >= PUSH_MAX_PER_DAY) {
    return { status: false, code: 'DAILY_CAP', message: `Only ${PUSH_MAX_PER_DAY} push broadcasts per day are allowed` };
  }
  return null;
}

/** Topic broadcast + PushJob; never throws on FCM failure (job.status 'failed'). */
async function runTopicBroadcast(req, { title, body, data, platform, source = 'manual', announcementId = null }) {
  const job = await PushJob.create({
    mode: 'topic',
    source,
    title,
    body,
    data,
    platform,
    announcement: announcementId,
    total: push.topicsFor(platform).length,
    startedBy: req.userId,
    startedAt: new Date(),
  });
  const results = await push.broadcast({ title, body, data, platform });
  const sent = results.filter((r) => r.messageId).length;
  job.results = results;
  job.sent = sent;
  job.failed = results.length - sent;
  job.status = sent > 0 ? 'completed' : 'failed';
  job.errorMessages = results.filter((r) => r.error).map((r) => `${r.topic}: ${String(r.error).slice(0, 300)}`);
  job.finishedAt = new Date();
  await job.save();
  await audit(req, source === 'announcement' ? 'push.announcement' : 'push.broadcast', { type: 'pushJob', id: job._id }, { after: { title, platform, sent, failed: job.failed, announcementId } });
  return job;
}

/* ---------- handlers ---------- */

exports.broadcast = async (req, res) => {
  try {
    const msg = readMessage(req.body, 'admin_message');
    if (msg.error) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: msg.error });
    const platform = req.body.platform === undefined || req.body.platform === '' ? 'all' : req.body.platform;
    if (!PLATFORMS.includes(platform)) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: 'platform must be all, android or ios' });
    const cap = await dailyCapError(req.userId);
    if (cap) return res.status(429).json(cap);
    const job = await runTopicBroadcast(req, { title: msg.title, body: msg.body, data: msg.data, platform });
    return res.json({ status: true, data: job.toObject() });
  } catch (err) {
    console.error('[admin push broadcast]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.preview = async (req, res) => {
  try {
    const count = await User.countDocuments(buildPushQuery((req.body || {}).filters));
    return res.json({ status: true, count, data: { count, max: PUSH_MAX_RECIPIENTS, tooMany: count > PUSH_MAX_RECIPIENTS } });
  } catch (err) {
    console.error('[admin push preview]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.filtered = async (req, res) => {
  try {
    const b = req.body || {};
    const msg = readMessage(b, 'admin_message');
    if (msg.error) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: msg.error });
    const query = buildPushQuery(b.filters);
    const total = await User.countDocuments(query);
    if (!total) return res.status(400).json({ status: false, code: 'NO_RECIPIENTS', message: 'No members match the selected filters' });
    if (total > PUSH_MAX_RECIPIENTS) {
      return res.status(400).json({ status: false, code: 'TOO_MANY', message: `This push would reach ${total} members; the limit is ${PUSH_MAX_RECIPIENTS}. Narrow the filters.`, total });
    }
    if (Number(b.confirmCount) !== total) {
      return res.status(400).json({ status: false, code: 'CONFIRM_MISMATCH', message: `confirmCount (${b.confirmCount}) does not match the current recipient count (${total}). Preview again.`, total });
    }
    const cap = await dailyCapError(req.userId);
    if (cap) return res.status(429).json(cap);

    const users = await User.find(query).select('_id device_token settings is_block').limit(PUSH_MAX_RECIPIENTS).lean();
    const filters = cleanFilters(b.filters);
    const job = await PushJob.create({
      mode: 'filtered',
      title: msg.title,
      body: msg.body,
      data: msg.data,
      filters,
      total: users.length,
      startedBy: req.userId,
      startedAt: new Date(),
    });
    await audit(req, 'push.filtered', { type: 'pushJob', id: job._id }, { after: { title: msg.title, total: users.length, filters } });
    res.json({ status: true, message: `Push started for ${users.length} member(s).`, data: { jobId: job._id, total: users.length, job: job.toObject() } });

    // Background loop with progress written to the job
    (async () => {
      let sent = 0;
      let failed = 0;
      const errors = new Map();
      for (let i = 0; i < users.length; i++) {
        // eslint-disable-next-line no-await-in-loop
        const r = await push.sendToUser(users[i], msg.title, msg.body, msg.data);
        if (r.ok) sent++;
        else {
          failed++;
          const key = String(r.error || 'unknown').slice(0, 200);
          errors.set(key, (errors.get(key) || 0) + 1);
        }
        if ((i + 1) % 50 === 0) {
          // eslint-disable-next-line no-await-in-loop
          await PushJob.updateOne({ _id: job._id }, { $set: { sent, failed } }).catch(() => {});
        }
      }
      await PushJob.updateOne(
        { _id: job._id },
        {
          $set: {
            status: 'completed',
            sent,
            failed,
            errorMessages: [...errors.entries()].slice(0, 20).map(([k, n]) => `${k} (x${n})`),
            finishedAt: new Date(),
          },
        }
      );
    })().catch((err) => {
      PushJob.updateOne({ _id: job._id }, { $set: { status: 'failed', errorMessages: [String(err.message).slice(0, 500)], finishedAt: new Date() } }).catch(() => {});
    });
  } catch (err) {
    console.error('[admin push filtered]', err.message);
    if (!res.headersSent) res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.toUser = async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.userId || !mongoose.isValidObjectId(b.userId)) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: 'userId is required' });
    const msg = readMessage(b, 'admin_message');
    if (msg.error) return res.status(400).json({ status: false, code: 'VALIDATION_ERROR', message: msg.error });
    const user = await User.findById(b.userId).select('_id full_name device_token settings is_block').lean();
    if (!user) return res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'User not found' });
    const r = await push.sendToUser(user, msg.title, msg.body, msg.data);
    const job = await PushJob.create({
      mode: 'user',
      status: r.ok ? 'completed' : 'failed',
      title: msg.title,
      body: msg.body,
      data: msg.data,
      targetUser: user._id,
      total: 1,
      sent: r.ok ? 1 : 0,
      failed: r.ok ? 0 : 1,
      results: [r.ok ? { messageId: r.messageId } : { error: r.error }],
      errorMessages: r.ok ? [] : [String(r.error).slice(0, 300)],
      startedBy: req.userId,
      startedAt: new Date(),
      finishedAt: new Date(),
    });
    audit(req, 'push.user', { type: 'user', id: user._id }, { after: { title: msg.title, ok: r.ok, error: r.ok ? undefined : r.error } });
    return res.json({
      status: true,
      message: r.ok ? `Push sent to ${user.full_name}` : `Push not delivered: ${r.error}`,
      data: { ok: r.ok, error: r.ok ? null : r.error, jobId: job._id },
    });
  } catch (err) {
    console.error('[admin push user]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.jobs = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const query = {};
    if (['topic', 'filtered', 'user'].includes(req.query.mode)) query.mode = req.query.mode;
    const [total, rows] = await Promise.all([
      PushJob.countDocuments(query),
      PushJob.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('startedBy', 'full_name email')
        .populate('targetUser', 'full_name email')
        .lean(),
    ]);
    res.set('Cache-Control', 'no-store');
    return res.json({ status: true, data: rows, pagination: { total, page, limit, pages: Math.ceil(total / limit) } });
  } catch (err) {
    console.error('[admin push jobs]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.PUSH_MAX_RECIPIENTS = PUSH_MAX_RECIPIENTS;
exports.PUSH_MAX_PER_DAY = PUSH_MAX_PER_DAY;
exports.buildPushQuery = buildPushQuery;
exports.readMessage = readMessage;
exports.dailyCapError = dailyCapError;
exports.runTopicBroadcast = runTopicBroadcast;
