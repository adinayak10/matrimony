// utils/generateRegionalSitemap.js — sitemap-regional.xml (D3.31).
// State pages are always listed; a city page is listed only when it passes the
// index rule (>= 300 unique CMS words, utils/regionalIndexing.js), the same
// rule the catch-all uses for its robots meta, so the sitemap never lists a
// noindex URL.
const axios = require('axios');
const { DOMAIN, writeSitemap, escapeXml, dateOnly, countUrls, realTarget, sitemapPath } = require('./sitemapFiles');
const { isIndexable } = require('./regionalIndexing');

const API_URL = process.env.API_URL || 'http://127.0.0.1:4002';

async function fetchWithRetry(url, retries = 3) {
  for (;;) {
    try {
      return await axios.get(url, { timeout: 5000 });
    } catch (err) {
      retries -= 1;
      if (retries <= 0) throw err;
      console.log(`⚠️ Retry fetching ${url} (${retries} attempts left)...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

const rows = (res) => (res && res.data && Array.isArray(res.data.data) ? res.data.data : []);

// A list row that carries the API's `contentWords` is decided from it (no
// extra request). An API build without that field returns no CMS content on
// the list, so each city page is loaded in full and counted by the same rule.
// `failed` counts cities that could not be checked.
async function indexableCityPages(cityList) {
  const out = [];
  let failed = 0;
  for (const row of cityList) {
    if (!row || !row.slug) continue;
    if (Number.isFinite(row.contentWords)) {
      if (isIndexable({ ...row, pageType: 'city' })) out.push(row);
      continue;
    }
    try {
      const res = await axios.get(`${API_URL}/api/city-pages/${encodeURIComponent(row.slug)}`, { timeout: 5000 });
      const page = res.data && res.data.data;
      if (page && isIndexable({ ...page, pageType: 'city' })) out.push({ ...row, updatedAt: page.updatedAt || row.updatedAt, createdAt: page.createdAt || row.createdAt });
    } catch (err) {
      failed += 1;
      console.warn(`⚠️ ${row.slug}: could not be checked (${err.message})`);
    }
  }
  return { pages: out, failed };
}

const generateRegionalSitemap = async () => {
  console.log('🔄 Generating regional pages sitemap...');
  const [cityResponse, stateResponse] = await Promise.all([
    fetchWithRetry(`${API_URL}/api/city-pages`),
    fetchWithRetry(`${API_URL}/api/state-pages`),
  ]);
  const statePages = rows(stateResponse).filter((p) => p && p.slug);
  const cityList = rows(cityResponse);
  const { pages: cityPages, failed } = await indexableCityPages(cityList);
  if (failed > 0 && countUrls(realTarget(sitemapPath('sitemap-regional.xml'))) > 0) {
    // A city that could not be checked would silently drop out of the sitemap.
    console.warn(`⚠️ sitemap-regional.xml: ${failed} city pages could not be checked, keeping the previous file`);
    return null;
  }

  const pages = [
    ...statePages.map((page) => ({ ...page, pageType: 'state' })),
    ...cityPages.map((page) => ({ ...page, pageType: 'city' })),
  ];
  console.log(`🌍 ${statePages.length} state pages, ${cityPages.length} of ${cityList.length} city pages indexable`);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map((page) => `  <url>
    <loc>${escapeXml(`${DOMAIN}/${page.slug}`)}</loc>
    <lastmod>${dateOnly(page.updatedAt || page.createdAt)}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.pageType === 'state' ? '0.8' : '0.7'}</priority>
  </url>`).join('\n')}
</urlset>
`;

  if (writeSitemap('sitemap-regional.xml', xml, { count: pages.length })) {
    console.log(`✅ Regional sitemap generated: ${pages.length} pages`);
  }
  return pages.length;
};

module.exports = generateRegionalSitemap;
