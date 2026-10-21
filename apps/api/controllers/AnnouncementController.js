'use strict';
/**
 * controllers/AnnouncementController.js — POST /api/fetchPlatformNotification (feature expansion A3).
 *
 * Body: { start (0-based offset), limit, platform? ('android'|'ios'|'web') }
 * Rows are shaped for apps/mobile/lib/models/notification_model.dart
 * (PlatformNotification.fromJson): `data` is always an object (the app parses it
 * as a User), toUser/fromUser null, `content` = body.
 * Platform: explicit body.platform wins; otherwise the caller's device_type
 * (1 = iOS, 0 = Android); unknown -> every platform.
 */
const Announcement = require('../models/Announcement');
const User = require('../models/User');
const { resolveCaller } = require('../middleware/identity');

const MAX_LIMIT = 50;

function intOr(v, def) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : def;
}

async function platformFilter(req, callerId) {
  const p = req.body && typeof req.body.platform === 'string' ? req.body.platform.toLowerCase() : '';
  if (p === 'android' || p === 'ios') return ['all', p];
  if (p === 'web') return ['all'];
  // req.user (token select) has no device_type; one indexed _id read
  const me = callerId ? await User.findById(callerId).select('device_type').lean() : null;
  const dt = me ? me.device_type : undefined;
  if (dt === 1) return ['all', 'ios'];
  if (dt === 0) return ['all', 'android'];
  return null;
}

function activeQuery(platforms, now = new Date()) {
  const q = {
    status: 'published',
    $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
  };
  if (platforms) q.platform = { $in: platforms };
  return q;
}

function toRow(a) {
  return {
    _id: a._id,
    type: a.type,
    title: a.title,
    content: a.body,
    linkUrl: a.linkUrl || '',
    platform: a.platform,
    expiresAt: a.expiresAt || null,
    createdAt: a.publishedAt || a.createdAt,
    updatedAt: a.updatedAt,
    toUser: null,
    fromUser: null,
    isRead: true,
    data: {},
  };
}

async function fetchPlatformNotification(req, res) {
  try {
    const callerId = resolveCaller(req);
    const start = Math.max(0, intOr(req.body && req.body.start, 0));
    const limit = Math.min(MAX_LIMIT, Math.max(1, intOr(req.body && req.body.limit, 20)));
    const query = activeQuery(await platformFilter(req, callerId));
    const [total, rows] = await Promise.all([
      Announcement.countDocuments(query),
      Announcement.find(query).sort({ publishedAt: -1, _id: -1 }).skip(start).limit(limit).lean(),
    ]);
    return res.json({ status: true, message: 'Platform notifications', data: rows.map(toRow), total, start, limit });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fetchPlatformNotification]', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
}

module.exports = { fetchPlatformNotification, toRow, activeQuery };
