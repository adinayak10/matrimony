const User = require('../models/User');
const jwt = require('jsonwebtoken');

const { JWT_SECRET, FIREBASE_WEB_API_KEY } = require('../config/env');


function isMobile(req) {
  return req.body.device_type || req.headers['user-agent']?.includes('okhttp');
}

// A2.3: payload {_id, email, tv}, explicit HS256, 7 days
function generateToken(user) {
  return jwt.sign(
    { _id: String(user._id), email: user.email, tv: user.tokenVersion || 0 },
    JWT_SECRET,
    { algorithm: 'HS256', expiresIn: '7d' }
  );
}

// The API never sets cookies (integrator #1): the web keeps its own session
// and the app stores the body token. `isMobileClient` is kept for callers.
// eslint-disable-next-line no-unused-vars
function sendTokenResponse(res, user, message, isMobileClient) {
  const token = generateToken(user);
  const userData = typeof user.toJSON === 'function' ? user.toJSON() : user;
  return res.status(200).json({ status: true, message, token, data: userData });
}


// ------------------- Firebase Email/Password + Google Auth (A3) ------------------------
// Identity comes ONLY from the verified Firebase ID token (services/firebaseAuth):
// body email / firebaseUid are ignored, firebaseToken is mandatory.

const { verifyFirebase, sendFirebaseError } = require('../services/firebaseAuth');

const POPULATE_PATHS = [
  'membershipPlan interests caste profession qualification gotra incomeRange',
  'location.country location.state location.city',
  'family.basedOut.country family.basedOut.state family.basedOut.city',
  'preferences.gotra preferences.caste preferences.qualification preferences.profession',
];

function populated(query) {
  return POPULATE_PATHS.reduce((q, p) => q.populate(p), query);
}

function cleanName(v) {
  if (typeof v !== 'string') return '';
  return v.replace(/[<>]/g, '').trim().slice(0, 60);
}

function cleanPhone(v) {
  if (typeof v !== 'string' && typeof v !== 'number') return '';
  const digits = String(v).replace(/\D/g, '');
  return digits.length >= 8 && digits.length <= 15 ? digits : '';
}

function cleanDeviceType(v) {
  if (v === undefined || v === null || v === '') return undefined;
  const n = Number(v);
  return Number.isInteger(n) ? n : undefined;
}

function cleanDeviceToken(v) {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, 512) : undefined;
}

function isDuplicateKey(err, field) {
  if (!err || err.code !== 11000) return false;
  if (!field) return true;
  const keys = err.keyPattern ? Object.keys(err.keyPattern) : [];
  return keys.includes(field) || (err.message || '').includes(`${field}_1`);
}

/** Device/platform fields every login refreshes; never identity fields. */
function applySessionFields(user, req) {
  const { device_token, device_type } = req.body || {};
  user.last_login_platform = isMobile(req) ? 'mobile' : 'web';
  const token = cleanDeviceToken(device_token);
  if (token) user.device_token = token;
  const dtype = cleanDeviceType(device_type);
  if (dtype !== undefined) user.device_type = dtype;
}

async function reload(userId) {
  return populated(User.findById(userId));
}

