'use strict';
// /api/* → API_INTERNAL_URL with the admin session translated into a Bearer
// header (C1.4). Mount it at the app root — `app.use(require('./routes/proxy'))`
// — NOT at '/api': http-proxy-middleware v3 forwards req.url as Express leaves
// it, and mounting at '/api' would strip the prefix before it reaches the API.
//
// Guard, in order:
//   401 JSON  no admin_session cookie (core/api.js turns this into /login)
//   403 JSON  non-GET/HEAD without `X-Requested-With: admin` (CSRF belt and braces
//             on top of SameSite=Strict)
//   404 JSON  path not on the allowlist — /api/deleteUser, /api/editProfile and
//             the rest of the user API are unreachable through the admin host
// Then: Authorization: Bearer <cookie>, the browser's Cookie header removed
// (middleware/adminAuth.js is cookie-first today, so a stale .banjaramatch.com
// `token` cookie would otherwise override the admin token), Set-Cookie from the
// API dropped, 180 s timeouts for APK uploads.
const env = require('../config/env');

// Required lazily so the allowlist (isAllowed) is testable before the
// dependency is installed; the proxy itself is built on first use.
let proxyInstance = null;
function getProxy() {
  if (proxyInstance) return proxyInstance;
  const { createProxyMiddleware } = require('http-proxy-middleware');
  proxyInstance = createProxyMiddleware(PROXY_OPTIONS);
  return proxyInstance;
}

const ALLOW = [
  /^\/api\/admin\//,
  /^\/api\/contact\/(all|stats|[a-f0-9]{24})(\/|$)/,
  /^\/api\/beta-tester\/(all|stats|[a-f0-9]{24})(\/|$)/,
  /^\/api\/city-pages\/admin(\/|$)/,
  /^\/api\/state-pages\/admin(\/|$)/,
  /^\/api\/states$/,
  /^\/api\/cities$/,
  /^\/api\/assignMembership$/,
  // TEMPORARY until Track A ships /api/admin/community-feedback (C4.3 / integrator #15).
  /^\/api\/auth\/community-feedback(\/|$)/,
];

// Never through the proxy: the browser must not be able to mint or drop API
// sessions with JS (login is the server-side form; logout is POST /auth/logout).
const DENY = [
  /^\/api\/admin\/auth\/(login|logout)$/,
];

const SAFE_METHODS = new Set(['GET', 'HEAD']);

function json(res, status, message) {
  res.status(status).set('Cache-Control', 'no-store').json({ status: false, success: false, message });
}

function isAllowed(pathname) {
  if (pathname.includes('..') || pathname.includes('//') || pathname.includes('\\') || /%2e|%2f|%5c/i.test(pathname)) return false;
  if (DENY.some((re) => re.test(pathname))) return false;
  return ALLOW.some((re) => re.test(pathname));
}

function guard(req, res, next) {
  const token = req.cookies ? req.cookies[env.COOKIE_NAME] : undefined;
  if (!token || typeof token !== 'string') return json(res, 401, 'Not signed in');
  if (!SAFE_METHODS.has(req.method) && (req.get('x-requested-with') || '') !== 'admin') {
    return json(res, 403, 'Missing X-Requested-With header');
  }
  if (!isAllowed(req.path)) return json(res, 404, 'Not found');
  req.adminToken = token;
  return next();
}

const PROXY_OPTIONS = {
  target: env.API_INTERNAL_URL,
  changeOrigin: false,
  xfwd: true,
  proxyTimeout: 180000,
  timeout: 180000,
  // Keep the request body a stream (no body parser runs before this router).
  on: {
    proxyReq(proxyReq, req) {
      proxyReq.removeHeader('cookie');
      proxyReq.setHeader('authorization', `Bearer ${req.adminToken}`);
      proxyReq.setHeader('x-admin-proxy', '1');
    },
    proxyRes(proxyRes) {
      // The API must never set cookies on the admin host.
      delete proxyRes.headers['set-cookie'];
      delete proxyRes.headers['set-cookie2'];
    },
    error(err, req, res) {
      console.error('[proxy]', req.method, req.url, err && err.code ? err.code : err && err.message);
      if (res.headersSent) { try { res.end(); } catch (e) { /* noop */ } return; }
      const status = err && err.code === 'ECONNRESET' ? 502 : (err && err.code === 'ETIMEDOUT' ? 504 : 502);
      json(res, status, 'API unreachable');
    },
  },
};

function apiProxy(req, res, next) {
  if (!req.path.startsWith('/api/')) return next();
  return guard(req, res, (err) => (err ? next(err) : getProxy()(req, res, next)));
}

module.exports = apiProxy;
module.exports.isAllowed = isAllowed;
module.exports.ALLOW = ALLOW;
module.exports.DENY = DENY;
