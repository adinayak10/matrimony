'use strict';
// Small helpers shared by the page routers (extracted unchanged from routes/index.js).
//
//   listOf(body)                -> body.data when it is an array, else []
//   upstreamStatus(err)         -> the API's HTTP status for an error, or null
//   cachedPost(path, body, {key, ttl, stale, store, timeout})
//       Cached POST reads (the lookup endpoints are POST-only). Same semantics
//       as apiGet: fresh hit -> cached; error -> stale copy if any, else UpstreamError.

const { apiPost, UpstreamError, cache } = require('./apiClient');

const listOf = (body) => (body && Array.isArray(body.data) ? body.data : []);

const upstreamStatus = (err) => (err && (err.upstreamStatus || (err.response && err.response.status))) || null;

async function cachedPost(path, body, { key, ttl = 10 * 60e3, stale = 24 * 3600e3, store = cache, timeout } = {}) {
  const hit = store.get(key);
  if (hit && hit.fresh) return hit.value;
  try {
    const data = await apiPost(path, body, { timeout });
    store.set(key, data, { ttl, stale });
    return data;
  } catch (err) {
    const staleHit = store.get(key);
    if (staleHit) {
      console.warn(`[routes] ${path}: serving stale copy (${err.message})`);
      return staleHit.value;
    }
    if (err instanceof UpstreamError) throw err;
    throw new UpstreamError(`API unavailable for ${path}: HTTP ${upstreamStatus(err)}`, { cause: err, path, status: upstreamStatus(err) });
  }
}

module.exports = { listOf, upstreamStatus, cachedPost };
