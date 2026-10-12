// Applies the user-supplied clan/sub-clan breakdown (2026-06-17) to the Gotra
// collection. Non-destructive: creates genuinely new sub-clan gotras, assigns
// clan to one previously-unassigned record, and adds alternateNames to
// already-correctly-assigned records for spelling variants the user gave us.
// Every change here is justified either by the user's literal text or an
// exact-normalized match to an existing record — no fuzzy/algorithmic guessing.
// Safe to re-run (upserts by name, $addToSet for alternateNames).

const mongoose = require('mongoose');
const Gotra = require('../models/Gotra');
const Clan = require('../models/Clan');

const MONGO_URI = 'mongodb://localhost:27017/aasd';

// New gotras to create (name not present in DB under any spelling)
const NEW_GOTRAS = [
  { name: 'Aaloth', clan: 'Rathod' },
  { name: 'Ranavath', clan: 'Rathod' },
  { name: 'Keloth', clan: 'Chavan' },
  { name: 'Chalavath', clan: 'Pawar' },
  { name: 'Padya', clan: 'Jadhav' },
  { name: 'Lakavath', clan: 'Jadhav' },
  { name: 'Pemavath', clan: 'Jadhav' },
];

// Existing unassigned record to assign a clan to (matches user's "Dasavath" under Vaditya/Jadhav)
const REASSIGN = [
  { name: 'Daasaavath', clan: 'Jadhav', addAlternateNames: ['Dasavath'] },
];

// Existing already-assigned records: add alternateNames only, no clan change
const ENRICH_ALTERNATE_NAMES = [
  { name: 'Devsoth', add: ['Devasoth'] },
  { name: 'Khaatroth', add: ['Khatravath'] },
  { name: 'Laavadiya', add: ['Lavdiya'] },
  { name: 'Sabavat', add: ['Sabavath'] },
  { name: 'Aamgoth', add: ['Aamgot'] },
  { name: 'Vankdoth', add: ['Vankudoth'] },
  { name: 'Vislavat', add: ['Vislavath', 'Islavath'] },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const clans = await Clan.find({});
  const clanByName = {};
  clans.forEach((c) => { clanByName[c.name] = c._id; });

  console.log('\n--- Creating new sub-clan gotras ---');
  for (const g of NEW_GOTRAS) {
    const exists = await Gotra.findOne({ name: g.name });
    if (exists) {
      console.log(`  SKIP (already exists): ${g.name}`);
      continue;
    }
    const clanId = clanByName[g.clan];
    if (!clanId) {
      console.log(`  ERROR: clan "${g.clan}" not found, skipping ${g.name}`);
      continue;
    }
    await Gotra.create({ name: g.name, clan: clanId });
    console.log(`  CREATED: ${g.name} -> ${g.clan}`);
  }

  console.log('\n--- Reassigning previously-unassigned gotras ---');
  for (const r of REASSIGN) {
    const clanId = clanByName[r.clan];
    if (!clanId) {
      console.log(`  ERROR: clan "${r.clan}" not found, skipping ${r.name}`);
      continue;
    }
    const res = await Gotra.updateOne(
      { name: r.name, clan: null },
      { $set: { clan: clanId }, $addToSet: { alternateNames: { $each: r.addAlternateNames || [] } } }
    );
    console.log(`  ${r.name}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  console.log('\n--- Adding alternateNames to already-assigned gotras ---');
  for (const e of ENRICH_ALTERNATE_NAMES) {
    const res = await Gotra.updateOne(
      { name: e.name },
      { $addToSet: { alternateNames: { $each: e.add } } }
    );
    console.log(`  ${e.name}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  await mongoose.disconnect();
  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Gotra enrichment failed:', err);
  process.exit(1);
});
