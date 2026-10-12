// services/sitemapService.js
const axios = require('axios');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.banjaramatch.com';
// D19: the web's /api/regenerate-sitemap requires this shared secret
const SITEMAP_REGEN_SECRET = (process.env.SITEMAP_REGEN_SECRET || '').trim();

/**
 * Trigger sitemap regeneration on the frontend server
 * This is called whenever blogs or regional pages are created/updated/deleted
 */
const triggerSitemapRegeneration = async () => {
  try {
    console.log('🔄 Triggering sitemap regeneration...');
    if (!SITEMAP_REGEN_SECRET) {
      console.warn('[sitemapService] SITEMAP_REGEN_SECRET is not set; the web will reject this call');
    }
    
    const response = await axios.post(`${FRONTEND_URL}/api/regenerate-sitemap`, {}, {
      timeout: 5000,
      headers: {
        'X-Internal-Request': 'true',
        ...(SITEMAP_REGEN_SECRET ? { 'X-Sitemap-Secret': SITEMAP_REGEN_SECRET } : {})
      }
    });
    
    if (response.data && response.data.success) {
      console.log('✅ Sitemap regenerated successfully');
      return true;
    }
    
    console.warn('⚠️ Sitemap regeneration returned unexpected response');
    return false;
  } catch (error) {
    console.error('❌ Failed to trigger sitemap regeneration:', error.message);
    // Don't throw - sitemap regeneration failure shouldn't block the main operation
    return false;
  }
};

module.exports = {
  triggerSitemapRegeneration
};
