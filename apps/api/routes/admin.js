// Admin Routes - Centralized routing for admin panel
const express = require('express');
const router = express.Router();
const { adminAuth } = require('../middleware/adminAuth');

// Import admin controllers
const authController = require('../controllers/admin/authController');
const dashboardController = require('../controllers/admin/dashboardController');
const userController = require('../controllers/admin/userController');
const bannerController = require('../controllers/admin/bannerController');
const constantsController = require('../controllers/admin/constantsController');
const aiGotraController = require('../controllers/admin/aiGotraController');
const settingsController = require('../controllers/admin/settingsController');
const reportController = require('../controllers/admin/reportController');
const photoModerationController = require('../controllers/admin/photoModerationController');
const auditLogController = require('../controllers/admin/auditLogController');
const CommunityFeedbackController = require('../controllers/CommunityFeedbackController');
const rl = require('../middleware/rateLimits');
const { record: audit } = require('../services/auditLog');

// ==================== ADMIN AUTH (No middleware) ====================
router.post('/auth/login', authController.adminLogin);
router.post('/auth/logout', authController.adminLogout);
router.get('/auth/me', adminAuth, authController.getAdminMe);
router.post('/auth/change-password', adminAuth, authController.changePassword); // C4.8

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', adminAuth, dashboardController.getDashboardStats);
router.get('/dashboard/recent-users', adminAuth, dashboardController.getRecentUsers);
router.get('/dashboard/user-growth', adminAuth, dashboardController.getUserGrowth);
router.get('/dashboard/engagement', adminAuth, dashboardController.getEngagementStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminAuth, userController.getAllUsers);
router.get('/users/:id', adminAuth, userController.getUserById);
router.put('/users/:id', adminAuth, userController.updateUser);
router.delete('/users/:id', adminAuth, userController.deleteUser);
router.post('/users/:id/block', adminAuth, userController.toggleBlockUser);
router.post('/users/:id/verify', adminAuth, userController.toggleVerifyUser);
router.post('/users/:id/reset-password', adminAuth, userController.resetUserPassword);
router.get('/users/:id/activity', adminAuth, userController.getUserActivity);
router.get('/users/:id/blocks', adminAuth, userController.getUserBlocks);
// Highlight ("top listed") toggle — replaces the unauthenticated
// /api/user/mark-top and /api/user/unmark-top (A4.2). Allowlisted update.
router.post('/users/:id/highlight', adminAuth, userController.setHighlight(true));
router.delete('/users/:id/highlight', adminAuth, userController.setHighlight(false));

// ==================== MEMBERSHIP PLANS (read-only list for the Assign modal) ====================
router.get('/membership-plans', adminAuth, async (req, res) => {
  try {
    const plans = await require('../models/MemebrshipPlan').find().sort({ price: 1 }).lean();
    res.json({ status: true, data: plans });
  } catch (err) {
    console.error('membership-plans error:', err.message);
    res.status(500).json({ status: false, message: 'Server error' });
  }
});
router.post('/users/:id/membership', adminAuth, (req, res, next) => {
  // alias of POST /api/assignMembership (A1.2)
  req.body = { ...(req.body || {}), user_id: req.params.id };
  return require('../controllers/UserController').assignMembership(req, res, next);
});

// ==================== COMMUNITY FEEDBACK (C4.3; old /api/auth/community-feedback paths stay for two weeks) ====================
router.get('/community-feedback', adminAuth, CommunityFeedbackController.getAllFeedbacks);
router.get('/community-feedback/stats', adminAuth, CommunityFeedbackController.getFeedbackStats);
router.get('/community-feedback/:id', adminAuth, CommunityFeedbackController.getFeedbackById);
router.patch('/community-feedback/:id', adminAuth, CommunityFeedbackController.updateFeedbackStatus);

// ==================== AUDIT LOG (C4.12) ====================
router.get('/audit-log', adminAuth, auditLogController.list);
router.get('/audit-log/actions', adminAuth, auditLogController.actions);

