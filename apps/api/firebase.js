const path = require('path');
const admin = require('firebase-admin');
// Absolute path from env in prod (SHARED/secrets); repo-local file for dev
const serviceAccount = require(process.env.FIREBASE_SERVICE_ACCOUNT_PATH || path.join(__dirname, 'serviceAccountKey.json'));

// Check if Firebase app already exists to prevent duplicate initialization
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

module.exports = admin;
