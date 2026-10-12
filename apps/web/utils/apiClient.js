'use strict';
// Server-side client for the API (loopback, keep-alive, short timeout) with
// stale-while-error caching for SSR reads. (D0.4, D1.10)
//
//   apiGet('/api/state-pages', { key: 'regional:states' })
//     fresh cache hit      -> cached body
//     miss / expired       -> GET; body cached for `ttl`
//     API 404              -> null, cached for 60 s
//     other error/timeout  -> stale entry if one exists, else throws UpstreamError
//                             (the error handler turns that into a 503 + Retry-After)
//   apiPost(path, body, { headers, timeout })   no caching, errors thrown as-is
//                                                (callers inspect err.response)
//   forwardAuth(req)  -> { Authorization: 'Bearer <cookie>' } or {}
//
// Without `key`, apiGet does not cache. Per-user reads (/api/auth/me) must put
// something user-specific in the key: see hashKey().

const http = require('node:http');
const crypto = require('node:crypto');
const axios = require('axios');
const cache = require('./swrCache');

const BASE_URL = process.env.AUTH_SERVER_URL || 'http://127.0.0.1:4002';
const DEFAULT_TIMEOUT = 3000;
const NOT_FOUND_TTL = 60e3;

class UpstreamError extends Error {
  constructor(message, { cause, path, status } = {}) {
    super(message);
    this.name = 'UpstreamError';
    this.status = 503;
    this.upstreamStatus = status || null;
    this.path = path || null;
    if (cause) this.cause = cause;
  }
}

const client = axios.create({
  baseURL: BASE_URL,
  timeout: DEFAULT_TIMEOUT,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 32 }),
  headers: { Accept: 'application/json', 'User-Agent': 'banjaramatch-web/ssr' },
  // 4xx/5xx reject (axios default); the catch below decides what each means.
});

// One upstream request per key at a time: a burst of visitors on a cold key
// shares the same promise instead of stampeding the API.
const inflight = new Map();

const isNotFound = (err) => err && err.response && err.response.status === 404;

function describe(err) {
  if (err && err.response) return `HTTP ${err.response.status}`;
  if (err && err.code) return err.code;
  return (err && err.message) || 'unknown error';
}

async function fetchAndCache(path, { key, ttl, stale, headers, timeout }) {
  try {
    const res = await client.get(path, { headers, timeout });
    if (key) cache.set(key, res.data, { ttl, stale });
    return res.data;
  } catch (err) {
    if (isNotFound(err)) {
      if (key) cache.set(key, null, { ttl: NOT_FOUND_TTL, stale: 0 });
      return null;
    }
    const staleEntry = key ? cache.get(key) : undefined;
    if (staleEntry) {
      console.warn(`[apiClient] ${path}: ${describe(err)}; serving stale copy`);
      return staleEntry.value;
    }
    throw new UpstreamError(`API unavailable for ${path}: ${describe(err)}`, {
      cause: err,
      path,
      status: err && err.response ? err.response.status : null,
    });
  }
}

async function apiGet(path, { key, ttl = 10 * 60e3, stale = 24 * 3600e3, headers, timeout } = {}) {
  if (key) {
    const hit = cache.get(key);
    if (hit && hit.fresh) return hit.value;
    if (inflight.has(key)) return inflight.get(key);
  }
  const p = fetchAndCache(path, { key, ttl, stale, headers, timeout });
  if (key) {
    inflight.set(key, p);
    p.finally(() => inflight.delete(key)).catch(() => {});
  }
  return p;
}

// Writes are never cached. Network failures and timeouts become UpstreamError;
// HTTP error responses are rethrown untouched so the caller can relay the
// API's status and message (routes/auth.js does).
async function apiPost(path, body, { headers, timeout = DEFAULT_TIMEOUT } = {}) {
  try {
    const res = await client.post(path, body, { headers, timeout });
    return res.data;
  } catch (err) {
    if (err && err.response) throw err;
    throw new UpstreamError(`API unavailable for ${path}: ${describe(err)}`, { cause: err, path });
  }
}

// The session cookie set by routes/auth.js, or the legacy API cookie for the
// 14-day migration window (integrator conflict #1).
function sessionToken(req) {
  const c = (req && req.cookies) || {};
  const t = c.bm_session || c.token;
  return typeof t === 'string' && t.length > 0 ? t : null;
}

function forwardAuth(req) {
  const t = sessionToken(req);
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// Short digest for cache keys that must be per-user without storing the token
// itself as a key (keys may end up in logs).
function hashKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex').slice(0, 16);
}

module.exports = {
  client,
  apiGet,
  apiPost,
  forwardAuth,
  sessionToken,
  hashKey,
  UpstreamError,
  cache,
  BASE_URL,
};