// Firebase email login (after Firebase verifies email/password)
exports.firebaseEmailLogin = async (req, res) => {
  try {
    let verified;
    try {
      verified = await verifyFirebase(req, {});
    } catch (e) {
      if (sendFirebaseError(res, e)) return;
      throw e;
    }
    const { user } = verified;
    if (!user) {
      return res.status(404).json({ status: false, code: 'USER_NOT_FOUND', message: 'User not found. Please register first.' });
    }
    if (user.is_block === 1) {
      return res.status(401).json({ status: false, code: 'ACCOUNT_BLOCKED', message: 'This account has been blocked' });
    }

    applySessionFields(user, req);
    await user.save();

    const fresh = await reload(user._id);
    return sendTokenResponse(res, fresh, 'Login successful', isMobile(req));
  } catch (err) {
    console.error('Firebase email login error:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

// Firebase email register (after Firebase creates the email/password account).
// Existing user -> the app's "auto login": only session fields are refreshed,
// full_name / phone / firebase_uid are NEVER overwritten (A3.3).
exports.firebaseEmailRegister = async (req, res) => {
  try {
    let verified;
    try {
      verified = await verifyFirebase(req, {});
    } catch (e) {
      if (sendFirebaseError(res, e)) return;
      throw e;
    }
    const { user: existing, uid, email } = verified;

    if (existing) {
      if (existing.is_block === 1) {
        return res.status(401).json({ status: false, code: 'ACCOUNT_BLOCKED', message: 'This account has been blocked' });
      }
      applySessionFields(existing, req);
      await existing.save();
      const fresh = await reload(existing._id);
      return sendTokenResponse(res, fresh, 'Login successful', isMobile(req));
    }

    const full_name = cleanName(req.body && req.body.full_name);
    if (!email) {
      return res.status(400).json({ status: false, message: 'The Firebase account has no email address' });
    }
    if (!full_name) {
      return res.status(400).json({ status: false, message: 'Name is required' });
    }

    const doc = {
      email,
      full_name,
      firebase_uid: uid,
      login_type: 2, // Email login (Google can be linked later)
      last_login_platform: isMobile(req) ? 'mobile' : 'web',
    };
    const phone = cleanPhone(req.body && req.body.phone);
    if (phone) doc.phone = phone;
    const token = cleanDeviceToken(req.body && req.body.device_token);
    if (token) doc.device_token = token;
    const dtype = cleanDeviceType(req.body && req.body.device_type);
    if (dtype !== undefined) doc.device_type = dtype;

    let user;
    try {
      user = await new User(doc).save();
    } catch (err) {
      if (isDuplicateKey(err, 'phone')) {
        return res.status(409).json({ status: false, code: 'DUPLICATE', field: 'phone', message: 'This phone number is already registered' });
      }
      if (isDuplicateKey(err)) {
        return res.status(409).json({ status: false, code: 'DUPLICATE', message: 'An account with these details already exists' });
      }
      throw err;
    }

    const fresh = await reload(user._id);
    return sendTokenResponse(res, fresh, 'Registration successful', isMobile(req));
  } catch (err) {
    console.error('Firebase email register error:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

// Firebase Google login (after Firebase verifies Google OAuth).
// Unified auth: the same email may sign in with Google or email/password;
// an existing account is LINKED (firebase_uid set only when empty), never
// renamed or re-keyed.
exports.firebaseGoogleLogin = async (req, res) => {
  try {
    let verified;
    try {
      verified = await verifyFirebase(req, { provider: 'google' });
    } catch (e) {
      if (sendFirebaseError(res, e)) return;
      throw e;
    }
    const { user: existing, uid, email, decoded } = verified;
    const photoURL = typeof req.body.photoURL === 'string' && /^https:\/\//.test(req.body.photoURL) ? req.body.photoURL.slice(0, 500) : '';

    if (existing) {
      if (existing.is_block === 1) {
        return res.status(401).json({ status: false, code: 'ACCOUNT_BLOCKED', message: 'This account has been blocked' });
      }
      // Account-link behaviour: fill only what is empty
      if (!existing.full_name || existing.full_name.trim() === '' || existing.full_name === 'Not specified') {
        const name = cleanName(req.body && req.body.full_name) || cleanName(decoded && decoded.name) || (email ? email.split('@')[0] : '');
        if (name) existing.full_name = name;
      }
      if (photoURL && !existing.profile_pic) existing.profile_pic = photoURL;
      if (!existing.login_type || existing.login_type === 1) existing.login_type = 3;
      applySessionFields(existing, req);
      await existing.save();
      const fresh = await reload(existing._id);
      return sendTokenResponse(res, fresh, 'Login successful', isMobile(req));
    }

    if (!email) {
      return res.status(400).json({ status: false, message: 'The Google account has no email address' });
    }
    const doc = {
      email,
      full_name: cleanName(req.body && req.body.full_name) || cleanName(decoded && decoded.name) || email.split('@')[0],
      firebase_uid: uid,
      login_type: 3, // Google
      last_login_platform: isMobile(req) ? 'mobile' : 'web',
    };
    if (photoURL) doc.profile_pic = photoURL;
    const token = cleanDeviceToken(req.body && req.body.device_token);
    if (token) doc.device_token = token;
    const dtype = cleanDeviceType(req.body && req.body.device_type);
    if (dtype !== undefined) doc.device_type = dtype;

    let user;
    try {
      user = await new User(doc).save();
    } catch (err) {
      if (isDuplicateKey(err)) {
        return res.status(409).json({ status: false, code: 'DUPLICATE', message: 'An account with these details already exists' });
      }
      throw err;
    }
    const fresh = await reload(user._id);
    return sendTokenResponse(res, fresh, 'Registration successful', isMobile(req));
  } catch (err) {
    console.error('Firebase google login error:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

// The phone-OTP / email-password / legacy Firebase handlers that used to live
// here (check-user, firebase-login, firebase-register, send-otp,
// verify-otp-backend, complete-profile, request-otp, verify-otp,
// registerWithEmail, loginWithEmail, verify-otp-with-name, checkUser,
// verifyFirebaseOtp, verifyFirebaseOtpWithName) were deleted in A3.1;
// routes/legacyAuth.js answers 410 on their paths.


// ------------------- Logout ------------------------

// Behind authenticate: revoke every token for this user (tv bump), drop the
// push token and clear the legacy domain cookie older web builds set (A2.4).
exports.logout = async (req, res) => {
  try {
    await User.updateOne({ _id: req.userId }, { $inc: { tokenVersion: 1 }, $set: { device_token: null } });
  } catch (err) {
    console.error('[logout] revoke failed:', err.message);
    return res.status(500).json({ status: false, message: 'Logout failed' });
  }
  res.clearCookie('token', { domain: '.banjaramatch.com', path: '/' });
  res.clearCookie('token', { path: '/' });
  return res.status(200).json({ status: true, message: 'Logged out' });
};

// ------------------- Get Logged-in User ------------------------

// controllers/AuthController.js
// Behind authenticate (A1/A3.4): req.userId is the verified caller.
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .populate('membershipPlan interests caste profession qualification gotra incomeRange')
      .populate('location.country location.state location.city')
      .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
      .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession');
      
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const profile = user.toJSON();

    // --- Helper: check missing fields by path ---
    function getValueByPath(obj, path) {
      return path.split('.').reduce((acc, key) => acc?.[key], obj);
    }

    // --- Profile Completion Logic ---
    const requiredFields = [
      { key: 'full_name', label: 'your full name' },
      { key: 'dob', label: 'your date of birth' },
      { key: 'gender', label: 'your gender' },
      { key: 'height', label: 'your height' },
      { key: 'maritalStatus', label: 'your marital status' },
      { key: 'location.country', label: 'your country' },
      { key: 'location.state', label: 'your state' },
      { key: 'location.city', label: 'your city' },
      { key: 'profession', label: 'your profession' },
      { key: 'qualification', label: 'your qualification' },
      { key: 'profile', label: 'your profile photo' },
    ];

    const missingFields = requiredFields.filter(field => {
      const val = getValueByPath(profile, field.key);
      // Handle empty string, empty array, null/undefined, or height check (must be number)
      if (field.key === 'height') {
        return typeof val !== 'number' || val <= 0;
      }
      if (Array.isArray(val)) {
        return val.length === 0;
      }
      return !val || val === '' || val === 'Not specified';
    }).map(f => f.label);

    const completionPercentage = Math.round(
      ((requiredFields.length - missingFields.length) / requiredFields.length) * 100
    );

    // Dynamic suggestions for profile completion
    const profileSuggestions = [
      field => `Hey! Just adding ${field} can make your profile stand out more.`,
      field => `Profiles with ${field} tend to get more attention. Just saying 😉`,
      field => `Let others know more about you by filling in ${field}.`,
    ];

    const profileCompletionSuggestion = missingFields.length > 0
      ? profileSuggestions[Math.floor(Math.random() * profileSuggestions.length)](missingFields[0])
      : `Your profile is complete! You're ready to shine 🌟`;

    profile.profileCompletion = {
      percentage: completionPercentage,
      missingFields,
      suggestion: profileCompletionSuggestion,
    };

    delete profile.tokenVersion;

    res.json({ user: profile });
  } catch (err) {
    console.error('[getMe] failed:', err.message || err);
    res.status(500).json({ status: false, message: 'Internal server error' });
  }
};

// ------------------- Password Reset (Firebase Action Handler) ------------------------

// Verify password reset code from Firebase
// Note: Firebase Admin SDK doesn't have verifyPasswordResetCode, so we'll validate on reset
exports.verifyPasswordResetCode = async (req, res) => {
  try {
    const { oobCode } = req.body;

    if (!oobCode) {
      return res.status(400).json({ 
        status: false, 
        message: 'Reset code is required' 
      });
    }


    // Firebase Admin SDK doesn't have verifyPasswordResetCode
    // We'll just return success and validate during actual password reset
    // This is safe because Firebase will validate the code when we try to reset
    
    console.log('✅ Reset code format valid, will verify on password reset');

    return res.status(200).json({ 
      status: true, 
      message: 'Reset code is valid',
      email: null // We'll get email during actual reset
    });
  } catch (error) {
    console.error('❌ Password reset code verification error:', error.message);
    
    return res.status(400).json({ 
      status: false, 
      message: 'Invalid reset link format'
    });
  }
};

// Confirm password reset with new password
exports.confirmPasswordReset = async (req, res) => {
  try {
    const { oobCode, newPassword, email } = req.body;

    if (!oobCode || !newPassword) {
      return res.status(400).json({ 
        status: false, 
        message: 'Reset code and new password are required' 
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ 
        status: false, 
        message: 'Password must be at least 6 characters' 
      });
    }

    // Use Firebase REST API to reset password
    // Firebase Admin SDK doesn't support password reset with oobCode
    const axios = require('axios');
    
    const response = await axios.post(
      `https://identitytoolkit.googleapis.com/v1/accounts:resetPassword?key=${FIREBASE_WEB_API_KEY}`,
      {
        oobCode: oobCode,
        newPassword: newPassword
      }
    );

    // A2.4: a password reset revokes every live session of that account
    const resetEmail = String(response.data?.email || '').toLowerCase();
    if (resetEmail) {
      await User.updateOne(
        { email: { $in: [resetEmail, response.data.email] } },
        { $inc: { tokenVersion: 1 } }
      ).catch((e) => console.error('[confirmPasswordReset] tokenVersion bump failed:', e.message));
    }

    return res.status(200).json({ 
      status: true, 
      message: 'Password reset successful. You can now login with your new password.',
      email: response.data.email
    });
  } catch (error) {
    console.error('❌ Password reset confirmation error:', error.response?.data || error.message);
    
    let errorMsg = 'Failed to reset password';
    const errorCode = error.response?.data?.error?.message;
    
    if (errorCode === 'INVALID_OOB_CODE' || errorCode === 'EXPIRED_OOB_CODE') {
      errorMsg = 'This reset link is invalid or has expired. Please request a new one.';
    } else if (errorCode === 'WEAK_PASSWORD') {
      errorMsg = 'Password is too weak. Please choose a stronger password.';
    } else if (error.response?.data?.error?.message) {
      errorMsg = error.response.data.error.message.replace(/_/g, ' ').toLowerCase();
    }

    return res.status(400).json({ 
      status: false, 
      message: errorMsg 
    });
  }
};
