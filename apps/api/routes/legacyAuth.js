'use strict';
/**
 * routes/legacyAuth.js (A3.1) — the 11 deleted auth routes answer 410 Gone
 * with one log line each, so any unknown client still calling them shows up
 * in the API log. Remove in Phase 7 (two weeks after A3 ships).
 */
const express = require('express');

const router = express.Router();

const LEGACY_PATHS = [
  '/check-user',
  '/firebase-login',
  '/firebase-register',
  '/send-otp',
  '/verify-otp-backend',
  '/complete-profile',
  '/request-otp',
  '/verify-otp',
  '/registerWithEmail',
  '/loginWithEmail',
  '/verify-otp-with-name',
];

router.all(LEGACY_PATHS, (req, res) => {
  // eslint-disable-next-line no-console
  console.warn('legacy_auth_route', {
    path: req.path,
    method: req.method,
    ua: String(req.headers['user-agent'] || '').slice(0, 80),
  });
  res.status(410).json({
    status: false,
    code: 'GONE',
    message: 'This sign-in method is no longer available. Please update the app and sign in with email or Google.',
  });
});

router.LEGACY_PATHS = LEGACY_PATHS;
module.exports = router;
