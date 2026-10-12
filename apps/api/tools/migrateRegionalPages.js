/**
 * Migration Script: Split RegionalPage into CityRegionalPage and StateRegionalPage
 * 
 * This script migrates data from the unified RegionalPage model to separate models
 * for better maintainability, performance, and SEO.
 * 
 * Run: node scripts/migrateRegionalPages.js
 */

const mongoose = require('mongoose');
const RegionalPage = require('../models/RegionalPage');
const CityRegionalPage = require('../models/CityRegionalPage');
const StateRegionalPage = require('../models/StateRegionalPage');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/matrimony';

async function migrateRegionalPages() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all existing regional pages
    const allPages = await RegionalPage.find({})
      .populate('city state')
      .lean();

    console.log(`📊 Found ${allPages.length} regional pages to migrate\n`);

    let cityPagesCreated = 0;
    let statePagesCreated = 0;
    let errors = 0;

    for (const page of allPages) {
      try {
        if (page.pageType === 'city') {
          // Migrate to CityRegionalPage
          const cityPage = new CityRegionalPage({
            city: page.city._id,
            state: page.state._id,
            slug: page.slug,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
            metaKeywords: page.metaKeywords,
            heroSection: page.heroSection,
            introSection: page.introSection,
            stats: page.stats,
            statsSection: page.statsSection,
            aboutSection: page.aboutSection,
            whyChooseSection: page.whyChooseSection,
            successStoriesSection: page.successStoriesSection,
            howItWorksSection: page.howItWorksSection,
            communityInsightsSection: page.communityInsightsSection,
            localitiesSection: page.localitiesSection,
            nearbyCitiesSection: page.nearbyCitiesSection,
            faqSection: page.faqSection,
            ctaSection: page.ctaSection,
            popularLocalities: page.popularLocalities,
            nearbyCities: page.nearbyCities,
            communityInsights: page.communityInsights,
            featuredMembers: page.featuredMembers,
            bannerImages: page.bannerImages,
            isActive: page.isActive,
            isPublished: page.isPublished,
            views: page.views,
            registrationsFromPage: page.registrationsFromPage,
            lastStatsUpdate: page.lastStatsUpdate,
            createdBy: page.createdBy,
            updatedBy: page.updatedBy,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt
          });

          await cityPage.save();
          console.log(`✅ Migrated city page: ${page.city?.name || page.slug}`);
          cityPagesCreated++;

        } else if (page.pageType === 'state') {
          // Migrate to StateRegionalPage
          const statePage = new StateRegionalPage({
            state: page.state._id,
            slug: page.slug,
            metaTitle: page.metaTitle,
            metaDescription: page.metaDescription,
            metaKeywords: page.metaKeywords,
            heroSection: page.heroSection,
            introSection: page.introSection,
            stats: page.stats,
            statsSection: page.statsSection,
            aboutSection: page.aboutSection,
            whyChooseSection: page.whyChooseSection,
            successStoriesSection: page.successStoriesSection,
            howItWorksSection: page.howItWorksSection,
            communityInsightsSection: page.communityInsightsSection,
            citiesSection: page.localitiesSection, // Renamed for state pages
            faqSection: page.faqSection,
            ctaSection: page.ctaSection,
            communityInsights: page.communityInsights,
            featuredMembers: page.featuredMembers,
            bannerImages: page.bannerImages,
            isActive: page.isActive,
            isPublished: page.isPublished,
            views: page.views,
            registrationsFromPage: page.registrationsFromPage,
            lastStatsUpdate: page.lastStatsUpdate,
            createdBy: page.createdBy,
            updatedBy: page.updatedBy,
            createdAt: page.createdAt,
            updatedAt: page.updatedAt
          });

          await statePage.save();
          console.log(`✅ Migrated state page: ${page.state?.name || page.slug}`);
          statePagesCreated++;
        }
      } catch (error) {
        console.error(`❌ Error migrating ${page.slug}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ City pages created: ${cityPagesCreated}`);
    console.log(`   ✅ State pages created: ${statePagesCreated}`);
    console.log(`   ❌ Errors: ${errors}`);

    if (errors === 0) {
      console.log('\n⚠️  Migration successful! To complete the migration:');
      console.log('   1. Test the new system thoroughly');
      console.log('   2. Update all API routes to use new models');
      console.log('   3. Backup and remove old RegionalPage collection');
      console.log('   4. Update frontend to use new API endpoints');
    }

    await mongoose.disconnect();
    console.log('\n✅ Disconnected from MongoDB');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateRegionalPages();
