const { connectDB } = require('./db');
const Setting = require('./models/settings');
const Interest = require('./models/Interest');
const User = require('./models/User');
const ChatRoom = require('./models/ChatRoom');
const Message = require('./models/Message');
const FriendShipRequest = require('./models/FriendShipRequest');
const Qualification = require('./models/Qualification');
const Profession = require('./models/Profession');
const IncomeRange = require('./models/IncomeRange');
const ReportReason = require('./models/ReportReason');
const AboutOption = require('./models/AboutOption');
const Caste = require('./models/Caste');
const Gotra = require('./models/Gotra');
const MembershipPlan = require('./models/MemebrshipPlan');
const City = require('./models/City');
const State = require('./models/State');
const Country = require('./models/Country');
const citiesData = require('./controllers/cities.json');
const { OCCUPATION_ENUM } = require('./enum/enum');
const crypto = require('crypto');

/**
 * Generate deterministic ObjectId from string (for consistent IDs across seeding)
 */
function generateDeterministicId(str) {
  const hash = crypto.createHash('md5').update(str).digest('hex');
  return hash.substring(0, 24);
}

/**
 * Seed Settings
 */
async function seedSettings() {
  console.log('🌱 Seeding Settings...');
  
  const newSetting = new Setting({
    version: '1.0.0',
    appName: 'YourAppName',
    setRoomUsersLimit: 50,
    minuteLimitInCreatingStory: 30,
    maxImagesCanBeUploadedInOnePost: 10,
    adBannerAndroid: 'https://example.com/ad_banner_android',
    adInterstitialAndroid: 'https://example.com/ad_interstitial_android',
    isAdmobOn: true,
  });

  const result = await newSetting.save();
  console.log('✅ Settings added successfully:', result);
}

/**
 * Seed Interests
 */
async function seedInterests() {
  console.log('🌱 Seeding Interests...');
  
  await Interest.deleteMany({});
  
  const interests = [
    { title: 'Cooking' },
    { title: 'Traveling' },
    { title: 'Reading' },
    { title: 'Gaming' },
    { title: 'Photography' },
    { title: 'Music' },
    { title: 'Dancing' },
    { title: 'Fitness' },
    { title: 'Drawing' },
    { title: 'Writing' },
  ];

  const result = await Interest.insertMany(interests);
  console.log('✅ Interests added successfully:', result.length, 'items');
}

/**
 * Seed Qualifications
 */
async function seedQualifications() {
  console.log('🌱 Seeding Qualifications...');
  
  const qualifications = [
    "High School",
    "Intermediate",
    "Diploma",
    "Graduate",
    "Postgraduate",
    "Doctorate",
    "MBA",
    "B.Tech",
    "M.Tech",
    "PhD",
    "CA",
    "LLB",
    "B.Ed",
    "M.Ed"
  ];

  await Qualification.deleteMany({});
  const result = await Qualification.insertMany(qualifications.map(name => ({ name })));
  console.log('✅ Qualifications added successfully:', result.length, 'items');
}

/**
 * Seed Professions
 */
async function seedProfessions() {
  console.log('🌱 Seeding Professions...');
  
  // Use OCCUPATION_ENUM from enum.js (excluding 'Not specified' for profession list)
  const professions = OCCUPATION_ENUM.filter(occ => occ !== 'Not specified');

  await Profession.deleteMany({});
  const result = await Profession.insertMany(professions.map(name => ({ name })));
  console.log('✅ Professions added successfully:', result.length, 'items');
}

/**
 * Seed Income Ranges
 */
async function seedIncomeRanges() {
  console.log('🌱 Seeding Income Ranges...');
  
  const incomeRanges = [
    { name: "₹0 - ₹1L", min: 0, max: 100000 },
    { name: "₹1L - ₹5L", min: 100001, max: 500000 },
    { name: "₹5L - ₹10L", min: 500001, max: 1000000 },
    { name: "₹10L - ₹20L", min: 1000001, max: 2000000 },
    { name: "₹20L - ₹50L", min: 2000001, max: 5000000 },
    { name: "₹50L+", min: 5000001, max: 999999999 }
  ];

  await IncomeRange.deleteMany({});
  const result = await IncomeRange.insertMany(incomeRanges);
  console.log('✅ Income Ranges added successfully:', result.length, 'items');
}

