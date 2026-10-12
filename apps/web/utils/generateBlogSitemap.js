// utils/generateBlogSitemap.js
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const domain = 'https://www.banjaramatch.com';
const API_URL = process.env.API_URL || 'https://api.banjaramatch.com';

const generateBlogSitemap = async () => {
  try {
    console.log('🔄 Generating blog sitemap...');
    
    // Fetch all published blogs from API with timeout and retry
    let response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await axios.get(`${API_URL}/api/blogs/all-published`, {
          timeout: 5000
        });
        break; // Success, exit retry loop
      } catch (err) {
        retries--;
        if (retries === 0) throw err;
        console.log(`⚠️ Retry fetching blogs (${retries} attempts left)...`);
        await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      }
    }
    
    if (!response || !response.data || !response.data.data) {
      console.warn('⚠️ No blogs found');
      // Create empty sitemap
      const emptyXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
</urlset>`;
      const filePath = path.join(__dirname, '..', 'public', 'sitemap-blogs.xml');
      fs.writeFileSync(filePath, emptyXml, 'utf8');
      return 0;
    }

    const blogs = response.data.data;
    console.log(`📝 Found ${blogs.length} published blogs`);

    // Helper function to get absolute URL for images
    const getAbsoluteImageUrl = (imageUrl) => {
      if (!imageUrl) return null;
      // If already absolute URL, return as is
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return imageUrl;
      }
      // If relative URL, make it absolute
      if (imageUrl.startsWith('/')) {
        return `${domain}${imageUrl}`;
      }
      // If path doesn't start with /, add domain and /
      return `${domain}/${imageUrl}`;
    };

    // Generate XML
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:news="http://www.google.com/schemas/sitemap-news/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${blogs.map(blog => {
  const imageUrl = getAbsoluteImageUrl(blog.featuredImage);
  const categorySlug = (blog.category || 'general').toLowerCase();
  return `  <url>
    <loc>${domain}/blogs/${categorySlug}/${blog.slug}</loc>
    <lastmod>${new Date(blog.updatedAt || blog.createdAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>${imageUrl ? `
    <image:image>
      <image:loc>${imageUrl}</image:loc>
      <image:title>${escapeXml(blog.title)}</image:title>
    </image:image>` : ''}
  </url>`;
}).join('\n')}
</urlset>`;

    const filePath = path.join(__dirname, '..', 'public', 'sitemap-blogs.xml');
    fs.writeFileSync(filePath, xml, 'utf8');
    
    console.log(`✅ Blog sitemap generated: ${blogs.length} blogs`);
    console.log(`📍 Location: ${filePath}`);
    
    return blogs.length;
  } catch (error) {
    console.error('❌ Error generating blog sitemap:', error.message);
    throw error;
  }
};

// Helper function to escape XML special characters
function escapeXml(unsafe) {
  if (!unsafe) return '';
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

module.exports = generateBlogSitemap;
