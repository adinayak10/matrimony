// Seeds cross-clan honorific/title-derived surnames used by Banjara families
// (e.g., "Naik" — the title of a Tanda chief that became a hereditary surname
// regardless of gotra/clan). These are different from clan/gotra-derived
// surnames already stored on Clan.statePresence / Gotra.statePresence.
//
// Safe to re-run: upserts by `name` instead of dropping the collection.

const mongoose = require('mongoose');
const SurnameTitle = require('../models/SurnameTitle');

const MONGO_URI = 'mongodb://localhost:27017/aasd';

const SURNAME_TITLES = [
  {
    name: 'Naik',
    alternateSpellings: ['Nayak', 'Naika', 'Nayaka'],
    meaning: 'Headman or chief of a Tanda (Banjara settlement/caravan)',
    origin:
      'Title conferred on the leader of a Tanda who organized the caravan, led trade negotiations, and represented the community to local rulers. Over generations, descendants of these chiefs carried the title forward as a hereditary surname, independent of which of the 4 major clans (Rathod, Pawar, Chavan, Jadhav) the family belonged to.',
    usagePattern:
      'Used as a standalone surname (e.g., "Hanuma Naik"), or appended after the gotra/clan name (e.g., "Banoth Naik", "Rathod Naik"). In Karnataka it is frequently used as the primary family surname, often replacing the gotra name in everyday and official use.',
    usageType: 'title-suffix',
    applicableClans: [],
    statePresence: [
      {
        state: 'Karnataka',
        prevalence: 'very common',
        exampleNames: ['Hanuma Naik', 'Lakshmi Naik', 'Pema Naik'],
        notes: 'Most widely used surname among Lambani families in Karnataka, often used standalone without the gotra name.',
      },
      {
        state: 'Maharashtra',
        prevalence: 'common',
        exampleNames: ['Banoth Naik', 'Rathod Naik'],
        notes: 'Common among Gormati families descended from Tanda-chief lineages.',
      },
      {
        state: 'Telangana',
        prevalence: 'common',
        exampleNames: ['Jadhav Naik', 'Mudavath Naik'],
        notes: 'Used by some Tanda-chief descendant families, often alongside the gotra name.',
      },
      {
        state: 'Andhra Pradesh',
        prevalence: 'occasional',
        exampleNames: ['Vankdoth Naik'],
        notes: 'Similar pattern to Telangana, less frequent than Raju/Rao suffixes.',
      },
    ],
    sortOrder: 1,
  },
  {
    name: 'Rao',
    alternateSpellings: ['Raw'],
    meaning: 'Status/honorific title meaning "ruler" or "lord"',
    origin:
      'Borrowed from Telugu/Kannada nobility titles and adopted by several Banjara families in Andhra Pradesh and Telangana as a marker of social status, particularly from the colonial and post-independence land-grant era onward.',
    usagePattern: 'Appended after the gotra name, e.g. "Banoth Rao", "Rathod Rao".',
    usageType: 'status',
    applicableClans: [],
    statePresence: [
      {
        state: 'Telangana',
        prevalence: 'common',
        exampleNames: ['Banoth Rao', 'Chavan Rao'],
        notes: 'Common in revenue and land records alongside gotra names.',
      },
      {
        state: 'Andhra Pradesh',
        prevalence: 'common',
        exampleNames: ['Rathod Rao', 'Jadhav Rao'],
        notes: 'Used similarly to Telangana, especially in coastal and Rayalaseema districts.',
      },
    ],
    sortOrder: 2,
  },
  {
    name: 'Raju',
    alternateSpellings: [],
    meaning: 'Honorific suffix meaning "king/prince" in Telugu',
    origin:
      'Widely adopted by several Telugu-speaking ST/OBC communities, including Banjara/Lambadi families in Telangana and Andhra Pradesh, as a respectability marker — extremely common in school records, voter rolls, and caste certificates.',
    usagePattern:
      'Appended directly after the gotra name, e.g. "Mudavath Raju", "Vankdoth Raju", "Jadhav Raju" — one of the most frequently seen gotra+title combinations in Telangana official documents.',
    usageType: 'title-suffix',
    applicableClans: [],
    statePresence: [
      {
        state: 'Telangana',
        prevalence: 'very common',
        exampleNames: ['Mudavath Raju', 'Vankdoth Raju', 'Jadhav Raju'],
        notes: 'Extremely common combination — appears on most official documents alongside the gotra name.',
      },
      {
        state: 'Andhra Pradesh',
        prevalence: 'common',
        exampleNames: ['Banoth Raju', 'Rathod Raju'],
        notes: 'Same pattern as Telangana, slightly less universal.',
      },
    ],
    sortOrder: 3,
  },
  {
    name: 'Patil',
    alternateSpellings: ['Patel'],
    meaning: 'Village headman title (Marathi: Patil, Gujarati: Patel)',
    origin:
      'Adopted by some Banjara families in Maharashtra and Gujarat whose ancestors held village-level administrative or revenue-collection roles after settling out of nomadic Tanda life.',
    usagePattern: 'Appended after the gotra/clan name, e.g. "Rathod Patil", "Pawar Patil".',
    usageType: 'occupational',
    applicableClans: [],
    statePresence: [
      {
        state: 'Maharashtra',
        prevalence: 'occasional',
        exampleNames: ['Rathod Patil', 'Pawar Patil'],
        notes: 'Found among families with a documented village-headman ancestor.',
      },
      {
        state: 'Gujarat',
        prevalence: 'occasional',
        exampleNames: ['Chavan Patel'],
        notes: 'Less common than in Maharashtra; mostly border districts.',
      },
    ],
    sortOrder: 4,
  },
  {
    name: 'Thakur',
    alternateSpellings: [],
    meaning: 'Title denoting a noble or landholding family',
    origin:
      'A status title used widely across North and Central India by many communities; adopted by some Banjara families in Madhya Pradesh and Rajasthan who held landholding status.',
    usagePattern: 'Used as a suffix after the gotra name, or occasionally standalone.',
    usageType: 'status',
    applicableClans: [],
    statePresence: [
      {
        state: 'Madhya Pradesh',
        prevalence: 'occasional',
        exampleNames: ['Rathod Thakur', 'Turi Thakur'],
        notes: 'Found among landholding Banjara families in central MP districts.',
      },
      {
        state: 'Rajasthan',
        prevalence: 'occasional',
        exampleNames: ['Rathore Thakur'],
        notes: 'Rare; mostly historical land-grant families.',
      },
    ],
    sortOrder: 5,
  },
];

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to MongoDB');

  let created = 0;
  let updated = 0;

  for (const entry of SURNAME_TITLES) {
    const result = await SurnameTitle.findOneAndUpdate(
      { name: entry.name },
      { $set: entry },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    if (result.createdAt && result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
    } else {
      updated++;
    }
    console.log(`  ✔ Surname Title: ${entry.name}`);
  }

  console.log(`\n✅ ${SURNAME_TITLES.length} surname titles seeded (upserted)`);

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
