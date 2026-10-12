'use strict';
/**
 * services/settingsCache.js — the one Setting document, cached 60 s (A4.3).
 *
 * Seven Setting docs exist in prod (six empty from seed.js) so a bare
 * `Setting.findOne()` is nondeterministic; we always sort by _id asc.
 * tools/cleanup/dedupe-settings.js reduces them to one.
 *
 * getSettings()  -> lean doc or null (never throws; falls back to the last
 *                   good value when Mongo errors)
 * invalidate()   -> drop the cache (call after PUT /api/admin/settings)
 * getSetting(path, fallback) -> dotted-path read with default
 */
const Setting = require('../models/settings');

const TTL_MS = 60 * 1000;
let cached = null;
let cachedAt = 0;
let inflight = null;

async function fetchFresh() {
  const doc = await Setting.findOne().sort({ _id: 1 }).lean();
  cached = doc || null;
  cachedAt = Date.now();
  return cached;
}

async function getSettings({ fresh = false } = {}) {
  const expired = Date.now() - cachedAt > TTL_MS;
  if (!fresh && cached && !expired) return cached;
  if (!fresh && inflight) return inflight;
  inflight = fetchFresh()
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[settingsCache] load failed:', err.message);
      return cached; // stale-while-error
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

function invalidate() {
  cached = null;
  cachedAt = 0;
}

async function getSetting(dottedPath, fallback) {
  const s = await getSettings();
  if (!s) return fallback;
  const v = String(dottedPath)
    .split('.')
    .reduce((acc, k) => (acc && typeof acc === 'object' ? acc[k] : undefined), s);
  return v === undefined || v === null ? fallback : v;
}

module.exports = { getSettings, invalidate, getSetting, TTL_MS };
