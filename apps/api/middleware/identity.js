'use strict';
/**
 * middleware/identity.js — one `authenticate` for every user route (A1.1).
 *
 *   extractToken(req)        Bearer first, then the legacy `token` cookie
 *                            (14-day fallback per integrator conflict #1;
 *                            drop the cookie read in Phase 7). Empty /
 *                            whitespace -> null.
 *   authenticate             401 JSON {status:false, code, message} on failure;
 *                            sets req.user (lean) and req.userId (string).
 *   optionalAuth             same, never fails.
 *   resolveCaller(req, fields) returns req.userId; logs IDENTITY_MISMATCH when
 *                            a body id field is present and differs.
 *   requireSelfOr403(req, bodyField) -> {ok:true} | {ok:false,status:403,body}
 *   selfOnly(bodyField)      middleware form of requireSelfOr403.
 *   reExport                 the same exports object, so
 *                            middleware/authMiddleware.js can become
 *                            `module.exports = require('./identity')`.
 *
 * Body ids are NEVER trusted for the caller identity.
 */
const { verifyUserToken, AuthError, parseBearer, cleanToken } = require('../services/verifyUserToken');

const LEGACY_COOKIE_NAMES = ['token', 'bm_session'];
const DEFAULT_CALLER_FIELDS = ['my_user_id', 'userA_id'];

function extractToken(req) {
  if (!req) return null;
  const headers = req.headers || {};
  const bearer = parseBearer(headers.authorization);
  if (bearer) return bearer;
  const cookies = req.cookies || {};
  for (const name of LEGACY_COOKIE_NAMES) {
    const t = cleanToken(cookies[name]);
    if (t) return t;
  }
  return null;
}

function sendAuthError(res, err) {
  const code = err && err.code ? err.code : 'INVALID_TOKEN';
  return res.status(401).json({
    status: false,
    code,
    message: err && err.message ? err.message : 'Unauthorized',
  });
}

function attach(req, user) {
  req.user = user;
  req.userId = String(user._id);
  req.isAdmin = user.role === 'admin';
}

async function authenticate(req, res, next) {
  try {
    const token = extractToken(req);
    const { user, decoded } = await verifyUserToken(token);
    attach(req, user);
    req.tokenClaims = decoded;
    return next();
  } catch (err) {
    if (err instanceof AuthError) return sendAuthError(res, err);
    // eslint-disable-next-line no-console
    console.error('[identity] authenticate failed:', err.message);
    return res.status(500).json({ status: false, code: 'AUTH_ERROR', message: 'Authentication error' });
  }
}

async function optionalAuth(req, res, next) {
  req.user = null;
  req.userId = null;
  req.isAdmin = false;
  try {
    const token = extractToken(req);
    if (!token) return next();
    const { user, decoded } = await verifyUserToken(token);
    attach(req, user);
    req.tokenClaims = decoded;
  } catch (_) {
    /* optional: ignore */
  }
  return next();
}

/**
 * Returns the authenticated caller id. `fields` lists the body keys that the
 * route's semantics treat as the CALLER (default my_user_id/userA_id). For
 * self-scoped routes where `user_id` is the caller pass ['user_id']; for
 * caller=my_user_id/target=user_id routes keep the default so the target
 * field is not reported as a mismatch.
 */
function resolveCaller(req, fields = DEFAULT_CALLER_FIELDS) {
  const callerId = req.userId ? String(req.userId) : null;
  const body = req.body || {};
  for (const f of fields) {
    const v = body[f];
    if (v === undefined || v === null || v === '') continue;
    if (callerId && String(v) !== callerId) {
      // eslint-disable-next-line no-console
      console.warn('IDENTITY_MISMATCH', {
        path: req.originalUrl || req.path,
        field: f,
        bodyValue: String(v).slice(0, 40),
        caller: callerId,
      });
      break;
    }
  }
  return callerId;
}

/**
 * For routes where a body id MUST equal the caller (editProfile, deleteUser).
 * Absent field -> ok (clients that stop sending it keep working).
 */
function requireSelfOr403(req, bodyField = 'user_id') {
  const v = req.body ? req.body[bodyField] : undefined;
  if (v === undefined || v === null || v === '') return { ok: true };
  if (req.userId && String(v) === String(req.userId)) return { ok: true };
  // eslint-disable-next-line no-console
  console.warn('IDENTITY_MISMATCH', {
    path: req.originalUrl || req.path,
    field: bodyField,
    bodyValue: String(v).slice(0, 40),
    caller: req.userId || null,
    action: '403',
  });
  return {
    ok: false,
    status: 403,
    body: { status: false, code: 'FORBIDDEN', message: 'You can only act on your own account' },
  };
}

function selfOnly(bodyField = 'user_id') {
  return function selfOnlyMiddleware(req, res, next) {
    const chk = requireSelfOr403(req, bodyField);
    if (!chk.ok) return res.status(chk.status).json(chk.body);
    return next();
  };
}

/**
 * Admin-or-401 for routes that stay on the user router but are admin-only.
 */
function requireAdmin(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ status: false, code: 'ADMIN_REQUIRED', message: 'Admin privileges required' });
}

const api = {
  extractToken,
  authenticate,
  optionalAuth,
  resolveCaller,
  requireSelfOr403,
  selfOnly,
  requireAdmin,
  AuthError,
  DEFAULT_CALLER_FIELDS,
};
api.reExport = api;

module.exports = api;
