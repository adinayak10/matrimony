'use strict';
/**
 * controllers/admin/analyticsController.js — admin analytics (feature expansion A3).
 *
 *   GET /api/admin/analytics/funnel?days=30     signup cohort of the last `days`
 *   GET /api/admin/analytics/activity?days=30   daily rows in data.days (Asia/Kolkata days), data.range = N
 *   GET /api/admin/analytics/demographics       non-blocked members
 *   GET /api/admin/analytics/active             onlineNow, dau, wau, mau
 *
 * Same 60 s in-process cache as dashboardController.js. DAU/WAU/MAU are
 * distinct ActivityLog.userId (socket connects) unioned with members online
 * now and lastSeen in the window, because socket.js sets lastSeen to null
 * while a member is online.
 */
const User = require('../../models/User');
const FriendshipRequest = require('../../models/FriendShipRequest');
const Message = require('../../models/Message');
const ActivityLog = require('../../models/ActivityLog');
const Shortlist = require('../../models/ShortList');
const RecentVisitor = require('../../models/RecentVisitor');
const City = require('../../models/City');
const State = require('../../models/State');
const Caste = require('../../models/Caste');
const Gotra = require('../../models/Gotra');

const CACHE_TTL_MS = 60 * 1000;
const TZ = 'Asia/Kolkata';
const cache = new Map();

async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function daysParam(req, def = 30, max = 365) {
  const n = parseInt(req.query.days, 10);
  if (!Number.isFinite(n) || n < 1) return def;
  return Math.min(n, max);
}

function daysAgo(n) {
  return new Date(Date.now() - n * 86400000);
}

function pct(part, whole) {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

function dayLabels(days) {
  const out = [];
  for (let i = days - 1; i >= 0; i--) out.push(dayFmt.format(new Date(Date.now() - i * 86400000)));
  return out;
}

async function dailyCounts(Model, match, dateField) {
  const rows = await Model.aggregate([
    { $match: match },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: `$${dateField}`, timezone: TZ } }, count: { $sum: 1 } } },
  ]);
  return new Map(rows.map((r) => [r._id, r.count]));
}

function fail(res, where, err) {
  console.error(`[admin analytics ${where}]`, err.message);
  return res.status(500).json({ status: false, message: 'Server error' });
}

/* ---------- funnel ---------- */

exports.funnel = async (req, res) => {
  try {
    const days = daysParam(req);
    const data = await cached(`funnel:${days}`, async () => {
      const since = daysAgo(days);
      const cohort = await User.distinct('_id', { createdAt: { $gte: since } });
      const ids = cohort;
      const [profileComplete, senders, acceptedReq, acceptedRec, messagers] = await Promise.all([
        User.countDocuments({ createdAt: { $gte: since }, 'profileCompletion.percentage': { $gte: 70 } }),
        ids.length ? FriendshipRequest.distinct('requester', { requester: { $in: ids } }) : [],
        ids.length ? FriendshipRequest.distinct('requester', { requester: { $in: ids }, status: 'accepted' }) : [],
        ids.length ? FriendshipRequest.distinct('recipient', { recipient: { $in: ids }, status: 'accepted' }) : [],
        ids.length ? Message.distinct('sender', { sender: { $in: ids } }) : [],
      ]);
      const accepted = new Set([...acceptedReq, ...acceptedRec].map(String));
      const counts = [
        ['signups', 'Signed up', ids.length],
        ['profile_complete_70', 'Profile 70%+ complete', profileComplete],
        ['interest_sent', 'Sent an interest', senders.length],
        ['interest_accepted', 'Interest accepted', accepted.size],
        ['first_message', 'Sent a message', messagers.length],
      ];
      const first = counts[0][2];
      const steps = counts.map(([key, label, count], i) => ({
        key,
        label,
        count,
        pctOfPrev: i === 0 ? (first ? 100 : null) : pct(count, counts[i - 1][2]),
        pctOfFirst: pct(count, first),
      }));
      return { days, since, steps, cachedAt: new Date() };
    });
    return res.json({ status: true, data });
  } catch (err) {
    return fail(res, 'funnel', err);
  }
};

/* ---------- activity ---------- */

