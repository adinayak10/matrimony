require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const helmet = require('helmet');

const app = express();
// nginx is the only client; trust its X-Forwarded-* headers.
app.set('trust proxy', 'loopback');

// ---------- SECURITY HEADERS ----------
// Hide X-Powered-By header
app.disable('x-powered-by');

// Use Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to avoid conflicts with inline scripts
  crossOriginEmbedderPolicy: false, // Disable to allow OAuth popups
  crossOriginOpenerPolicy: false // Disable to allow Firebase Google Sign-In popup
}));

// Add custom security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

// ---------- MIDDLEWARE SETUP ----------
// ---------- CORS SETUP ----------
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://www.banjaramatch.com',
  'https://banjaramatch.com',
    'https://www.banjaramatch.com',
   'https://api.banjaramatch.com'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      console.warn(`❌ CORS blocked: ${origin}`);
      return callback(new Error('CORS not allowed from this origin: ' + origin), false);
    }
  },
  credentials: true,
}));


app.use(cookieParser());
app.use(compression({ threshold: 1024 }));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ---------- VIEW ENGINE ----------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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
  const target = htmlRedirectMap[req.path];
  if (target) return res.redirect(301, target);
  // Generic .html extension stripping for any unmapped legacy file
  if (req.path.endsWith('.html')) {
    const cleanPath = req.path.slice(0, -5) || '/';
    return res.redirect(301, cleanPath);
  }
  next();
});

// ---------- STATIC FILES ----------
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
const indexRoutes = require('./routes/index');
app.use('/', indexRoutes);


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
  res.status(404).render('pages/404', { title: '404 - Page Not Found' });
});

// ---------- START SERVER ----------
const PORT = Number(process.env.PORT) || 4000;
const HOST = process.env.HOST || '127.0.0.1';
app.listen(PORT, HOST, () => {
  console.log(`BanjaraMatch is running on http://${HOST}:${PORT}`);
  // pm2 wait_ready: the old process is kept until this is sent.
  if (process.send) process.send('ready');
});
