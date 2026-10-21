// Uses ../firebase.js (initialises firebase-admin from FIREBASE_SERVICE_ACCOUNT_PATH;
// a stub under NODE_ENV=test), so requiring this file never needs a key on disk.
const admin = require('../firebase');

async function sendPushNotification(token, title, body, data = {}) {
  if (!token) return;

  const message = {
    token,
    data: {
      ...data,
      title,  // 👈 Include title here
      body,   // 👈 Include body here
    },
    android: {
      priority: 'high',
      notification: {
        title: String(title || ''), // without a title Android may show a blank entry
        body: String(body || ''),
        sound: 'default',
        channelId: 'chatter', // should match the one used in the app
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
      },
    },
    apns: {
      headers: {
        'apns-priority': '10',
      },
      payload: {
        aps: {
          alert: {
            title,
            body,
          },
          sound: 'default',
        },
      },
    },
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('✅ Notification sent:', response);
  } catch (error) {
    console.error('❌ Error sending notification:', error.message);
  }
}

module.exports = sendPushNotification;