/**
 * Seed Report Reasons
 */
async function seedReportReasons() {
  console.log('🌱 Seeding Report Reasons...');
  
  const reasons = [
    'Inappropriate content',
    'Spam or scam',
    'Harassment or abuse',
    'Fake profile',
    'Other',
  ];

  await ReportReason.deleteMany({});
  const reasonDocs = reasons.map(reason => ({ title: reason }));
  const result = await ReportReason.insertMany(reasonDocs);
  console.log('✅ Report Reasons added successfully:', result.length, 'items');
}

/**
 * Seed About Options (Tones, Traits, Hobbies, Goals)
 */
async function seedAboutOptions() {
  console.log('🌱 Seeding About Options...');
  
  const data = [
    // Tones
    { 'category': 'tone', 'value': 'Romantic' },
    { 'category': 'tone', 'value': 'Funny' },
    { 'category': 'tone', 'value': 'Witty' },
    { 'category': 'tone', 'value': 'Intellectual' },
    { 'category': 'tone', 'value': 'Casual' },
    { 'category': 'tone', 'value': 'Emotional' },
    { 'category': 'tone', 'value': 'Spiritual' },
    { 'category': 'tone', 'value': 'Bold' },

    // Traits
    { 'category': 'trait', 'value': 'Adventurous' },
    { 'category': 'trait', 'value': 'Caring' },
    { 'category': 'trait', 'value': 'Loyal' },
    { 'category': 'trait', 'value': 'Empathetic' },
    { 'category': 'trait', 'value': 'Ambitious' },
    { 'category': 'trait', 'value': 'Spontaneous' },
    { 'category': 'trait', 'value': 'Confident' },
    { 'category': 'trait', 'value': 'Creative' },
    { 'category': 'trait', 'value': 'Grounded' },
    { 'category': 'trait', 'value': 'Introverted' },
    { 'category': 'trait', 'value': 'Extroverted' },

    // Hobbies
    { 'category': 'hobby', 'value': 'Cooking' },
    { 'category': 'hobby', 'value': 'Dancing' },
    { 'category': 'hobby', 'value': 'Singing' },
    { 'category': 'hobby', 'value': 'Traveling' },
    { 'category': 'hobby', 'value': 'Hiking' },
    { 'category': 'hobby', 'value': 'Painting' },
    { 'category': 'hobby', 'value': 'Reading' },
    { 'category': 'hobby', 'value': 'Writing Poetry' },
    { 'category': 'hobby', 'value': 'Gaming' },
    { 'category': 'hobby', 'value': 'Yoga' },
    { 'category': 'hobby', 'value': 'Fitness' },
    { 'category': 'hobby', 'value': 'Photography' },

    // Goals
    { 'category': 'goal', 'value': 'Marriage' },
    { 'category': 'goal', 'value': 'Friendship' },
    { 'category': 'goal', 'value': 'Casual Dating' },
    { 'category': 'goal', 'value': 'Life Partner' },
    { 'category': 'goal', 'value': 'Serious Relationship' },
    { 'category': 'goal', 'value': 'Exploring Options' },
    { 'category': 'goal', 'value': 'Companionship' },
  ];

  await AboutOption.deleteMany({});
  const result = await AboutOption.insertMany(data);
  console.log('✅ About Options added successfully:', result.length, 'items');
}

/**
 * Update ChatRoom Status (utility function)
 */
async function updateChatRoomStatus() {
  console.log('🔧 Updating ChatRoom Status...');
  const result = await ChatRoom.updateMany({}, { $set: { status: 'pending' } });
  console.log('✅ ChatRoom status updated:', result.modifiedCount, 'rooms');
}

/**
 * Seed Castes and Gotras
 */
/**
 * Seed Castes and Gotras
 */
