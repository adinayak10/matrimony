'use strict';
// In-memory stale-while-error cache: a Map with LRU eviction (max 500 keys).
//
// Each entry has two windows: `ttl` (fresh — served without asking the API)
// and `stale` (kept after expiry so a failed refresh can still serve the last
// good value). utils/apiClient.js is the only intended caller, but the shape is
// generic. (D0.4)

const DEFAULT_MAX = 500;

class SwrCache {
  constructor({ max = DEFAULT_MAX } = {}) {
    this.max = max;
    this.map = new Map();
  }

  // Returns { value, fresh, expired } or undefined when the key is unknown or
  // its stale window has passed too. Touching an entry moves it to the MRU end.
  get(key, now = Date.now()) {
    const entry = this.map.get(key);
    if (!entry) return undefined;
    if (now > entry.staleUntil) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, entry);
    return { value: entry.value, fresh: now <= entry.expiresAt, expired: now > entry.expiresAt };
  }

  set(key, value, { ttl = 10 * 60e3, stale = 24 * 3600e3 } = {}, now = Date.now()) {
    if (this.map.has(key)) this.map.delete(key);
    this.map.set(key, { value, expiresAt: now + ttl, staleUntil: now + ttl + stale });
    while (this.map.size > this.max) {
      // Map iterates in insertion order, so the first key is the least recently used.
      const oldest = this.map.keys().next().value;
      this.map.delete(oldest);
    }
  }

  delete(key) {
    return this.map.delete(key);
  }

  clear() {
    this.map.clear();
  }

  get size() {
    return this.map.size;
  }
}

module.exports = new SwrCache();
module.exports.SwrCache = SwrCache;
