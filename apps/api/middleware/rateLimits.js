'use strict';
/**
 * middleware/rateLimits.js — express-rate-limit instances (A7.3).
 *
 *   authLimiter        20 / 15 min per IP        /api/auth/*
 *   adminLoginLimiter   5 / 15 min per IP+email  /api/admin/auth/login
 *   formLimiter         5 / h per IP             contact/beta-tester/community-feedback POST
 *   interestLimiter    60 / h per user           /api/sendInterestRequest (after authenticate)
 *   reportLimiter      10 / day per user         /api/reportUser (after authenticate)
 *   publicListLimiter  60 / 15 min per IP        GET /api/community-feedback/contributors
 *   globalLimiter     600 / 15 min per IP        app-wide
 *
 * Requires `app.set('trust proxy', 'loopback')` BEFORE these are mounted so
 * req.ip is the client behind nginx (otherwise everyone shares 127.0.0.1).
 * JSON 429 body: {status:false, code:'RATE_LIMITED', message, retryAfterSeconds}.
 * Skipped under NODE_ENV=test unless RATE_LIMIT_TEST=1.
 */
const erl = require('express-rate-limit');

const rateLimit = typeof erl === 'function' ? erl : erl.rateLimit;
// v7.4+ exports ipKeyGenerator (IPv6-safe); fall back to req.ip on older versions.
const ipKey = typeof erl.ipKeyGenerator === 'function' ? (req) => erl.ipKeyGenerator(req.ip) : (req) => req.ip;

const skipInTest = () => process.env.NODE_ENV === 'test' && process.env.RATE_LIMIT_TEST !== '1';

function handler(req, res, _next, options) {
  const retryAfterSeconds = Math.ceil((options.windowMs || 0) / 1000);
  res.status(options.statusCode || 429).json({
    status: false,
    code: 'RATE_LIMITED',
    message: 'Too many requests, please try again later.',
    retryAfterSeconds,
  });
}

function make(opts) {
  return rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    handler,
    skip: skipInTest,
    max: opts.limit, // v6 name; v7 reads `limit` (below) and treats `max` as an alias
    ...opts,
  });
}

const userKey = (req) => (req.userId ? `u:${req.userId}` : `ip:${ipKey(req)}`);

const authLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  keyGenerator: ipKey,
});

const adminLoginLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => {
    const email = String((req.body && req.body.email) || '')
      .trim()
      .toLowerCase()
      .slice(0, 120);
    return `${ipKey(req)}|${email}`;
  },
});

const formLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: ipKey,
});

const interestLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  keyGenerator: userKey,
});

const reportLimiter = make({
  windowMs: 24 * 60 * 60 * 1000,
  limit: 10,
  keyGenerator: userKey,
});

const blogLikeLimiter = make({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  keyGenerator: ipKey,
});

// C4.6: one broadcast send per minute per admin
const broadcastLimiter = make({
  windowMs: 60 * 1000,
  limit: 1,
  keyGenerator: userKey,
});

// Public read-only lists the website renders (community-feedback contributors)
const publicListLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 60,
  keyGenerator: ipKey,
});

const globalLimiter = make({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  keyGenerator: ipKey,
});

module.exports = {
  authLimiter,
  adminLoginLimiter,
  formLimiter,
  interestLimiter,
  reportLimiter,
  blogLikeLimiter,
  broadcastLimiter,
  publicListLimiter,
  globalLimiter,
  make,
};
