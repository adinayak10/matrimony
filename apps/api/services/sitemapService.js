// services/sitemapService.js
const axios = require('axios');

const FRONTEND_URL = process.env.FRONTEND_URL || 'https://www.banjaramatch.com';

/**
 * Trigger sitemap regeneration on the frontend server
 * This is called whenever blogs or regional pages are created/updated/deleted
 */
const triggerSitemapRegeneration = async () => {
  try {
    console.log('🔄 Triggering sitemap regeneration...');
    
    const response = await axios.post(`${FRONTEND_URL}/api/regenerate-sitemap`, {}, {
      timeout: 5000,
      headers: {
        'X-Internal-Request': 'true'
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
