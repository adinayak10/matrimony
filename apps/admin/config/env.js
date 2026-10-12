'use strict';
// Admin server configuration. Read once at boot; fails fast on anything the
// server cannot run without. The admin server NEVER holds JWT_SECRET — it
// authenticates by asking the API (`/api/admin/auth/me`) and stores the
// API-issued token in an httpOnly cookie (docs/plans/admin-base-ui.md C0.4).
const path = require('path');

// env/admin.env is symlinked to apps/admin/.env by deploy.sh; load it relative
// to this file so `pm2 start` from any cwd finds it. dotenv is optional: pm2's
// ecosystem file can inject the variables directly, and the unit tests set
// them in-process, so a missing module is a warning, not a crash.
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  if (process.env.NODE_ENV !== 'test') console.warn('[admin env] dotenv not installed; reading process.env only');
}

const pkg = require('../package.json');

function int(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  if (!Number.isFinite(n)) throw new Error(`[admin env] ${name} must be a number, got "${raw}"`);
  return n;
}

function url(name, fallback, { required = false } = {}) {
  const raw = (process.env[name] || '').trim() || fallback;
  if (!raw) {
    if (required) throw new Error(`[admin env] ${name} is required (e.g. http://127.0.0.1:4002)`);
    return '';
  }
  let parsed;
  try { parsed = new URL(raw); } catch (e) { throw new Error(`[admin env] ${name} is not a valid URL: "${raw}"`); }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error(`[admin env] ${name} must be http(s)`);
  // No trailing slash so `API_INTERNAL_URL + '/api/...'` concatenates cleanly.
  return raw.replace(/\/+$/, '');
}

const NODE_ENV = process.env.NODE_ENV || 'production';
const SESSION_TTL_HOURS = int('SESSION_TTL_HOURS', 8); // aligned with the API admin JWT (integrator conflict #3)
if (SESSION_TTL_HOURS <= 0 || SESSION_TTL_HOURS > 24 * 14) {
  throw new Error('[admin env] SESSION_TTL_HOURS must be between 1 and 336');
}

const BOOT_TIME = Date.now();
const RELEASE_SHA = (process.env.RELEASE_SHA || '').trim();

const env = Object.freeze({
  NODE_ENV,
  IS_PROD: NODE_ENV === 'production',
  IS_TEST: NODE_ENV === 'test',
  PORT: int('PORT', 4001),
  HOST: process.env.HOST || '127.0.0.1',
  API_INTERNAL_URL: url('API_INTERNAL_URL', '', { required: true }),
  API_PUBLIC_URL: url('API_PUBLIC_URL', 'https://api.banjaramatch.com'),
  SESSION_TTL_HOURS,
  SESSION_TTL_MS: SESSION_TTL_HOURS * 3600 * 1000,
  RELEASE_SHA,
  // Cache-busting token for /css /js /img. deploy.sh exports RELEASE_SHA;
  // without it (local dev) every boot gets a fresh version.
  ASSET_VERSION: RELEASE_SHA ? RELEASE_SHA.slice(0, 12) : `${pkg.version}-${BOOT_TIME}`,
  // The cookie is Secure except on an explicit local development run over http.
  COOKIE_SECURE: NODE_ENV !== 'development',
  COOKIE_NAME: 'admin_session',
  APP_VERSION: pkg.version,
  BOOT_TIME,
});

module.exports = env;
