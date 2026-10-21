'use strict';
/**
 * services/verificationService.js — the one place a member becomes verified
 * (feature expansion A1). Used by the verification queue (approve/reject) and
 * by the older admin toggle POST /api/admin/users/:id/verify.
 *
 *   markVerified(user, { reviewerId, verificationId })
 *     is_verified=1 + verifiedAt, closes any pending request as approved,
 *     Notification 'verification_approved' + push + congratulation email.
 *   markRejected(user, reason, { verificationId })
 *     Notification 'verification_rejected' + push (the request row itself is
 *     updated by the caller).
 *   unverify(userId)          is_verified=0, verifiedAt=null
 *   verificationFile(name)    absolute path inside PRIVATE_UPLOADS_DIR/verification, or null
 *   removeFiles(row)          unlink a request's files (quiet), returns count
 *
 * Notifications/push/email never throw into the caller.
 */
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Notification = require('../models/Notification');
const Verification = require('../models/Verification');
const push = require('./push');
const { verificationDir } = require('../middleware/privateUpload');

const APPROVED_TEXT = 'Congratulations! Your profile has been verified by our team.';

function idOf(u) {
  return u && typeof u === 'object' && u._id !== undefined ? u._id : u;
}

async function markVerified(userOrId, { reviewerId = null, verificationId = null } = {}) {
  const id = idOf(userOrId);
  const now = new Date();
  const user = await User.findByIdAndUpdate(id, { $set: { is_verified: 1, verifiedAt: now } }, { new: true })
    .select('_id full_name email device_token settings is_block is_verified verifiedAt')
    .lean();
  if (!user) return null;

  // A direct admin verify also closes the member's open request
  const close = { user: user._id, status: 'pending' };
  if (verificationId) close._id = { $ne: verificationId };
  await Verification.updateMany(close, { $set: { status: 'approved', reviewedBy: reviewerId, reviewedAt: now } }).catch(() => {});

  try {
    await Notification.create({
      type: 'verification_approved',
      toUser: user._id,
      content: APPROVED_TEXT,
      data: { verified: true, verificationId: verificationId ? String(verificationId) : null },
    });
  } catch (err) {
    console.error('[verification] notification failed:', err.message);
  }
  push
    .sendToUser(user, 'Profile Verified', APPROVED_TEXT, { type: 'verification_approved', userId: String(user._id) })
    .catch(() => {});
  if (user.email) {
    // lazy: emailService builds a transport at require time
    // eslint-disable-next-line global-require
    const { sendProfileVerifiedEmail } = require('./emailService');
    Promise.resolve(sendProfileVerifiedEmail({ full_name: user.full_name, email: user.email })).catch((e) =>
      console.error('[verification] email failed:', e.message)
    );
  }
  return user;
}

async function markRejected(userOrId, reason, { verificationId = null } = {}) {
  const id = idOf(userOrId);
  const text = reason
    ? `Your verification request was not approved: ${reason}`
    : 'Your verification request was not approved. Please submit clearer photos.';
  try {
    await Notification.create({
      type: 'verification_rejected',
      toUser: id,
      content: text.slice(0, 600),
      data: { verificationId: verificationId ? String(verificationId) : null, reason: reason || null },
    });
  } catch (err) {
    console.error('[verification] notification failed:', err.message);
  }
  push.sendToUser(id, 'Verification update', text.slice(0, 180), { type: 'verification_rejected' }).catch(() => {});
}

async function unverify(userId) {
  return User.findByIdAndUpdate(userId, { $set: { is_verified: 0, verifiedAt: null } }, { new: true }).select('is_verified verifiedAt').lean();
}

/** Basename-only resolution inside the verification dir (resolveApkFile pattern). */
function verificationFile(name) {
  if (!name || typeof name !== 'string') return null;
  const base = path.basename(name);
  if (!base || base === '.' || base === '..') return null;
  const dir = path.resolve(verificationDir());
  const file = path.resolve(dir, base);
  return file.startsWith(dir + path.sep) ? file : null;
}

function filesOf(row) {
  if (!row) return [];
  return [...(row.documentFiles || []), row.selfieFile].filter(Boolean);
}

async function removeFiles(row) {
  let n = 0;
  for (const name of filesOf(row)) {
    const file = verificationFile(name);
    if (!file) continue;
    try {
      await fs.promises.unlink(file);
      n++;
    } catch (err) {
      if (err.code !== 'ENOENT') console.warn('[verification] unlink failed:', err.message);
    }
  }
  return n;
}

module.exports = { markVerified, markRejected, unverify, verificationFile, removeFiles, filesOf, APPROVED_TEXT };
