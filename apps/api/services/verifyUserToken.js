'use strict';
/**
 * services/verifyUserToken.js — shared by middleware/identity.js (HTTP) and
 * socket.js io.use (handshake). One place decides whether a user JWT is
 * acceptable:
 *
 *   verifyUserToken(token) -> { user, decoded }
 *   throws AuthError with .code in
 *     AUTH_REQUIRED   no token
 *     INVALID_TOKEN   bad signature / expired / unknown user / bad _id
 *     ACCOUNT_BLOCKED user.is_block === 1 (401, so clients bounce to login)
 *     TOKEN_REVOKED   decoded.tv !== (user.tokenVersion || 0)
 *
 * A missing `tv` claim is treated as 0 so tokens issued before the
 * tokenVersion field exists stay valid until the user logs out (A2.3/A2.4).
 *
 * tokenFromHandshake(handshake) implements the integrator order for sockets:
 * handshake.auth.token -> Authorization: Bearer -> bm_session|token cookie.
 */
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');

const USER_TOKEN_SELECT = '_id role is_block tokenVersion gender gotra family settings email full_name';

const MESSAGES = {
  AUTH_REQUIRED: 'Authentication required',
  INVALID_TOKEN: 'Invalid or expired token',
  ACCOUNT_BLOCKED: 'This account has been blocked',
  TOKEN_REVOKED: 'Session expired, please log in again',
};

class AuthError extends Error {
  constructor(code, message) {
    super(message || MESSAGES[code] || code);
    this.name = 'AuthError';
    this.code = code;
    this.status = 401;
  }
}

function parseBearer(headerValue) {
  if (!headerValue || typeof headerValue !== 'string') return null;
  const m = /^\s*Bearer\s+(.+?)\s*$/i.exec(headerValue);
  if (!m) return null;
  const t = m[1].trim();
  return t ? t : null;
}

function cleanToken(token) {
  if (typeof token !== 'string') return null;
  const t = token.trim();
  // The Flutter app sends `Authorization: Bearer ` (empty) when logged out and
  // some clients send the literal strings below.
  if (!t || t === 'null' || t === 'undefined') return null;
  return t;
}

async function verifyUserToken(token) {
  const t = cleanToken(token);
  if (!t) throw new AuthError('AUTH_REQUIRED');

  let decoded;
  try {
    decoded = jwt.verify(t, JWT_SECRET, { algorithms: ['HS256'] });
  } catch (_) {
    throw new AuthError('INVALID_TOKEN');
  }
  if (!decoded || typeof decoded !== 'object' || !mongoose.isValidObjectId(decoded._id)) {
    throw new AuthError('INVALID_TOKEN');
  }

  const user = await User.findById(decoded._id).select(USER_TOKEN_SELECT).lean();
  if (!user) throw new AuthError('INVALID_TOKEN');
  if (user.is_block === 1) throw new AuthError('ACCOUNT_BLOCKED');

  const claimTv = Number.isInteger(decoded.tv) ? decoded.tv : 0;
  const userTv = Number.isInteger(user.tokenVersion) ? user.tokenVersion : 0;
  if (claimTv !== userTv) throw new AuthError('TOKEN_REVOKED');

  return { user, decoded };
}

/**
 * Minimal cookie parser for the socket handshake (no cookie-parser there).
 */
function parseCookieHeader(header) {
  const out = {};
  if (!header || typeof header !== 'string') return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim();
    if (!k) continue;
    let v = part.slice(i + 1).trim();
    try {
      v = decodeURIComponent(v);
    } catch (_) {
      /* keep raw */
    }
    out[k] = v;
  }
  return out;
}

/**
 * Order per integrator conflict #2: auth.token (new Flutter build),
 * Authorization header, then bm_session|token cookie (web through the
 * same-origin /socket.io proxy).
 */
function tokenFromHandshake(handshake) {
  if (!handshake) return null;
  const fromAuth = cleanToken(handshake.auth && handshake.auth.token);
  if (fromAuth) return fromAuth;
  const headers = handshake.headers || {};
  const fromHeader = parseBearer(headers.authorization);
  if (fromHeader) return fromHeader;
  const cookies = parseCookieHeader(headers.cookie);
  return cleanToken(cookies.bm_session) || cleanToken(cookies.token) || null;
}

module.exports = {
  verifyUserToken,
  AuthError,
  USER_TOKEN_SELECT,
  MESSAGES,
  parseBearer,
  cleanToken,
  parseCookieHeader,
  tokenFromHandshake,
};
