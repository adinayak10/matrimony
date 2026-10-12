// utils/generateSitemapIndex.js
const fs = require('fs');
const path = require('path');

const domain = 'https://www.banjaramatch.com';
const publicDir = path.join(__dirname, '..', 'public');

const getFileLastmod = (fileName) => {
  try {
    return fs.statSync(path.join(publicDir, fileName)).mtime.toISOString().split('T')[0];
  } catch (error) {
    return new Date().toISOString().split('T')[0];
  }
};

const generateSitemapIndex = () => {
  try {
    console.log('🔄 Generating sitemap index...');

    const sitemapFiles = [
      'sitemap-main.xml',
      'sitemap-blogs.xml',
      'sitemap-regional.xml'
    ];
    
    // Create sitemap index that references all sitemap files
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map((fileName) => `  <sitemap>
    <loc>${domain}/${fileName}</loc>
    <lastmod>${getFileLastmod(fileName)}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;

    const filePath = path.join(__dirname, '..', 'public', 'sitemap.xml');
    fs.writeFileSync(filePath, xml, 'utf8');
    
    console.log('✅ Sitemap index generated');
    console.log(`📍 Location: ${filePath}`);
  } catch (error) {
    console.error('❌ Error generating sitemap index:', error.message);
    throw error;
  }
};

module.exports = generateSitemapIndex;
