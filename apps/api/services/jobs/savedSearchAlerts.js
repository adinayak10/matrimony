'use strict';
/**
 * services/jobs/savedSearchAlerts.js — new profiles for saved searches
 * (feature expansion A2). For every alert-enabled saved search whose last
 * alert is older than 24 h: count profiles created after
 * (lastNotifiedAt || createdAt) that match the search (same query as
 * runSavedSearch via services/profileSearch); when > 0 store a Notification
 * 'profile_search_alert' and push {type:'profile_search_alert', savedSearchId}.
 * lastNotifiedAt moves forward only when an alert was sent, so profiles are
 * never counted twice and nothing is lost between runs.
 *
 * Plain async function: no timers or queries at require time.
 */
const SavedSearch = require('../../models/SavedSearch');
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const profileSearch = require('../profileSearch');
const push = require('../push');

const DAY = 24 * 3600 * 1000;
const BATCH = 1000;

async function runSavedSearchAlerts({ now = new Date() } = {}) {
  const dueBefore = new Date(now.getTime() - DAY);
  const stats = { checked: 0, notified: 0 };
  const searches = await SavedSearch.find({
    alertEnabled: true,
    $or: [{ lastNotifiedAt: null }, { lastNotifiedAt: { $lte: dueBefore } }],
  })
    .sort({ lastNotifiedAt: 1 })
    .limit(BATCH)
    .lean();

  for (const s of searches) {
    stats.checked++;
    try {
      const owner = await User.findById(s.user).lean();
      if (!owner || owner.is_block === 1) continue;
      const filters = s.filters || {};
      const since = s.lastNotifiedAt || s.createdAt;
      const query = await profileSearch.buildSearchQuery(owner, {
        filters,
        isVerify: !!filters.isVerify,
        recentlyActive: !!filters.recentlyActive,
        createdAfter: since,
      });
      if (!query) continue;
      const count = await User.countDocuments(query);
      if (!count) continue;

      const text = `${count} new ${count === 1 ? 'profile matches' : 'profiles match'} your saved search "${s.name}".`;
      await Notification.create({
        type: 'profile_search_alert',
        toUser: owner._id,
        content: text,
        data: { savedSearchId: String(s._id), count },
      });
      await SavedSearch.updateOne({ _id: s._id }, { $set: { lastNotifiedAt: now } }, { timestamps: false });
      await push.sendToUser(owner, 'New matches for your search', text, { type: 'profile_search_alert', savedSearchId: String(s._id) });
      stats.notified++;
    } catch (err) {
      console.error('[savedSearchAlerts] search failed:', String(s._id), err.message);
    }
  }
  return stats;
}

module.exports = runSavedSearchAlerts;
module.exports.runSavedSearchAlerts = runSavedSearchAlerts;
