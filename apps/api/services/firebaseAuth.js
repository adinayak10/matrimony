'use strict';
/**
 * services/firebaseAuth.js — verifyFirebase(req, { provider }) (A3.2).
 *
 * - `firebaseToken` (body) must be a non-empty string -> 400 otherwise.
 * - admin.auth().verifyIdToken(token, true)  (checkRevoked) -> 401 on failure.
 * - uid and email come from the DECODED token; body email/firebaseUid are
 *   ignored (they were the spoof vector).
 * - provider:'google' requires decoded.firebase.sign_in_provider === 'google.com'.
 * - Lookup: User.findOne({firebase_uid: uid}), else User.findOne({email}) with
 *   the lowercased email (run tools/cleanup/lowercase-emails.js first), and
 *   link firebase_uid only when it is empty.
 *
 * Returns { user|null, uid, email, decoded, linked }.
 * Throws FirebaseAuthError { status, code, message }.
 */
const admin = require('../firebase');
const User = require('../models/User');

class FirebaseAuthError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'FirebaseAuthError';
    this.status = status;
    this.code = code;
  }
}

const PROVIDER_IDS = {
  google: 'google.com',
  password: 'password',
  phone: 'phone',
};

async function verifyFirebase(req, { provider } = {}) {
  const raw = req && req.body ? req.body.firebaseToken : undefined;
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new FirebaseAuthError(
      400,
      'FIREBASE_TOKEN_REQUIRED',
      'Firebase token is required. Please update the app and try again.'
    );
  }

  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(raw.trim(), true);
  } catch (err) {
    // Log why (expired, wrong project/audience, clock skew, credentials not loaded);
    // Firebase's messages never contain the token itself.
    // eslint-disable-next-line no-console
    console.warn('[firebaseAuth] verifyIdToken failed:', (err && err.code) || 'unknown', '-', (err && err.message) || String(err));
    throw new FirebaseAuthError(401, 'INVALID_FIREBASE_TOKEN', 'Invalid Firebase token');
  }

  const uid = decoded && decoded.uid ? String(decoded.uid) : '';
  if (!uid) throw new FirebaseAuthError(401, 'INVALID_FIREBASE_TOKEN', 'Invalid Firebase token');
  const email = String((decoded && decoded.email) || '')
    .trim()
    .toLowerCase();

  if (provider) {
    const want = PROVIDER_IDS[provider] || provider;
    const got = decoded.firebase && decoded.firebase.sign_in_provider;
    if (got !== want) {
      throw new FirebaseAuthError(401, 'WRONG_PROVIDER', 'This sign-in method is not allowed here');
    }
  }

  let user = await User.findOne({ firebase_uid: uid });
  let linked = false;

  if (!user && email) {
    user = await User.findOne({ email });
    if (user) {
      if (!user.firebase_uid) {
        user.firebase_uid = uid;
        await user.save();
        linked = true;
      } else if (user.firebase_uid !== uid) {
        // Firebase keeps one account per email, so this only happens after a
        // project migration; never relink silently, just log for the owner.
        // eslint-disable-next-line no-console
        console.warn('[firebaseAuth] uid mismatch for existing email account', { userId: String(user._id) });
      }
    }
  }

  return { user, uid, email, decoded, linked };
}

/**
 * Express helper: translate a FirebaseAuthError into a JSON response.
 * Returns true when it handled the error.
 */
function sendFirebaseError(res, err) {
  if (!(err instanceof FirebaseAuthError)) return false;
  res.status(err.status).json({ status: false, code: err.code, message: err.message });
  return true;
}

module.exports = { verifyFirebase, FirebaseAuthError, sendFirebaseError, PROVIDER_IDS };
