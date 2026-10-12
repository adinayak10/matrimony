// utils/generateBlogSitemap.js — sitemap-blogs.xml from GET /api/blogs/all-published (D3.31).
const axios = require('axios');
const { DOMAIN, writeSitemap, escapeXml, dateOnly } = require('./sitemapFiles');

const API_URL = process.env.API_URL || 'http://127.0.0.1:4002';

const getAbsoluteImageUrl = (imageUrl) => {
  if (!imageUrl) return null;
  if (/^https?:\/\//.test(imageUrl)) return imageUrl;
  return `${DOMAIN}/${String(imageUrl).replace(/^\/+/, '')}`;
};

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

const generateBlogSitemap = async () => {
  console.log('🔄 Generating blog sitemap...');
  const response = await fetchWithRetry(`${API_URL}/api/blogs/all-published`);
  const blogs = (response && response.data && Array.isArray(response.data.data) ? response.data.data : [])
    .filter((blog) => blog && blog.slug && blog.category);

  if (blogs.length === 0) {
    // An empty set never overwrites a real file (writeSitemap keeps the previous one).
    console.warn('⚠️ No published blogs returned');
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${blogs.map((blog) => {
    const imageUrl = getAbsoluteImageUrl(blog.featuredImage);
    const categorySlug = String(blog.category || 'general').toLowerCase();
    return `  <url>
    <loc>${escapeXml(`${DOMAIN}/blogs/${categorySlug}/${blog.slug}`)}</loc>
    <lastmod>${dateOnly(blog.updatedAt || blog.createdAt)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>${imageUrl ? `
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
      <image:title>${escapeXml(blog.title)}</image:title>
    </image:image>` : ''}
  </url>`;
  }).join('\n')}
</urlset>
`;

  if (writeSitemap('sitemap-blogs.xml', xml, { count: blogs.length })) {
    console.log(`✅ Blog sitemap generated: ${blogs.length} blogs`);
  }
  return blogs.length;
};

module.exports = generateBlogSitemap;
