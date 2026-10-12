// utils/generateSitemap.js
const fs = require('fs');
const path = require('path');

const domain = 'https://www.banjaramatch.com';
const rootDir = path.join(__dirname, '..');

const getLastmodFromFile = (relativePath, fallbackDate = '2025-11-29') => {
  try {
    const filePath = path.join(rootDir, relativePath);
    return fs.statSync(filePath).mtime.toISOString().split('T')[0];
  } catch (error) {
    return fallbackDate;
  }
};

// Define static pages - Google Ads Sitelinks optimized
const pages = [
  {
    loc: '', // homepage
    sourceFile: 'views/pages/index.ejs',
    priority: '1.0',
    changefreq: 'weekly',
  },
  {
    loc: 'register', // Sitelink #1 - Primary CTA
    sourceFile: 'views/pages/register.ejs',
    priority: '0.8',
    changefreq: 'monthly',
  },
  // /all-profiles requires authentication — excluded from sitemap to prevent GSC redirect warnings
  // {
  //   loc: 'all-profiles',
  //   sourceFile: 'views/pages/all-profiles.ejs',
  //   priority: '0.9',
  //   changefreq: 'daily',
  // },
  {
    loc: 'about', // Sitelink #3 - About Us
    sourceFile: 'views/pages/about.ejs',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    loc: 'contact', // Sitelink #4 - Contact Us
    sourceFile: 'views/pages/contact.ejs',
    priority: '0.4',
    changefreq: 'yearly',
  },
  {
    loc: 'blogs', // Sitelink #5 - Blog & Tips
    sourceFile: 'views/pages/blog.ejs',
    priority: '0.8',
    changefreq: 'weekly',
  },
  {
    loc: 'features',
    sourceFile: 'views/pages/features.ejs',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    loc: 'terms-conditions',
    sourceFile: 'views/pages/terms-conditions.ejs',
    priority: '0.2',
    changefreq: 'yearly',
  },
  {
    loc: 'privacy-policy',
    sourceFile: 'views/pages/privacy-policy.ejs',
    priority: '0.2',
    changefreq: 'yearly',
  },
  {
    loc: 'account-deletion',
    sourceFile: 'views/pages/account-deletion.ejs',
    priority: '0.2',
    changefreq: 'yearly',
  },
  {
    loc: 'community-feedback',
    sourceFile: 'views/pages/community-feedback.ejs',
    priority: '0.5',
    changefreq: 'monthly',
  },
  {
    loc: 'beta-tester',
    sourceFile: 'views/pages/beta-tester.ejs',
    priority: '0.4',
    changefreq: 'monthly',
  },
  {
    loc: 'banjara-matrimony-app',
    sourceFile: 'views/pages/ai-matrimony-app.ejs',
    priority: '0.7',
    changefreq: 'monthly',
  },
  {
    loc: 'sitemap',
    sourceFile: 'views/pages/sitemap.ejs',
    priority: '0.3',
    changefreq: 'monthly',
  },
  {
    loc: 'lambadi-matrimony',
    sourceFile: 'views/pages/lambadi-matrimony.ejs',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    loc: 'gormati-matrimony',
    sourceFile: 'views/pages/gormati-matrimony.ejs',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    loc: 'banjara-gotra-list',
    sourceFile: 'views/pages/banjara-gotra-list.ejs',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    loc: 'banjara-community-history',
    sourceFile: 'views/pages/banjara-community-history.ejs',
    priority: '0.8',
    changefreq: 'monthly',
  },
  {
    loc: 'child-safety-policy',
    sourceFile: 'views/pages/child-safety-policy.ejs',
    priority: '0.3',
    changefreq: 'yearly',
  },
  {
    loc: 'biodata-builder',
    sourceFile: 'public/biodata-builder.html',
    priority: '0.6',
    changefreq: 'monthly',
  },
  {
    loc: 'faq',
    sourceFile: 'views/pages/faq.ejs',
    priority: '0.6',
    changefreq: 'monthly',
  },
];

const generateSitemap = () => {
  const normalizedPages = pages.map((page) => ({
    ...page,
    lastmod: page.lastmod || getLastmodFromFile(page.sourceFile)
  }));

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${normalizedPages.map(page => `
  <url>
    <loc>${domain}/${page.loc}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`).join('')}
</urlset>`;

  const filePath = path.join(__dirname, '..', 'public', 'sitemap-main.xml');

  fs.writeFileSync(filePath, xml.trim(), 'utf8');
  console.log('✅ Main sitemap generated at:', filePath);
};

module.exports = generateSitemap;
