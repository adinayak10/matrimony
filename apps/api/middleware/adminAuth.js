'use strict';
/**
 * middleware/adminAuth.js — Bearer-only admin authentication (A2.5, integrator #3).
 *
 *   401  no/invalid/expired token, blocked account, revoked tokenVersion
 *   403  valid token that is not an admin token (aud !== 'admin' or role !== 'admin')
 *
 * The API never sets or reads cookies for admin sessions: the admin app keeps
 * its own host-only session and injects `Authorization: Bearer` on the proxy.
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');
const { parseBearer } = require('../services/verifyUserToken');

const ADMIN_SELECT = '_id email role full_name is_block tokenVersion';

function deny(res, status, code, message) {
  return res.status(status).json({ status: false, code, message });
}

const adminAuth = async (req, res, next) => {
  try {
    const token = parseBearer(req.headers.authorization);
    if (!token) return deny(res, 401, 'AUTH_REQUIRED', 'Access denied. No token provided.');

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    } catch (_) {
      return deny(res, 401, 'INVALID_TOKEN', 'Invalid or expired token.');
    }
    if (!decoded || !mongoose.isValidObjectId(decoded._id)) {
      return deny(res, 401, 'INVALID_TOKEN', 'Invalid token.');
    }
    if (decoded.aud !== 'admin') {
      return deny(res, 403, 'ADMIN_REQUIRED', 'Access denied. Admin privileges required.');
    }

    const user = await User.findById(decoded._id).select(ADMIN_SELECT);
    if (!user) return deny(res, 401, 'INVALID_TOKEN', 'Access denied. User not found.');
    if (user.role !== 'admin') return deny(res, 403, 'ADMIN_REQUIRED', 'Access denied. Admin privileges required.');
    if (user.is_block === 1) return deny(res, 401, 'ACCOUNT_BLOCKED', 'This account has been blocked.');

    const claimTv = Number.isInteger(decoded.tv) ? decoded.tv : 0;
    if (claimTv !== (user.tokenVersion || 0)) {
      return deny(res, 401, 'TOKEN_REVOKED', 'Session expired, please log in again.');
    }

    req.user = user;
    req.userId = String(user._id);
    req.isAdmin = true;
    req.tokenClaims = decoded;
    return next();
  } catch (error) {
    console.error('Admin auth error:', error.message);
    return deny(res, 500, 'AUTH_ERROR', 'Server error during authentication.');
  }
};

module.exports = { adminAuth };
