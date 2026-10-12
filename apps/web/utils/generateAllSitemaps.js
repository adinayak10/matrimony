// utils/generateAllSitemaps.js
const generateMainSitemap = require('./generateSitemap');
const generateBlogSitemap = require('./generateBlogSitemap');
const generateRegionalSitemap = require('./generateRegionalSitemap');
const generateSitemapIndex = require('./generateSitemapIndex');

const generateAllSitemaps = async () => {
  try {
    console.log('\n🚀 Starting sitemap generation...\n');
    
    // Generate main sitemap (static pages)
    generateMainSitemap();
    
    // Generate blog sitemap
    const blogCount = await generateBlogSitemap();
    
    // Generate regional pages sitemap
    const regionalCount = await generateRegionalSitemap();
    
    // Generate sitemap index
    generateSitemapIndex();
    
    console.log('\n✅ All sitemaps generated successfully!');
    console.log(`📊 Summary:`);
    console.log(`   - Static pages: 18 (includes features, sitemap, account deletion, Google Ads sitelinks, footer pages, lambadi/gormati/gotra pages)`);
    console.log(`   - Blog posts: ${blogCount || 0}`);
    console.log(`   - Regional pages: ${regionalCount || 0}`);
    console.log(`   - Total URLs: ${18 + (blogCount || 0) + (regionalCount || 0)}`);
    console.log(`\n📁 Files created:`);
    console.log(`   - /public/sitemap.xml (index)`);
    console.log(`   - /public/sitemap-main.xml`);
    console.log(`   - /public/sitemap-blogs.xml`);
    console.log(`   - /public/sitemap-regional.xml`);
    console.log(`\n🎯 Google Ads Sitelinks Included:`);
    console.log(`   1. Register Free (/register)`);
    console.log(`   2. Browse Profiles (/all-profiles)`);
    console.log(`   3. About Us (/about)`);
    console.log(`   4. Contact Us (/contact)`);
    console.log(`   5. Blog & Tips (/blogs)`);
    console.log(`   6. City Matches (regional pages)`);
    console.log(`\n📄 Additional Footer Pages:`);
    console.log(`   - Community Feedback (/community-feedback)`);
    console.log(`   - Beta Testing Program (/beta-tester)`);
    console.log(`   - Mobile App (/banjara-matrimony-app)\n`);
    
    return true;
  } catch (error) {
    console.error('\n❌ Error generating sitemaps:', error.message);
    return false;
  }
};

// Run if called directly
if (require.main === module) {
  generateAllSitemaps()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = generateAllSitemaps;
