'use strict';
/**
 * config/env.js — single source of truth for process.env in the API.
 *
 * Must be the FIRST require in index.js / app.js (before any model or
 * controller) so dotenv has populated process.env and the JWT_SECRET
 * fail-fast runs before anything can fall back to a default secret.
 *
 * Env names are fixed by the integrator (docs/plans/integrator.md):
 * PORT, HOST, NODE_ENV, RELEASE_SHA, MONGODB_URI, JWT_SECRET, CORS_ORIGINS,
 * FIREBASE_WEB_API_KEY, FIREBASE_SERVICE_ACCOUNT_PATH, INTEREST_DAILY_CAP,
 * SITEMAP_REGEN_SECRET.
 */
const path = require('path');

// apps/api/.env is a symlink into /var/www/banjaramatch-shared/env/api.env in
// production; resolve relative to this file so the cwd does not matter
// (pm2, tools/, tests). dotenv never overrides variables already set.
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_TEST = NODE_ENV === 'test';

// Only used when NODE_ENV==='test' and no JWT_SECRET is provided. 64 chars so
// it passes the same length rule as production secrets.
const TEST_JWT_SECRET = 'banjaramatch-test-only-jwt-secret-0123456789abcdef0123456789abcdef';

function loadJwtSecret() {
  const s = (process.env.JWT_SECRET || '').trim();
  if (s.length >= 32) return s;
  if (IS_TEST && !s) return TEST_JWT_SECRET;
  // Fail fast: a short/missing secret means forgeable tokens (P0 finding #1).
  // eslint-disable-next-line no-console
  console.error(
    '[config/env] JWT_SECRET is missing or shorter than 32 characters. ' +
      'Generate one with `openssl rand -hex 48` and set it in apps/api/.env ' +
      '(shared/env/api.env). Refusing to start.'
  );
  process.exit(1);
  return null; // unreachable, keeps linters calm
}

const JWT_SECRET = loadJwtSecret();

const DEFAULT_CORS_ORIGINS = [
  'https://www.banjaramatch.com',
  'https://banjaramatch.com',
  'https://admin.banjaramatch.com',
];

function parseOrigins(value) {
  if (!value || !String(value).trim()) return DEFAULT_CORS_ORIGINS.slice();
  return String(value)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function toInt(value, fallback) {
  const n = parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function toBoolEnv(value, fallback) {
  if (value === undefined || value === null || String(value).trim() === '') return fallback;
  return /^(1|true|yes|on)$/i.test(String(value).trim());
}

const env = {
  NODE_ENV,
  IS_TEST,
  IS_PROD: NODE_ENV === 'production',
  PORT: toInt(process.env.PORT, 4002),
  HOST: (process.env.HOST || '127.0.0.1').trim(),
  RELEASE_SHA: (process.env.RELEASE_SHA || '').trim() || null,
  MONGODB_URI: (process.env.MONGODB_URI || '').trim(),
  JWT_SECRET,
  CORS_ORIGINS: parseOrigins(process.env.CORS_ORIGINS),
  FIREBASE_WEB_API_KEY: (process.env.FIREBASE_WEB_API_KEY || '').trim(),
  FIREBASE_SERVICE_ACCOUNT_PATH: (process.env.FIREBASE_SERVICE_ACCOUNT_PATH || '').trim(),
  INTEREST_DAILY_CAP: toInt(process.env.INTEREST_DAILY_CAP, 20),
  SITEMAP_REGEN_SECRET: (process.env.SITEMAP_REGEN_SECRET || '').trim(),
  // Feature expansion (2026-10). Verification documents live OUTSIDE uploads/
  // so neither nginx nor the /uploads static fallback can ever serve them.
  PRIVATE_UPLOADS_DIR: path.resolve((process.env.PRIVATE_UPLOADS_DIR || '').trim() || path.resolve(__dirname, '..', 'private_uploads')),
  // node-cron jobs (schedular/schedular.js) run only when true, never under test
  CRON_ENABLED: toBoolEnv(process.env.CRON_ENABLED, false),
  VERIFICATION_FILE_RETENTION_DAYS: toInt(process.env.VERIFICATION_FILE_RETENTION_DAYS, 30),
  DEFAULT_CORS_ORIGINS,
};

module.exports = env;
