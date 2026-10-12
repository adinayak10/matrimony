// Admin Dashboard Controller
const User = require('../../models/User');
const FriendshipRequest = require('../../models/FriendShipRequest');
const Message = require('../../models/Message');
const ChatRoom = require('../../models/ChatRoom');

/**
 * Get dashboard statistics
 */
exports.getDashboardStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      verifiedUsers,
      blockedUsers,
      maleUsers,
      femaleUsers,
      totalMessages,
      totalFriendRequests,
      totalChatRooms
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ is_block: 0 }),
      User.countDocuments({ is_verified: 1 }),
      User.countDocuments({ is_block: 1 }),
      User.countDocuments({ gender: 'Male' }),
      User.countDocuments({ gender: 'Female' }),
      Message.countDocuments(),
      FriendshipRequest.countDocuments(),
      ChatRoom.countDocuments()
    ]);

    // Get recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.countDocuments({ 
      createdAt: { $gte: sevenDaysAgo } 
    });

    // Get users by membership
    const membershipStats = await User.aggregate([
      {
        $group: {
          _id: '$membershipPlan',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'membershipplans',
          localField: '_id',
          foreignField: '_id',
          as: 'plan'
        }
      }
    ]);

    // Get users by login type
    const loginTypeStats = await User.aggregate([
      {
        $group: {
          _id: '$login_type',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      status: true,
      data: {
        overview: {
          totalUsers,
          activeUsers,
          verifiedUsers,
          blockedUsers,
          recentUsers
        },
        gender: {
          male: maleUsers,
          female: femaleUsers,
          other: totalUsers - maleUsers - femaleUsers
        },
        activity: {
          totalMessages,
          totalFriendRequests,
          totalChatRooms
        },
        membership: membershipStats,
        loginTypes: loginTypeStats
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get recent users
 */
exports.getRecentUsers = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const users = await User.find()
      .select('full_name email phone gender profile is_verified is_block createdAt')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .lean();

    res.json({
      status: true,
      data: users
    });
  } catch (error) {
    console.error('Get recent users error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get user growth statistics
 */
exports.getUserGrowth = async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const growth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      status: true,
      data: growth
    });
  } catch (error) {
    console.error('Get user growth error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};

/**
 * Get engagement statistics
 */
exports.getEngagementStats = async (req, res) => {
  try {
    // Get users who sent/received messages in last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const activeMessagers = await Message.distinct('sender', {
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get users who sent friend requests in last 7 days
    const activeRequesters = await FriendshipRequest.distinct('from', {
      createdAt: { $gte: sevenDaysAgo }
    });

    // Get average messages per user
    const messageStats = await Message.aggregate([
      {
        $group: {
          _id: '$sender',
          messageCount: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: null,
          avgMessages: { $avg: '$messageCount' },
          totalSenders: { $sum: 1 }
        }
      }
    ]);

    res.json({
      status: true,
      data: {
        activeMessagers: activeMessagers.length,
        activeRequesters: activeRequesters.length,
        averageMessagesPerUser: messageStats[0]?.avgMessages || 0,
        totalActiveMessagers: messageStats[0]?.totalSenders || 0
      }
    });
  } catch (error) {
    console.error('Get engagement stats error:', error);
    res.status(500).json({ status: false, message: 'Server error', error: error.message });
  }
};
