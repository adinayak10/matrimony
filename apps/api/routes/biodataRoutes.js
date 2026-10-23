'use strict';
/**
 * routes/biodataRoutes.js — /api/biodata (biodata maker, docs/plans/02-biodata-maker.md).
 *
 * Public:  config, templates, published pages, guest render (multipart), shared-by-token views.
 * Member:  /documents/* (authenticate; owner-scoped in the controller, others get 404).
 * biodata.enabled=false answers 503 FEATURE_DISABLED everywhere except /config and /pages.
 *
 * Limiters (middleware/rateLimits.make; skipped under test unless RATE_LIMIT_TEST=1):
 *   render        20/h per IP for guests, 60/h per member
 *   owner pdf     60/h per member
 *   writes       120/15 min per member (create/update/delete/duplicate/restore/share)
 *   photo         30/day per member
 *   share views  120/15 min per IP
 *
 * router.PUBLIC_PATHS / router.MEMBER_PATHS list [method, path] for the tests.
 */
const express = require('express');
const erl = require('express-rate-limit');
const { authenticate, optionalAuth } = require('../middleware/identity');
const { make } = require('../middleware/rateLimits');
const { ownerPhotoUpload, renderUpload } = require('../middleware/biodataUpload');
const ctl = require('../controllers/BiodataController');

const router = express.Router();

const HOUR = 60 * 60 * 1000;
const ipKey = typeof erl.ipKeyGenerator === 'function' ? (req) => erl.ipKeyGenerator(req.ip) : (req) => req.ip;
const userKey = (req) => (req.userId ? `u:${req.userId}` : `ip:${ipKey(req)}`);

const renderLimiter = make({ windowMs: HOUR, limit: (req) => (req.userId ? 60 : 20), keyGenerator: userKey });
const ownerPdfLimiter = make({ windowMs: HOUR, limit: 60, keyGenerator: userKey });
const writeLimiter = make({ windowMs: 15 * 60 * 1000, limit: 120, keyGenerator: userKey });
const photoLimiter = make({ windowMs: 24 * HOUR, limit: 30, keyGenerator: userKey });
const shareViewLimiter = make({ windowMs: 15 * 60 * 1000, limit: 120, keyGenerator: ipKey });

const member = [authenticate, ctl.requireEnabled];
const owned = [...member, ctl.loadOwned];
const shared = [ctl.sharedHeaders, shareViewLimiter, ctl.requireEnabled, ctl.loadShared];

// ---------- public ----------
router.get('/config', ctl.config);
router.get('/templates', ctl.requireEnabled, ctl.templates);
router.get('/pages', ctl.listPages);
router.get('/pages/:slug', ctl.getPage);
router.post('/render', optionalAuth, ctl.requireEnabled, ctl.guestGate, renderLimiter, renderUpload, ctl.render);
router.get('/shared/:token', ...shared, ctl.sharedView);
router.get('/shared/:token/photo', ...shared, ctl.sharedPhoto);
router.get('/shared/:token/pdf', ...shared, ctl.sharedPdf);

// ---------- member ----------
router.get('/documents', ...member, ctl.listDocuments);
router.post('/documents', ...member, writeLimiter, ctl.createDocument);
router.get('/documents/:id', ...owned, ctl.getDocument);
router.put('/documents/:id', ...owned, writeLimiter, ctl.updateDocument);
router.delete('/documents/:id', ...owned, writeLimiter, ctl.deleteDocument);
router.post('/documents/:id/duplicate', ...owned, writeLimiter, ctl.duplicateDocument);
router.get('/documents/:id/versions', ...owned, ctl.listVersions);
router.get('/documents/:id/versions/:v', ...owned, ctl.getVersion);
router.post('/documents/:id/versions/:v/restore', ...owned, writeLimiter, ctl.restoreVersion);
router.post('/documents/:id/photo', ...owned, photoLimiter, ownerPhotoUpload, ctl.uploadPhoto);
router.delete('/documents/:id/photo', ...owned, writeLimiter, ctl.deletePhoto);
router.get('/documents/:id/photo', ...owned, ctl.getPhoto);
// GET per the contract; POST is the same handler (the builder posts after flushing its autosave)
router.get('/documents/:id/pdf', ...owned, ownerPdfLimiter, ctl.documentPdf);
router.post('/documents/:id/pdf', ...owned, ownerPdfLimiter, ctl.documentPdf);
router.post('/documents/:id/share', ...owned, writeLimiter, ctl.share);
router.post('/documents/:id/share/rotate', ...owned, writeLimiter, ctl.rotateShare);

function pathsOf(filter) {
  const out = [];
  for (const layer of router.stack) {
    if (!layer.route) continue;
    for (const method of Object.keys(layer.route.methods)) {
      if (layer.route.methods[method] && filter(layer.route.path)) out.push([method, layer.route.path]);
    }
  }
  return out;
}

const isMember = (p) => p === '/documents' || p.startsWith('/documents/');
router.PUBLIC_PATHS = pathsOf((p) => !isMember(p));
router.MEMBER_PATHS = pathsOf(isMember);

module.exports = router;
