'use strict';
/**
 * routes/publicLookupRoutes.js — lookups that need no login (A1.2).
 *
 * Mount BEFORE routes/userRoutes.js (which does router.use(authenticate)):
 *   app.use('/api', require('./routes/publicLookupRoutes'));
 *   app.use('/api', require('./routes/userRoutes'));
 *
 * Everything here is reference data or app-boot data the Flutter app reads
 * before login. fetchSetting / download-apk stay in routes/settingsRoute.js.
 */
const express = require('express');
const UserController = require('../controllers/UserController');
const CommunityFeedbackController = require('../controllers/CommunityFeedbackController');
const rl = require('../middleware/rateLimits');

const router = express.Router();

// Location
router.post('/countries', UserController.countries);
router.post('/states', UserController.states);
router.post('/cities', UserController.cities);

// Community reference data
router.post('/fetchGotraList', UserController.fetchGotraList);
router.post('/fetchCasteList', UserController.fetchCasteList);
router.get('/fetchClanList', UserController.fetchClanList);
router.post('/fetchClanList', UserController.fetchClanList);
router.get('/fetchSurnameTitleList', UserController.fetchSurnameTitleList);
router.post('/fetchSurnameTitleList', UserController.fetchSurnameTitleList);

// Profile reference data
router.post('/fetchProfessionList', UserController.fetchProfessionList);
router.post('/fetchQualificationList', UserController.fetchQualificationList);
router.post('/fetchIncomeRange', UserController.fetchIncomeRange);
router.post('/fetchReportReasons', UserController.fetchReportReasons);

// App boot
router.post('/fetchBanner', UserController.fetchBanner);

// Website "contributors" list: completed suggestions, safe fields only, no PII.
router.get('/community-feedback/contributors', rl.publicListLimiter, CommunityFeedbackController.getPublicContributors);

// Ice Breaker Game stats (counts only, no PII)
router.get('/getIcebreakerStats', (req, res) => {
  try {
    // lazy: gamesocket.js is loaded by socket.js at boot
    // eslint-disable-next-line global-require
    const { getIcebreakerStats } = require('../gamesocket');
    const stats = getIcebreakerStats() || {};
    return res.json({
      status: true,
      data: {
        activeGames: stats.activeGames || 0,
        queuedPlayers: stats.playersInQueue || 0,
      },
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Error getting ice breaker stats:', error.message);
    return res.json({ status: false, message: 'Error getting stats', data: { activeGames: 0, queuedPlayers: 0 } });
  }
});

/** Paths served here, used by test/auth-required.test.js to know what is public. */
router.PUBLIC_PATHS = [
  '/countries',
  '/states',
  '/cities',
  '/fetchGotraList',
  '/fetchCasteList',
  '/fetchClanList',
  '/fetchSurnameTitleList',
  '/fetchProfessionList',
  '/fetchQualificationList',
  '/fetchIncomeRange',
  '/fetchReportReasons',
  '/fetchBanner',
  '/community-feedback/contributors',
  '/getIcebreakerStats',
];

module.exports = router;
