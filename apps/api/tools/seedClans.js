/**
 * Corrected seed: 5 major Banjara clans (Gor Samuh) + Turi (6th optional)
 * Source: community-documented gotra classification
 * Run: node scripts/seedClans.js
 */

const mongoose = require('mongoose');
const Clan  = require('../models/Clan');
const Gotra = require('../models/Gotra');

const MONGO_URI = 'mongodb://localhost:27017/aasd';

// ─── 1. THE 5 (+1) CORRECT MAJOR CLANS ──────────────────────────────────────
//
// Banjara community is divided into 4 primary clans (gotras / super-families),
// with Banoth being recognised as a 5th independent clan by most scholars,
// and Turi as an optional 6th.
//
// References:
//   banjarazone.com/bz_jaath.aspx
//   m.goarbanjara.com/ancient-history-of-gor-banjaras-part-8/
//   Babu History of Banjara (sintiroma.org)

const CLANS = [
  {
    name: 'Rathod',
    displayName: 'Rathod (Bhukya) Gor',
    description:
      'One of the four primary Banjara clans. Also called Bhukya — descendants of Bhika son of Phulsingh. The Rathod clan traces its lineage to the Rathore Rajput dynasty of Rajasthan (Marwar region). It is the largest Banjara clan by population and is spread across Rajasthan, Madhya Pradesh, Gujarat, Telangana, and Andhra Pradesh. The clan is further divided into multiple Jaaths (sub-clans) such as Ramavath, Rajavath, Meghavath, Nenavath, and others. The Rathod gotra family tree (as documented by Bhats/Dhadis) traces descent through Khatrot, Daha, Megha, and Khamdhar.',
    origin: 'Rajasthan — Marwar / Jodhpur region',
    alternateNames: ['Bhukya', 'Rathore', 'Rathoda', 'Rathod Gor', 'Bhukia'],
    kuldevi: 'Nagnechi Mata / Seeta Mata',
    sortOrder: 1,
    statePresence: [
      {
        state: 'Telangana',
        localName: 'Rathod / Bhukya',
        strongholdDistricts: ['Nizamabad', 'Karimnagar', 'Adilabad', 'Nalgonda'],
        commonSurnames: ['Bhukya', 'Rathod', 'Ramavath', 'Nenavath', 'Rajavath'],
      },
      {
        state: 'Andhra Pradesh',
        localName: 'Rathod / Bhukya',
        strongholdDistricts: ['Kurnool', 'Guntur', 'Nellore', 'Kadapa'],
        commonSurnames: ['Bhukya', 'Rathod', 'Meghavath'],
      },
      {
        state: 'Rajasthan',
        localName: 'Rathore',
        strongholdDistricts: ['Jodhpur', 'Barmer', 'Nagaur', 'Pali', 'Jaisalmer'],
        commonSurnames: ['Rathore', 'Rathod'],
      },
      {
        state: 'Madhya Pradesh',
        localName: 'Rathod',
        strongholdDistricts: ['Betul', 'Chhindwara', 'Hoshangabad', 'Vidisha'],
        commonSurnames: ['Rathod', 'Ramavath'],
      },
      {
        state: 'Gujarat',
        localName: 'Rathod',
        strongholdDistricts: ['Banaskantha', 'Sabarkantha', 'Dahod', 'Panchmahal'],
        commonSurnames: ['Rathod', 'Rathore'],
      },
      {
        state: 'Maharashtra',
        localName: 'Rathod',
        strongholdDistricts: ['Nanded', 'Solapur', 'Nagpur'],
        commonSurnames: ['Rathod'],
      },
    ],
  },

  {
    name: 'Pawar',
    displayName: 'Pawar Gor',
    description:
      'The Pawar clan is one of the four primary Banjara clans. Also written as Panwar, it traces descent from the Paramara (Pawar) Rajput lineage of Central India. The Pawar clan has 12 major sub-clans (Jaaths) originating from 7 sons of Kasturi and 5 sons of Hanjal. Key sub-clans include Zarpala/Jharapla, Vankdoth, Aamgoth, Lunsavath, Vislavath, Banni, and the three Pammar sub-clans (Aivath Pammar, Chaivoth Pammar, Inloth Pammar). The Pawar clan is prominent in Maharashtra (Gormati community) and also found in Telangana and Rajasthan.',
    origin: 'Central India — Malwa / Paramara Rajput homeland',
    alternateNames: ['Panwar', 'Pamhar', 'Pawar Gor', 'Paramara'],
    kuldevi: 'Seeta Mata',
    sortOrder: 2,
    statePresence: [
      {
        state: 'Maharashtra',
        localName: 'Pawar / Vankdoth',
        strongholdDistricts: ['Nanded', 'Nagpur', 'Yavatmal', 'Amravati', 'Aurangabad'],
        commonSurnames: ['Pawar', 'Vankdoth', 'Wankdoth', 'Zarpala'],
      },
      {
        state: 'Telangana',
        localName: 'Pawar',
        strongholdDistricts: ['Nizamabad', 'Adilabad', 'Medak'],
        commonSurnames: ['Pawar', 'Vankdoth', 'Pammar'],
      },
      {
        state: 'Rajasthan',
        localName: 'Pawar',
        strongholdDistricts: ['Jodhpur', 'Barmer', 'Jalore'],
        commonSurnames: ['Pawar', 'Panwar'],
      },
      {
        state: 'Karnataka',
        localName: 'Pawar',
        strongholdDistricts: ['Bellary', 'Raichur', 'Bidar'],
        commonSurnames: ['Pawar', 'Vankdoth'],
      },
    ],
  },

  {
    name: 'Chavan',
    displayName: 'Chavan (Chauhan) Gor',
    description:
      'The Chavan clan is one of the four primary Banjara clans. Also known as Chauhan — tracing roots to the Chahamana (Chauhan) Rajput lineage of Rajputana. The Chavan clan is smaller than Rathod and Jadhav in population but has distinct identity. The six Jaaths of the Chavan clan trace descent from six sons of Tejmal: Palathya, Mud, Korra, Sabavath, Kuelut, and Chauradiya. Palathya has 5 Padas, Mud has 13, Korra has 42, and Chauradiya has 5. The Chavan clan is found primarily in Maharashtra, Telangana, and Andhra Pradesh.',
    origin: 'Rajputana — Chahamana/Chauhan Rajput homeland',
    alternateNames: ['Chauhan', 'Chauvan', 'Chavan Gor', 'Chauhan Gor'],
    kuldevi: 'Seeta Mata',
    sortOrder: 3,
    statePresence: [
      {
        state: 'Maharashtra',
        localName: 'Chavan',
        strongholdDistricts: ['Nanded', 'Latur', 'Osmanabad'],
        commonSurnames: ['Chavan', 'Mud', 'Korra'],
      },
      {
        state: 'Telangana',
        localName: 'Chavan',
        strongholdDistricts: ['Nizamabad', 'Karimnagar'],
        commonSurnames: ['Chavan', 'Chauradiya'],
      },
      {
        state: 'Andhra Pradesh',
        localName: 'Chavan',
        strongholdDistricts: ['Kurnool', 'Kadapa'],
        commonSurnames: ['Chavan', 'Korra'],
      },
    ],
  },

  {
    name: 'Jadhav',
    displayName: 'Jadhav (Vadatiya) Gor',
    description:
      'The Jadhav clan is one of the four primary Banjara clans, also called Vadatiya or Wadatiya. The name Jadhav connects to the Yadava Rajput lineage of the Deccan. The Jadhav/Vadatiya clan has one of the largest numbers of sub-clans (Jaaths) among all Banjara clans — including Gangavath, Dungaroth, Ajmera, Bodaa, Bharoth, Gugloth, Goraam, Barmaavath, Lonavath, Loolaavath, Tejavath, Tepavath, Teravath, and many others. The founding legend involves Purushottam Panda (Baba Brahman) who married into the community and became Wadatiya. The clan is dominant in Maharashtra and spread across all Deccan states.',
    origin: 'Deccan — Yadava Rajput homeland, Maharashtra',
    alternateNames: ['Vadatiya', 'Wadatiya', 'Jadav', 'Vaditya', 'Jaadhav', 'Jadhav Gor'],
    kuldevi: 'Tulja Bhavani / Seeta Mata',
    sortOrder: 4,
    statePresence: [
      {
        state: 'Maharashtra',
        localName: 'Jadhav / Vadatiya',
        strongholdDistricts: ['Nanded', 'Latur', 'Osmanabad', 'Aurangabad', 'Nagpur'],
        commonSurnames: ['Jadhav', 'Vadatiya', 'Ganjavath', 'Dungaroth'],
      },
      {
        state: 'Telangana',
        localName: 'Jaadhav',
        strongholdDistricts: ['Nizamabad', 'Karimnagar', 'Nalgonda', 'Mahbubnagar'],
        commonSurnames: ['Jaadhav', 'Jadhav', 'Barmaavath', 'Gangavath'],
      },
      {
        state: 'Andhra Pradesh',
        localName: 'Jadhav',
        strongholdDistricts: ['Kurnool', 'Kadapa', 'Nellore', 'Guntur'],
        commonSurnames: ['Jadhav', 'Tejavath'],
      },
      {
        state: 'Karnataka',
        localName: 'Jadhav',
        strongholdDistricts: ['Bidar', 'Gulbarga', 'Bellary'],
        commonSurnames: ['Jadhav', 'Dungaroth'],
      },
    ],
  },

  {
    name: 'Banoth',
    displayName: 'Banoth Gor',
    description:
      'Banoth is recognised as the 5th major Banjara clan. Some scholars treat it as a sub-clan of Rathod (split from Bhukya), while others — including the Banoth community itself — claim independent status. The Banoth clan has 15 documented Jaaths: Aadoth, Ade, Banoth, Bhojavath, Danavath, Dharmasoth, Dheeravath, Jaatroth, Karnavath, Kuntavath, Lavori, Mudavath, Paanavath, Rupavath, and Sabdasoth. The Banoth clan is particularly dominant in Telangana and Andhra Pradesh and holds significant political influence through leaders like Seethakka (MLA) who belongs to the Banoth lineage.',
    origin: 'Deccan / Central India (possibly split from Rathod in medieval period)',
    alternateNames: ['Bhanoth', 'Vanoth', 'Banot', 'Banoth Gor'],
    kuldevi: 'Seeta Mata',
    sortOrder: 5,
    statePresence: [
      {
        state: 'Telangana',
        localName: 'Banoth',
        strongholdDistricts: ['Nizamabad', 'Karimnagar', 'Warangal', 'Adilabad', 'Nalgonda'],
        commonSurnames: ['Banoth', 'Bhanoth', 'Mudavath'],
      },
      {
        state: 'Andhra Pradesh',
        localName: 'Banoth',
        strongholdDistricts: ['Kurnool', 'Guntur', 'Nellore', 'Krishna'],
        commonSurnames: ['Banoth', 'Mudavath'],
      },
      {
        state: 'Maharashtra',
        localName: 'Banoth',
        strongholdDistricts: ['Nanded', 'Nagpur', 'Amravati'],
        commonSurnames: ['Banoth', 'Bhanoth'],
      },
      {
        state: 'Karnataka',
        localName: 'Banoth',
        strongholdDistricts: ['Bellary', 'Raichur', 'Bidar'],
        commonSurnames: ['Banoth'],
      },
    ],
  },

  {
    name: 'Turi',
    displayName: 'Turi Gor',
    description:
      'Turi is sometimes recognised as the 6th Banjara clan/gotra. Also called Badawatis, the Turi lineage has 4 documented sub-clans: Jasavath, Rajavath, Tegavath, and Winjod. Some scholars classify Turi as an independent clan while others treat it as a sub-division within the Rathod lineage. The Turi community is found primarily in Rajasthan and Madhya Pradesh.',
    origin: 'Rajasthan / Madhya Pradesh',
    alternateNames: ['Badawati', 'Badawatis', 'Turi Gor'],
    kuldevi: 'Seeta Mata',
    sortOrder: 6,
    statePresence: [
      {
        state: 'Rajasthan',
        localName: 'Turi',
        strongholdDistricts: ['Barmer', 'Jodhpur', 'Jaisalmer'],
        commonSurnames: ['Turi', 'Rajavath'],
      },
      {
        state: 'Madhya Pradesh',
        localName: 'Turi',
        strongholdDistricts: ['Betul', 'Chhindwara'],
        commonSurnames: ['Turi'],
      },
    ],
  },
];

