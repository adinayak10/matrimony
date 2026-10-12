'use strict';
const User = require('../../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../../config/env');

// A real bcrypt hash of a random string: bcrypt.compare always runs against
// it when the email is unknown or has no password, so timing never reveals
// whether an admin account exists (A2.5).
const DUMMY_HASH = bcrypt.hashSync('dummy-' + require('crypto').randomBytes(16).toString('hex'), 10);
const GENERIC_401 = { status: false, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };

/**
 * Admin Login with Email — compare BEFORE the role check, one generic 401.
 * Signs { _id, email, role:'admin', tv, aud:'admin' } for 8 h. No cookie:
 * the admin app keeps its own session and reads the token from the body.
 */
exports.adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return res.status(400).json({ status: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() })
      .select('+password _id email full_name role is_block tokenVersion');

    const isMatch = await bcrypt.compare(password, (user && user.password) || DUMMY_HASH);

    if (!user || !isMatch || user.role !== 'admin' || user.is_block === 1) {
      return res.status(401).json(GENERIC_401);
    }

    const tv = user.tokenVersion || 0;
    const token = jwt.sign(
      { _id: String(user._id), email: user.email, role: 'admin', tv, aud: 'admin' },
      JWT_SECRET,
      { algorithm: 'HS256', expiresIn: '8h' }
    );

    return res.status(200).json({
      status: true,
      message: 'Login successful',
      token,
      data: {
        _id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
      },
    });
  } catch (err) {
    console.error('❌ [Admin Login] Error:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * Get Admin User Info — runs behind adminAuth (routes/admin.js), so the
 * token has already been verified and req.user is the admin.
 */
exports.getAdminMe = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password -device_token -firebase_uid -tokenVersion');
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    return res.status(200).json({ status: true, data: user });
  } catch (err) {
    console.error('❌ [Admin GetMe] Error:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/auth/change-password {currentPassword, newPassword} (C4.8)
 * bcrypt-verified, >= 12 chars, revokes every other admin session (tokenVersion).
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string') {
      return res.status(400).json({ status: false, message: 'currentPassword and newPassword are required' });
    }
    if (newPassword.length < 12) {
      return res.status(400).json({ status: false, message: 'New password must be at least 12 characters' });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({ status: false, message: 'New password must differ from the current one' });
    }

    const user = await User.findById(req.userId).select('+password _id role');
    if (!user || user.role !== 'admin') return res.status(401).json(GENERIC_401);
    const ok = await bcrypt.compare(currentPassword, user.password || DUMMY_HASH);
    if (!ok) return res.status(401).json({ status: false, code: 'INVALID_CREDENTIALS', message: 'Current password is incorrect' });

    const hashed = await bcrypt.hash(newPassword, 12);
    await User.updateOne({ _id: user._id }, { $set: { password: hashed }, $inc: { tokenVersion: 1 } });
    require('../../services/auditLog').recordAsync(req, 'admin.changePassword', { type: 'user', id: String(user._id) });

    // The caller's own token is now revoked too: the admin logs in again.
    return res.status(200).json({ status: true, message: 'Password changed. Please sign in again.', reauth: true });
  } catch (err) {
    console.error('[Admin ChangePassword] Error:', err.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * Admin Logout — the API holds no admin session; clear the legacy cookie the
 * old panel used to set so stale browsers stop sending it.
 */
exports.adminLogout = (req, res) => {
  res.clearCookie('token', { domain: '.banjaramatch.com', path: '/' });
  return res.status(200).json({ status: true, message: 'Logged out successfully' });
};
