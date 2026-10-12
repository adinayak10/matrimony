'use strict';
// One GET per nav item, plus /users/:id, /blogs/new and /blogs/:id/edit — every
// one behind requireAdmin.
//
// Migrated pages render views/pages/<key>.ejs with their page script. Pages not
// yet migrated are served by res.sendFile from the legacy public/*.html files
// (the legacy-compat shim, C1.8) — behind the gate, so the old pages gain the
// server-side auth check today and are replaced route by route later. The map
// below is explicit so nothing in public/ is reachable by guessing a name.
const path = require('path');
const express = require('express');
const requireAdmin = require('../middleware/requireAdmin');
const { renderPage, renderError } = require('../lib/render');
const { ITEMS, BY_KEY } = require('../config/nav');

const router = express.Router();
const PUBLIC = path.join(__dirname, '..', 'public');
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Pages rendered from views/pages/<key>.ejs + public/js/pages/<key>.js.
const MIGRATED = new Set(['dashboard', 'users', 'reports', 'photo-moderation']);

// Legacy shim: nav key → function(req) → legacy html filename under public/.
// Tabs on the merged pages pick the matching old page until C3.5/C3.6 land.
const LEGACY = {
  'contact-enquiries': () => 'contact-enquiries.html',
  'community-feedback': () => 'community-feedback.html',
  'beta-testers': () => 'beta-testers.html',
  blogs: () => 'dashboard.html', // blog CRUD lives inside the old dashboard until C3.4
  banners: () => 'banners.html',
  'regional-pages': (req) => ({ cities: 'city-pages.html', states: 'state-pages.html' }[req.query.tab] || 'regional-pages.html'),
  'master-data': (req) => (['gotras', 'clans', 'surname-titles'].includes(String(req.query.tab)) ? 'community-data.html' : 'constants.html'),
  settings: () => 'settings.html',
  'apk-manager': () => 'apk-manager.html',
  'broadcast-email': () => 'broadcast-email.html',
};

function sendLegacy(res, file) {
  return new Promise((resolve, reject) => {
    res.sendFile(path.join(PUBLIC, file), {
      dotfiles: 'deny',
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate, private' },
    }, (err) => (err ? reject(err) : resolve()));
  });
}

function pageHandler(item) {
  return async (req, res, next) => {
    try {
      if (MIGRATED.has(item.key)) {
        return await renderPage(res, item.key, { title: item.label, pageScript: item.key, activeKey: item.key });
      }
      const legacy = LEGACY[item.key];
      if (legacy) return await sendLegacy(res, legacy(req));
      // Pending item (audit-log): nothing to show yet, say so without a dead link.
      return await renderError(res, 404, {
        title: `${item.label} is not available yet`,
        message: 'This page ships with a later deploy. Nothing is missing from your data.',
        retryHref: '/dashboard',
      });
    } catch (err) { next(err); }
  };
}

for (const item of ITEMS) {
  router.get(item.href, requireAdmin, pageHandler(item));
}

// /users/:id — real detail page (C3.1). Invalid ids are a 404, not an API call.
router.get('/users/:id', requireAdmin, async (req, res, next) => {
  try {
    if (!OBJECT_ID.test(req.params.id)) {
      return await renderError(res, 404, { title: 'User not found', message: 'That is not a valid user id.', retryHref: '/users' });
    }
    return await renderPage(res, 'user-detail', {
      title: 'User',
      pageScript: 'user-detail',
      activeKey: 'users',
      userId: req.params.id,
    });
  } catch (err) { next(err); }
});

// Blog form pages: not migrated yet (C3.4) → the legacy dashboard handles blogs.
router.get('/blogs/new', requireAdmin, async (req, res, next) => {
  try { await sendLegacy(res, LEGACY.blogs(req)); } catch (err) { next(err); }
});
router.get('/blogs/:id/edit', requireAdmin, async (req, res, next) => {
  try {
    if (!OBJECT_ID.test(req.params.id)) {
      return await renderError(res, 404, { title: 'Blog not found', message: 'That is not a valid blog id.', retryHref: '/blogs' });
    }
    await sendLegacy(res, LEGACY.blogs(req));
  } catch (err) { next(err); }
});

module.exports = router;
module.exports.MIGRATED = MIGRATED;
module.exports.LEGACY = LEGACY;
module.exports.BY_KEY = BY_KEY;