// ==================== REPORT / ABUSE MODERATION ====================
router.get('/reports', adminAuth, reportController.getAllReports);
router.get('/reports/stats', adminAuth, reportController.getReportStats);
router.get('/reports/:id', adminAuth, reportController.getReportById);
router.patch('/reports/:id/status', adminAuth, reportController.updateReportStatus);
router.post('/reports/:id/block-user', adminAuth, reportController.blockReportedUser);

// ==================== PHOTO MODERATION ====================
router.get('/photos', adminAuth, photoModerationController.getPhotosByStatus);
router.post('/photos/:id/approve', adminAuth, photoModerationController.approvePhoto);
router.post('/photos/:id/reject', adminAuth, photoModerationController.rejectPhoto);

// ==================== BANNER MANAGEMENT ====================
router.get('/banners', adminAuth, bannerController.getAllBanners);
router.get('/banners/:id', adminAuth, bannerController.getBannerById);
router.post('/banners', adminAuth, bannerController.createBanner);
router.put('/banners/:id', adminAuth, bannerController.updateBanner);
router.delete('/banners/:id', adminAuth, bannerController.deleteBanner);
router.post('/banners/:id/toggle-status', adminAuth, bannerController.toggleBannerStatus);

// ==================== CONSTANTS MANAGEMENT ====================

// Castes
router.get('/constants/castes', adminAuth, constantsController.getAllCastes);
router.post('/constants/castes', adminAuth, constantsController.createCaste);
router.put('/constants/castes/:id', adminAuth, constantsController.updateCaste);
router.delete('/constants/castes/:id', adminAuth, constantsController.deleteCaste);

// Clans
router.get('/constants/clans', adminAuth, constantsController.getAllClans);
router.post('/constants/clans', adminAuth, constantsController.createClan);
router.put('/constants/clans/:id', adminAuth, constantsController.updateClan);
router.delete('/constants/clans/:id', adminAuth, constantsController.deleteClan);

// Gotras
router.get('/constants/gotras', adminAuth, constantsController.getAllGotras);
router.post('/constants/gotras', adminAuth, constantsController.createGotra);
router.put('/constants/gotras/:id', adminAuth, constantsController.updateGotra);
router.delete('/constants/gotras/:id', adminAuth, constantsController.deleteGotra);

// AI-assisted clan suggestion for unassigned gotras (Groq Cloud) — read-only
// suggestion + a separate apply step, admin reviews before anything is saved
router.post('/gotras/ai-suggest', adminAuth, aiGotraController.suggestClanForUnassignedGotras);
router.post('/gotras/ai-apply', adminAuth, aiGotraController.applyClanSuggestions);

// Surname Titles
router.get('/constants/surname-titles', adminAuth, constantsController.getAllSurnameTitles);
router.post('/constants/surname-titles', adminAuth, constantsController.createSurnameTitle);
router.put('/constants/surname-titles/:id', adminAuth, constantsController.updateSurnameTitle);
router.delete('/constants/surname-titles/:id', adminAuth, constantsController.deleteSurnameTitle);

// Professions
router.get('/constants/professions', adminAuth, constantsController.getAllProfessions);
router.post('/constants/professions', adminAuth, constantsController.createProfession);
router.put('/constants/professions/:id', adminAuth, constantsController.updateProfession);
router.delete('/constants/professions/:id', adminAuth, constantsController.deleteProfession);

// Qualifications
router.get('/constants/qualifications', adminAuth, constantsController.getAllQualifications);
router.post('/constants/qualifications', adminAuth, constantsController.createQualification);
router.put('/constants/qualifications/:id', adminAuth, constantsController.updateQualification);
router.delete('/constants/qualifications/:id', adminAuth, constantsController.deleteQualification);

// Income Ranges
router.get('/constants/income-ranges', adminAuth, constantsController.getAllIncomeRanges);
router.post('/constants/income-ranges', adminAuth, constantsController.createIncomeRange);
router.put('/constants/income-ranges/:id', adminAuth, constantsController.updateIncomeRange);
router.delete('/constants/income-ranges/:id', adminAuth, constantsController.deleteIncomeRange);

