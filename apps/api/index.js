const express = require('express');
require('dotenv').config();
const path = require('path');
const http = require('http');
const mongoose = require('mongoose');
const socketIO = require('socket.io');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const { connectDB } = require('./db');

const PORT = Number(process.env.PORT) || 4002;
const HOST = process.env.HOST || '127.0.0.1';

const app = express();
const server = http.createServer(app);

// Behind nginx on the same host
app.set('trust proxy', 'loopback');

// CORS
app.use(cors({
  origin: function (origin, callback) {
    const allowed = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:4000',
      'http://192.168.1.13:3000',
      'http://localhost:8080',
      'http://localhost:8081',
      'https://www.banjaramatch.com',
      'https://api.banjaramatch.com',
      'https://banjaramatch.com',
      'https://admin.banjaramatch.com'
    ];

    if (!origin || allowed.includes(origin)) return callback(null, true);
    console.warn('❌ CORS blocked:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Handle preflight requests
app.options('*', cors());




// Middleware
app.use(cookieParser());

// Body is parsed once here (multipart is multer's; nginx caps the rest)
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use('/uploads', express.static('uploads'));
app.use(express.static(path.join(__dirname, 'public')));

// Health (registered before the DB connect so pm2/deploy can poll it)
app.get('/health', (req, res) => {
  const db = mongoose.connection.readyState === 1;
  res.status(db ? 200 : 503)
    .set('Cache-Control', 'no-store')
    .json({
      ok: db,
      app: 'api',
      db,
      release: process.env.RELEASE_SHA || null,
      uptime: process.uptime()
    });
});

// DB Connection
(async () => {
  try {
    const client = await connectDB();

    // WebSocket
    const io = socketIO(server, { cors: { origin: '*' } });
    const { setupSocket } = require('./socket');
    setupSocket(io);

    // Routes
    app.use('/api', require('./routes/settingsRoute'));
    app.use('/api', require('./routes/userRoutes'));
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
    app.use('/api/admin', require('./routes/adminRoutes')); // Admin routes (blogs, users, settings, etc.)

    // Root
    app.get('/', (req, res) => {
      res.json({ service: 'banjaramatch-api' });
    });

    console.log('✅ API Server setup complete');

    // Start Server (readiness = DB connected + listening)
    server.listen(PORT, HOST, () => {
      console.log(`✅ Server running on ${HOST}:${PORT}`);
      if (process.send) process.send('ready');
    });

    process.on('warning', (e) => console.warn(e.stack));

  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
  }
})();
