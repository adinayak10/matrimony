// utils/generateRegionalSitemap.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const domain = 'https://www.banjaramatch.com';
const API_URL = process.env.API_URL || 'https://api.banjaramatch.com';

const generateRegionalSitemap = async () => {
  try {
    console.log('🔄 Generating regional pages sitemap...');
    
    // Fetch city and state pages from new endpoints with timeout and retry
    let cityPages = [];
    let statePages = [];
    let retries = 3;
    
    while (retries > 0) {
      try {
        const [cityResponse, stateResponse] = await Promise.all([
          axios.get(`${API_URL}/api/city-pages`, { timeout: 5000 }),
          axios.get(`${API_URL}/api/state-pages`, { timeout: 5000 })
        ]);
        
        cityPages = cityResponse.data?.data || [];
        statePages = stateResponse.data?.data || [];
        break; // Success, exit retry loop
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`⚠️ Retry fetching regional pages (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
    
    const pages = [
      ...statePages.map((page) => ({ ...page, pageType: 'state' })),
      ...cityPages.map((page) => ({ ...page, pageType: 'city' }))
    ];
    
    if (pages.length === 0) {
      console.warn('⚠️ No regional pages found');
      // Create empty sitemap
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
</urlset>`;
      const filePath = path.join(__dirname, '..', 'public', 'sitemap-regional.xml');
      fs.writeFileSync(filePath, emptyXml, 'utf8');
      return 0;
    }

    console.log(`🌍 Found ${statePages.length} state pages and ${cityPages.length} city pages`);

    // Generate XML with higher priority for regional pages (SEO important)
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(page => {
  const lastmod = page.updatedAt || page.createdAt || new Date();
  const dateStr = new Date(lastmod).toISOString().split('T')[0];
  return `  <url>
    <loc>${domain}/${page.slug}</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${page.pageType === 'state' ? '0.8' : '0.7'}</priority>
  </url>`;
}).join('\n')}
</urlset>`;

    const filePath = path.join(__dirname, '..', 'public', 'sitemap-regional.xml');
    fs.writeFileSync(filePath, xml, 'utf8');
    
    console.log(`✅ Regional sitemap generated: ${pages.length} pages`);
    console.log(`📍 Location: ${filePath}`);
    
    return pages.length;
  } catch (error) {
    console.error('❌ Error generating regional sitemap:', error.message);
    throw error;
  }
};

module.exports = generateRegionalSitemap;
