'use strict';
// Session middleware for page routes (D1.10, D1.12, integrator conflict #1).
// Extracted unchanged from routes/index.js so routes/member.js and
// routes/stories.js share it.
//
//   const { optionalUser, ensureAuth, redirectIfAuthenticated, checkProfileCompletion } = require('../middleware/session');

const { apiGet, hashKey } = require('../utils/apiClient');
const { upstreamStatus } = require('../utils/apiHelpers');
const { setSession, clearSession, SESSION_COOKIE, LEGACY_COOKIE, RETURN_TO_COOKIE } = require('../routes/auth');

const isProd = process.env.NODE_ENV === 'production';

// bm_session (web-owned, httpOnly, host-only) or, for the 14-day migration
// window, the legacy API-set `token` cookie — which is re-issued as bm_session
// and cleared from .banjaramatch.com so it cannot shadow the new cookie.
function readSession(req, res) {
  const c = req.cookies || {};
  if (typeof c[SESSION_COOKIE] === 'string' && c[SESSION_COOKIE]) return c[SESSION_COOKIE];
  if (typeof c[LEGACY_COOKIE] === 'string' && c[LEGACY_COOKIE]) {
    setSession(req, res, c[LEGACY_COOKIE]);
    res.clearCookie(LEGACY_COOKIE, { path: '/', domain: '.banjaramatch.com' });
    return c[LEGACY_COOKIE];
  }
  return null;
}

// /api/auth/me, cached 60 s per token hash. 401 surfaces as an UpstreamError
// with upstreamStatus 401; a timeout or 5xx is an UpstreamError without one.
async function fetchMe(token) {
  const data = await apiGet('/api/auth/me', {
    key: 'me:' + hashKey(token),
    ttl: 60e3,
    stale: 0,
    timeout: 1500,
    headers: { Authorization: 'Bearer ' + token },
  });
  return (data && data.user) || null;
}

function redirectToLogin(req, res) {
  res.cookie(RETURN_TO_COOKIE, req.originalUrl, {
    httpOnly: true,
    secure: isProd || req.secure,
    sameSite: 'lax',
    path: '/',
    maxAge: 600000,
  });
  return res.redirect(302, '/login');
}

// --- Middleware: Optional User Check (for all pages) ---
async function optionalUser(req, res, next) {
  req.user = null;
  const token = readSession(req, res);
  if (!token) return next();
  try {
    req.user = await fetchMe(token);
  } catch (err) {
    if (upstreamStatus(err) === 401) clearSession(req, res);
    else console.warn('[optionalUser] /me unavailable:', err.message);
  }
  next();
}

// --- Middleware: Auth Check ---
async function ensureAuth(req, res, next) {
  const token = readSession(req, res);
  if (!token) return redirectToLogin(req, res);
  try {
    const user = await fetchMe(token);
    if (!user) {
      clearSession(req, res);
      return redirectToLogin(req, res);
    }
    req.user = user;
    return next();
  } catch (err) {
    const status = upstreamStatus(err);
    if (status === 401) {
      clearSession(req, res);
      return redirectToLogin(req, res);
    }
    if (status === 403) return redirectToLogin(req, res);
    // API down / timeout: 503 via the error handler, never a logout.
    return next(err);
  }
}

// --- Middleware: Redirect if Authenticated ---
async function redirectIfAuthenticated(req, res, next) {
  const token = readSession(req, res);
  if (!token) return next();
  try {
    const user = await fetchMe(token);
    if (user) return res.redirect(302, '/dashboard');
  } catch (err) {
    if (upstreamStatus(err) === 401) clearSession(req, res);
  }
  return next();
}

// --- Middleware: Check Profile Completion ---
function checkProfileCompletion(req, res, next) {
  const user = req.user;

  // Skip onboarding check if already on onboarding page
  if (req.path === '/onboarding') {
    return next();
  }

  // Check if mandatory fields are completed (removed username as it's optional and captured during registration)
  const mandatoryFields = ['gender', 'dob', 'height', 'maritalStatus', 'caste', 'gotra'];
  const missingFields = mandatoryFields.filter(field => !user[field]);

  if (missingFields.length > 0) {
    return res.redirect('/onboarding');
  }

  return next();
}

module.exports = {
  readSession,
  fetchMe,
  redirectToLogin,
  optionalUser,
  ensureAuth,
  redirectIfAuthenticated,
  checkProfileCompletion,
};