// Interests
router.get('/constants/interests', adminAuth, constantsController.getAllInterests);
router.post('/constants/interests', adminAuth, constantsController.createInterest);
router.put('/constants/interests/:id', adminAuth, constantsController.updateInterest);
router.delete('/constants/interests/:id', adminAuth, constantsController.deleteInterest);

// Report Reasons
router.get('/constants/report-reasons', adminAuth, constantsController.getAllReportReasons);
router.post('/constants/report-reasons', adminAuth, constantsController.createReportReason);
router.put('/constants/report-reasons/:id', adminAuth, constantsController.updateReportReason);
router.delete('/constants/report-reasons/:id', adminAuth, constantsController.deleteReportReason);

// About Options
router.get('/constants/about-options', adminAuth, constantsController.getAllAboutOptions);
router.post('/constants/about-options', adminAuth, constantsController.createAboutOption);
router.put('/constants/about-options/:id', adminAuth, constantsController.updateAboutOption);
router.delete('/constants/about-options/:id', adminAuth, constantsController.deleteAboutOption);

// ==================== SETTINGS ====================
router.get('/settings', adminAuth, settingsController.getSettings);
router.put('/settings', adminAuth, settingsController.updateSettings);

// ==================== BROADCAST EMAIL (C4.6: BroadcastJob, 500 cap, 2/day, confirmCount) ====================
const User = require('../models/User');
const BroadcastJob = require('../models/BroadcastJob');
const { sendBroadcastEmail } = require('../services/emailService');
const { sanitizeRich } = require('../services/sanitize');
const { buildBroadcastQuery } = require('../services/broadcastQuery');

const BROADCAST_MAX_RECIPIENTS = 500;
const BROADCAST_MAX_PER_DAY = 2;

/**
 * POST /api/admin/broadcast-email/send-test
 * Body: { userId, subject, bodyHtml, bodyText }
 */
