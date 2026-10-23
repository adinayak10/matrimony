// utils/generateSitemap.js — sitemap-main.xml: the static pages, the blog
// category pages that have at least one published post (D3.31), and the
// published Biodata Maker guide/category pages with >= 300 words
// (docs/plans/02-biodata-maker.md).
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const blogCategories = require('../config/blogCategories');
const { DOMAIN, writeSitemap, escapeXml, countUrls, realTarget, sitemapPath } = require('./sitemapFiles');

const API_URL = process.env.API_URL || 'http://127.0.0.1:4002';
const rootDir = path.join(__dirname, '..');

const getLastmodFromFile = (relativePath, fallbackDate = '2025-11-29') => {
  try {
    return fs.statSync(path.join(rootDir, relativePath)).mtime.toISOString().split('T')[0];
  } catch (error) {
    return fallbackDate;
  }
};

// Static pages. /all-profiles and the other logged-in pages are excluded
// (they redirect to /login). /account-deletion stays reachable for Play at
// priority 0.1.
const pages = [
  { loc: '', sourceFile: 'views/pages/index.ejs', priority: '1.0', changefreq: 'weekly' },
  { loc: 'register', sourceFile: 'views/pages/register.ejs', priority: '0.8', changefreq: 'monthly' },
  { loc: 'about', sourceFile: 'views/pages/about.ejs', priority: '0.6', changefreq: 'monthly' },
  { loc: 'contact', sourceFile: 'views/pages/contact.ejs', priority: '0.4', changefreq: 'yearly' },
  { loc: 'blogs', sourceFile: 'views/pages/blog.ejs', priority: '0.8', changefreq: 'weekly' },
  { loc: 'features', sourceFile: 'views/pages/features.ejs', priority: '0.7', changefreq: 'monthly' },
  { loc: 'terms-conditions', sourceFile: 'views/pages/terms-conditions.ejs', priority: '0.2', changefreq: 'yearly' },
  { loc: 'privacy-policy', sourceFile: 'views/pages/privacy-policy.ejs', priority: '0.2', changefreq: 'yearly' },
  { loc: 'account-deletion', sourceFile: 'views/pages/account-deletion.ejs', priority: '0.1', changefreq: 'yearly' },
  { loc: 'community-feedback', sourceFile: 'views/pages/community-feedback.ejs', priority: '0.5', changefreq: 'monthly' },
  { loc: 'beta-tester', sourceFile: 'views/pages/beta-tester.ejs', priority: '0.4', changefreq: 'monthly' },
  { loc: 'banjara-matrimony-app', sourceFile: 'views/pages/ai-matrimony-app.ejs', priority: '0.7', changefreq: 'monthly' },
  { loc: 'sitemap', sourceFile: 'views/pages/sitemap.ejs', priority: '0.3', changefreq: 'monthly' },
  { loc: 'lambadi-matrimony', sourceFile: 'views/pages/lambadi-matrimony.ejs', priority: '0.8', changefreq: 'monthly' },
  { loc: 'gormati-matrimony', sourceFile: 'views/pages/gormati-matrimony.ejs', priority: '0.8', changefreq: 'monthly' },
  { loc: 'banjara-gotra-list', sourceFile: 'views/pages/banjara-gotra-list.ejs', priority: '0.8', changefreq: 'monthly' },
  { loc: 'banjara-community-history', sourceFile: 'views/pages/banjara-community-history.ejs', priority: '0.8', changefreq: 'monthly' },
  { loc: 'child-safety-policy', sourceFile: 'views/pages/child-safety-policy.ejs', priority: '0.3', changefreq: 'yearly' },
  { loc: 'faq', sourceFile: 'views/pages/faq.ejs', priority: '0.6', changefreq: 'monthly' },
  { loc: 'success-stories', sourceFile: 'views/pages/success-stories.ejs', priority: '0.6', changefreq: 'weekly' },
  { loc: 'biodata-maker', sourceFile: 'views/pages/biodata-landing.ejs', priority: '0.8', changefreq: 'weekly' },
  { loc: 'biodata-maker/templates', sourceFile: 'views/pages/biodata-templates.ejs', priority: '0.7', changefreq: 'weekly' },
];

