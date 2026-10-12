const RecentVisitor = require('../models/RecentVisitor');
const Notification = require('../models/Notification');
const sendNotification = require('../util/sendNotification');
const { getIO, onlineUsers } = require('../socket');

async function runInterestMonitor() {
  console.log(`[${new Date().toISOString()}] 🔍 Starting interest monitor task...`);

  const views = await RecentVisitor.find({}).populate('visitor visited');

  const io = getIO();


  for (const view of views) {
    const { visitor, visited, count, updatedAt } = view;
    if (!visitor || !visited) continue;

    const daysSinceLastVisit = (Date.now() - new Date(updatedAt)) / (1000 * 60 * 60 * 24);
    const isRecent = daysSinceLastVisit <= 2;
    const hasHighCount = count >= 3;

    const alreadyNotified = await Notification.findOne({
      type: 'interest_detected',
      fromUser: visitor._id,
      toUser: visited._id,
    }).sort({ createdAt: -1 });

    const daysSinceNotification = alreadyNotified
      ? (Date.now() - new Date(alreadyNotified.createdAt)) / (1000 * 60 * 60 * 24)
      : Infinity;

    if (isRecent && hasHighCount && daysSinceNotification > 7) {
      const message = `${visitor.full_name} has viewed your profile multiple times. They might be interested in you.`;

      // Save notification to DB
      await Notification.create({
        type: 'interest_detected',
        fromUser: visitor._id,
        toUser: visited._id,
        content: message,
      });

      const visitedSocketId = onlineUsers.get(visited._id.toString());

      if (visitedSocketId) {
        io.to(visitedSocketId).emit('interest_detected', {
          fromUser: {
            _id: visitor._id,
            name: visitor.full_name,
            profile: visitor.profile
          },
          message,
        });
        console.log(`⚡ Real-time socket alert sent to ${visited.full_name}`);
      } else if (visited.device_token) {
        await sendNotification(
          visited.device_token,
          '🔥 Someone is very interested!',
          message
        );
        console.log(`📩 FCM push sent to ${visited.full_name}`);
      } else {
        console.log(`⚠️ No delivery method for ${visited.full_name}`);
      }
    }
  }

  console.log(`[${new Date().toISOString()}] ✅ Interest monitor task completed.`);
}

module.exports = runInterestMonitor;
