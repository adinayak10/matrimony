const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// Firebase Email/Password Auth (Primary - Free and Unlimited)
router.post('/firebase-email-login', AuthController.firebaseEmailLogin);
router.post('/firebase-email-register', AuthController.firebaseEmailRegister);

// Firebase Google Auth (Social Login)
router.post('/firebase-google-login', AuthController.firebaseGoogleLogin);

// Firebase Phone Auth (Legacy - Expensive SMS)
router.post('/check-user', AuthController.checkUserByPhone);
router.post('/firebase-login', AuthController.firebaseLogin);
router.post('/firebase-register', AuthController.firebaseRegister);

// Backend OTP (Alternative - requires SMS gateway)
router.post('/send-otp', AuthController.sendOtp);
router.post('/verify-otp-backend', AuthController.verifyOtpBackend);
router.post('/complete-profile', AuthController.completeProfile);

// Old OTP-based authentication (for mobile app compatibility)
router.post('/request-otp', AuthController.requestOtp);
router.post('/verify-otp', AuthController.verifyOtpAndLogin);

// Email-based authentication (hidden for web, kept for admin/future use)
router.post('/registerWithEmail', AuthController.registerWithEmail);
router.post('/loginWithEmail', AuthController.loginWithEmail);

// Firebase token verification (deprecated - kept for backward compatibility)
router.post('/verify-otp-with-name', AuthController.verifyFirebaseOtpWithName);

// Password Reset (Firebase Action Handler)
router.post('/verify-password-reset-code', AuthController.verifyPasswordResetCode);
router.post('/confirm-password-reset', AuthController.confirmPasswordReset);

// Common routes
router.post('/logout', AuthController.logout);
router.get('/me', AuthController.getMe);

// Community Feedback
const CommunityFeedbackController = require('../controllers/CommunityFeedbackController');
router.post('/community-feedback', CommunityFeedbackController.submitCommunityFeedback);
router.get('/community-feedback', CommunityFeedbackController.getAllFeedbacks); // Admin only
router.put('/community-feedback/:feedbackId', CommunityFeedbackController.updateFeedbackStatus); // Admin only

module.exports = router;
