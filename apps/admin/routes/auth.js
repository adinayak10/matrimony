'use strict';
// Login / logout. Plain HTML forms so they work without JS (C1.3).
//
//   GET  /login         valid cookie → 302 /dashboard, else the login page
//   POST /auth/login    form-encoded; 10 req / 15 min / IP; sets admin_session
//   POST /auth/logout   tells the API, drops the cookie, 302 /login
//
// The body parser is mounted on this router only (C1.2 step 6) so multipart
// uploads through the proxy keep streaming.
const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const apiClient = require('../lib/apiClient');
const { renderPage } = require('../lib/render');
const requireAdmin = require('../middleware/requireAdmin');

const router = express.Router();
const form = express.urlencoded({ extended: false, limit: '10kb' });

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: 'Too many login attempts. Try again in 15 minutes.',
  handler: (req, res) => renderLogin(res, {
    status: 429,
    flash: { type: 'error', message: 'Too many login attempts. Try again in 15 minutes.' },
    next: req.body && req.body.next,
  }),
});

function renderLogin(res, { status = 200, flash = null, next = '', email = '' } = {}) {
  return renderPage(res, 'login', {
    layout: 'auth',
    title: 'Sign in',
    status,
    flash,
    next: requireAdmin.safeNext(next || ''),
    email: typeof email === 'string' ? email.slice(0, 200) : '',
    activeKey: null,
  });
}

function sessionCookie() {
  return { ...requireAdmin.cookieOptions(), maxAge: env.SESSION_TTL_MS };
}

router.get('/login', async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies[env.COOKIE_NAME];
    if (token) {
      try {
        const r = await apiClient.me(token);
        if (r.ok) return res.redirect(302, requireAdmin.safeNext(req.query.next));
        res.clearCookie(env.COOKIE_NAME, requireAdmin.cookieOptions());
      } catch (e) {
        // API down: still show the form, the POST will report it.
      }
    }
    return await renderLogin(res, { next: req.query.next });
  } catch (err) { next(err); }
});

router.post('/auth/login', form, loginLimiter, async (req, res, next) => {
  try {
    const email = String((req.body && req.body.email) || '').trim().toLowerCase();
    const password = String((req.body && req.body.password) || '');
    const nextUrl = requireAdmin.safeNext((req.body && req.body.next) || '');

    if (!email || !password || email.length > 200 || password.length > 200) {
      return await renderLogin(res, {
        status: 400, email, next: nextUrl,
        flash: { type: 'error', message: 'Enter your email and password.' },
      });
    }

    let r;
    try {
      r = await apiClient.login(email, password);
    } catch (e) {
      console.error('[auth] login: API unreachable:', e && e.message);
      return await renderLogin(res, {
        status: 503, email, next: nextUrl,
        flash: { type: 'error', message: 'The API is not reachable right now. Try again in a moment.' },
      });
    }

    if (!r.ok) {
      // One generic message for wrong password / unknown email / not an admin.
      return await renderLogin(res, {
        status: 401, email, next: nextUrl,
        flash: { type: 'error', message: 'Invalid email or password.' },
      });
    }

    res.cookie(env.COOKIE_NAME, r.token, sessionCookie());
    return res.redirect(302, nextUrl);
  } catch (err) { next(err); }
});

router.post('/auth/logout', form, async (req, res, next) => {
  try {
    const token = req.cookies && req.cookies[env.COOKIE_NAME];
    if (token) {
      requireAdmin.invalidate(token);
      await apiClient.logout(token); // best effort, never throws
    }
    res.clearCookie(env.COOKIE_NAME, requireAdmin.cookieOptions());
    const wantsJson = (req.get('x-requested-with') || '') === 'admin';
    if (wantsJson) return res.json({ status: true, redirect: '/login' });
    return res.redirect(302, '/login');
  } catch (err) { next(err); }
});

module.exports = router;