// Biodata pages from GET /api/biodata/pages?published=1 ({slug, kind, updatedAt,
// contentWords}): guides at the top level, categories under the gallery, and
// only with >= 300 words (the same rule that sets their robots tag). The landing
// page is a static entry above.
const BIODATA_GUIDE_RE = /^(marriage|banjara)-biodata-[a-z0-9-]{2,60}$/;
const BIODATA_CATEGORY_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
const BIODATA_MIN_WORDS = 300;

function mapBiodataRows(rows) {
  const out = [];
  const seen = new Set();
  for (const r of Array.isArray(rows) ? rows : []) {
    if (!r || typeof r.slug !== 'string' || r.isPublished === false) continue;
    if (!(Number(r.contentWords) >= BIODATA_MIN_WORDS)) continue;
    let loc = null;
    if (r.kind === 'guide' && BIODATA_GUIDE_RE.test(r.slug)) loc = r.slug;
    else if (r.kind === 'category' && BIODATA_CATEGORY_RE.test(r.slug)) loc = 'biodata-maker/templates/' + r.slug;
    if (!loc || seen.has(loc)) continue;
    seen.add(loc);
    const d = r.updatedAt ? new Date(r.updatedAt) : null;
    out.push({
      loc,
      lastmod: d && !isNaN(d) ? d.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      priority: r.kind === 'guide' ? '0.6' : '0.5',
      changefreq: 'monthly',
    });
  }
  return out;
}

// [] when the API has no biodata pages (or predates the endpoint: 404); null
// when it cannot be reached, so the caller keeps the previous file.
async function fetchBiodataPages() {
  try {
    const res = await axios.get(`${API_URL}/api/biodata/pages?published=1`, { timeout: 5000 });
    return mapBiodataRows(Array.isArray(res.data && res.data.data) ? res.data.data : []);
  } catch (err) {
    if (err && err.response && err.response.status === 404) return [];
    console.warn('⚠️ Biodata pages unavailable for the sitemap:', err.message);
    return null;
  }
}

// GET /api/blogs/categories -> { data: [{ category: 'Tips', count: 3 }, ...] }
async function fetchCategoryPages() {
  try {
    const res = await axios.get(`${API_URL}/api/blogs/categories`, { timeout: 5000 });
    const rows = Array.isArray(res.data && res.data.data) ? res.data.data : [];
    const today = new Date().toISOString().split('T')[0];
    return rows
      .filter((r) => r && r.category && Number(r.count) > 0)
      .map((r) => String(r.category).toLowerCase())
      .filter((slug) => blogCategories.includes(slug))
      .map((slug) => ({ loc: 'blogs/' + slug, lastmod: today, priority: '0.6', changefreq: 'weekly' }));
  } catch (err) {
    console.warn('⚠️ Blog categories unavailable for the sitemap:', err.message);
    return null;
  }
}

const generateSitemap = async () => {
  const [fetched, biodataFetched] = await Promise.all([fetchCategoryPages(), fetchBiodataPages()]);
  if ((fetched === null || biodataFetched === null) && countUrls(realTarget(sitemapPath('sitemap-main.xml'))) > 0) {
    // Without the API the category/biodata URLs would silently drop out; keep the file as it is.
    console.warn('⚠️ sitemap-main.xml: keeping the previous file');
    return null;
  }
  const categoryPages = fetched || [];
  const biodataPages = biodataFetched || [];
  const all = [...pages, ...categoryPages, ...biodataPages].map((page) => ({
    ...page,
    lastmod: page.lastmod || getLastmodFromFile(page.sourceFile),
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${all.map((page) => `  <url>
    <loc>${escapeXml(`${DOMAIN}/${page.loc}`)}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('\n')}
</urlset>
`;

  if (writeSitemap('sitemap-main.xml', xml, { count: all.length })) {
    console.log(`✅ Main sitemap generated: ${pages.length} static + ${categoryPages.length} category + ${biodataPages.length} biodata pages`);
  }
  return all.length;
};

module.exports = generateSitemap;
module.exports.pages = pages;
module.exports.mapBiodataRows = mapBiodataRows;
module.exports.fetchBiodataPages = fetchBiodataPages;
