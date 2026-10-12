'use strict';
// admin.banjaramatch.com — Express 4 + EJS admin server.
//
// Middleware order is load-bearing (docs/plans/admin-base-ui.md C1.2):
//   1. security headers       middleware/security.js (helmet CSP, enforced;
//                             X-Robots-Tag noindex, Cache-Control no-store)
//   2. cookieParser           the admin_session cookie is the only state
//   3. static assets          /css /js /img /vendor + /robots.txt ONLY. No
//                             *.html is ever served: old URLs are 301s
//                             (routes/legacy.js) and everything else is a 404.
//   4. GET /health            unauthenticated, never 5xx because the API is down
//   5. /api/* proxy           routes/proxy.js at the APP ROOT (http-proxy-middleware
//                             v3 would strip an app.use('/api') prefix) and BEFORE
//                             any body parser so multipart uploads keep streaming
//   6+7. auth / legacy / pages  routes/auth.js carries its own route-level
//                             express.urlencoded; every page route is behind
//                             requireAdmin and rendered through lib/render.js
//                             (views/pages/<key>.ejs + public/js/pages/<key>.js)
//   8. *.html → 404, generic 404, error handler (error.ejs, never a stack)
//   9. listen on HOST:PORT (loopback) and tell pm2 we are ready
//
// The server never holds JWT_SECRET: sessions are validated by asking the API
// (/api/admin/auth/me) and the API-issued token lives in an httpOnly cookie.
const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { renderError } = require('./lib/render');
const requireAdmin = require('./middleware/requireAdmin');
const security = require('./middleware/security');
const apiProxy = require('./routes/proxy');
const authRoutes = require('./routes/auth');
const legacyRoutes = require('./routes/legacy');
const pageRoutes = require('./routes/pages');

const PUBLIC_DIR = path.join(__dirname, 'public');
// Only these paths are static. Nothing else in public/ is reachable.
const STATIC_PATH = /^\/(css|js|img|vendor)\/|^\/robots\.txt$/;

function createApp() {
  const app = express();
  // nginx is the only client; trust its X-Forwarded-* headers.
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');
  app.set('etag', false);

  // 1. security headers
  app.use(security());

  // 2. cookies
  app.use(cookieParser());

  // 3. static assets, gated by path
  const staticFiles = express.static(PUBLIC_DIR, { maxAge: '7d', index: false, dotfiles: 'ignore' });
  app.use((req, res, next) => (STATIC_PATH.test(req.path) ? staticFiles(req, res, next) : next()));

  // 4. health (deploy.sh wait_healthy). `api` is the last /me outcome, not a live call.
  app.get('/health', (req, res) => {
    res.set('Cache-Control', 'no-store').json({
      ok: true,
      app: 'admin',
      release: env.RELEASE_SHA || null,
      uptime: process.uptime(),
      api: requireAdmin.apiReachable(),
    });
  });

  // 5. /api/* proxy — before any body parser
  app.use(apiProxy);

  // 6+7. auth (own urlencoded parser), legacy 301s, pages (each behind requireAdmin)
  app.use(authRoutes);
  app.use(legacyRoutes);
  app.use(pageRoutes);

  // 8. anything *.html that the legacy map did not 301 is gone
  app.get(/\.html$/i, (req, res) => renderError(res, 404));
  app.use((req, res) => renderError(res, 404));
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    console.error('[admin]', req.method, req.originalUrl, err && err.message);
    if (res.headersSent) return res.end();
    const status = Number.isInteger(err && err.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
    return renderError(res, status, {
      message: status >= 500 ? 'The page could not be rendered. Nothing was changed.' : '',
    });
  });

  return app;
}

// 9. boot
if (require.main === module) {
  const app = createApp();
  const server = app.listen(env.PORT, env.HOST, () => {
    console.log(`admin listening on http://${env.HOST}:${env.PORT} (${env.NODE_ENV}${env.RELEASE_SHA ? `, release ${env.RELEASE_SHA.slice(0, 7)}` : ''})`);
    // pm2 wait_ready: the old process is kept until this is sent.
    if (process.send) process.send('ready');
  });
  server.on('error', (err) => {
    console.error('[admin] listen failed:', err && err.message);
    process.exit(1);
  });
}

module.exports = { createApp };
