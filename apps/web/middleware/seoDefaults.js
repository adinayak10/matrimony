'use strict';
// Per-request defaults for the head.ejs meta contract (D3.24).
//
// Routes render with `meta: { title, description, canonical?, robots?, ogType?,
// ogImage?, keywords?, jsonLd?: object[], prev?, next?, pageCategory?,
// noAnalytics?, styles?: string[], scripts?: string[] }`; head.ejs merges that
// over res.locals.metaDefaults, so a page only states what differs.
//
// Wiring (app.js, before indexRoutes): app.use(require('./middleware/seoDefaults'));

const site = require('../config/site');

function canonicalPath(req) {
  let p = (req.path || '/').toLowerCase();
  if (p.length > 1) p = p.replace(/\/+$/, '');
  return p || '/';
}

module.exports = function seoDefaults(req, res, next) {
  res.locals.metaDefaults = {
    robots: 'index, follow, max-image-preview:large',
    ogType: 'website',
    ogImage: site.defaultImage,
    canonical: canonicalPath(req),
    jsonLd: [],
  };
  res.locals.currentPath = req.path;
  next();
};

module.exports.canonicalPath = canonicalPath;
