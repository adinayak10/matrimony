'use strict';
// Admin Dashboard Controller (C4.6: indexed counts, 60 s cache, real "active")
const User = require('../../models/User');
const FriendshipRequest = require('../../models/FriendShipRequest');
const Message = require('../../models/Message');
const ChatRoom = require('../../models/ChatRoom');

const CACHE_TTL_MS = 60 * 1000;
const cache = new Map();

async function cached(key, fn) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value;
  const value = await fn();
  cache.set(key, { at: Date.now(), value });
  return value;
}

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

/**
 * GET /api/admin/dashboard/stats
 * activeUsers = lastSeen within 7 days (WAU); notBlockedUsers is the old number.
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const data = await cached('stats', async () => {
      const sevenDaysAgo = daysAgo(7);
      const [
        totalUsers,
        notBlockedUsers,
        activeUsers,
        verifiedUsers,
        blockedUsers,
        maleUsers,
        femaleUsers,
        totalMessages,
        totalFriendRequests,
        totalChatRooms,
        recentUsers,
        membershipStats,
        loginTypeStats,
      ] = await Promise.all([
        User.countDocuments(),
        User.countDocuments({ is_block: 0 }),
        User.countDocuments({ lastSeen: { $gte: sevenDaysAgo } }),
        User.countDocuments({ is_verified: 1 }),
        User.countDocuments({ is_block: 1 }),
        User.countDocuments({ gender: 'Male' }),
        User.countDocuments({ gender: 'Female' }),
        Message.estimatedDocumentCount(),
        FriendshipRequest.estimatedDocumentCount(),
        ChatRoom.estimatedDocumentCount(),
        User.countDocuments({ createdAt: { $gte: sevenDaysAgo } }),
        User.aggregate([
          { $group: { _id: '$membershipPlan', count: { $sum: 1 } } },
          { $lookup: { from: 'membershipplans', localField: '_id', foreignField: '_id', as: 'plan' } },
        ]),
        User.aggregate([{ $group: { _id: '$login_type', count: { $sum: 1 } } }]),
      ]);

      return {
        overview: {
          totalUsers,
          activeUsers,
          activeUsersLabel: 'Active (last 7 days)',
          notBlockedUsers,
          verifiedUsers,
          blockedUsers,
          recentUsers,
        },
        gender: { male: maleUsers, female: femaleUsers, other: totalUsers - maleUsers - femaleUsers },
        activity: { totalMessages, totalFriendRequests, totalChatRooms },
        membership: membershipStats,
        loginTypes: loginTypeStats,
        cachedAt: new Date(),
      };
    });

    res.set('Cache-Control', 'no-store').json({ status: true, data });
  } catch (error) {
    console.error('Get dashboard stats error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/dashboard/recent-users?limit=10
 */
exports.getRecentUsers = async (req, res) => {
  try {
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 10));
    const users = await User.find()
      .select('full_name email phone gender profile is_verified is_block createdAt lastSeen last_login_platform')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json({ status: true, data: users });
  } catch (error) {
    console.error('Get recent users error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/dashboard/user-growth?days=30
 */
exports.getUserGrowth = async (req, res) => {
  try {
    const days = Math.min(365, Math.max(1, parseInt(req.query.days, 10) || 30));
    const growth = await cached(`growth:${days}`, () =>
      User.aggregate([
        { $match: { createdAt: { $gte: daysAgo(days) } } },
        { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ])
    );
    res.json({ status: true, data: growth });
  } catch (error) {
    console.error('Get user growth error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/dashboard/engagement
 */
exports.getEngagementStats = async (req, res) => {
  try {
    const data = await cached('engagement', async () => {
      const sevenDaysAgo = daysAgo(7);
      const [activeMessagers, activeRequesters, messageStats] = await Promise.all([
        Message.distinct('sender', { createdAt: { $gte: sevenDaysAgo } }),
        // C4.6: the field is `requester` (was `from`, always 0)
        FriendshipRequest.distinct('requester', { createdAt: { $gte: sevenDaysAgo } }),
        Message.aggregate([
          { $group: { _id: '$sender', messageCount: { $sum: 1 } } },
          { $group: { _id: null, avgMessages: { $avg: '$messageCount' }, totalSenders: { $sum: 1 } } },
        ]),
      ]);
      return {
        activeMessagers: activeMessagers.length,
        activeRequesters: activeRequesters.length,
        averageMessagesPerUser: (messageStats[0] && messageStats[0].avgMessages) || 0,
        totalActiveMessagers: (messageStats[0] && messageStats[0].totalSenders) || 0,
      };
    });
    res.json({ status: true, data });
  } catch (error) {
    console.error('Get engagement stats error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

exports.invalidateCache = () => cache.clear();
