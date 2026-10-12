require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');

const csp = require('./config/csp');
const assets = require('./utils/assets');
const { safeJson, jsonLd } = require('./utils/jsonLd');

const app = express();
// nginx is the only client; trust its X-Forwarded-* headers.
app.set('trust proxy', 'loopback');

// ---------- SECURITY HEADERS ----------
// Hide X-Powered-By header
app.disable('x-powered-by');

// Helmet: CSP from config/csp.js (report-only until CSP_ENFORCE=1, D1.7).
app.use(helmet({
  contentSecurityPolicy: { useDefaults: false, directives: csp.directives, reportOnly: csp.reportOnly },
  crossOriginEmbedderPolicy: false, // Disable to allow OAuth popups
  crossOriginOpenerPolicy: false // Disable to allow Firebase Google Sign-In popup
}));

// Add custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(self), microphone=(self), geolocation=(self)');
  next();
});

// ---------- MIDDLEWARE SETUP ----------
// ---------- CORS SETUP ----------
// Only the JSON endpoints need CORS at all; a disallowed origin simply gets no
// CORS headers (callback(null, false)) — never an error, so a page request with
// a foreign Origin header is still served (D1.9).
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://www.banjaramatch.com',
  'https://banjaramatch.com',
  'https://api.banjaramatch.com'
];

const corsMw = cors({
  origin: function (origin, callback) {
    return callback(null, !origin || allowedOrigins.includes(origin));
  },
  credentials: true,
});
app.use('/api', corsMw);
app.use('/auth', corsMw);

app.use(cookieParser());
app.use(compression({ threshold: 1024 }));
// Same limit as the API (integrator conflict #7); proxied JSON bodies pass through here first.
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false, limit: '2mb' }));

// ---------- VIEW ENGINE ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Template helpers (Express merges app.locals into every render).
app.locals.safeJson = safeJson;
app.locals.jsonLd = jsonLd;
app.locals.asset = assets.asset;
app.locals.assetHas = assets.has;
app.locals.assetFileExists = assets.publicFileExists;
app.locals.photoUrl = require('./utils/photoUrl');
app.locals.img = require('./utils/img');
app.locals.site = require('./config/site');
app.locals.escapeHtml = require('./utils/escapeHtml');

// ---------- HTML EXTENSION REDIRECTS (SEO: prevent duplicate content) ----------
// Must be before express.static so .html files in /public don't serve as duplicates
const htmlRedirectMap = {
  '/index.html':              '/',
  '/login.html':              '/login',
  '/sign-up.html':            '/register',
  '/about.html':              '/about',
  '/about-us.html':           '/about',
  '/contact.html':            '/contact',
  '/enquiry.html':            '/contact',
  '/make-reservation.html':   '/contact',
  '/all-profiles.html':       '/all-profiles',
  '/user-profile.html':       '/dashboard',
  '/user-profile-edit.html':  '/update-profile',
  '/user-dashboard.html':     '/dashboard',
  '/user-interests.html':     '/user-interests',
  '/user-setting.html':       '/user-setting',
  '/user-my-matches.html':    '/dashboard',
  '/profile-details.html':    '/dashboard',
  '/coming-soon.html':        '/',
  '/photo-gallery-1.html':    '/',
  '/photo-gallery.html':      '/',
  '/blog-detail.html':        '/blogs',
  '/faq.html':                '/about',
  '/plans.html':              '/features',
  '/services.html':           '/features',
  '/user-plan.html':          '/features',
  '/wedding.html':            '/',
  '/wedding-video.html':      '/',
  '/404.html':                '/',
  '/biodata-builder-v2.html': '/biodata-builder',
  '/biodata-builder-old-24templates.html': '/biodata-builder',
  '/biodata-builder-backup.html': '/biodata-builder',
  '/biodata-builder.html':        '/biodata-builder',
  '/blog.html':                   '/blogs',
  '/user-chat.html':              '/user-chat',
};
app.use((req, res, next) => {
  const target = htmlRedirectMap[req.path] || htmlRedirectMap[req.path.toLowerCase()];
  if (target) return res.redirect(301, target);
  // Generic .html extension stripping for any unmapped legacy file (one hop: lowercased here)
  if (/\.html$/i.test(req.path)) {
    const cleanPath = req.path.slice(0, -5).toLowerCase() || '/';
    return res.redirect(301, cleanPath);
  }
  next();
});

// One URL per page: lowercase, no trailing slash (D3.27). Before express.static.
app.use(require('./middleware/canonicalUrl'));

