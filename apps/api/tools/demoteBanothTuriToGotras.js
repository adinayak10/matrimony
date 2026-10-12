// User decision (2026-06-17): Banjara clans should be exactly 4 (Rathod, Pawar,
// Chavan, Jadhav) per banjaracommunity.blogspot.com — Banoth and Turi are
// sub-divisions of Rathod, not independent clans. This script:
//   1. Reassigns every Gotra currently under Banoth/Turi to Rathod.
//   2. Creates a "Turi" Gotra under Rathod (no such Gotra doc existed yet —
//      "Banoth" already exists as a Gotra and gets folded in by step 1).
//   3. Deletes the Banoth and Turi Clan documents.
// Re-running is safe: steps 1/3 become no-ops once the Clan docs are gone,
// step 2 is guarded by an existence check.

const mongoose = require('mongoose');
const Clan = require('../models/Clan');
const Gotra = require('../models/Gotra');

const MONGO_URI = 'mongodb://localhost:27017/aasd';

async function run() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  const rathod = await Clan.findOne({ name: 'Rathod' });
  const banoth = await Clan.findOne({ name: 'Banoth' });
  const turi = await Clan.findOne({ name: 'Turi' });

  if (!rathod) throw new Error('Rathod clan not found, aborting');

  if (banoth) {
    const res = await Gotra.updateMany({ clan: banoth._id }, { $set: { clan: rathod._id } });
    console.log(`Reassigned Banoth gotras -> Rathod: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  } else {
    console.log('Banoth clan already removed, skipping gotra reassignment');
  }

  if (turi) {
    const res = await Gotra.updateMany({ clan: turi._id }, { $set: { clan: rathod._id } });
    console.log(`Reassigned Turi gotras -> Rathod: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  } else {
    console.log('Turi clan already removed, skipping gotra reassignment');
  }

  const existingTuriGotra = await Gotra.findOne({ name: 'Turi' });
  if (!existingTuriGotra) {
    await Gotra.create({
      name: 'Turi',
      clan: rathod._id,
      description: 'Sub-clan (Jaath) within the Rathod lineage.',
    });
    console.log('CREATED Gotra "Turi" -> Rathod');
  } else {
    console.log('Gotra "Turi" already exists, skipping creation');
  }

  if (banoth) {
    await Clan.deleteOne({ _id: banoth._id });
    console.log('DELETED Clan "Banoth"');
  }
  if (turi) {
    await Clan.deleteOne({ _id: turi._id });
    console.log('DELETED Clan "Turi"');
  }

  const finalClanCount = await Clan.countDocuments({});
  const rathodGotraCount = await Gotra.countDocuments({ clan: rathod._id });
  const totalGotras = await Gotra.countDocuments({});
  console.log(`\nFinal state: ${finalClanCount} clans, Rathod has ${rathodGotraCount} gotras, ${totalGotras} gotras total`);

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Demotion script failed:', err);
  process.exit(1);
});
