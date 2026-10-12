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
//     - writes <name>.tmp then renames, so a reader never sees a partial file

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

function writeSitemap(name, xml, { count, minRatio = 0.5 } = {}) {
  const file = sitemapPath(name);
  if (typeof count === 'number') {
    const previous = countUrls(file);
    if (count === 0 && previous > 0) {
      console.warn(`⚠️ ${name}: new sitemap is empty, keeping the previous ${previous} URLs`);
      return false;
    }
    if (previous > 0 && count < previous * minRatio) {
      console.warn(`⚠️ ${name}: ${count} URLs is below ${Math.round(minRatio * 100)}% of the previous ${previous}, keeping the previous file`);
      return false;
    }
  }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, xml, 'utf8');
  fs.renameSync(tmp, file);
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

module.exports = { DOMAIN, sitemapDir, sitemapPath, countUrls, writeSitemap, escapeXml, dateOnly };
