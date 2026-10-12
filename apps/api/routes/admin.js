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

// ==================== ADMIN AUTH (No middleware) ====================
router.post('/auth/login', authController.adminLogin);
router.post('/auth/logout', authController.adminLogout);
router.get('/auth/me', authController.getAdminMe);

// ==================== DASHBOARD ====================
router.get('/dashboard/stats', adminAuth, dashboardController.getDashboardStats);
router.get('/dashboard/recent-users', adminAuth, dashboardController.getRecentUsers);
router.get('/dashboard/user-growth', adminAuth, dashboardController.getUserGrowth);
router.get('/dashboard/engagement', adminAuth, dashboardController.getEngagementStats);

// ==================== USER MANAGEMENT ====================
router.get('/users', adminAuth, userController.getAllUsers);
router.get('/users/:id', adminAuth, userController.getUserById);
router.put('/users/:id', (req, res, next) => {
  console.log('🛣️ PUT /admin/users/:id route hit', { id: req.params.id, body: req.body });
  next();
}, adminAuth, userController.updateUser);
router.delete('/users/:id', adminAuth, userController.deleteUser);
router.post('/users/:id/block', adminAuth, userController.toggleBlockUser);
router.post('/users/:id/verify', adminAuth, userController.toggleVerifyUser);
router.post('/users/:id/reset-password', adminAuth, userController.resetUserPassword);
router.get('/users/:id/activity', adminAuth, userController.getUserActivity);
router.get('/users/:id/blocks', adminAuth, userController.getUserBlocks);

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

// ==================== BROADCAST EMAIL ====================
const User = require('../models/User');
const { sendBroadcastEmail } = require('../services/emailService');

/**
 * POST /api/admin/broadcast-email/send-test
 * Body: { userId, subject, bodyHtml, bodyText }
 * Sends the email to one specific user (for testing).
 */
router.post('/broadcast-email/send-test', adminAuth, async (req, res) => {
  try {
    const { userId, subject, bodyHtml, bodyText } = req.body;

    if (!userId)  return res.status(400).json({ success: false, message: 'userId is required' });
    if (!subject) return res.status(400).json({ success: false, message: 'subject is required' });
    if (!bodyHtml) return res.status(400).json({ success: false, message: 'bodyHtml is required' });

    const user = await User.findById(userId).select('full_name email').lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    if (!user.email) return res.status(400).json({ success: false, message: `User "${user.full_name}" has no email address` });

    const result = await sendBroadcastEmail([user], subject, bodyHtml, bodyText || '');
    if (result.sent > 0) {
      res.json({ success: true, message: `Test email sent to ${user.full_name} <${user.email}>` });
    } else {
      res.status(500).json({ success: false, message: `Failed to send: ${result.errors[0] || 'unknown error'}` });
    }
  } catch (err) {
    console.error('Test send error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

/**
 * GET /api/admin/broadcast-email/preview
 * Count users matching given filter criteria (for admin preview before sending).
 * Query params: gender, minAge, maxAge, verified, blocked, platform, hasPremium
 */
router.get('/broadcast-email/preview', adminAuth, async (req, res) => {
  try {
    const query = buildBroadcastQuery(req.query);
    // Only count users that have an email address
    query.email = { $exists: true, $nin: [null, ''] };

    const count = await User.countDocuments(query);
    res.json({ success: true, count });
  } catch (err) {
    console.error('Broadcast preview error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/**
 * POST /api/admin/broadcast-email/send
 * Body: { subject, bodyHtml, bodyText, filter: { gender, minAge, maxAge, verified, blocked, platform } }
 */
router.post('/broadcast-email/send', adminAuth, async (req, res) => {
  try {
    const { subject, bodyHtml, bodyText, filter = {} } = req.body;

    if (!subject || !bodyHtml) {
      return res.status(400).json({ success: false, message: 'subject and bodyHtml are required' });
    }

    const query = buildBroadcastQuery(filter);
    query.email = { $exists: true, $nin: [null, ''] };

    const users = await User.find(query).select('full_name email').lean();

    if (!users.length) {
      return res.status(400).json({ success: false, message: 'No users match the selected filters' });
    }

    // Run broadcast in background — respond immediately so admin isn't left waiting
    res.json({
      success: true,
      message: `Broadcast started. Sending to ${users.length} user(s).`,
      total: users.length,
    });

    // Fire-and-forget email sending
    sendBroadcastEmail(users, subject, bodyHtml, bodyText || '')
      .then(result => console.log(`[broadcast] Done – sent:${result.sent} failed:${result.failed}`))
      .catch(err => console.error('[broadcast] Error:', err.message));

  } catch (err) {
    console.error('Broadcast send error:', err);
    // Only send error if headers haven't been sent yet
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
});

/** Build Mongoose query from admin filter params */
function buildBroadcastQuery(filter) {
  const query = {};
  const { gender, minAge, maxAge, verified, blocked, platform } = filter;

  if (gender && gender !== 'all') query.gender = gender;

  if (minAge || maxAge) {
    const now = new Date();
    query.dob = {};
    // dob is stored as a date — older dob means higher age
    if (minAge) {
      const maxDob = new Date(now);
      maxDob.setFullYear(maxDob.getFullYear() - parseInt(minAge));
      query.dob.$lte = maxDob;
    }
    if (maxAge) {
      const minDob = new Date(now);
      minDob.setFullYear(minDob.getFullYear() - parseInt(maxAge) - 1);
      query.dob.$gte = minDob;
    }
  }

  if (verified === '1' || verified === true) query.is_verified = 1;
  if (verified === '0' || verified === false) query.is_verified = 0;

  if (blocked === '1' || blocked === true) query.is_block = 1;
  if (blocked === '0' || blocked === false) query.is_block = 0;

  if (platform && platform !== 'all') query.last_login_platform = platform;

  return query;
}

module.exports = router;