// ─── 2. GOTRA → CLAN MAPPING ─────────────────────────────────────────────────
// Based on the community-documented "Full list of Gotras" classification
// Source: banjarazone.com, goarbanjara.com, Babu History of Banjara

const GOTRA_CLAN_MAP = {

  // ══ RATHOD / BHUKYA ═════════════════════════════════════════════════════
  // Documented Rathod Jaaths from the article
  'Aadoth':       'Rathod',   // Aaloth / Aalot variant
  'Aalan':        'Rathod',   // Aalot
  'Baalan':       'Rathod',   // Balanot (from Bala son of Rathod)
  'Bhaanavath':   'Rathod',   // Bhanavath
  'Depa':         'Rathod',   // Depavath
  'Devsoth':      'Rathod',   // Devsoth (son of Khamdhar, Rathod tree)
  'Dharamsi':     'Rathod',   // Dharamsot variant
  'Daalwane':     'Rathod',   // Dhalwan/Daalwan (from Aalot, Rathod)
  'Jattoth':      'Rathod',   // Jaatot / Jatot (from Jatiya, son of Bala/Rathod)
  'Karamsi':      'Rathod',   // Karamsiyot (Rathod sub)
  'Khaana':       'Rathod',   // Khanavath (Rathod)
  'Khaatroth':    'Rathod',   // Khatroth (Rathod)
  'Khetha':       'Rathod',   // Khetavath (Rathod)
  'Khethaavath':  'Rathod',   // Khethavath (Rathod)
  'Mega':         'Rathod',   // Megavath (Meghavath - Rathod)
  'Meghaavath':   'Rathod',   // Meghavath (Rathod)
  'Melaasi':      'Rathod',   // Malasi (in Rathod family tree)
  'Mera':         'Rathod',   // Meravath (Rathod)
  'Meraavali':    'Rathod',   // Meravath variant (Rathod)
  'Modercha':     'Rathod',   // Modaricha (son of Malasi in Rathod tree)
  'Mohan':        'Rathod',   // Mohan (son of Bala, Rathod)
  'Muchaal':      'Rathod',   // Muchhal (son of Bala, Rathod)
  'Nenavath':     'Rathod',   // Nenavath (Rathod)
  'Peethaavath':  'Rathod',   // Pithavath (Rathod)
  'Raanaa':       'Rathod',   // Ranavath (Rathod)
  'Raja':         'Rathod',   // Rajavath root (Rathod)
  'Rajavath':     'Rathod',   // Rajavath (Rathod)
  'Ramavath':     'Rathod',   // Ramavath (Rathod / Bhukya sub)
  'Ramdaano':     'Rathod',   // Ramniya (in Rathod tree)
  'Ramsi':        'Rathod',   // Ramniya variant (Rathod)
  'Ransi':        'Rathod',   // Ranasoth / Ranasipota (Rathod)
  'Ratta':        'Rathod',   // Rathla/Phulia (Rathod sub)
  'Ratna':        'Rathod',   // Rathla variant
  'Sothariya':    'Rathod',   // Sotki (Rathod sub)

  // ══ PAWAR ════════════════════════════════════════════════════════════════
  // Documented Pawar Jaaths from the article
  'Aamgoth':         'Pawar',   // Aamgoth (Pawar - from Kasturi's sons)
  'Aivath Pammar':   'Pawar',   // Aivath Pammar (Pawar)
  'Baanni':          'Pawar',   // Baani/Banni (from Hanjal's sons - Pawar)
  'Binjraavat':      'Pawar',   // Winjaravath / Vinjaravath (Pawar - son of Kasturi)
  'Chaivoth Pammar': 'Pawar',   // Chaivoth Pammar (Pawar)
  'Injraavath':      'Pawar',   // Injraavath / Ingravath (Pawar sub)
  'Inloth Pammar':   'Pawar',   // Inloth Pammar (Pawar)
  'Jarathla':        'Pawar',   // Zarpala / Jharapla (Pawar - from Kasturi)
  'Jharapla':        'Pawar',   // Jharapla / Zarpala (Pawar)
  'Lunavath':        'Pawar',   // Lunsavath (Pawar - from Kasturi)
  'Lunsavath':       'Pawar',   // Lunsavath (Pawar)
  'Nunsavath':       'Pawar',   // Nunsavath = Lunsavath (Pawar)
  'Pamaadiyaa':      'Pawar',   // Pamadiya (Pawar)
  'Sarabaani':       'Pawar',   // Tarabani (Pawar - from Hanjal's sons)
  'Tarabaanni':      'Pawar',   // Tarabani (Pawar)
  'Vankdoth':        'Pawar',   // Vankdoth (Pawar - Wankadot)
  'Vinjraavat':      'Pawar',   // Vinjaravath (Pawar)
  'Vislavat':        'Pawar',   // Vislavath (Pawar - Winshalavath)

  // ══ CHAVAN / CHAUHAN ═════════════════════════════════════════════════════
  // Documented Chavan Jaaths: 6 sons of Tejmal
  'Chauradiya':   'Chavan',  // Chauradiya (6th son of Tejmal - Chavan)
  'Chitravath':   'Chavan',  // Chintavath variant (Chavan)
  'Dumavath':     'Chavan',  // Dumaavath / Chauradiya (Chavan)
  'Korra':        'Chavan',  // Korra / Kurra (3rd son of Tejmal - Chavan, 42 padas)
  'Mood':         'Chavan',  // Mud (2nd son of Tejmal - Chavan, 13 padas)
  'Paalthyaa':    'Chavan',  // Palathya (1st son of Tejmal - Chavan, 5 padas)
  'Sabavat':      'Chavan',  // Sabavath / Sapavath (Chavan)
  'Laavadiya':    'Chavan',  // Lavadiya (Chavan sub)
  'Korra/Mood':   'Chavan',  // variant entry (Chavan)
  'Chapavath':    'Chavan',  // Chapavath (Chavan-related)

  // ══ JADHAV / VADATIYA ════════════════════════════════════════════════════
  // Documented Jadhav/Vadatiya Jaaths from the article
  'Ajmera':       'Jadhav',  // Ajmera (Jadhav - son of Dhetji/Pades Ajmera)
  'Baada':        'Jadhav',  // Badavath (Jadhav)
  'Baadaavath':   'Jadhav',  // Badavath (Jadhav)
  'Barmaavath':   'Jadhav',  // Barmavath (Jadhav)
  'Bhagvaandas':  'Jadhav',  // Bhagvandas (Jadhav)
  'Bharoth':      'Jadhav',  // Bharoth (Jadhav - from Bharot, son of Dhetji)
  'Bodaa':        'Jadhav',  // Bodaa (Jadhav - Boda Pade Ajmera)
  'Dungaroth':    'Jadhav',  // Dungaroth (Jadhav)
  'Gangaavath':   'Jadhav',  // Gangavath (Jadhav)
  'Gongavath':    'Jadhav',  // Gangavath variant (Jadhav)
  'Goraam':       'Jadhav',  // Goram (Jadhav - from Kasturi/Pawar? No - Goram is listed under Jadhav in full list)
  'Gugloth':      'Jadhav',  // Gugloth (Jadhav - Gugul son of Khetaji)
  'Jaadhav':      'Jadhav',  // Jadhav (Jadhav)
  'Jaagoth':      'Jadhav',  // Jaloth variant (Jadhav)
  'Jaalpoth':     'Jadhav',  // Jaloth (Jadhav)
  'Jamanavath':   'Jadhav',  // Jamanavath (Jadhav)
  'Jayt':         'Jadhav',  // Jayt / Jetsalot (Jadhav)
  'Kagla':        'Jadhav',  // Kagla (Jadhav)
  'Kunsoth':      'Jadhav',  // Kunsoth / Khunasi (Jadhav - son of Netji)
  'Lataavath':    'Jadhav',  // Lokavath variant or Lotavath (Jadhav)
  'Lokaavath':    'Jadhav',  // Lokavath (Jadhav)
  'Lonaavath':    'Jadhav',  // Lonavath (Jadhav)
  'Loolaavath':   'Jadhav',  // Loolaavath (Jadhav)
  'Lotaavath':    'Jadhav',  // Lotavath (Jadhav alphabetical 184)
  'Maaloth':      'Jadhav',  // Maaloth (Jadhav - Maalpot variant)
  'Mohandas':     'Jadhav',  // Mohandas (Jadhav)
  'Pipaavath':    'Jadhav',  // Pipaavath (Jadhav)
  'Poosnamal':    'Jadhav',  // Poosnamal (Jadhav)
  'Saalaavath':   'Jadhav',  // Salavath (Jadhav)
  'Salaavath':    'Jadhav',  // Salavath (Jadhav)
  'Sejaavath':    'Jadhav',  // Sejavath (Jadhav)
  'Tejaavath':    'Jadhav',  // Tejavath (Jadhav)
  'Tepaavath':    'Jadhav',  // Tepavath (Jadhav)
  'Teraavath':    'Jadhav',  // Teravath (Jadhav)
  'Tuvar':        'Jadhav',  // Tuvar/Tunwar (Jadhav)
  'Undaavath':    'Jadhav',  // Undavath (Jadhav)

  // ══ BANOTH ═══════════════════════════════════════════════════════════════
  // 15 documented Banoth Jaaths from the article
  'Ade':          'Banoth',  // Ade (Banoth)
  'Banoth':       'Banoth',  // Banoth / Baanoth (Banoth)
  'Bhojaavath':   'Banoth',  // Bhojavath (Banoth)
  'Bhoja':        'Banoth',  // Bhojavath root (Banoth)
  'Daanaavath':   'Banoth',  // Danavath (Banoth)
  'Deeravath':    'Banoth',  // Dheeravath (Banoth)
  'Dharmasoth':   'Banoth',  // Dharmasoth (Banoth - listed explicitly under Banoth in article)
  'Jaatroth':     'Banoth',  // Jaatroth (Banoth)
  'Karnaavath':   'Banoth',  // Karnavath (Banoth)
  'Kuntaavath':   'Banoth',  // Kuntavath (Banoth)
  'Lavori':       'Banoth',  // Lavori (Banoth)
  'Mudavath':     'Banoth',  // Mudavath (Banoth — 12th Jaath)
  'Musavath':     'Banoth',  // Musavath (closely related to Mudavath - Banoth)
  'Paanaavath':   'Banoth',  // Paanavath (Banoth)
  'Roopaavath':   'Banoth',  // Rupavath (Banoth)
  'Rupavath':     'Banoth',  // Rupavath (Banoth)
  'Sabdasoth':    'Banoth',  // Sabdasoth (Banoth)

  // ══ TURI ═════════════════════════════════════════════════════════════════
  // 4 documented Turi sub-clans
  'Raamraano':    'Turi',    // Rajavath variant / Turi
  'Ratvaano':     'Turi',    // Turi variant

};

