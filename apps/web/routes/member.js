'use strict';
// Member pages added by the feature expansion (Track C):
//
//   GET /verify-profile   status card + ID/selfie form
//                         SSR: POST /api/fetchVerificationStatus, POST /api/fetchSetting (documentTypes)
//                         browser: multipart POST /api/profileVerification via the same-origin proxy
//   GET /daily-matches    SSR: POST /api/getTopDailyMatches {limit: 30}
//   GET /saved-searches   SSR: POST /api/fetchSavedSearches
//                         browser: updateSavedSearch / deleteSavedSearch; Run -> /all-profiles?saved=<id>
//   GET /connections      302 -> /user-interests#menu2 (the Connections tab)
//   GET /user-plan        302 -> /dashboard (the product is free; the plan page is gone)
//
// Mounted in app.js before routes/index.js (its /:slug catch-all stays last).

const express = require('express');
const { apiPost, forwardAuth, UpstreamError } = require('../utils/apiClient');
const { listOf, cachedPost } = require('../utils/apiHelpers');
const { ensureAuth, checkProfileCompletion } = require('../middleware/session');
const { pageMeta } = require('../config/pageMeta');

const router = express.Router();

const member = [ensureAuth, checkProfileCompletion];

// documentTypes from the public settings lookup ([{_id, title}]); [] when unavailable.
async function documentTypes() {
  try {
    const body = await cachedPost('/api/fetchSetting', {}, { key: 'lookup:settings' });
    const rows = body && body.data && Array.isArray(body.data.documentTypes) ? body.data.documentTypes : [];
    return rows.map((d) => (d && (d.title || d.name)) || '').filter(Boolean);
  } catch (err) {
    console.warn('[verify-profile] fetchSetting unavailable:', err.message);
    return [];
  }
}

router.get('/verify-profile', member, async (req, res, next) => {
  const headers = forwardAuth(req);
  let status = null;
  let statusError = false;
  try {
    const body = await apiPost('/api/fetchVerificationStatus', {}, { headers });
    status = (body && body.data) || null;
  } catch (err) {
    if (err instanceof UpstreamError) return next(err);
    statusError = true;
    console.warn('[verify-profile] fetchVerificationStatus failed:', err.message);
  }
  res.render('pages/verify-profile', {
    title: 'Verify Your Profile - Banjara Match',
    meta: pageMeta('verifyProfile'),
    user: req.user,
    verification: status,
    statusError,
    documentTypes: await documentTypes(),
  });
});

router.get('/daily-matches', member, async (req, res, next) => {
  let matches = [];
  let loadError = false;
  try {
    const body = await apiPost('/api/getTopDailyMatches', { my_user_id: req.user._id, limit: 30 }, { headers: forwardAuth(req) });
    matches = listOf(body);
  } catch (err) {
    if (err instanceof UpstreamError) return next(err);
    loadError = true;
    console.warn('[daily-matches] getTopDailyMatches failed:', err.message);
  }
  res.render('pages/daily-matches', {
    title: 'Daily Matches - Banjara Match',
    meta: pageMeta('dailyMatches'),
    user: req.user,
    matches,
    loadError,
  });
});

router.get('/saved-searches', member, async (req, res, next) => {
  let searches = [];
  let loadError = false;
  try {
    searches = listOf(await apiPost('/api/fetchSavedSearches', {}, { headers: forwardAuth(req) }));
  } catch (err) {
    if (err instanceof UpstreamError) return next(err);
    loadError = true;
    console.warn('[saved-searches] fetchSavedSearches failed:', err.message);
  }
  res.render('pages/saved-searches', {
    title: 'Saved Searches - Banjara Match',
    meta: pageMeta('savedSearches'),
    user: req.user,
    searches,
    loadError,
  });
});

router.get('/connections', (req, res) => res.redirect(302, '/user-interests#menu2'));

router.get('/user-plan', (req, res) => res.redirect(302, '/dashboard'));

module.exports = router;
