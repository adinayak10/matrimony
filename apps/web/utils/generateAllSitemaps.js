// utils/generateAllSitemaps.js — main + blog + regional + index (D3.31).
// Each child file is written atomically and guarded against empty or
// shrunken output (utils/sitemapFiles.js); one failing child does not stop
// the others, and the index is rebuilt from whatever exists.
const generateMainSitemap = require('./generateSitemap');
const generateBlogSitemap = require('./generateBlogSitemap');
const generateRegionalSitemap = require('./generateRegionalSitemap');
const generateSitemapIndex = require('./generateSitemapIndex');
const { sitemapDir } = require('./sitemapFiles');

const generateAllSitemaps = async () => {
  console.log(`\n🚀 Starting sitemap generation into ${sitemapDir()}\n`);
  let ok = true;
  const run = async (label, fn) => {
    try {
      return await fn();
    } catch (error) {
      ok = false;
      console.error(`❌ ${label} sitemap failed:`, error.message);
      return null;
    }
  };
  const mainCount = await run('main', generateMainSitemap);
  const blogCount = await run('blog', generateBlogSitemap);
  const regionalCount = await run('regional', generateRegionalSitemap);
  await run('index', async () => generateSitemapIndex());

  console.log(`📊 Sitemaps: main ${mainCount ?? '-'} | blogs ${blogCount ?? '-'} | regional ${regionalCount ?? '-'}`);
  return ok;
};

// Run if called directly
if (require.main === module) {
  generateAllSitemaps()
    .then((ok) => process.exit(ok ? 0 : 1))
    .catch(() => process.exit(1));
}

module.exports = generateAllSitemaps;