// ─── 3. GOTRA METADATA (state-wise surnames for key gotras) ──────────────────

const GOTRA_META = {
  'Mudavath': {
    alternateNames: ['Moodavath', 'Mudaval'],
    statePresence: [
      { state: 'Telangana',      localGotraName: 'Mudavath', commonSurnames: ['Mudavath', 'Moodavath'] },
      { state: 'Andhra Pradesh', localGotraName: 'Mudavath', commonSurnames: ['Mudavath'] },
      { state: 'Karnataka',      localGotraName: 'Mudavath', commonSurnames: ['Mudavath'] },
    ],
  },
  'Banoth': {
    alternateNames: ['Bhanoth', 'Vanoth', 'Banot'],
    statePresence: [
      { state: 'Telangana',      localGotraName: 'Banoth',  commonSurnames: ['Banoth', 'Bhanoth'] },
      { state: 'Maharashtra',    localGotraName: 'Banoth',  commonSurnames: ['Banoth'] },
      { state: 'Karnataka',      localGotraName: 'Banoth',  commonSurnames: ['Banoth'] },
      { state: 'Andhra Pradesh', localGotraName: 'Banoth',  commonSurnames: ['Banoth'] },
    ],
  },
  'Jaadhav': {
    alternateNames: ['Jadhav', 'Jadav'],
    statePresence: [
      { state: 'Maharashtra',    localGotraName: 'Jadhav',  commonSurnames: ['Jadhav', 'Jaadhav'] },
      { state: 'Telangana',      localGotraName: 'Jaadhav', commonSurnames: ['Jaadhav'] },
      { state: 'Karnataka',      localGotraName: 'Jadhav',  commonSurnames: ['Jadhav'] },
    ],
  },
  'Vankdoth': {
    alternateNames: ['Wankdoth', 'Vankdot'],
    statePresence: [
      { state: 'Maharashtra', localGotraName: 'Vankdoth', commonSurnames: ['Vankdoth', 'Wankdoth'] },
      { state: 'Telangana',   localGotraName: 'Vankdoth', commonSurnames: ['Vankdoth'] },
    ],
  },
  'Ramavath': {
    alternateNames: ['Ramawat', 'Ramavat'],
    statePresence: [
      { state: 'Rajasthan',    localGotraName: 'Ramawat',  commonSurnames: ['Ramawat', 'Ramavath'] },
      { state: 'Telangana',    localGotraName: 'Ramavath', commonSurnames: ['Ramavath'] },
      { state: 'Maharashtra',  localGotraName: 'Ramavath', commonSurnames: ['Ramavath'] },
    ],
  },
  'Rajavath': {
    alternateNames: ['Rajawat', 'Rajawath'],
    statePresence: [
      { state: 'Rajasthan',    localGotraName: 'Rajawat',  commonSurnames: ['Rajawat'] },
      { state: 'Madhya Pradesh', localGotraName: 'Rajavath', commonSurnames: ['Rajavath'] },
      { state: 'Telangana',    localGotraName: 'Rajavath', commonSurnames: ['Rajavath'] },
    ],
  },
  'Meghaavath': {
    alternateNames: ['Meghawat', 'Meghavath'],
    statePresence: [
      { state: 'Rajasthan',    localGotraName: 'Meghawat',  commonSurnames: ['Meghawat'] },
      { state: 'Telangana',    localGotraName: 'Meghaavath', commonSurnames: ['Meghaavath'] },
      { state: 'Maharashtra',  localGotraName: 'Meghavath', commonSurnames: ['Meghavath'] },
    ],
  },
  'Nenavath': {
    alternateNames: ['Nenavat'],
    statePresence: [
      { state: 'Telangana',    localGotraName: 'Nenavath', commonSurnames: ['Nenavath'] },
      { state: 'Andhra Pradesh', localGotraName: 'Nenavath', commonSurnames: ['Nenavath'] },
    ],
  },
  'Dungaroth': {
    alternateNames: ['Dungar', 'Dungrot'],
    statePresence: [
      { state: 'Maharashtra',  localGotraName: 'Dungaroth', commonSurnames: ['Dungaroth', 'Dungar'] },
      { state: 'Telangana',    localGotraName: 'Dungaroth', commonSurnames: ['Dungaroth'] },
    ],
  },
  'Lunsavath': {
    alternateNames: ['Lunavath', 'Nunsavath'],
    statePresence: [
      { state: 'Rajasthan',  localGotraName: 'Lunsavath',  commonSurnames: ['Lunsavath', 'Lunavath'] },
      { state: 'Gujarat',    localGotraName: 'Lunsavath',  commonSurnames: ['Lunsavath'] },
    ],
  },
  'Aivath Pammar': {
    alternateNames: ['Aivat Pammar', 'Ivat Pamar'],
    statePresence: [
      { state: 'Telangana',   localGotraName: 'Aivath Pammar', commonSurnames: ['Pammar', 'Aivath'] },
      { state: 'Maharashtra', localGotraName: 'Ivat Pamar',    commonSurnames: ['Pammar'] },
    ],
  },
  'Chaivoth Pammar': {
    alternateNames: ['Chaivat Pammar', 'Chevath Pamar'],
    statePresence: [
      { state: 'Telangana',   localGotraName: 'Chaivoth Pammar', commonSurnames: ['Pammar', 'Chaivoth'] },
      { state: 'Maharashtra', localGotraName: 'Chevath Pamar',   commonSurnames: ['Pammar'] },
    ],
  },
  'Inloth Pammar': {
    alternateNames: ['Inlot Pammar', 'Inlot Pamar'],
    statePresence: [
      { state: 'Telangana',   localGotraName: 'Inloth Pammar', commonSurnames: ['Pammar', 'Inloth'] },
      { state: 'Maharashtra', localGotraName: 'Inlot Pamar',   commonSurnames: ['Pammar'] },
    ],
  },
  'Gangaavath': {
    alternateNames: ['Gangawat', 'Gangavath'],
    statePresence: [
      { state: 'Maharashtra',   localGotraName: 'Gangavath', commonSurnames: ['Gangavath'] },
      { state: 'Telangana',     localGotraName: 'Gangaavath', commonSurnames: ['Gangaavath'] },
      { state: 'Uttar Pradesh', localGotraName: 'Gangawat',  commonSurnames: ['Gangawat'] },
    ],
  },
};