async function seedCasteAndGotra() {
  console.log('🌱 Seeding Castes and Gotras...');
  
  const casteGotraMap = {
    // 'Brahmin': ['Bharadwaj', 'Kashyap', 'Vashishtha', 'Gautam', 'Agastya', 'Atri', 'Bhrigu', 'Parashara', 'Kaushik', 'Shandilya'],
    // 'Rajput': ['Raghuvanshi', 'Chandravanshi', 'Suryavanshi', 'Solanki', 'Tomar', 'Sisodia', 'Chauhan', 'Pratihar', 'Paramara', 'Gohil'],
    // 'Yadav': ['Nandvanshi', 'Gwalvanshi', 'Gopvanshi', 'Ahirvanshi', 'Krishnavanshi', 'Mahato', 'Raut', 'Kurmi', 'Morya', 'Abhira'],
    // 'Vaishya': ['Agarwal', 'Gupta', 'Maheshwari', 'Bansal', 'Goyal', 'Mittal', 'Jindal', 'Khandelwal', 'Oswal', 'Goenka'],
    // 'Kayastha': ['Srivastava', 'Nigam', 'Mathur', 'Saxena', 'Bhatnagar', 'Asthana', 'Karna', 'Ambasta', 'Gaur', 'Nauriya'],

   
  "Banjara": [
    "Aadoth",
    "Aalan",
    "Aamaa",
    "Aamgoth",
    "Aanaa",
    "Aatbhayya",
    "Ade",
    "Ajmera",
    "Aivath Pammar",
    "Alaavleeya",
    "Arsi",
    "Baalan",
    "Baada",
    "Baadaavath",
    "Baanni",
    "Baldhaane",
    "Banoth",
    "Barmaavath",
    "Basaavath",
    "Bhaanavath",
    "Bhagvaandas",
    "Bharoth",
    "Bheekaa",
    "Bhora",
    "Bhoraavath",
    "Bhoja",
    "Bhojaavath",
    "Bhunsoth",
    "Bidaano",
    "Binjraavat",
    "Bodaa",
    "Cheetah",
    "Chaampa",
    "Chaivoth Pammar",
    "Chauradiya",
    "Chapavath",
    "Chitravath",
    "Chood",
    "Daanaavath",
    "Daas",
    "Daasaavath",
    "Daalwane",
    "Daasaavath",
    "Daesa",
    "Daulavath",
    "Deeravath",
    "Depa",
    "Desa",
    "Desavath",
    "Devi",
    "Devji",
    "Devsoth",
    "Dhakaliya",
    "Dhana",
    "Dharmasoth",
    "Dharamsi",
    "Dhega",
    "Doodavath",
    "Dumavath",
    "Dungaroth",
    "Dunger",
    "Dungha",
    "Elaasi",
    "Gaalaa",
    "Gaja",
    "Gangaavath",
    "Ghana",
    "Gole",
    "Golaani",
    "Gongavath",
    "Goraam",
    "Goreebaavath",
    "Gugloth",
    "Haaku",
    "Haaravath",
    "Haapaavath",
    "Heeba",
    "Heera",
    "Hoba",
    "Holaani",
    "Injraavath",
    "Inloth Pammar",
    "Jaadhav",
    "Jaagoth",
    "Jaalpoth",
    "Jamanavath",
    "Jarathla",
    "Jattoth",
    "Jaatroth",
    "Jayt",
    "Jetha",
    "Jharapla",
    "Kagla",
    "Kaaba",
    "Kamma",
    "Kapoor",
    "Karamchand",
    "Karamsi",
    "Karnaavath",
    "Khaana",
    "Khaatroth",
    "Khetha",
    "Khethaavath",
    "Khola",
    "Kohla",
    "Korra",
    "Korra/Mood",
    "Kumba",
    "Kunsoth",
    "Kuntaavath",
    "Lachama",
    "Laksoth",
    "Laavadiya",
    "Lambaadhota",
    "Lataavath",
    "Lavori",
    "Lola",
    "Logaala",
    "Lokaavath",
    "Lonaavath",
    "Lotaavath",
    "Loolaavath",
    "Lunsavath",
    "Lunavath",
    "Maadhu",
    "Maagaavath",
    "Maaloth",
    "Mannoth",
    "Meeraaja",
    "Meghaavath",
    "Melaasi",
    "Mepalaan",
    "Mera",
    "Meraavali",
    "Mega",
    "Modercha",
    "Mohandas",
    "Mohan",
    "Molaani",
    "Mood",
    "Muchaal",
    "Mudavath",
    "Musavath",
    "Naathaavath",
    "Naggа",
    "Naranaavath",
    "Naramand",
    "Nenavath",
    "Neha",
    "Nunsavath",
    "Ooda",
    "Padma",
    "Paalthyaa",
    "Paanaavath",
    "Pama",
    "Pamaadiyaa",
    "Peethaavath",
    "Pema",
    "Perojaano",
    "Pipaavath",
    "Poona",
    "Poosnamal",
    "Raja",
    "Raamraano",
    "Raanaa",
    "Rajavath",
    "Ramavath",
    "Ramdaano",
    "Ramsi",
    "Ransi",
    "Ranjit",
    "Ratna",
    "Ratvaano",
    "Ratta",
    "Rojwaane",
    "Roopaavath",
    "Rooda",
    "Rupavath",
    "Sabavat",
    "Sarabaani",
    "Sabdasoth",
    "Sabaano",
    "Saalaavath",
    "Saavaare",
    "Salaavath",
    "Sejaavath",
    "Soma",
    "Sothariya",
    "Tarabaanni",
    "Tejaavath",
    "Tepaavath",
    "Teraavath",
    "Thakkar",
    "Thala",
    "Tholaani",
    "Tholach",
    "Tokaraavath",
    "Tova",
    "Tuvar",
    "Undaavath",
    "Vankdoth",
    "Vedi",
    "Veeroth",
    "Vinjraavat",
    "Vislavat",
    "Vudsi"
  ]


  };


  await Caste.deleteMany({});
  await Gotra.deleteMany({});

  const casteDocs = {};
  let casteCount = 0;
  let gotraCount = 0;

  // Seed Castes
  for (const casteName of Object.keys(casteGotraMap)) {
    let caste = await Caste.findOne({ name: casteName });
    if (!caste) {
      caste = await new Caste({ name: casteName }).save();
      casteCount++;
    }
    casteDocs[casteName] = caste;
  }

  // Seed Gotras
  for (const [casteName, gotras] of Object.entries(casteGotraMap)) {
    const caste = casteDocs[casteName];
    for (const gotraName of gotras) {
      const exists = await Gotra.findOne({ name: gotraName });
      if (!exists) {
        await new Gotra({ name: gotraName }).save();
        gotraCount++;
      }
    }
  }

  console.log(`✅ Castes added: ${casteCount}, Gotras added: ${gotraCount}`);
}