exports.activity = async (req, res) => {
  try {
    const days = daysParam(req, 30, 180);
    const data = await cached(`activity:${days}`, async () => {
      const since = daysAgo(days);
      const [signups, interests, accepted, shortlists, visitors, messages] = await Promise.all([
        dailyCounts(User, { createdAt: { $gte: since } }, 'createdAt'),
        dailyCounts(FriendshipRequest, { createdAt: { $gte: since } }, 'createdAt'),
        dailyCounts(FriendshipRequest, { status: 'accepted', updatedAt: { $gte: since } }, 'updatedAt'),
        dailyCounts(Shortlist, { createdAt: { $gte: since } }, 'createdAt'),
        dailyCounts(RecentVisitor, { lastVisitedAt: { $gte: since } }, 'lastVisitedAt'),
        dailyCounts(Message, { createdAt: { $gte: since } }, 'createdAt'),
      ]);
      const labels = dayLabels(days);
      const maps = { signups, interests, accepted, shortlists, visitors, messages };
      const series = {};
      const totals = {};
      for (const [k, m] of Object.entries(maps)) {
        series[k] = labels.map((d) => m.get(d) || 0);
        totals[k] = series[k].reduce((a, b) => a + b, 0);
      }
      const rows = labels.map((date, i) => {
        const r = { date };
        for (const k of Object.keys(maps)) r[k] = series[k][i];
        return r;
      });
      // `days` is the per-day row list the admin page renders; `range` is the window length.
      return { range: days, days: rows, rows, timezone: TZ, labels, series, totals, cachedAt: new Date() };
    });
    return res.json({ status: true, data });
  } catch (err) {
    return fail(res, 'activity', err);
  }
};

/* ---------- demographics ---------- */

async function topRefs(field, Model, base, limit = 20) {
  const rows = await User.aggregate([
    { $match: { ...base, [field]: { $ne: null } } },
    { $group: { _id: `$${field}`, count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit },
    { $lookup: { from: Model.collection.name, localField: '_id', foreignField: '_id', as: 'ref' } },
    { $project: { _id: 1, count: 1, name: { $ifNull: [{ $arrayElemAt: ['$ref.name', 0] }, 'Unknown'] } } },
  ]);
  return rows.map((r) => ({ _id: r._id, name: r.name, count: r.count }));
}

async function groupBy(field, base) {
  const rows = await User.aggregate([{ $match: base }, { $group: { _id: `$${field}`, count: { $sum: 1 } } }, { $sort: { count: -1 } }]);
  return rows.map((r) => {
    const key = r._id === null || r._id === undefined || r._id === '' ? 'Not specified' : r._id;
    return { _id: key, name: key, key, count: r.count };
  });
}

const AGE_BUCKETS = [
  { key: '18-24', min: 18, max: 24 },
  { key: '25-29', min: 25, max: 29 },
  { key: '30-34', min: 30, max: 34 },
  { key: '35-39', min: 35, max: 39 },
  { key: '40-49', min: 40, max: 49 },
  { key: '50+', min: 50, max: 120 },
];

function yearsBack(n) {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
}

exports.demographics = async (req, res) => {
  try {
    const data = await cached('demographics', async () => {
      const base = { is_block: 0 };
      const ageCounts = AGE_BUCKETS.map((b) =>
        // age >= min  <=> dob <= today - min years ; age <= max <=> dob > today - (max+1) years
        User.countDocuments({ ...base, dob: { $lte: yearsBack(b.min), $gt: yearsBack(b.max + 1) } })
      );
      const [total, cities, states, castes, gotras, gender, maritalStatus, profileCreatedBy, unknownAge, ...ages] = await Promise.all([
        User.countDocuments(base),
        topRefs('location.city', City, base),
        topRefs('location.state', State, base),
        topRefs('caste', Caste, base),
        topRefs('gotra', Gotra, base),
        groupBy('gender', base),
        groupBy('maritalStatus', base),
        groupBy('profileCreatedBy', base),
        User.countDocuments({ ...base, dob: null }),
        ...ageCounts,
      ]);
      const bucket = (key, count) => ({ _id: key, name: key, key, count });
      const ageBuckets = AGE_BUCKETS.map((b, i) => bucket(b.key, ages[i]));
      const bucketed = ages.reduce((a, b) => a + b, 0);
      ageBuckets.push(bucket('Other', Math.max(0, total - unknownAge - bucketed)));
      ageBuckets.push(bucket('Not specified', unknownAge));
      return { total, cities, states, castes, gotras, gender, maritalStatus, profileCreatedBy, ageBuckets, cachedAt: new Date() };
    });
    return res.json({ status: true, data });
  } catch (err) {
    return fail(res, 'demographics', err);
  }
};

/* ---------- active ---------- */

async function activeSince(since, onlineIds) {
  const [logged, seen] = await Promise.all([
    ActivityLog.distinct('userId', { timestamp: { $gte: since } }),
    User.distinct('_id', { lastSeen: { $gte: since } }),
  ]);
  const set = new Set(onlineIds);
  for (const id of logged) if (id) set.add(String(id));
  for (const id of seen) set.add(String(id));
  return set.size;
}

exports.active = async (req, res) => {
  try {
    const data = await cached('active', async () => {
      const online = (await User.distinct('_id', { isOnline: true })).map(String);
      const [dau, wau, mau] = await Promise.all([activeSince(daysAgo(1), online), activeSince(daysAgo(7), online), activeSince(daysAgo(30), online)]);
      return { onlineNow: online.length, dau, wau, mau, cachedAt: new Date() };
    });
    return res.json({ status: true, data });
  } catch (err) {
    return fail(res, 'active', err);
  }
};

exports._cache = cache;
