// utils/generateRegionalSitemap.js — sitemap-regional.xml (D3.31).
// State pages are always listed; a city page is listed only when it passes the
// index rule (>= 300 unique CMS words, utils/regionalIndexing.js), the same
// rule the catch-all uses for its robots meta, so the sitemap never lists a
// noindex URL.
const axios = require('axios');
const { DOMAIN, writeSitemap, escapeXml, dateOnly } = require('./sitemapFiles');
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

// The list endpoint carries no CMS content; each city page is loaded in full.
async function indexableCityPages(cityList) {
  const out = [];
  for (const row of cityList) {
    if (!row || !row.slug) continue;
    try {
      const res = await axios.get(`${API_URL}/api/city-pages/${encodeURIComponent(row.slug)}`, { timeout: 5000 });
      const page = res.data && res.data.data;
      if (page && isIndexable(page)) out.push({ ...row, updatedAt: page.updatedAt || row.updatedAt, createdAt: page.createdAt || row.createdAt });
    } catch (err) {
      console.warn(`⚠️ ${row.slug}: skipped (${err.message})`);
    }
  }
  return out;
}

const generateRegionalSitemap = async () => {
  console.log('🔄 Generating regional pages sitemap...');
  const [cityResponse, stateResponse] = await Promise.all([
    fetchWithRetry(`${API_URL}/api/city-pages`),
    fetchWithRetry(`${API_URL}/api/state-pages`),
  ]);
  const statePages = rows(stateResponse).filter((p) => p && p.slug);
  const cityList = rows(cityResponse);
  const cityPages = await indexableCityPages(cityList);

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