/**
 * Seed Membership Plans
 */
async function seedMembershipPlans() {
  console.log('🌱 Seeding Membership Plans...');
  
  const existingPlans = await MembershipPlan.find();
  if (existingPlans.length > 0) {
    console.log('ℹ️  Membership plans already exist, skipping...');
    return;
  }

  const plans = [
    {
      name: 'Free',
      price: 0,
      duration_days: 0,
      description: 'Basic free access with limited features',
      features: ['Limited profile views', 'Cannot send interest', 'Cannot view contact'],
    },
    {
      name: 'Silver',
      price: 499,
      duration_days: 30,
      description: 'Silver membership with essential features',
      features: ['View profiles', 'Send interest', 'Limited contact access'],
    },
    {
      name: 'Gold',
      price: 999,
      duration_days: 90,
      description: 'Gold membership with extended features',
      features: ['Send unlimited interests', 'View contact details', 'Priority search listing'],
    },
    {
      name: 'Platinum',
      price: 1999,
      duration_days: 180,
      description: 'Top tier with all features unlocked',
      features: ['All Gold features', 'Profile boost', 'Dedicated support'],
    },
  ];

  const createdPlans = await MembershipPlan.insertMany(plans);
  console.log('✅ Membership plans added:', createdPlans.length, 'items');
}

/**
 * Seed Cities (from cities.json)
 */
/**
 * Seed Countries, States, and Cities from cities.json
 * This ensures consistent IDs across re-seeding
 */
