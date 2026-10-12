const path = require('path');
const admin = require('firebase-admin');

// Under NODE_ENV=test no credentials are loaded: verifyIdToken always throws,
// so services/firebaseAuth.js answers 401 and the suites never touch Firebase.
if (process.env.NODE_ENV === 'test') {
  module.exports = {
    auth: () => ({
      verifyIdToken: async () => {
        throw new Error('firebase stub: verifyIdToken is unavailable in tests');
      },
    }),
    apps: [],
    messaging: () => ({
      send: async () => {
        throw new Error('firebase stub: messaging is unavailable in tests');
      },
    }),
  };
} else {
  // Absolute path from env in prod (SHARED/secrets); repo-local file for dev
  const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccountKey.json'));

  // Check if Firebase app already exists to prevent duplicate initialization
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  module.exports = admin;
}
