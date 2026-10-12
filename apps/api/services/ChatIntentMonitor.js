const ChatIntentLog = require('../models/ChatIntentLog');
const Message = require('../models/Message');
const Block = require('../models/Block');
const { getIO, getOnlineUsers } = require('../socket');
const sendNotification = require('../util/sendNotification');

async function runChatIntentMonitor() {
  console.log("🧠 Running Chat Intent Monitor...");

  const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48h

  const logs = await ChatIntentLog.aggregate([
    { $match: { openedAt: { $gte: since }, duration: { $gte: 10 } } },
    {
      $group: {
        _id: { userId: '$userId', targetUser: '$targetUser' },
        totalViews: { $sum: 1 },
        totalDuration: { $sum: '$duration' }
      }
    },
    { $match: { totalViews: { $gte: 2 }, totalDuration: { $gte: 20 } } }
  ]);

  const io = getIO();
  const onlineUsers = getOnlineUsers();

  for (const log of logs) {
    const { userId, targetUser } = log._id;

    // ❌ Skip if message was already sent
    const hasMessaged = await Message.findOne({
      sender: userId,
      receiver: targetUser
    });

    if (hasMessaged) continue;

    // ❌ Skip if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: userId, blocked: targetUser },
        { blocker: targetUser, blocked: userId }
      ]
    });

    if (isBlocked) continue;

    // ✅ Send nudge
    const socketId = onlineUsers.get(targetUser.toString());
    const msg = "Someone viewed your chat multiple times but didn’t send a message. Maybe they’re shy? Want to break the ice?";

    if (socketId) {
      io.to(socketId).emit('silent_interest_detected', { message: msg });
      console.log(`⚡ Socket nudge sent to ${targetUser}`);
    } else {
      const targetUserData = await require('../models/User').findById(targetUser);
      if (targetUserData?.device_token) {
        await sendNotification(
          targetUserData.device_token,
          "🤫 Someone’s Curious!",
          msg
        );
        console.log(`📩 FCM push sent to ${targetUser}`);
      }
    }
  }

  console.log("✅ Chat Intent Monitor completed.");
}

module.exports = runChatIntentMonitor;
