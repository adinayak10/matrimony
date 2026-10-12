'use strict';
// Web-owned session (D1.12, integrator conflict #1).
//
//   POST /auth/login     { email, firebaseUid, firebaseToken }             -> API /api/auth/firebase-email-login
//   POST /auth/register  { email, full_name, phone?, firebaseUid, firebaseToken } -> API /api/auth/firebase-email-register
//   POST /auth/google    { email, full_name?, photoURL?, firebaseUid, firebaseToken } -> API /api/auth/firebase-google-login
//   POST /auth/logout
//
// Each proxied body carries device_type: 'web-proxy' so AuthController.js
// isMobile() returns the JSON form (token in the body, no API-set cookie).
// On success the web sets `bm_session` (httpOnly, secure, sameSite=lax, path=/,
// 7 d, host-only — no domain attribute) and, for a registration, `bm_welcome`
// (10 min) which /thank-you consumes. The response is
// { status, isNewUser, redirect } — never the token.
//
// Mount in app.js BEFORE indexRoutes:  app.use(require('./routes/auth'));

const express = require('express');
const { apiPost, sessionToken, UpstreamError } = require('../utils/apiClient');

const router = express.Router();

const isProd = process.env.NODE_ENV === 'production';
const SESSION_COOKIE = 'bm_session';
const WELCOME_COOKIE = 'bm_welcome';
const RETURN_TO_COOKIE = 'returnTo';
const LEGACY_COOKIE = 'token';
const LEGACY_DOMAIN = '.banjaramatch.com';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const WELCOME_MAX_AGE = 10 * 60 * 1000;
const API_TIMEOUT = 8000; // Firebase ID-token verification on the API can take a while

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
const UID_RE = /^[A-Za-z0-9_-]{1,128}$/;
const PHONE_RE = /^\+?[0-9]{6,15}$/;

function cookieBase(req) {
  return { httpOnly: true, secure: isProd || req.secure, sameSite: 'lax', path: '/' };
}

function setSession(req, res, token) {
  res.cookie(SESSION_COOKIE, token, { ...cookieBase(req), maxAge: SESSION_MAX_AGE });
}

function clearSession(req, res) {
  const base = cookieBase(req);
  res.clearCookie(SESSION_COOKIE, base);
  res.clearCookie(WELCOME_COOKIE, base);
  res.clearCookie(RETURN_TO_COOKIE, base);
  // Legacy API-set cookie (.banjaramatch.com, not httpOnly) from before D12.
  res.clearCookie(LEGACY_COOKIE, { path: '/', domain: LEGACY_DOMAIN });
  res.clearCookie(LEGACY_COOKIE, { path: '/' });
}

