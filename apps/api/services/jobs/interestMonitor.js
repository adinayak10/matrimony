'use strict';
/**
 * services/jobs/interestMonitor.js — "someone keeps viewing your profile"
 * (fixed version of services/detectInterestMonitor.js, feature expansion A0.5).
 *
 * Fixes: only pairs with count >= 3 AND lastVisitedAt within 2 days are read
 * (the old job loaded every RecentVisitor row), honours the visited member's
 * settings.notifyOnProfileVisit / allowNotifications, skips banned members and
 * blocked pairs, at most one alert per pair per 7 days, push via services/push.
 *
 * Plain async function: no timers or queries at require time.
 */
const RecentVisitor = require('../../models/RecentVisitor');
const Notification = require('../../models/Notification');
const blocks = require('../blocks');
const push = require('../push');

const MIN_VISITS = 3;
const RECENT_DAYS = 2;
const COOLDOWN_DAYS = 7;
const BATCH = 500;
const DAY = 24 * 3600 * 1000;

async function runInterestMonitor({ now = new Date() } = {}) {
  const since = new Date(now.getTime() - RECENT_DAYS * DAY);
  const cooldown = new Date(now.getTime() - COOLDOWN_DAYS * DAY);
  const stats = { checked: 0, notified: 0, skipped: 0 };

  const views = await RecentVisitor.find({ count: { $gte: MIN_VISITS }, lastVisitedAt: { $gte: since } })
    .sort({ lastVisitedAt: -1 })
    .limit(BATCH)
    .populate('visitor', 'full_name profile is_block')
    .populate('visited', 'full_name device_token settings is_block')
    .lean();

  // socket.js is required lazily: it requires controllers indirectly via gamesocket
  // eslint-disable-next-line global-require
  const { getIO, onlineUsers } = require('../../socket');

  for (const view of views) {
    stats.checked++;
    const { visitor, visited } = view;
    if (!visitor || !visited || visitor.is_block === 1 || visited.is_block === 1) { stats.skipped++; continue; }
    const settings = visited.settings || {};
    if (settings.notifyOnProfileVisit === false) { stats.skipped++; continue; }
    if (await blocks.isBlockedEither(visitor._id, visited._id)) { stats.skipped++; continue; }

    const recent = await Notification.exists({
      type: 'interest_detected',
      fromUser: visitor._id,
      toUser: visited._id,
      createdAt: { $gte: cooldown },
    });
    if (recent) { stats.skipped++; continue; }

    const message = `${visitor.full_name || 'Someone'} has viewed your profile several times. They might be interested in you.`;
    await Notification.create({
      type: 'interest_detected',
      fromUser: visitor._id,
      toUser: visited._id,
      content: message,
      data: { userId: String(visitor._id) },
    });
    stats.notified++;

    const socketId = onlineUsers.get(String(visited._id));
    if (socketId) {
      try {
        getIO().to(socketId).emit('interest_detected', {
          fromUser: { _id: visitor._id, name: visitor.full_name, profile: visitor.profile || null },
          message,
        });
      } catch (_) { /* io not initialised (tests/tools) */ }
    } else {
      await push.sendToUser(visited, 'Someone is interested in you', message, { type: 'profile_visit', userId: String(visitor._id) });
    }
  }
  return stats;
}

module.exports = runInterestMonitor;
module.exports.runInterestMonitor = runInterestMonitor;
