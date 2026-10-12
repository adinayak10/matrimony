'use strict';
// One URL per page: lowercase, no trailing slash, query kept (D3.27).
//
//   /About/   -> 301 /about
//   /Banjara-Matrimony-Telangana?x=1 -> 301 /banjara-matrimony-telangana?x=1
//
// GET/HEAD only (a POST must never be turned into a GET by a redirect) and
// never for asset, API, auth or socket paths, whose case is meaningful or which
// are not pages. Mounted in app.js after the .html redirect map and before
// express.static so the .html stripper and this middleware produce one hop.

const SKIP_PREFIXES = [
  '/css/', '/js/', '/images/', '/fonts/', '/build/', '/uploads/', '/downloads/',
  '/icons/', '/.well-known/', '/socket.io/', '/api/', '/auth/',
];

// File-like paths at the root (sitemaps, robots, icons, IndexNow key) are
// served as-is too.
const SKIP_EXACT_RE = /^\/[^/]+\.(xml|txt|json|ico|png|webmanifest)$/i;

function shouldSkip(p) {
  if (p === '/') return true;
  if (SKIP_EXACT_RE.test(p)) return true;
  return SKIP_PREFIXES.some((prefix) => p.startsWith(prefix));
}

module.exports = function canonicalUrl(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next();
  const p = req.path || '/';
  if (shouldSkip(p)) return next();

  // Lowercase letters only; percent-escapes (%3C) keep their hex case so an
  // encoded path is never redirected to an equivalent spelling of itself.
  const lowered = p.replace(/%[0-9A-Fa-f]{2}|[A-Z]+/g, (m) => (m.charAt(0) === '%' ? m : m.toLowerCase()));
  const stripped = lowered.length > 1 ? lowered.replace(/\/+$/, '') : lowered;
  const target = stripped || '/';
  if (target === p) return next();

  const q = req.originalUrl.indexOf('?');
  const query = q === -1 ? '' : req.originalUrl.slice(q);
  res.set('Cache-Control', 'public, max-age=3600');
  return res.redirect(301, target + query);
};

module.exports.shouldSkip = shouldSkip;
