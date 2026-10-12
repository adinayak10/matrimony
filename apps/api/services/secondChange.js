const SecondChanceQueue = require('../models/SecondChanceQueue');
const User = require('../models/User');
const { getIO, onlineUsers } = require('../socket');
const sendNotification = require('../util/sendNotification');

async function emitSecondChanceSuggestions() {
  const cutoffTime = new Date(Date.now() - 12 * 60 * 60 * 1000); // 12 hours ago

  const entries = await SecondChanceQueue.find({
    reminded: false,
    rejectedAt: { $lte: cutoffTime },
  });

  const io = getIO();

  for (const entry of entries) {
    try {
      const userId = entry.userId.toString();
      const socketId = onlineUsers.get(userId);
      const profile = await User.findById(entry.profileId);
      const user = await User.findById(userId); // user receiving the suggestion

      if (!profile || !user) continue;

      const payload = {
        message: "Want to reconsider this profile? Sometimes first impressions aren’t enough.",
        profile: {
          _id: profile._id,
          name: profile.full_name,
          profilePic: profile.profile,
        }
      };

      if (socketId) {
        io.to(socketId).emit('second_chance_suggestion', payload);
        console.log(`⚡ Socket suggestion sent to ${user.full_name}`);
      } else if (user.device_token) {
        await sendNotification(
          user.device_token,
          '⏰ Second Chance?',
          payload.message,
          {
            type: 'second_chance',
            profileId: profile._id,
            name: profile.full_name,
            profilePic: profile.profile,
          }
        );
        console.log(`📩 FCM push sent to ${user.full_name}`);
      } else {
        console.log(`⚠️ User ${user.full_name} has no socket or FCM device token`);
        continue; // skip saving reminder flag if no delivery
      }

      entry.reminded = true;
      await entry.save();

    } catch (err) {
      console.error('❌ Error processing second chance entry:', err);
    }
  }
}

module.exports = { emitSecondChanceSuggestions };
