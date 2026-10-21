'use strict';
/**
 * app.js — createApp() (A9.1): builds the express app, the http server and
 * socket.io WITHOUT connecting to Mongo or listening. index.js does the
 * connect + listen; test/helpers/harness.js wraps the app with supertest.
 *
 * Order matters: setupSocket(io) runs BEFORE the route modules are required
 * because controllers/UserController.js captures getIO() at require time.
 */
const env = require('./config/env');
require('./utils/log').patchConsole();

const express = require('express');
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');

const UPLOADS = path.join(__dirname, 'uploads');
// Only these sub-directories exist under uploads/ (profile_images, apk,
// blog_images); anything else, dotfiles and odd extensions are 404.
const UPLOAD_PATH_RE = /^\/(profile_images|apk|blog_images)\/[A-Za-z0-9_.-]+\.(jpe?g|png|webp|apk)$/i;

function createApp() {
  const app = express();
  const server = http.createServer(app);

  // Behind nginx on the same host; must be set BEFORE any rate limiter
  app.set('trust proxy', 'loopback');
  app.disable('x-powered-by');

  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS from env; a non-listed origin simply gets no ACAO header (no throw)
  const allowed = env.CORS_ORIGINS;
  const corsOptions = {
    origin(origin, callback) {
      if (!origin || allowed.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
  };
  app.use(cors(corsOptions));
  app.options('*', cors(corsOptions));

  app.use(cookieParser());

  // Body is parsed once here (multipart is multer's; nginx caps the rest)
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));
  app.use(mongoSanitize());

  // Rate limits (A7.3)
  const rl = require('./middleware/rateLimits');
  app.use(rl.globalLimiter);
  app.use('/api/auth', rl.authLimiter);
  app.post('/api/admin/auth/login', rl.adminLoginLimiter);
  app.post(['/api/contact/submit', '/api/beta-tester/submit', '/api/auth/community-feedback'], rl.formLimiter);

  // Static: uploads behind an allowlist (nginx serves this in prod; this is the fallback)
  app.use(
    '/uploads',
    (req, res, next) => (UPLOAD_PATH_RE.test(req.path) ? next() : res.status(404).end()),
    express.static(UPLOADS, {
      index: false,
      dotfiles: 'deny',
      setHeaders: (res) => {
        res.set('X-Content-Type-Options', 'nosniff');
        res.set('Content-Disposition', 'inline');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    })
  );
  app.use(express.static(path.join(__dirname, 'public')));

  // Health (outside the DB wait so pm2/deploy can poll it; 503 until Mongo is up)
  app.get('/health', (req, res) => {
    const db = mongoose.connection.readyState === 1;
    res
      .status(db ? 200 : 503)
      .set('Cache-Control', 'no-store')
      .json({
        ok: db,
        app: 'api',
        db,
        release: env.RELEASE_SHA,
        uptime: process.uptime(),
      });
  });

  // WebSocket — must be set up BEFORE the route modules are required
  const io = socketIO(server, {
    cors: { origin: env.CORS_ORIGINS, credentials: true },
  });
  const { setupSocket } = require('./socket');
  setupSocket(io);

  // Routes (publicLookupRoutes MUST be mounted before userRoutes)
  app.use('/api', require('./routes/settingsRoute'));
  app.use('/api', require('./routes/publicLookupRoutes'));
  app.use('/api', require('./routes/userRoutes'));
  app.use('/api/auth', require('./routes/legacyAuth')); // 410 for the deleted auth paths (A3.1)
  app.use('/api/auth', require('./routes/authRoute'));
  app.use('/api', require('./routes/aboutRoutes'));
  app.use('/api/blogs', require('./routes/blogRoutes')); // Public blog routes
  app.use('/api/city-pages', require('./routes/cityPageRoutes')); // City regional pages
  app.use('/api/state-pages', require('./routes/statePageRoutes')); // State regional pages
  app.use('/api/contact', require('./routes/contactRoutes')); // Contact form routes
  app.use('/api/beta-tester', require('./routes/betaTesterRoutes')); // Beta tester applications
  app.use('/api/compatibility', require('./routes/compatibilityRoutes')); // Guna Milan / horoscope compatibility
  app.use('/api/calls', require('./routes/callRoutes')); // Agora video/voice calling (needs AGORA_APP_ID/AGORA_APP_CERTIFICATE)
  app.use('/api/admin', require('./routes/admin')); // New organized admin routes
  app.use('/api/admin', require('./routes/adminRoutes')); // Admin routes (blogs, apk)
  // Feature expansion (2026-10): separate routers so tracks never share a file.
  app.use('/api', require('./routes/communityRoutes')); // member community endpoints (own authenticate)
  app.use('/api/success-stories', require('./routes/successStoryRoutes')); // public published stories
  app.use('/api/admin', require('./routes/adminVerificationRoutes')); // verification queue
  app.use('/api/admin', require('./routes/adminCommunityRoutes')); // stories, announcements, faqs, push, icebreaker, analytics, matchmaking

  // Root
  app.get('/', (req, res) => {
    res.json({ service: 'banjaramatch-api' });
  });

  // JSON 404 for unknown /api paths (never an HTML page)
  app.use('/api', (req, res) => {
    res.status(404).json({ status: false, code: 'NOT_FOUND', message: 'Not found' });
  });

  // Error handler: body-parser 413/400, multer errors, anything thrown by a route
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (res.headersSent) return;
    const status = err.status || err.statusCode || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
    if (status >= 500) console.error('[app] unhandled route error:', err);
    const message =
      status === 413 ? 'Payload too large' : status === 400 ? 'Bad request' : status < 500 ? err.message || 'Request rejected' : 'Internal server error';
    res.status(status).json({ status: false, code: err.code && typeof err.code === 'string' ? err.code : undefined, message });
  });

  return { app, server, io };
}

module.exports = createApp;
module.exports.createApp = createApp;
