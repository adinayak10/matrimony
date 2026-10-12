'use strict';
// Security headers for every admin response (C1.2 step 1).
//
// CSP (C1.2): default-src 'self'; img-src 'self' data: <API_PUBLIC_URL>;
// script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none';
// form-action 'self'. Shipped as Content-Security-Policy-Report-Only until the
// legacy pages (inline handlers) are gone (C6); flip CSP_ENFORCE=1 to enforce.
//
// Also: X-Robots-Tag noindex (robots.txt alone is not enough for an authed host),
// Cache-Control: no-store on everything that is not a static asset, and a
// same-origin Referrer-Policy so user ids in paths never leak to the API host's
// logs via <img> referrers.
//
// `helmet` is a new dependency (apps/admin/package.json, see wiring notes).
const helmet = require('helmet');
const env = require('../config/env');

const STATIC_PREFIX = /^\/(css|js|img|vendor)\//;
const STATIC_FILE = /^\/(robots\.txt|favicon\.ico|favicon\.svg)$/;

function buildCsp() {
  return {
    useDefaults: false,
    reportOnly: process.env.CSP_ENFORCE !== '1',
    directives: {
      'default-src': ["'self'"],
      'img-src': ["'self'", 'data:', env.API_PUBLIC_URL],
      'script-src': ["'self'"],
      'style-src': ["'self'"],
      'connect-src': ["'self'"],
      'font-src': ["'self'"],
      'frame-ancestors': ["'none'"],
      'form-action': ["'self'"],
      'base-uri': ["'self'"],
      'object-src': ["'none'"],
    },
  };
}

function security() {
  const helmetMw = helmet({
    contentSecurityPolicy: buildCsp(),
    // Avatars are loaded from api.banjaramatch.com; COEP would block them.
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'same-origin' },
    // HSTS is set by nginx (deploy/nginx/admin.conf); avoid a duplicate header.
    strictTransportSecurity: false,
    frameguard: { action: 'deny' },
    xContentTypeOptions: true,
  });

  return function securityHeaders(req, res, next) {
    res.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive');
    if (!STATIC_PREFIX.test(req.path) && !STATIC_FILE.test(req.path)) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
    }
    helmetMw(req, res, next);
  };
}

module.exports = security;
module.exports.buildCsp = buildCsp;