async function seedLocations() {
  console.log('🌱 Seeding Countries, States, and Cities from JSON...');
  
  // Step 1: Find or create India country
  let india = await Country.findOne({ name: 'India' });
  
  if (!india) {
    // Create with deterministic ID if it doesn't exist
    const indiaId = generateDeterministicId('India');
    india = await Country.create({
      _id: indiaId,
      name: 'India',
      isoCode: 'IN'
    });
    console.log('✅ Created country: India');
  } else {
    console.log(`ℹ️  Country India already exists (ID: ${india._id})`);
  }

  // Step 2: Group cities by state from JSON
  const stateMap = new Map();
  
  citiesData.forEach(cityData => {
    if (!stateMap.has(cityData.state)) {
      stateMap.set(cityData.state, []);
    }
    stateMap.get(cityData.state).push(cityData);
  });

  console.log(`📊 Found ${stateMap.size} states in JSON data`);

  let statesCreated = 0;
  let statesExisting = 0;
  let citiesCreated = 0;
  let citiesExisting = 0;

  // Step 3: For each state, create state and its cities
  for (const [stateName, cities] of stateMap.entries()) {
    // Look for existing state first
    let state = await State.findOne({ name: stateName, country: india._id });
    
    if (!state) {
      // Create deterministic state ID
      const stateId = generateDeterministicId(`India-${stateName}`);
      try {
        state = await State.create({
          _id: stateId,
          name: stateName,
          country: india._id
        });
        statesCreated++;
      } catch (err) {
        // If ID conflict, find by name
        if (err.code === 11000) {
          state = await State.findOne({ name: stateName, country: india._id });
          statesExisting++;
        } else {
          throw err;
        }
      }
    } else {
      statesExisting++;
    }

    // Step 4: Create cities for this state
    for (const cityData of cities) {
      // Look for existing city first
      let existingCity = await City.findOne({ name: cityData.city, state: state._id });
      
      if (!existingCity) {
        // Create deterministic city ID
        const cityId = generateDeterministicId(`${stateName}-${cityData.city}`);
        try {
          await City.create({
            _id: cityId,
            name: cityData.city,
            state: state._id,
            // Store additional data from JSON
            district: cityData.district || null,
            latitude: cityData.latitude || null,
            longitude: cityData.longitude || null,
            population: cityData.population || null,
            stdCode: cityData['std-code'] || null,
            gstStateCode: cityData['gst-state-code'] || null,
            iso31662: cityData['iso_3166-2'] || null,
            altitude: cityData.altitude || null,
            rank: cityData.rank || null
          });
          citiesCreated++;
        } catch (err) {
          // If ID conflict, skip
          if (err.code === 11000) {
            citiesExisting++;
          } else {
            throw err;
          }
        }
      } else {
        citiesExisting++;
      }
    }
  }

  console.log(`✅ States: ${statesCreated} new, ${statesExisting} existing`);
  console.log(`✅ Cities: ${citiesCreated} new, ${citiesExisting} existing`);
  console.log(`📍 Total cities in database: ${await City.countDocuments()}`);
}

// Legacy function name for compatibility
async function seedCities() {
  return await seedLocations();
}

/**
 * Clear Collections (use with caution!)
 */
async function clearCollections() {
  console.log('⚠️  Clearing Collections...');
  
  await ChatRoom.deleteMany({});
  console.log('✅ ChatRooms cleared');
  
  await Message.deleteMany({});
  console.log('✅ Messages cleared');
  
  await FriendShipRequest.deleteMany({});
  console.log('✅ FriendShipRequests cleared');
  
  // Uncomment below to clear users (DANGEROUS!)
  // await User.deleteMany({});
  // console.log('✅ Users cleared');
}

/**
 * Main Seed Function
 */
async function seed() {
  try {
    console.log('🚀 Starting Database Seeding...\n');
    
    await connectDB();
    
    // Uncomment the functions you want to run:
    
    await seedSettings();
    await seedInterests();
    await seedQualifications();
    await seedProfessions();
    await seedIncomeRanges();
    await seedReportReasons();
    await seedAboutOptions();
    await seedCasteAndGotra();
    await seedMembershipPlans();
    await seedCities();
    
   // Utility functions:
    await updateChatRoomStatus();
    // await clearCollections();  // ⚠️ USE WITH CAUTION!
    
    console.log('\n✅ Seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seed if called directly
if (require.main === module) {
  seed();
}

module.exports = {
  seed,
  seedSettings,
  seedInterests,
  seedQualifications,
  seedProfessions,
  seedIncomeRanges,
  seedReportReasons,
  seedAboutOptions,
  seedCasteAndGotra,
  seedMembershipPlans,
  seedCities,
  seedLocations,
  updateChatRoomStatus,
  clearCollections,
};
