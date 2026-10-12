/**
 * Seed Sample Regional Pages
 * Creates regional pages for major cities
 */

const mongoose = require('mongoose');
const RegionalPage = require('../models/RegionalPage');
const City = require('../models/City');
const State = require('../models/State');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/matrimony';

const sampleCities = [
  { cityName: 'Hyderabad', stateName: 'Telangana', totalMembers: 1200, totalMales: 520, totalFemales: 680, couplesMatched: 320 },
  { cityName: 'Bangalore', stateName: 'Karnataka', totalMembers: 1500, totalMales: 650, totalFemales: 850, couplesMatched: 410 },
  { cityName: 'Mumbai', stateName: 'Maharashtra', totalMembers: 1800, totalMales: 780, totalFemales: 1020, couplesMatched: 520 },
  { cityName: 'Pune', stateName: 'Maharashtra', totalMembers: 980, totalMales: 420, totalFemales: 560, couplesMatched: 280 },
  { cityName: 'Delhi', stateName: 'Delhi', totalMembers: 1350, totalMales: 580, totalFemales: 770, couplesMatched: 390 },
  { cityName: 'Warangal', stateName: 'Telangana', totalMembers: 450, totalMales: 190, totalFemales: 260, couplesMatched: 120 },
  { cityName: 'Karimnagar', stateName: 'Telangana', totalMembers: 320, totalMales: 140, totalFemales: 180, couplesMatched: 85 },
  { cityName: 'Mysore', stateName: 'Karnataka', totalMembers: 520, totalMales: 220, totalFemales: 300, couplesMatched: 145 },
  { cityName: 'Nagpur', stateName: 'Maharashtra', totalMembers: 680, totalMales: 290, totalFemales: 390, couplesMatched: 190 },
  { cityName: 'Gurgaon', stateName: 'Haryana', totalMembers: 890, totalMales: 380, totalFemales: 510, couplesMatched: 240 }
];

async function seedRegionalPages() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB\n');

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const cityData of sampleCities) {
      try {
        // Find or create state
        let state = await State.findOne({ name: cityData.stateName });
        if (!state) {
          state = new State({
            name: cityData.stateName,
            code: cityData.stateName.substring(0, 2).toUpperCase(),
            isActive: true
          });
          await state.save();
          console.log(`   ✅ Created state: ${cityData.stateName}`);
        }

        // Find or create city
        let city = await City.findOne({ name: cityData.cityName });
        if (!city) {
          city = new City({
            name: cityData.cityName,
            state: state._id,
            isActive: true
          });
          await city.save();
          console.log(`   ✅ Created city: ${cityData.cityName}`);
        }

        // Check if regional page already exists
        const existingPage = await RegionalPage.findOne({ city: city._id });
        if (existingPage) {
          console.log(`⏭️  ${cityData.cityName} - Regional page already exists (${existingPage.slug})`);
          skipped++;
          continue;
        }

        // Create regional page
        const regionalPage = new RegionalPage({
          city: city._id,
          state: state._id,
          stats: {
            totalMembers: cityData.totalMembers,
            totalMales: cityData.totalMales,
            totalFemales: cityData.totalFemales,
            activeBrides: cityData.totalFemales,
            activeGrooms: cityData.totalMales,
            couplesMatched: cityData.couplesMatched,
            successStories: Math.floor(cityData.couplesMatched * 0.3)
          },
          isActive: true,
          isPublished: true,
          lastStatsUpdate: new Date()
        });

        await regionalPage.save();
        await regionalPage.populate('city state');

        console.log(`✅ Created: ${cityData.cityName}, ${cityData.stateName}`);
        console.log(`   Slug: ${regionalPage.slug}`);
        console.log(`   URL: https://www.banjaramatch.com/${regionalPage.slug}\n`);
        created++;

      } catch (error) {
        console.error(`❌ Error creating page for ${cityData.cityName}:`, error.message);
        errors++;
      }
    }

    console.log('\n📊 Seeding Summary:');
    console.log(`   ✅ Created: ${created}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📄 Total: ${sampleCities.length}`);

    console.log('\n✅ Regional pages seeded successfully!');
    console.log('\n🌐 You can now access:');
    console.log('   https://www.banjaramatch.com/banjara-matrimony-hyderabad');
    console.log('   https://www.banjaramatch.com/banjara-matrimony-bangalore');
    console.log('   https://www.banjaramatch.com/banjara-matrimony-mumbai');
    console.log('   https://www.banjaramatch.com/banjara-matrimony-delhi');
    console.log('   ...and 6 more cities\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeding
seedRegionalPages();