router.post('/broadcast-email/send-test', adminAuth, async (req, res) => {
  try {
    const { userId, subject, bodyHtml, bodyText } = req.body || {};

    if (!userId || !require('mongoose').isValidObjectId(userId)) return res.status(400).json({ success: false, message: 'userId is required' });
    if (typeof subject !== 'string' || !subject.trim()) return res.status(400).json({ success: false, message: 'subject is required' });
    if (typeof bodyHtml !== 'string' || !bodyHtml.trim()) return res.status(400).json({ success: false, message: 'bodyHtml is required' });

    const user = await User.findById(userId).select('full_name email').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.email) return res.status(400).json({ success: false, message: `User "${user.full_name}" has no email address` });

    const result = await sendBroadcastEmail([user], subject.trim().slice(0, 200), sanitizeRich(bodyHtml), typeof bodyText === 'string' ? bodyText : '');
    audit(req, 'broadcast.test', { type: 'user', id: userId }, { after: { subject: subject.trim().slice(0, 200) } });
    if (result.sent > 0) {
      res.json({ success: true, message: `Test email sent to ${user.full_name} <${user.email}>` });
    } else {
      res.status(500).json({ success: false, message: `Failed to send: ${result.errors[0] || 'unknown error'}` });
    }
  } catch (err) {
    console.error('Test send error:', err.message);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

/**
 * GET /api/admin/broadcast-email/preview — recipient count for the filters
 */
router.get('/broadcast-email/preview', adminAuth, async (req, res) => {
  try {
    const query = buildBroadcastQuery(req.query);
    query.email = { $exists: true, $nin: [null, ''] };
    const count = await User.countDocuments(query);
    res.json({ success: true, count, max: BROADCAST_MAX_RECIPIENTS, tooMany: count > BROADCAST_MAX_RECIPIENTS });
  } catch (err) {
    console.error('Broadcast preview error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/admin/broadcast-email/send
 * Body: { subject, bodyHtml, bodyText, filter, confirmCount }
 * confirmCount must equal the current preview count; max 500 recipients;
 * 2 sends per admin per day; 1 per minute (limiter). Returns the job id.
 */
router.post('/broadcast-email/send', adminAuth, rl.broadcastLimiter, async (req, res) => {
  try {
    const { subject, bodyHtml, bodyText, filter = {}, confirmCount } = req.body || {};

    if (typeof subject !== 'string' || !subject.trim() || typeof bodyHtml !== 'string' || !bodyHtml.trim()) {
      return res.status(400).json({ success: false, message: 'subject and bodyHtml are required' });
    }

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const sentToday = await BroadcastJob.countDocuments({ startedBy: req.userId, createdAt: { $gte: since }, status: { $ne: 'failed' } });
    if (sentToday >= BROADCAST_MAX_PER_DAY) {
      return res.status(429).json({ success: false, code: 'DAILY_CAP', message: `Only ${BROADCAST_MAX_PER_DAY} broadcasts per day are allowed` });
    }

    const query = buildBroadcastQuery(filter && typeof filter === 'object' ? filter : {});
    query.email = { $exists: true, $nin: [null, ''] };

    const total = await User.countDocuments(query);
    if (!total) {
      return res.status(400).json({ success: false, message: 'No users match the selected filters' });
    }
    if (total > BROADCAST_MAX_RECIPIENTS) {
      return res.status(400).json({ success: false, code: 'TOO_MANY', message: `This broadcast would reach ${total} members; the limit is ${BROADCAST_MAX_RECIPIENTS}. Narrow the filters.`, total });
    }
    if (Number(confirmCount) !== total) {
      return res.status(400).json({ success: false, code: 'CONFIRM_MISMATCH', message: `confirmCount (${confirmCount}) does not match the current recipient count (${total}). Preview again.`, total });
    }

    const users = await User.find(query).select('full_name email').limit(BROADCAST_MAX_RECIPIENTS).lean();
    const cleanSubject = subject.trim().slice(0, 200);
    const cleanHtml = sanitizeRich(bodyHtml);

    const job = await BroadcastJob.create({
      status: 'running',
      subject: cleanSubject,
      filter,
      total: users.length,
      startedBy: req.userId,
      startedAt: new Date(),
    });
    audit(req, 'broadcast.send', { type: 'broadcast', id: job._id }, { after: { subject: cleanSubject, total: users.length, filter } });

    res.json({
      success: true,
      message: `Broadcast started. Sending to ${users.length} user(s).`,
      total: users.length,
      jobId: job._id,
    });

    // Background send with progress written to the job
    let lastWrite = 0;
    const onProgress = ({ sent, failed }) => {
      const now = Date.now();
      if (now - lastWrite < 2000) return;
      lastWrite = now;
      BroadcastJob.updateOne({ _id: job._id }, { $set: { sent, failed } }).catch(() => {});
    };
    sendBroadcastEmail(users, cleanSubject, cleanHtml, typeof bodyText === 'string' ? bodyText : '', onProgress)
      .then((result) =>
        BroadcastJob.updateOne(
          { _id: job._id },
          { $set: { status: 'completed', sent: result.sent, failed: result.failed, errorMessages: result.errors.slice(0, 50), finishedAt: new Date() } }
        )
      )
      .catch((err) =>
        BroadcastJob.updateOne({ _id: job._id }, { $set: { status: 'failed', errorMessages: [String(err.message).slice(0, 500)], finishedAt: new Date() } })
      )
      .catch(() => {});
  } catch (err) {
    console.error('Broadcast send error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

/** GET /api/admin/broadcast-email/jobs/:id — progress polling */
router.get('/broadcast-email/jobs/:id', adminAuth, async (req, res) => {
  try {
    if (!require('mongoose').isValidObjectId(req.params.id)) return res.status(404).json({ success: false, message: 'Job not found' });
    const job = await BroadcastJob.findById(req.params.id).populate('startedBy', 'full_name email').lean();
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.set('Cache-Control', 'no-store').json({ success: true, data: job });
  } catch (err) {
    console.error('Broadcast job error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/** GET /api/admin/broadcast-email/jobs — recent jobs */
router.get('/broadcast-email/jobs', adminAuth, async (req, res) => {
  try {
    const jobs = await BroadcastJob.find().sort({ createdAt: -1 }).limit(20).populate('startedBy', 'full_name email').lean();
    res.json({ success: true, data: jobs });
  } catch (err) {
    console.error('Broadcast jobs error:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
