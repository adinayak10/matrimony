'use strict';
// Entry point: env first (fail-fast on a missing/short JWT_SECRET), then DB,
// then the app (apps/api/app.js builds express + socket.io without listening).
const env = require('./config/env');
const cluster = require('cluster');
const { connectDB } = require('./db');
const createApp = require('./app');

process.on('unhandledRejection', (r) => console.error('unhandledRejection', r));
process.on('uncaughtException', (e) => {
  console.error('uncaughtException', e);
  process.exit(1); // pm2 restarts
});
process.on('warning', (e) => console.warn(e.stack));

(async () => {
  try {
    await connectDB();

    const { server } = createApp();
    console.log('✅ API Server setup complete');

    // Start Server (readiness = DB connected + listening)
    server.listen(env.PORT, env.HOST, () => {
      console.log(`✅ Server running on ${env.HOST}:${env.PORT}`);
      if (process.send) process.send('ready');
      // Background jobs: one process only, opt-in via CRON_ENABLED (feature expansion A0.5)
      if (!env.IS_TEST && env.CRON_ENABLED && cluster.isPrimary) {
        require('./schedular/schedular').start();
      }
    });
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  }
})();
