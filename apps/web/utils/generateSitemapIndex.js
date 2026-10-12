// utils/generateSitemapIndex.js — sitemap.xml index over the three child files (D3.31).
const fs = require('fs');
const { DOMAIN, sitemapPath, writeSitemap } = require('./sitemapFiles');

const getFileLastmod = (fileName) => {
  try {
    return fs.statSync(sitemapPath(fileName)).mtime.toISOString().split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
};

const generateSitemapIndex = () => {
  const sitemapFiles = ['sitemap-main.xml', 'sitemap-blogs.xml', 'sitemap-regional.xml']
    .filter((f) => fs.existsSync(sitemapPath(f)));
  if (!sitemapFiles.length) {
    console.warn('⚠️ No child sitemaps exist yet; index not written');
    return false;
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map((fileName) => `  <sitemap>
    <loc>${DOMAIN}/${fileName}</loc>
    <lastmod>${getFileLastmod(fileName)}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>
`;
  writeSitemap('sitemap.xml', xml);
  console.log('✅ Sitemap index generated');
  return true;
};

module.exports = generateSitemapIndex;
