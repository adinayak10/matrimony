/**
 * Migration Script: Update Regional Page Slugs
 * Changes from: banjara-matrimony-city-state
 * To: banjara-matrimony-city
 */

const mongoose = require('mongoose');
const RegionalPage = require('../models/RegionalPage');
const City = require('../models/City');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/matrimony';

async function updateSlugs() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB');

    // Get all regional pages
    const pages = await RegionalPage.find({}).populate('city state');
    console.log(`📄 Found ${pages.length} regional pages to update`);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    for (const page of pages) {
      try {
        if (!page.city || !page.state) {
          console.log(`⚠️  Skipping page ${page._id} - missing city or state reference`);
          skipped++;
          continue;
        }

        const cityName = page.city.name.toLowerCase().replace(/\s+/g, '-');
        const newSlug = `banjara-matrimony-${cityName}`;

        // Check if slug needs update
        if (page.slug === newSlug) {
          console.log(`✓ ${page.city.name} - slug already correct`);
          skipped++;
          continue;
        }

        // Check for slug conflicts
        const conflictPage = await RegionalPage.findOne({ 
          slug: newSlug, 
          _id: { $ne: page._id } 
        });

        if (conflictPage) {
          console.log(`❌ ${page.city.name} - slug conflict detected with another page`);
          errors++;
          continue;
        }

        // Update slug
        const oldSlug = page.slug;
        page.slug = newSlug;
        await page.save();

        console.log(`✅ Updated: ${page.city.name}`);
        console.log(`   Old: ${oldSlug}`);
        console.log(`   New: ${newSlug}`);
        updated++;

      } catch (error) {
        console.error(`❌ Error updating page for ${page.city?.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📄 Total: ${pages.length}`);

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
updateSlugs();
