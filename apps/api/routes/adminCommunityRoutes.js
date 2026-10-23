'use strict';
// /api/admin/{success-stories,announcements,faq-categories,faqs,push,analytics,recommendations}
// and /api/admin/users/:id/recommend(ations) (feature expansion A3). Every route needs adminAuth;
// every mutation is audited inside its controller (services/auditLog.record).
const express = require('express');
const erl = require('express-rate-limit');
const { adminAuth } = require('../middleware/adminAuth');
const rl = require('../middleware/rateLimits');
const validateImages = require('../middleware/validateImages');
const { uploadStoryPhoto } = require('../controllers/SuccessStoryController');
const successStories = require('../controllers/admin/successStoryController');
const announcements = require('../controllers/admin/announcementController');
const faqs = require('../controllers/admin/faqController');
const pushCtl = require('../controllers/admin/pushController');
const analytics = require('../controllers/admin/analyticsController');
const recommendations = require('../controllers/admin/recommendationController');

const router = express.Router();

// Local limiter built like middleware/rateLimits.js: one push send per minute per admin
// (the 5-per-day cap is enforced from PushJob rows in pushController).
const rateLimit = typeof erl === 'function' ? erl : erl.rateLimit;
const ipKey = typeof erl.ipKeyGenerator === 'function' ? (req) => erl.ipKeyGenerator(req.ip) : (req) => req.ip;
const pushSendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 1,
  max: 1,
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
// Announcement publish only hits the broadcast limiter when it also pushes.
const broadcastLimiterIfPush = (req, res, next) =>
  req.body && (req.body.sendPush === true || req.body.sendPush === 'true') ? rl.broadcastLimiter(req, res, next) : next();

// ==================== SUCCESS STORIES ====================
router.get('/success-stories', adminAuth, successStories.list);
router.post('/success-stories', adminAuth, uploadStoryPhoto, validateImages, successStories.create);
router.get('/success-stories/:id', adminAuth, successStories.getById);
router.put('/success-stories/:id', adminAuth, uploadStoryPhoto, validateImages, successStories.update);
router.delete('/success-stories/:id', adminAuth, successStories.remove);
router.patch('/success-stories/:id/status', adminAuth, successStories.setStatus);
router.patch('/success-stories/:id/featured', adminAuth, successStories.setFeatured);

// ==================== ANNOUNCEMENTS ====================
router.get('/announcements', adminAuth, announcements.list);
router.post('/announcements', adminAuth, announcements.create);
router.get('/announcements/:id', adminAuth, announcements.getById);
router.put('/announcements/:id', adminAuth, announcements.update);
router.delete('/announcements/:id', adminAuth, announcements.remove);
router.post('/announcements/:id/publish', adminAuth, broadcastLimiterIfPush, announcements.publish);
router.post('/announcements/:id/archive', adminAuth, announcements.archive);

// ==================== FAQ ====================
router.get('/faq-categories', adminAuth, faqs.listCategories);
router.post('/faq-categories', adminAuth, faqs.createCategory);
router.put('/faq-categories/:id', adminAuth, faqs.updateCategory);
router.delete('/faq-categories/:id', adminAuth, faqs.deleteCategory);
router.get('/faqs', adminAuth, faqs.listFaqs);
router.post('/faqs/reorder', adminAuth, faqs.reorderFaqs);
router.post('/faqs', adminAuth, faqs.createFaq);
router.put('/faqs/:id', adminAuth, faqs.updateFaq);
router.delete('/faqs/:id', adminAuth, faqs.deleteFaq);

// ==================== PUSH ====================
router.post('/push/broadcast', adminAuth, pushSendLimiter, pushCtl.broadcast);
router.post('/push/preview', adminAuth, pushCtl.preview);
router.post('/push/filtered', adminAuth, pushSendLimiter, pushCtl.filtered);
router.post('/push/user', adminAuth, pushCtl.toUser);
router.get('/push/jobs', adminAuth, pushCtl.jobs);

// ==================== ANALYTICS ====================
router.get('/analytics/funnel', adminAuth, analytics.funnel);
router.get('/analytics/activity', adminAuth, analytics.activity);
router.get('/analytics/demographics', adminAuth, analytics.demographics);
router.get('/analytics/active', adminAuth, analytics.active);

// ==================== MATCHMAKING ====================
router.post('/users/:id/recommend', adminAuth, recommendations.recommend);
router.get('/users/:id/recommendations', adminAuth, recommendations.listForUser);
router.get('/recommendations', adminAuth, recommendations.listAll);
router.delete('/recommendations/:id', adminAuth, recommendations.remove);

module.exports = router;
