const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authenticate } = require('../middleware/identity');
const { adminAuth } = require('../middleware/adminAuth');
const rl = require('../middleware/rateLimits');

// Firebase Email/Password Auth (Primary - Free and Unlimited)
router.post('/firebase-email-login', AuthController.firebaseEmailLogin);
router.post('/firebase-email-register', AuthController.firebaseEmailRegister);

// Firebase Google Auth (Social Login)
router.post('/firebase-google-login', AuthController.firebaseGoogleLogin);

// The legacy phone-OTP / email-password routes were deleted (A3.1);
// routes/legacyAuth.js (mounted before this router) answers 410 on them.

// Password Reset (Firebase Action Handler)
router.post('/verify-password-reset-code', AuthController.verifyPasswordResetCode);
router.post('/confirm-password-reset', AuthController.confirmPasswordReset);

// Common routes
router.post('/logout', authenticate, AuthController.logout);
router.get('/me', authenticate, AuthController.getMe);

// Community Feedback
const CommunityFeedbackController = require('../controllers/CommunityFeedbackController');
router.post('/community-feedback', rl.formLimiter, CommunityFeedbackController.submitCommunityFeedback);
router.get('/community-feedback', adminAuth, CommunityFeedbackController.getAllFeedbacks); // Admin only
router.put('/community-feedback/:feedbackId', adminAuth, CommunityFeedbackController.updateFeedbackStatus); // Admin only

module.exports = router;