// ─── 4. SEED ─────────────────────────────────────────────────────────────────

async function seed() {
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connected to MongoDB');

  // Drop all existing clans (we're replacing wrong 15 with correct 6)
  const deleted = await Clan.deleteMany({});
  console.log(`🗑  Dropped ${deleted.deletedCount} old clan records`);

  // Also clear clan reference on all gotras
  await Gotra.updateMany({}, { $unset: { clan: 1, alternateNames: 1, statePresence: 1 } });
  console.log('🗑  Cleared old clan assignments from all gotras');

  // Create the 6 correct clans
  const clanMap = {}; // name → _id
  for (const clanData of CLANS) {
    const clan = await Clan.create(clanData);
    clanMap[clanData.name] = clan._id;
    console.log(`  ✔ Clan: ${clan.displayName}`);
  }
  console.log(`\n✅ ${CLANS.length} correct major clans created\n`);

  // Map gotras to clans
  let mapped = 0, enriched = 0;
  const gotras = await Gotra.find({});

  for (const gotra of gotras) {
    const update = {};
    const clanName = GOTRA_CLAN_MAP[gotra.name];
    if (clanName && clanMap[clanName]) {
      update.clan = clanMap[clanName];
      mapped++;
    }
    const meta = GOTRA_META[gotra.name];
    if (meta) {
      if (meta.alternateNames?.length) update.alternateNames = meta.alternateNames;
      if (meta.statePresence?.length)  update.statePresence  = meta.statePresence;
      enriched++;
    }
    if (Object.keys(update).length) {
      await Gotra.findByIdAndUpdate(gotra._id, { $set: update });
    }
  }

  console.log(`✅ ${mapped} gotras mapped to their correct major clan`);
  console.log(`✅ ${enriched} gotras enriched with state/alternate name metadata`);
  console.log(`ℹ️  ${gotras.length - mapped} gotras unassigned — assign via admin panel\n`);

  // Summary per clan
  for (const [name, id] of Object.entries(clanMap)) {
    const count = await Gotra.countDocuments({ clan: id });
    console.log(`  ${name.padEnd(12)}: ${count} gotras`);
  }

  await mongoose.disconnect();
  console.log('\n✅ Seed complete.');
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
