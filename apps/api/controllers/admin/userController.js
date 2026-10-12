'use strict';
// Admin User Management Controller (C4.1 + A2.4 + A6.12 + C4.12)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../../models/User');
const UserPhoto = require('../../models/UserPhoto');
const FriendshipRequest = require('../../models/FriendShipRequest');
const Message = require('../../models/Message');
const Notification = require('../../models/Notification');
const ActivityLog = require('../../models/ActivityLog');
const Block = require('../../models/Block');
const admin = require('../../firebase'); // Firebase Admin SDK
const sendNotification = require('../../util/sendNotification');
const { sendProfileVerifiedEmail } = require('../../services/emailService');
const { cascadeDeleteUser } = require('../../services/userCascade');
const { record: audit } = require('../../services/auditLog');
const escapeRegex = require('../../utils/escapeRegex');
const { GENDER_ENUM, MARITAL_STATUS_ENUM } = require('../../enum/enum');

// Never returned to the admin UI (user-detail never renders them)
const ADMIN_USER_SELECT = '-password -device_token -firebase_uid -coordinates -block_user_ids -blocked -tokenVersion -personalityMap';
const SORT_WHITELIST = new Set(['-createdAt', 'createdAt', '-lastSeen', 'lastSeen', 'full_name', '-full_name', '-updatedAt']);
const isId = (v) => mongoose.isValidObjectId(v);

/**
 * GET /api/admin/users?page&limit&search&gender&platform&verified&blocked&sort
 */