// Only a same-site relative path may be used as a post-login destination.
function safeRedirect(value) {
  if (typeof value !== 'string') return null;
  if (!/^\/(?!\/)[A-Za-z0-9/_\-.?=&%+:#]*$/.test(value)) return null;
  if (value.startsWith('/auth') || value.startsWith('/api') || value.startsWith('/logout')) return null;
  return value.length > 512 ? null : value;
}

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
// Names and phones are shown back on pages; strip anything tag-like here too.
const plain = (v, max) => str(v, max).replace(/[<>]/g, '');

function fail(res, status, message) {
  return res.status(status).set('Cache-Control', 'no-store').json({ status: false, message });
}

// CSRF: a cross-site HTML form cannot send application/json, and a cross-site
// fetch carries an Origin that is not ours.
function sameOriginJson(req, res, next) {
  // Header check, not req.is(): a zero-length form post has no "body" for
  // type-is and would otherwise slip through.
  if (!/^application\/json\b/i.test(req.get('content-type') || '')) return fail(res, 415, 'JSON body required');
  const origin = req.get('origin');
  if (origin) {
    let host = null;
    try { host = new URL(origin).host; } catch { host = null; }
    if (!host || host !== req.get('host')) return fail(res, 403, 'Cross-origin request refused');
  }
  res.set('Cache-Control', 'no-store');
  next();
}

function validateCommon(body) {
  const email = str(body.email, 254).toLowerCase();
  const firebaseUid = str(body.firebaseUid, 128);
  const firebaseToken = str(body.firebaseToken, 4096);
  if (!EMAIL_RE.test(email)) return { error: 'A valid email is required' };
  if (!UID_RE.test(firebaseUid)) return { error: 'Sign-in session is invalid, please try again' };
  if (!firebaseToken) return { error: 'Sign-in session has expired, please try again' };
  return { email, firebaseUid, firebaseToken };
}

async function relay(req, res, apiPath, payload) {
  let data;
  try {
    data = await apiPost(apiPath, { ...payload, device_type: 'web-proxy' }, { timeout: API_TIMEOUT });
  } catch (err) {
    if (err instanceof UpstreamError || !err.response) {
      console.warn('[auth] API unreachable for', apiPath, err && err.message);
      return res.status(503).set('Retry-After', '30').json({ status: false, message: 'Sign-in service is temporarily unavailable, please try again in a moment' });
    }
    const status = err.response.status >= 400 && err.response.status < 500 ? err.response.status : 502;
    const message = str(err.response.data && err.response.data.message, 200) || 'Sign-in failed';
    return fail(res, status, message);
  }

  if (!data || data.status !== true || typeof data.token !== 'string' || !data.token) {
    return fail(res, 401, str(data && data.message, 200) || 'Sign-in failed');
  }

  const isNewUser = /registration/i.test(String(data.message || ''));
  setSession(req, res, data.token);
  // The legacy cookie would otherwise shadow bm_session in the browser's
  // document.cookie-reading code for the 14-day window.
  res.clearCookie(LEGACY_COOKIE, { path: '/', domain: LEGACY_DOMAIN });
  if (isNewUser) res.cookie(WELCOME_COOKIE, '1', { ...cookieBase(req), maxAge: WELCOME_MAX_AGE });

  const returnTo = safeRedirect(req.cookies && req.cookies[RETURN_TO_COOKIE]);
  if (returnTo) res.clearCookie(RETURN_TO_COOKIE, cookieBase(req));
  const redirect = isNewUser ? '/thank-you' : (returnTo || '/dashboard');

  return res.status(200).json({ status: true, isNewUser, redirect });
}

router.post('/auth/login', sameOriginJson, async (req, res, next) => {
  try {
    const v = validateCommon(req.body || {});
    if (v.error) return fail(res, 400, v.error);
    await relay(req, res, '/api/auth/firebase-email-login', v);
  } catch (err) { next(err); }
});

router.post('/auth/register', sameOriginJson, async (req, res, next) => {
  try {
    const body = req.body || {};
    const v = validateCommon(body);
    if (v.error) return fail(res, 400, v.error);
    const full_name = plain(body.full_name, 100);
    if (full_name.length < 2) return fail(res, 400, 'Please enter your full name');
    const phone = plain(body.phone, 20).replace(/[\s-]/g, '');
    if (phone && !PHONE_RE.test(phone)) return fail(res, 400, 'Please enter a valid phone number');
    await relay(req, res, '/api/auth/firebase-email-register', { ...v, full_name, ...(phone ? { phone } : {}) });
  } catch (err) { next(err); }
});

router.post('/auth/google', sameOriginJson, async (req, res, next) => {
  try {
    const body = req.body || {};
    const v = validateCommon(body);
    if (v.error) return fail(res, 400, v.error);
    const full_name = plain(body.full_name, 100);
    const photoURL = str(body.photoURL, 2048);
    const payload = { ...v };
    if (full_name) payload.full_name = full_name;
    if (/^https:\/\//.test(photoURL)) payload.photoURL = photoURL;
    await relay(req, res, '/api/auth/firebase-google-login', payload);
  } catch (err) { next(err); }
});

router.post('/auth/logout', sameOriginJson, async (req, res) => {
  const token = sessionToken(req);
  clearSession(req, res);
  if (token) {
    // Best effort: lets the API revoke the token once Phase 3e lands.
    apiPost('/api/auth/logout', { device_type: 'web-proxy' }, { headers: { Authorization: `Bearer ${token}` }, timeout: 2000 })
      .catch(() => {});
  }
  return res.status(200).json({ status: true, redirect: '/login' });
});

module.exports = router;
module.exports.setSession = setSession;
module.exports.clearSession = clearSession;
module.exports.safeRedirect = safeRedirect;
module.exports.SESSION_COOKIE = SESSION_COOKIE;
module.exports.WELCOME_COOKIE = WELCOME_COOKIE;
module.exports.RETURN_TO_COOKIE = RETURN_TO_COOKIE;

module.exports.LEGACY_COOKIE = LEGACY_COOKIE;
