'use strict';
// res.locals.regionalIndex = [{ state, slug, cities: [{ name, slug }] }] for
// partials/regional-links.ejs (footer + home) (D3.26).
//
// Data: GET /api/state-pages and GET /api/city-pages (public list endpoints,
// apps/api/controllers/{state,city}RegionalPageController.js getAllStatePages /
// getAllCityPages). Shapes verified:
//   state-pages: { status, data: [{ _id, slug, state: { _id, name }, stats }] }
//   city-pages:  { status, data: [{ _id, slug, city: { _id, name }, state: { _id, name }, stats }] }
// Cached 10 min, stale copy served on API errors, and an empty list when there
// is nothing to serve — a footer must never take a page down.
//
// Wiring (app.js, before indexRoutes): app.use(require('./middleware/regionalIndex'));

const { apiGet } = require('../utils/apiClient');

const TTL = 10 * 60e3;
const STALE = 24 * 3600e3;
const SKIP_RE = /^\/(api|auth|csp-report|socket\.io|health|build|css|js|images|fonts|uploads|downloads|icons|\.well-known)(\/|$)/;

const idOf = (ref) => (ref && typeof ref === 'object' ? String(ref._id || ref.id || '') : String(ref || ''));
const nameOf = (ref, fallback = '') => (ref && typeof ref === 'object' && ref.name ? String(ref.name) : fallback);
const byName = (a, b) => a.name.localeCompare(b.name);

function buildIndex(statesBody, citiesBody) {
  const states = Array.isArray(statesBody && statesBody.data) ? statesBody.data : [];
  const cities = Array.isArray(citiesBody && citiesBody.data) ? citiesBody.data : [];
  const groups = new Map();

  for (const s of states) {
    if (!s || !s.slug) continue;
    const id = idOf(s.state) || s.slug;
    groups.set(id, { state: nameOf(s.state, s.slug), name: nameOf(s.state, s.slug), slug: s.slug, cities: [] });
  }
  for (const c of cities) {
    if (!c || !c.slug) continue;
    const id = idOf(c.state);
    if (!groups.has(id)) {
      // A city page whose state has no state page: still listed, under a heading without a link.
      groups.set(id || c.slug, { state: nameOf(c.state, 'Other'), name: nameOf(c.state, 'Other'), slug: null, cities: [] });
    }
    const g = groups.get(id || c.slug);
    g.cities.push({ name: nameOf(c.city, c.slug), slug: c.slug });
  }
  const out = [...groups.values()].sort(byName);
  for (const g of out) {
    g.cities.sort(byName);
    delete g.name;
  }
  return out;
}

let memo = { at: 0, value: [] };

async function loadIndex() {
  if (Date.now() - memo.at < 30e3) return memo.value;
  const [states, cities] = await Promise.all([
    apiGet('/api/state-pages', { key: 'regional:states', ttl: TTL, stale: STALE }).catch(() => null),
    apiGet('/api/city-pages', { key: 'regional:cities', ttl: TTL, stale: STALE }).catch(() => null),
  ]);
  const value = states || cities ? buildIndex(states, cities) : memo.value;
  memo = { at: Date.now(), value };
  return value;
}

module.exports = async function regionalIndex(req, res, next) {
  res.locals.regionalIndex = [];
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  if (SKIP_RE.test(req.path || '')) return next();
  try {
    res.locals.regionalIndex = await loadIndex();
  } catch (err) {
    console.warn('[regionalIndex]', err && err.message);
  }
  next();
};

module.exports.buildIndex = buildIndex;
module.exports.loadIndex = loadIndex;
