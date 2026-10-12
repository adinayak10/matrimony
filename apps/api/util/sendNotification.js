const path = require('path');
const admin = require('firebase-admin');

// Reuse the app initialised by ../firebase.js; only load the key if nothing did
if (!admin.apps.length) {
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, '..', 'serviceAccountKey.json'));
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

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
