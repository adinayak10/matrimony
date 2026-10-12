'use strict';
// The auth gate for every page route.
//
//   cookie admin_session  →  apiClient.me(token)  →  req.admin  →  next()
//   no cookie             →  302 /login?next=<original url>
//   /me says 401/403/404  →  clear cookie, 302 /login
//   API down / 5xx        →  503 "API unreachable" page (never a redirect loop)
//
// /me results are cached in memory for 60 s keyed by sha256(token) so a page
// load with a dozen navigations does not hammer the API; a logout invalidates
// the entry. The cache holds only {_id,email,full_name}, never the token.
const crypto = require('crypto');
const apiClient = require('../lib/apiClient');
const { renderError } = require('../lib/render');
const env = require('../config/env');

const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map(); // sha256(token) → { admin, expires }

// For GET /health: true when the last /me call reached the API (whatever it
// answered), false when it was unreachable, null before the first call.
let lastApiOk = null;

const keyOf = (token) => crypto.createHash('sha256').update(token).digest('hex');

function cacheGet(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (hit.expires < Date.now()) { cache.delete(key); return null; }
  return hit.admin;
}

function cacheSet(key, admin) {
  if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value);
  cache.set(key, { admin, expires: Date.now() + CACHE_TTL_MS });
}

function invalidate(token) {
  if (token) cache.delete(keyOf(token));
}

function clearCache() { cache.clear(); }

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: '/',
});

// Only same-origin absolute paths may be used as `next`.
function safeNext(raw) {
  if (typeof raw !== 'string' || !raw.startsWith('/') || raw.startsWith('//') || raw.includes('\\')) return '/dashboard';
  if (/^\/(login|auth)(\/|\?|$)/.test(raw)) return '/dashboard';
  if (/[\r\n\0]/.test(raw)) return '/dashboard';
  return raw.length > 2000 ? '/dashboard' : raw;
}

function loginRedirect(req, res) {
  const next = req.method === 'GET' ? safeNext(req.originalUrl) : '/dashboard';
  return res.redirect(302, `/login?next=${encodeURIComponent(next)}`);
}

async function requireAdmin(req, res, next) {
  const token = req.cookies ? req.cookies[env.COOKIE_NAME] : undefined;
  if (!token || typeof token !== 'string') return loginRedirect(req, res);

  const key = keyOf(token);
  const cached = cacheGet(key);
  if (cached) {
    req.admin = cached;
    req.adminToken = token;
    return next();
  }

  let result;
  try {
    result = await apiClient.me(token);
    lastApiOk = true;
  } catch (err) {
    lastApiOk = false;
    console.error('[requireAdmin] API unreachable:', err && err.message);
    return renderError(res, 503, {
      title: 'API unreachable',
      message: 'The admin panel could not reach the API to confirm your session. Nothing was changed. Try again in a moment.',
      retryHref: req.originalUrl,
    });
  }

  if (!result.ok) {
    res.clearCookie(env.COOKIE_NAME, cookieOptions());
    cache.delete(key);
    return loginRedirect(req, res);
  }

  cacheSet(key, result.admin);
  req.admin = result.admin;
  req.adminToken = token;
  return next();
}

module.exports = requireAdmin;
module.exports.requireAdmin = requireAdmin;
module.exports.invalidate = invalidate;
module.exports.clearCache = clearCache;
module.exports.cookieOptions = cookieOptions;
module.exports.safeNext = safeNext;
module.exports.apiReachable = () => lastApiOk;
module.exports._cache = cache;
