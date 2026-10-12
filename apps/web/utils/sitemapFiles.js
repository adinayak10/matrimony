'use strict';
// Where the sitemap XML files live and how they are written (D3.31).
//
//   SITEMAP_DIR (env) or apps/web/public — in the monorepo deploy the shared
//   dir /var/www/banjaramatch-shared/sitemaps, which public/sitemap*.xml
//   symlink to; app.js also serves /sitemap*.xml straight from SITEMAP_DIR.
//
//   writeSitemap(name, xml, { count, minRatio })
//     - never writes an empty url set (count 0 keeps the previous file)
//     - refuses when count < minRatio (default 50 %) of the previous file's <url> count
//     - writes a temp file next to the target then renames, so a reader never
//       sees a partial file; a symlinked target is resolved first (the link stays)

const fs = require('fs');
const path = require('path');

const DOMAIN = 'https://www.banjaramatch.com';

function sitemapDir() {
  return process.env.SITEMAP_DIR || path.join(__dirname, '..', 'public');
}

function sitemapPath(name) {
  return path.join(sitemapDir(), name);
}

function countUrls(file) {
  try {
    const xml = fs.readFileSync(file, 'utf8');
    return (xml.match(/<url>/g) || []).length;
  } catch (err) {
    return 0;
  }
}

// public/sitemap*.xml are symlinks into the shared sitemaps dir in the
// monorepo deploy. rename() over a symlink would replace the link with a
// regular file, so the write goes to the link's real target and the temp file
// is created next to it (same filesystem, so the rename is atomic).
function realTarget(file) {
  try {
    return fs.realpathSync(file);
  } catch (err) {
    // Missing file, or a dangling link: follow the link by hand once.
    try {
      const link = fs.readlinkSync(file);
      return path.resolve(path.dirname(file), link);
    } catch (e) {
      return file;
    }
  }
}

function writeSitemap(name, xml, { count, minRatio = 0.5 } = {}) {
  const file = realTarget(sitemapPath(name));
  if (typeof count === 'number') {
    const previous = countUrls(file);
    if (count === 0) {
      console.warn(`⚠️ ${name}: new sitemap is empty, not written` + (previous > 0 ? ` (keeping the previous ${previous} URLs)` : ''));
      return false;
    }
    // SITEMAP_ALLOW_SHRINK=1 is for one deliberate run (e.g. the first one after
    // the city index rule removes the noindex cities); never set it permanently.
    const allowShrink = /^(1|true|yes)$/i.test(process.env.SITEMAP_ALLOW_SHRINK || '');
    if (previous > 0 && count < previous * minRatio && !allowShrink) {
      console.warn(`⚠️ ${name}: ${count} URLs is below ${Math.round(minRatio * 100)}% of the previous ${previous}, keeping the previous file`);
      return false;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.${process.pid}.tmp`;
  try {
    fs.writeFileSync(tmp, xml, 'utf8');
    fs.renameSync(tmp, file);
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (e) { /* nothing to clean */ }
    throw err;
  }
  return true;
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe).replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));
}

const dateOnly = (d) => {
  const t = new Date(d || Date.now());
  return (Number.isNaN(t.getTime()) ? new Date() : t).toISOString().split('T')[0];
};

module.exports = { DOMAIN, sitemapDir, sitemapPath, realTarget, countUrls, writeSitemap, escapeXml, dateOnly };
