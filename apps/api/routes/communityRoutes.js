'use strict';
// Member-facing community endpoints under /api (feature expansion A3):
// submitSuccessStory, fetchMySuccessStories, fetchPlatformNotification, fetchRecommendations.
// Each route applies `authenticate` itself (this router is mounted at /api after userRoutes).
const express = require('express');
const erl = require('express-rate-limit');
const { authenticate } = require('../middleware/identity');
const validateImages = require('../middleware/validateImages');
const SuccessStoryController = require('../controllers/SuccessStoryController');
const AnnouncementController = require('../controllers/AnnouncementController');
const recommendationController = require('../controllers/admin/recommendationController');

const router = express.Router();

// Local limiter built like middleware/rateLimits.js (same key/skip/429 body).
// Upload abuse guard; the 3-stories-per-day rule itself is SuccessStoryController.submissionQuota.
const rateLimit = typeof erl === 'function' ? erl : erl.rateLimit;
const ipKey = typeof erl.ipKeyGenerator === 'function' ? (req) => erl.ipKeyGenerator(req.ip) : (req) => req.ip;
const storyUploadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => (req.userId ? `u:${req.userId}` : `ip:${ipKey(req)}`),
  skip: () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TEST !== '1',
  handler: (req, res, _next, options) =>
    res.status(options.statusCode || 429).json({
      status: false,
      code: 'RATE_LIMITED',
      message: 'Too many requests, please try again later.',
      retryAfterSeconds: Math.ceil((options.windowMs || 0) / 1000),
    }),
});

router.post(
  '/submitSuccessStory',
  authenticate,
  storyUploadLimiter,
  SuccessStoryController.submissionQuota,
  SuccessStoryController.uploadStoryPhoto,
  validateImages,
  SuccessStoryController.submitSuccessStory
);
router.post('/fetchMySuccessStories', authenticate, SuccessStoryController.fetchMySuccessStories);
router.post('/fetchPlatformNotification', authenticate, AnnouncementController.fetchPlatformNotification);
router.post('/fetchRecommendations', authenticate, recommendationController.fetchRecommendations);

module.exports = router;
