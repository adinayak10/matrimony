const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const PORT = Number(process.env.PORT) || 4001;
const HOST = process.env.HOST || '127.0.0.1';
// nginx is the only client; trust its X-Forwarded-* headers.
app.set('trust proxy', 'loopback');

// Middleware
app.use(cors({
  origin: ['http://localhost:3001', 'https://admin.banjaramatch.com'],
  credentials: true
}));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check for deploy.sh wait_healthy (before static so no file can shadow it).
app.get('/health', (req, res) => {
  res.set('Cache-Control', 'no-store').json({
    ok: true,
    app: 'admin',
    release: process.env.RELEASE_SHA || null,
    uptime: process.uptime(),
  });
});

// Disable caching for HTML files and set correct MIME types
app.use((req, res, next) => {
  if (req.url.endsWith('.html') || req.url === '/users' || req.url === '/dashboard' || req.url === '/beta-testers' || req.url === '/contact-enquiries' || req.url === '/settings') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  } else if (req.url.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  }
  next();
});

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Routes

// Serve main page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

app.get('/users', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'users.html'));
});

app.get('/contact-enquiries', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'contact-enquiries.html'));
});

app.get('/beta-testers', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'beta-testers.html'));
});

app.get('/user-detail', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user-detail.html'));
});

app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

app.get('/banners', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'banners.html'));
});

app.get('/reports', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

app.get('/photo-moderation', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'photo-moderation.html'));
});

app.get('/constants', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'constants.html'));
});

app.get('/community-data', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'community-data.html'));
});

app.get('/community-feedback', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'community-feedback.html'));
});

app.get('/regional-pages', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'regional-pages.html'));
});

app.get('/city-pages', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'city-pages.html'));
});

app.get('/state-pages', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'state-pages.html'));
});

app.get('/apk-manager', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'apk-manager.html'));
});

app.get('/broadcast-email', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'broadcast-email.html'));
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`✅ Admin panel running on http://${HOST}:${PORT}`);
  // pm2 wait_ready: the old process is kept until this is sent.
  if (process.send) process.send('ready');
});