exports.getAllUsers = async (req, res) => {
  try {
    const { search = '', gender, platform, verified, blocked, status, registration_platform } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const sort = SORT_WHITELIST.has(String(req.query.sort)) ? String(req.query.sort) : '-createdAt';

    const query = {};
    const q = escapeRegex(search, 40);
    if (q) {
      query.$or = [
        { full_name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { phone: { $regex: q, $options: 'i' } },
      ];
    }
    if (gender && GENDER_ENUM.includes(gender)) query.gender = gender;
    const plat = platform || registration_platform;
    if (['mobile', 'web'].includes(plat)) query.last_login_platform = plat;
    if (verified === '1' || verified === 'true') query.is_verified = 1;
    if (verified === '0' || verified === 'false') query.is_verified = 0;
    if (blocked === '1' || status === 'blocked') query.is_block = 1;
    if (blocked === '0' || status === 'active') query.is_block = 0;

    const [total, users] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
        .select(ADMIN_USER_SELECT)
        .populate('qualification profession caste gotra incomeRange interests membershipPlan')
        .populate('location.country location.state location.city')
        .sort(sort)
        .limit(limit)
        .skip((page - 1) * limit)
        .lean(),
    ]);

    const usersWithPlatform = users.map((user) => ({
      ...user,
      platform_label: user.last_login_platform === 'mobile' ? 'Mobile' : 'Web',
    }));

    res.json({
      status: true,
      data: usersWithPlatform,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error('Get all users error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/users/:id — full details (photos, stats), never the hash
 */
exports.getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });

    const user = await User.findById(id)
      .select(ADMIN_USER_SELECT)
      .populate('qualification profession caste gotra incomeRange interests membershipPlan')
      .populate('location.country location.state location.city')
      .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
      .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession')
      .lean();

    if (!user) {
      return res.status(404).json({ status: false, message: 'User not found' });
    }

    const [photos, sentRequests, receivedRequests, sentMessages, receivedMessages] = await Promise.all([
      UserPhoto.find({ userId: id }).sort({ order: 1, uploadedAt: -1 }).lean(),
      FriendshipRequest.countDocuments({ requester: id }),
      FriendshipRequest.countDocuments({ recipient: id }),
      Message.countDocuments({ sender: id }),
      Message.countDocuments({ receiver: id }),
    ]);

    res.json({
      status: true,
      data: {
        ...user,
        platform_label: user.last_login_platform === 'mobile' ? 'Mobile' : 'Web',
        photos,
        stats: { sentRequests, receivedRequests, sentMessages, receivedMessages },
      },
    });
  } catch (error) {
    console.error('Get user by ID error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * PUT /api/admin/users/:id — allowlisted profile fields only (C4.1).
 * is_verified / is_block / membershipPlan / role / password / firebase_uid /
 * device_token have their own endpoints or are never settable here.
 */
const UPDATE_ALLOW = ['full_name', 'email', 'phone', 'gender', 'dob', 'bio', 'maritalStatus', 'height'];
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });
    const body = req.body || {};

    const $set = {};
    const rejected = [];
    for (const key of Object.keys(body)) {
      if (!UPDATE_ALLOW.includes(key)) {
        rejected.push(key);
        continue;
      }
      const v = body[key];
      if (v === undefined) continue;
      if (key === 'email' || key === 'phone') {
        // empty values are dropped (sparse unique index), never set to null
        if (v === null || String(v).trim() === '') continue;
        $set[key] = key === 'email' ? String(v).trim().toLowerCase().slice(0, 254) : String(v).replace(/\D/g, '').slice(0, 15);
      } else if (key === 'gender') {
        if (!GENDER_ENUM.includes(v)) return res.status(400).json({ status: false, message: 'Invalid gender' });
        $set.gender = v;
      } else if (key === 'maritalStatus') {
        if (v !== null && v !== '' && !MARITAL_STATUS_ENUM.includes(v)) return res.status(400).json({ status: false, message: 'Invalid maritalStatus' });
        $set.maritalStatus = v || null;
      } else if (key === 'dob') {
        const d = v ? new Date(v) : null;
        if (d && Number.isNaN(d.getTime())) return res.status(400).json({ status: false, message: 'Invalid dob' });
        $set.dob = d;
      } else if (key === 'height') {
        if (v === null || v === '') { $set.height = null; continue; }
        const n = Number(v);
        if (!Number.isFinite(n)) return res.status(400).json({ status: false, message: 'Invalid height' });
        $set.height = n;
      } else {
        $set[key] = typeof v === 'string' ? v.replace(/[<>]/g, '').trim().slice(0, key === 'bio' ? 2000 : 100) : v;
      }
    }
    const forbidden = rejected.filter((k) => ['is_verified', 'is_block', 'membershipPlan', 'role', 'password', 'firebase_uid', 'device_token', 'tokenVersion'].includes(k));
    if (forbidden.length) {
      return res.status(400).json({ status: false, message: `These fields cannot be changed here: ${forbidden.join(', ')}` });
    }
    if (!Object.keys($set).length) {
      return res.status(400).json({ status: false, message: 'No updatable fields in request' });
    }

    const before = await User.findById(id).select(UPDATE_ALLOW.join(' ')).lean();
    if (!before) return res.status(404).json({ status: false, message: 'User not found' });

    let user;
    try {
      user = await User.findByIdAndUpdate(id, { $set }, { new: true, runValidators: true })
        .select(ADMIN_USER_SELECT)
        .populate('qualification profession caste gotra incomeRange interests membershipPlan')
        .populate('location.country location.state location.city')
        .populate('family.basedOut.country family.basedOut.state family.basedOut.city')
        .populate('preferences.gotra preferences.caste preferences.qualification preferences.profession');
    } catch (err) {
      if (err && err.code === 11000) {
        return res.status(409).json({ status: false, message: 'Email or phone already belongs to another account' });
      }
      if (err && err.name === 'ValidationError') {
        return res.status(400).json({ status: false, message: err.message });
      }
      throw err;
    }
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    audit(req, 'user.update', { type: 'user', id }, { before, after: $set });
    res.json({ status: true, message: 'User updated successfully', data: user });
  } catch (error) {
    console.error('Update user error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/users/:id/block {block, reason} — A2.4: bumps tokenVersion
 * so the ban/unban is immediate (next REST call -> 401 ACCOUNT_BLOCKED).
 */
exports.toggleBlockUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { block, reason } = req.body || {};
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });
    if (String(id) === req.userId) return res.status(400).json({ status: false, message: 'You cannot block your own account' });

    const before = await User.findById(id).select('is_block block_reason').lean();
    if (!before) return res.status(404).json({ status: false, message: 'User not found' });

    const $set = { is_block: block ? 1 : 0 };
    if (block && typeof reason === 'string' && reason.trim()) $set.block_reason = reason.trim().slice(0, 500);
    if (!block) $set.block_reason = null;

    const user = await User.findByIdAndUpdate(id, { $set, $inc: { tokenVersion: 1 } }, { new: true }).select('is_block');

    audit(req, block ? 'user.block' : 'user.unblock', { type: 'user', id }, { before, after: $set });
    res.json({
      status: true,
      message: block ? 'User blocked successfully' : 'User unblocked successfully',
      data: { is_block: user.is_block },
    });
  } catch (error) {
    console.error('Toggle block user error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/users/:id/verify {verify}
 */
exports.toggleVerifyUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { verify } = req.body || {};
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });

    const user = await User.findById(id).select('_id full_name email device_token is_verified');
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    const before = { is_verified: user.is_verified };
    user.is_verified = verify ? 1 : 0;
    await user.save();

    if (verify) {
      const body = 'Congratulations! Your profile has been verified by our team.';
      if (user.device_token) {
        try {
          await sendNotification(user.device_token, 'Profile Verified', body, { type: 'profile_verified', userId: user._id.toString() });
          await Notification.create({ type: 'profile_updated', toUser: user._id, content: body, data: { verified: true, timestamp: new Date() } });
        } catch (notifError) {
          console.error('[verify] push failed:', notifError.message);
        }
      }
      if (user.email) {
        sendProfileVerifiedEmail({ full_name: user.full_name, email: user.email }).catch((e) =>
          console.error('[verify] email failed:', e.message)
        );
      }
    }

    audit(req, verify ? 'user.verify' : 'user.unverify', { type: 'user', id }, { before, after: { is_verified: user.is_verified } });
    res.json({
      status: true,
      message: verify ? 'User verified successfully' : 'User unverified',
      data: { is_verified: user.is_verified },
    });
  } catch (error) {
    console.error('Verify user error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * DELETE /api/admin/users/:id — full cascade through services/userCascade
 * (A6.12), plus the Firebase Auth account.
 */
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });
    if (String(id) === req.userId) return res.status(400).json({ status: false, message: 'You cannot delete your own account' });

    const user = await User.findById(id).select('_id email full_name firebase_uid role').lean();
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    if (user.role === 'admin') return res.status(400).json({ status: false, message: 'Admin accounts cannot be deleted here' });

    const result = await cascadeDeleteUser(id);

    if (user.firebase_uid && process.env.NODE_ENV !== 'test') {
      try {
        await admin.auth().deleteUser(user.firebase_uid);
      } catch (firebaseError) {
        if (firebaseError.code !== 'auth/user-not-found') {
          console.error('[deleteUser] Firebase deletion failed:', firebaseError.message);
        }
      }
    }

    audit(req, 'user.delete', { type: 'user', id }, { before: { email: user.email, full_name: user.full_name }, after: { counts: result.counts, files: result.files } });
    res.json({ status: true, message: 'User and all related data deleted successfully', data: { counts: result.counts, files: result.files } });
  } catch (error) {
    console.error('Delete user error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * POST /api/admin/users/:id/reset-password {newPassword} — revokes sessions (A2.4)
 */
exports.resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body || {};
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });

    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      return res.status(400).json({ status: false, message: 'Password must be at least 8 characters long' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findByIdAndUpdate(id, { $set: { password: hashedPassword }, $inc: { tokenVersion: 1 } }, { new: true }).select('_id');
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });

    audit(req, 'user.resetPassword', { type: 'user', id });
    res.json({ status: true, message: 'Password reset successfully' });
  } catch (error) {
    console.error('Reset password error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/users/:id/activity
 */
exports.getUserActivity = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });
    const activities = await ActivityLog.find({ userId: id }).sort({ timestamp: -1 }).limit(50).lean();
    res.json({ status: true, data: activities });
  } catch (error) {
    console.error('Get user activity error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * GET /api/admin/users/:id/blocks — read-only list of users this user blocked
 */
exports.getUserBlocks = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) return res.status(404).json({ status: false, message: 'User not found' });
    const blocks = await Block.find({ blocker: id })
      .populate('blocked', 'full_name email profile is_block')
      .sort('-createdAt')
      .lean();
    res.json({ status: true, data: blocks });
  } catch (error) {
    console.error('Get user blocks error:', error.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
};

/**
 * POST / DELETE /api/admin/users/:id/highlight (A4.2)
 * The only field this can touch is is_highlighted.
 */
exports.setHighlight = (value) => async (req, res) => {
  try {
    const { id } = req.params;
    if (!isId(id)) {
      return res.status(400).json({ status: false, message: 'Invalid user id' });
    }
    const user = await User.findByIdAndUpdate(
      id,
      { $set: { is_highlighted: !!value } },
      { new: true, runValidators: false }
    ).select('_id full_name is_highlighted');
    if (!user) return res.status(404).json({ status: false, message: 'User not found' });
    audit(req, value ? 'user.highlight' : 'user.unhighlight', { type: 'user', id });
    return res.json({
      status: true,
      message: value ? 'User highlighted' : 'User highlight removed',
      data: { _id: user._id, is_highlighted: user.is_highlighted },
    });
  } catch (error) {
    console.error('setHighlight error:', error.message);
    return res.status(500).json({ status: false, message: 'Server error' });
  }
};
