'use strict';
/**
 * services/notificationVisibility.js — which of a member's notifications are
 * shown (list + unread badge use the same filter so the counts agree).
 *
 * visibleNotificationQuery(userId, extra)
 *   -> { toUser, ...extra, fromUser: {$nin: hidden} }
 *   hidden = senders that are banned (is_block 1), deleted, or blocked in
 *   either direction (services/blocks.js). System notifications without a
 *   fromUser (announcements, ...) always stay.
 * countUnreadNotifications(userId) -> number for the `notification_count` badge
 */
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const User = require('../models/User');
const blocks = require('./blocks');

function oid(v) {
  const raw = v && typeof v === 'object' && v._id !== undefined ? v._id : v;
  if (!mongoose.isValidObjectId(raw)) return null;
  return new mongoose.Types.ObjectId(String(raw));
}

async function visibleNotificationQuery(userId, extra = {}) {
  const id = oid(userId);
  const query = { toUser: id, ...extra };
  if (!id) return query;

  const senders = await Notification.distinct('fromUser', { toUser: id, fromUser: { $ne: null } });
  if (!senders.length) return query;

  const [blockedSet, visible] = await Promise.all([
    blocks.getBlockedIdSet(id),
    User.find({ _id: { $in: senders }, is_block: { $ne: 1 } }).distinct('_id'),
  ]);
  const visibleSet = new Set(visible.map(String));
  const hidden = senders.filter((s) => blockedSet.has(String(s)) || !visibleSet.has(String(s)));
  if (hidden.length) query.fromUser = { $nin: hidden };
  return query;
}

async function countUnreadNotifications(userId) {
  return Notification.countDocuments(await visibleNotificationQuery(userId, { isRead: false }));
}

module.exports = { visibleNotificationQuery, countUnreadNotifications };
