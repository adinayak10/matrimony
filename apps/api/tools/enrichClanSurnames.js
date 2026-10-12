// Adds title-derived surnames (Naik, Rao, Raju, Patil, Thakur) into the
// existing Clan.statePresence[].commonSurnames arrays, without touching
// description/origin/kuldevi or any other clan field. Uses $addToSet via
// arrayFilters so it's safe to re-run (no duplicates, no data loss).

const mongoose = require('mongoose');
const Clan = require('../models/Clan');

const MONGO_URI = 'mongodb://localhost:27017/aasd';

// clanName -> { state -> [surnames to add] }
const ADDITIONS = {
  Rathod: {
    Telangana: ['Raju', 'Rao', 'Naik'],
    'Andhra Pradesh': ['Raju', 'Rao'],
    Maharashtra: ['Patil'],
    'Madhya Pradesh': ['Thakur'],
    Rajasthan: ['Thakur'],
  },
  Pawar: {
    Telangana: ['Raju', 'Rao', 'Naik'],
    Maharashtra: ['Patil'],
    Karnataka: ['Naik'],
  },
  Chavan: {
    Telangana: ['Raju', 'Rao', 'Naik'],
    'Andhra Pradesh': ['Raju', 'Rao'],
    Maharashtra: ['Patil'],
  },
  Jadhav: {
    Telangana: ['Raju', 'Rao', 'Naik'],
    'Andhra Pradesh': ['Raju', 'Rao'],
    Maharashtra: ['Patil'],
    Karnataka: ['Naik'],
  },
  Banoth: {
    Telangana: ['Raju', 'Rao', 'Naik'],
    'Andhra Pradesh': ['Raju', 'Rao'],
    Maharashtra: ['Patil'],
    Karnataka: ['Naik'],
  },
  Turi: {
    'Madhya Pradesh': ['Thakur'],
  },
};

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  for (const [clanName, stateMap] of Object.entries(ADDITIONS)) {
    for (const [state, surnames] of Object.entries(stateMap)) {
      const res = await Clan.updateOne(
        { name: clanName, 'statePresence.state': state },
        { $addToSet: { 'statePresence.$[elem].commonSurnames': { $each: surnames } } },
        { arrayFilters: [{ 'elem.state': state }] }
      );
      console.log(`  ${clanName} / ${state}: +[${surnames.join(', ')}] (matched ${res.matchedCount}, modified ${res.modifiedCount})`);
    }
  }

  const clans = await Clan.find({}, 'name statePresence.state statePresence.commonSurnames').lean();
  console.log('\nFinal state:');
  clans.forEach((c) => {
    console.log(' ', c.name, '->', c.statePresence.map((s) => `${s.state}:[${s.commonSurnames.join(',')}]`).join(' | '));
  });

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});
