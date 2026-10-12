'use strict';
// Same-origin /api proxy to the API on loopback (D1.13, integrator #1).
//
// Browser JS can no longer read the session (bm_session is httpOnly), so every
// fetch('/api/...') from a page comes here: the cookie is stripped (the API
// never sees the web session cookie) and replaced by `Authorization: Bearer
// <token>` from bm_session, or from the legacy `token` cookie during the
// 14-day migration window. express.json() has already consumed the body in
// app.js, so fixRequestBody re-serialises it; multipart uploads are streamed
// untouched.
//
// Mount AFTER indexRoutes: the web's own /api/regenerate-sitemap and
// /api/proxy/cities keep precedence.
//   app.use('/', indexRoutes);
//   app.use(require('./middleware/apiProxy'));
//
// Dependency (apps/web/package.json): "http-proxy-middleware": "^3.0.3"

const { sessionToken, BASE_URL } = require('../utils/apiClient');

let proxy = null;
let loadError = null;

function build() {
  const { createProxyMiddleware, fixRequestBody } = require('http-proxy-middleware');
  return createProxyMiddleware({
    pathFilter: '/api',
    target: process.env.API_INTERNAL_URL || BASE_URL,
    changeOrigin: false,
    xfwd: true,
    proxyTimeout: 30000,
    timeout: 35000,
    logger: { info() {}, warn: console.warn, error: console.error },
    on: {
      proxyReq(proxyReq, req) {
        proxyReq.removeHeader('cookie');
        const token = sessionToken(req);
        if (token) proxyReq.setHeader('Authorization', `Bearer ${token}`);
        else proxyReq.removeHeader('authorization');
        proxyReq.setHeader('X-Requested-With', 'web');
        fixRequestBody(proxyReq, req);
      },
      proxyRes(proxyRes) {
        // The API must never set cookies on the www origin (A2.3 is removed
        // once D12 is live; strip defensively until then).
        delete proxyRes.headers['set-cookie'];
      },
      error(err, req, res) {
        console.error('[apiProxy]', err && err.code ? err.code : err && err.message);
        if (res.headersSent || typeof res.status !== 'function') return;
        res.status(502).set('Cache-Control', 'no-store').json({ status: false, message: 'API unavailable, please try again' });
      },
    },
  });
}

try {
  proxy = build();
} catch (err) {
  loadError = err;
  console.error('[apiProxy] http-proxy-middleware not installed; /api/* will answer 503 until it is:', err.message);
}

module.exports = function apiProxy(req, res, next) {
  if (!req.path.startsWith('/api')) return next();
  if (!proxy) {
    return res.status(503).set('Cache-Control', 'no-store').json({ status: false, message: 'API proxy unavailable' });
  }
  return proxy(req, res, next);
};

module.exports.loadError = loadError;
