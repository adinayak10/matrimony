'use strict';
/**
 * tools/cleanup/purge-logs.js (A8.6)
 *
 *   SearchLog.searchedAt      < now - 90d
 *   ActivityLog.timestamp     < now - 90d
 *   Notification.createdAt    < now - 180d
 *   RecentVisitor.lastVisitedAt < now - 180d
 *
 * TTL indexes (A6.11) keep the collections bounded afterwards. Idempotent.
 *
 *   node tools/cleanup/purge-logs.js
 *   node tools/cleanup/purge-logs.js --apply --yes-i-know --prod
 */
const g = require('../_guard');
const SearchLog = require('../../models/SearchLog');
const ActivityLog = require('../../models/ActivityLog');
const Notification = require('../../models/Notification');
const RecentVisitor = require('../../models/RecentVisitor');

const DAY = 24 * 60 * 60 * 1000;

g.run(async ({ apply }) => {
  const now = Date.now();
  const jobs = [
    ['searchLogs', SearchLog, { searchedAt: { $lt: new Date(now - 90 * DAY) } }],
    ['activityLogs', ActivityLog, { timestamp: { $lt: new Date(now - 90 * DAY) } }],
    ['notifications', Notification, { createdAt: { $lt: new Date(now - 180 * DAY) } }],
    ['recentVisitors', RecentVisitor, { lastVisitedAt: { $lt: new Date(now - 180 * DAY) } }],
  ];
  const summary = { applied: apply };
  for (const [name, Model, filter] of jobs) {
    const total = await Model.estimatedDocumentCount();
    const stale = await Model.countDocuments(filter);
    let deleted = 0;
    if (apply && stale) {
      const r = await Model.deleteMany(filter);
      deleted = r.deletedCount || 0;
    }
    summary[name] = { total, stale, deleted };
  }
  // eslint-disable-next-line no-console
  console.log(summary);
});