// ---------- SITEMAPS (D3.31) ----------
// Generated into SITEMAP_DIR (shared dir in the monorepo deploy) and served
// from there directly (mounted before express.static, which would otherwise
// serve the public/ symlinks), so the public/ symlinks are a convenience, not a need.
const SITEMAP_DIR = process.env.SITEMAP_DIR;
if (SITEMAP_DIR) {
  app.get(/^\/sitemap(-[a-z]+)?\.xml$/, (req, res, next) => {
    const file = path.join(SITEMAP_DIR, path.basename(req.path));
    res.sendFile(file, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600, must-revalidate' } }, (err) => {
      if (err) next();
    });
  });
}

// ---------- STATIC FILES ----------
// Hashed build output (utils/assets.js manifest): immutable for a year.
app.use('/build', express.static(path.join(__dirname, 'public', 'build'), {
  immutable: true,
  maxAge: '365d',
  etag: false,
  index: false,
}));

app.use(express.static(path.join(__dirname, 'public'), {
  etag: true,
  lastModified: true,
  maxAge: '7d',
  setHeaders: (res, filePath) => {
    const extension = path.extname(filePath).toLowerCase();

    if (extension === '.html') {
      res.setHeader('Cache-Control', 'public, max-age=0, must-revalidate');
      return;
    }

    if (['.jpg', '.jpeg', '.png', '.webp', '.svg', '.ico', '.gif', '.woff', '.woff2'].includes(extension)) {
      res.setHeader('Cache-Control', 'public, max-age=2592000, stale-while-revalidate=86400');
      return;
    }

    if (['.css', '.js'].includes(extension)) {
      res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');
      return;
    }

    if (['.xml', '.txt', '.json'].includes(extension)) {
      res.setHeader('Cache-Control', 'public, max-age=3600, must-revalidate');
    }
  }
}));

// ---------- ROBOTS.TXT (SEO) ----------
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.sendFile(path.join(__dirname, 'robots.txt'));
});

// ---------- ADS.TXT (for Google AdSense - future use) ----------
app.get('/ads.txt', (req, res) => {
  res.type('text/plain');
  res.send('# Ads.txt file for BanjaraMatch.com\n# No ads currently configured');
});


// ---------- HEALTH (deploy.sh wait_healthy; before indexRoutes so the catch-all never sees it) ----------
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    ok: true,
    app: 'web',
    release: process.env.RELEASE_SHA || null,
    uptime: process.uptime(),
  });
});

// ---------- ROUTES ----------
// Order matters (integrator conflict #18): wellKnown/auth/cspReport before the
// /:slug catch-all in indexRoutes; the /api proxy after it so the web's own
// /api/regenerate-sitemap and /api/proxy/cities keep precedence.
app.use(require('./middleware/seoDefaults'));
app.use(require('./middleware/regionalIndex'));
app.use(require('./routes/wellKnown'));
app.use(require('./routes/auth'));
app.use(require('./routes/cspReport'));
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);
app.use(require('./middleware/apiProxy'));


const generateAllSitemaps = require('./utils/generateAllSitemaps');

// Generate sitemaps on startup (delayed to let API server start)
setTimeout(() => {
  console.log('⏰ Starting delayed sitemap generation...');
  generateAllSitemaps().catch(err => {
    console.error('❌ Failed to generate sitemaps on startup:', err.message);
  });
}, 5000); // Wait 5 seconds after server starts

// Regenerate sitemaps every 6 hours
setInterval(() => {
  console.log('⏰ Auto-regenerating sitemaps...');
  generateAllSitemaps().catch(err => {
    console.error('❌ Failed to auto-regenerate sitemaps:', err.message);
  });
}, 6 * 60 * 60 * 1000); // 6 hours



// ---------- 404 HANDLER ----------
app.use((req, res) => {
  res.status(404).render('pages/404', {
    title: '404 - Page Not Found | BanjaraMatch',
    meta: require('./config/pageMeta').pageMeta('notFound', { canonical: undefined }),
    user: null,
  });
});

// ---------- ERROR HANDLER (last) ----------
app.use(require('./middleware/errorHandler'));

// ---------- START SERVER ----------
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, (err) => {
  // Express 5 hands a failed bind (EADDRINUSE) to this callback instead of
  // throwing: exit so pm2 never gets 'ready' from a process that is not listening.
  if (err) {
    console.error(`BanjaraMatch could not listen on ${HOST}:${PORT}:`, err.code || err.message);
    process.exit(1);
  }
  console.log(`BanjaraMatch is running on http://${HOST}:${PORT}`);
  // pm2 wait_ready: the old process is kept until this is sent.
  if (process.send) process.send('ready');
});
