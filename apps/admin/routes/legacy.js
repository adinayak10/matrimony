'use strict';
// Old URLs → new routes, all 301 (C1.7). The old admin served public/*.html
// directly through nginx try_files; those paths and the old server.js routes
// map here so bookmarks keep working. Test pages (debug, flow-test, test-auth,
// test-dashboard) are deleted files and fall through to the .html 404.
const express = require('express');

const router = express.Router();
const OBJECT_ID = /^[a-f0-9]{24}$/i;

// Plain page renames: /<old>(.html) → /<new>
const PAGE_MAP = {
  index: '/dashboard',
  dashboard: '/dashboard',
  login: '/login',
  users: '/users',
  reports: '/reports',
  'photo-moderation': '/photo-moderation',
  'contact-enquiries': '/contact-enquiries',
  'community-feedback': '/community-feedback',
  'beta-testers': '/beta-testers',
  banners: '/banners',
  'regional-pages': '/regional-pages',
  settings: '/settings',
  'apk-manager': '/apk-manager',
  'broadcast-email': '/broadcast-email',
  constants: '/master-data?tab=castes',
  'community-data': '/master-data?tab=gotras',
  'city-pages': '/regional-pages?tab=cities',
  'state-pages': '/regional-pages?tab=states',
};

// Explicit 404s: deleted test pages (C6/C9) must not 301 anywhere.
const GONE = new Set(['debug', 'flow-test', 'test-auth', 'test-dashboard']);

function withQuery(target, req) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : '';
  if (!qs) return target;
  return target.includes('?') ? `${target}&${qs}` : `${target}?${qs}`;
}

router.get('/', (req, res) => res.redirect(301, '/dashboard'));

// /user-detail?id=X and /user-detail.html?id=X → /users/X
router.get(['/user-detail', '/user-detail.html'], (req, res, next) => {
  const id = String(req.query.id || '');
  if (OBJECT_ID.test(id)) return res.redirect(301, `/users/${id}`);
  return res.redirect(301, '/users');
});

// /<page>.html and the old extension-less aliases that moved.
router.get(/^\/([a-z0-9-]+)\.html$/, (req, res, next) => {
  const name = req.params[0];
  if (GONE.has(name)) return next(); // → generic 404
  const target = PAGE_MAP[name];
  if (!target) return next();
  return res.redirect(301, withQuery(target, req));
});

for (const name of ['constants', 'community-data', 'city-pages', 'state-pages']) {
  router.get(`/${name}`, (req, res) => res.redirect(301, withQuery(PAGE_MAP[name], req)));
}

module.exports = router;
module.exports.PAGE_MAP = PAGE_MAP;
module.exports.GONE = GONE;
