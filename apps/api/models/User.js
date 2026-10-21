const mongoose = require('mongoose');
const {
  GENDER_ENUM,
  MARITAL_STATUS_ENUM,
  MARITAL_STATUS_PREFERENCE_ENUM,
  FAMILY_TYPE_ENUM,
  FAMILY_STATUS_ENUM,
  FAMILY_VALUES_ENUM,
  OCCUPATION_ENUM,
  DIET_ENUM,
  DIET_PREFERENCE_ENUM,
  SMOKING_ENUM,
  SMOKING_PREFERENCE_ENUM,
  DRINKING_ENUM,
  DRINKING_PREFERENCE_ENUM,
  SPIRITUAL_BELIEF_ENUM,
  MANGLIK_STATUS_ENUM,
  MANGLIK_PREFERENCE_ENUM,
  COMPLEXION_ENUM,
  BODY_TYPE_ENUM,
  BODY_TYPE_PREFERENCE_ENUM,
  DISABILITY_ENUM,
  VISA_STATUS_ENUM,
  RESIDENCY_STATUS_ENUM,
  PROFILE_PIC_VISIBILITY_ENUM,
  ALLOW_CONNECTIONS_ENUM,
  ALLOW_MESSAGES_ENUM,
  EMAIL_VISIBILITY_ENUM,
  MOBILE_VISIBILITY_ENUM,
  PERSONAL_VALUE_ENUM
} = require('../enum/enum');

const userSchema = new mongoose.Schema({
  // 🔑 Core Authentication & Identity
  login_type: {
    type: Number,
    required: true,
  },
  device_type: {
    type: Number,
    required: false,
  },
  device_token: {
    type: String,
    required: false,
    default: null,
  },
  last_login_platform: {
    type: String,
    enum: ['mobile', 'web'],
    default: 'web',
    required: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  


  phone: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },
  
  firebase_uid: {
    type: String,
    unique: true,
    sparse: true,
    required: false
  },

  password: {
    type: String,
    required: false,
    select: false
  },

  // Bumped on logout / password reset / admin block: tokens carry `tv` and
  // are rejected when it no longer matches (A2.3/A2.4).
  tokenVersion: {
    type: Number,
    default: 0
  },
  
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  
  // 👤 Personal Information & Profile Status
  full_name: {
    type: String,
    required: false,
    trim: false,
    default: "Not specified"
  },
  username: {
    type: String,
    required: false,
    unique: false,
    trim: true,
    default: ""
  },
  dob: {
    type: Date,
    required: false,
    default: null,
  },
  bio: {
    type: String,
    required: false,
    unique: false,
    default: "",
  },
  gender: {
    type: String,
    enum: GENDER_ENUM,
    default: 'Not specified'
  },
height: {
    type: Number,
    required: false,
    default: null, // Use null as the default for a number type
    min: [30, 'Height must be at least 30 cm.'], 
    max: [250, 'Height cannot exceed 250 cm.'],
    validate: {
        validator: function(v) {
            // Allows the field to be null or a valid number.
            // This is useful if the field is not always provided.
            return v === null || (typeof v === 'number' && v >= 30 && v <= 250);
        },
        message: 'Height must be a number in cm between 30 and 250.'
    }
},
  maritalStatus: {
    type: String,
    enum: MARITAL_STATUS_ENUM,
    required: false,
    default: null,
  },
  profile: {
    type: String,
    default: null,
  },
  background_image: {
    type: String,
    default: null,
  },
  isOnline: {
    type: Boolean,
    default: false,
  },
  lastSeen: {
    type: Date,
    default: null,
  },
  is_highlighted: {
    type: Boolean,
    default: false,
  },
  is_verified: {
    type: Number,
    default: 0,
  },
  verifiedAt: { type: Date, default: null },
  // Who manages this profile (matrimony convention: parents often create it)
  profileCreatedBy: {
    type: String,
    enum: ['self', 'parent', 'sibling', 'relative', 'friend'],
    default: 'self',
  },
  // Admin-only note set when an admin blocks the account; never serialized to members
  block_reason: { type: String, default: null, select: false },
  is_push_notifications: {
    type: Number,
    default: 0,
  },
  is_invited_to_room: {
    type: Number,
    default: 0,
  },
  is_block: {
    type: Number,
    default: 0,
  },

  // 🏡 Location & Coordinates
  location: {
    country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', default: null },
    state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', default: null },
    city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null },
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      index: '2dsphere',
      default: [0, 0],
    },
  },

  // 🎓 Career, Education & Financial
  profession: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Profession',
    default: null,
  },
  qualification: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Qualification',
    default: null,
  },
  educationField: {
    type: String,
    default: ""
  },
  collegeName: {
    type: String,
    default: ""
  },
  incomeRange: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'IncomeRange',
    default: null
  },
  
  // 👨‍👩‍👧‍👦 Family & Background
  family: {
    father: {
      profession: { type: String, trim: true, default: "Not specified" },
      isAlive: { type: Boolean, default: true }
    },
    mother: {
      profession: { type: String, trim: true, default: "Not specified" },
      isAlive: { type: Boolean, default: true }
    },
    brothers: {
      total: { type: Number, default: 0 },
    },
    sisters: {
      total: { type: Number, default: 0 },
    },
    familyType: {
      type: String,
      enum: FAMILY_TYPE_ENUM,
      default: 'Not specified'
    },
    familyStatus: {
      type: String,
      enum: FAMILY_STATUS_ENUM,
      default: 'Not specified'
    },
    incomeRange: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IncomeRange',
      default: null,
    },
    // Mother's gotra for exogamy matching (A6.1)
    motherGotra: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Gotra',
      default: null,
    },
    basedOut: {
      country: { type: mongoose.Schema.Types.ObjectId, ref: 'Country', default: null },
      state: { type: mongoose.Schema.Types.ObjectId, ref: 'State', default: null },
      city: { type: mongoose.Schema.Types.ObjectId, ref: 'City', default: null }
    },
    fatherName: { type: String, default: "" },
    fatherOccupation: { type: String, default: "" },
    motherName: { type: String, default: "" },
    motherOccupation: { type: String, default: "" },
    siblingsCount: { type: Number, default: 0 },
    familyValues: {
      type: String,
      enum: FAMILY_VALUES_ENUM,
      default: 'Not specified'
    },
  },
  
  // 🕌 Cultural & Religious
  caste: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Caste',
    required: false,
    default: null,
  },
  gotra: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Gotra',
    required: false,
    default: null,
  },
  motherTongue: {
    type: String,
    default: ""
  },
  knownLanguages: [{
    type: String,
    default: []
  }],
  manglikStatus: {
    type: String,
    enum: MANGLIK_STATUS_ENUM,
    default: 'Not specified'
  },
  horoscopeRequired: {
    type: Boolean,
    default: false
  },

  // Guna Milan / horoscope compatibility inputs — all optional, additive.
  // Simplified Rashi+Nakshatra scoring (see utils/gunaMilanTable.js), not a
  // full Vedic Ashtakoot/panchang calculation.
  horoscope: {
    birthTime: { type: String, default: '' },
    birthPlace: { type: String, default: '' },
    rashi: { type: String, default: '' },
    nakshatra: { type: String, default: '' },
  },

  // 🧘 Lifestyle & Interests
  diet: {
    type: String,
    enum: DIET_ENUM,
    default: 'Not specified'
  },
  smoke: {
    type: String,
    enum: SMOKING_ENUM,
    default: 'Not specified'
  },
  drink: {
    type: String,
    enum: DRINKING_ENUM,
    default: 'Not specified'
  },
  livingWithFamily: {
    type: Boolean,
    default: true,
  },
  spiritualBelief: {
    type: String,
    enum: SPIRITUAL_BELIEF_ENUM,
    default: 'Not specified'
  },
  about: { type: String, default: "" },
  hobbies: [{ type: String }],
  personalityTraits: [{ type: String }],
  interests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "Interest",
  }],

  // 🧬 Physical Attributes
  complexion: {
    type: String,
    enum: COMPLEXION_ENUM,
    default: 'Not specified'
  },
  bodyType: {
    type: String,
    enum: BODY_TYPE_ENUM,
    default: 'Not specified'
  },
  weight: {
    type: Number,
    default: null
  },
  disability: {
    type: String,
    enum: DISABILITY_ENUM,
    default: 'None'
  },
  // '' = not specified (feature expansion 2026-10)
  bloodGroup: {
    type: String,
    enum: ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    default: ''
  },

  // 🏠 Address & Residency
  presentAddress: { type: String, default: "" },
  permanentAddress: { type: String, default: "" },
  pinCode: { type: String, default: "" },
  visaStatus: {
    type: String,
    enum: VISA_STATUS_ENUM,
    default: 'Not specified'
  },
  residencyStatus: {
    type: String,
    enum: RESIDENCY_STATUS_ENUM,
    default: 'Not specified'
  },
  alternateContact: { type: String, default: "" },
  isOnWhatsapp: { type: Boolean, default: false },

  // ⚙️ System & App-specific
  profileCompletion: {
    percentage: { type: Number, default: 0 },
    missingFields: [{ type: String }],
    suggestion: { type: String, default: "" }
  },
  membershipPlan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MembershipPlan',
    default: null,
  },
  settings: {
    showLocation: { type: Boolean, default: true },
    showIncome: { type: Boolean, default: true },
    profilePicVisibility: {
      type: String,
      enum: PROFILE_PIC_VISIBILITY_ENUM,
      default: 'everyone',
    },
    profilePicRequestRequired: { type: Boolean, default: false },
    allowConnections: {
      type: String,
      enum: ALLOW_CONNECTIONS_ENUM,
      default: 'everyone',
    },
    allowMessages: {
      type: String,
      enum: ALLOW_MESSAGES_ENUM,
      default: 'onlyAccepted',
    },
    emailVisibility: {
      type: String,
      enum: EMAIL_VISIBILITY_ENUM,
      default: 'private',
    },
    mobileVisibility: {
      type: String,
      enum: MOBILE_VISIBILITY_ENUM,
      default: 'private',
    },
    allowNotifications: { type: Boolean, default: true },
    notifyOnInterest: { type: Boolean, default: true },
    notifyOnMessage: { type: Boolean, default: true },
    notifyOnProfileVisit: { type: Boolean, default: true }
  },
  blocked: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  }],
  
  // 💖 Partner Preferences with Defaults
  preferences: {
    // Note: marital_status is an array here to allow users to select multiple options
    marital_status: [{
      type: String,
      enum: MARITAL_STATUS_PREFERENCE_ENUM
    }],
    children: { type: Boolean, default: null }, // Null if not specified
    caste: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Caste', default: [] }],
    gotra: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Gotra', default: [] }],
    subCasteId: { type: String, default: "" },
    height_range: {
        min: { 
            type: Number, 
            default: 121, // Corresponds to 4'0"
            min: [30, 'Minimum height must be at least 30 cm.'], 
            max: [250, 'Minimum height cannot exceed 250 cm.']
        },
        max: { 
            type: Number, 
            default: 213, // Corresponds to 7'0"
            min: [30, 'Maximum height must be at least 30 cm.'], 
            max: [250, 'Maximum height cannot exceed 250 cm.']
        },
    },
    age_range: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 60 },
    },
    incomeRange: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'IncomeRange',
      default: null,
    },
    location: { type: String, default: "Anywhere" },
    residenceCountryId: { type: String, default: "Any" },
    preferredCountryId: { type: String, default: "Any" },
    preferredStateId: { type: String, default: "Any" },
    qualification: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Qualification', default: [] }],
    profession: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Profession', default: [] }],
    language: { type: String, default: "Any" },
    diet: {
      type: String,
      enum: DIET_PREFERENCE_ENUM,
      default: 'Any'
    },
    smoke: {
      type: String,
      enum: SMOKING_PREFERENCE_ENUM,
      default: 'Any'
    },
    drink: {
      type: String,
      enum: DRINKING_PREFERENCE_ENUM,
      default: 'Any'
    },
    bodyType: {
      type: String,
      enum: BODY_TYPE_PREFERENCE_ENUM,
      default: 'Any'
    },
    complexion: { type: String, default: "Any" },
    manglik: {
      type: String,
      enum: MANGLIK_PREFERENCE_ENUM,
      default: 'Any'
    },
    personalValue: {
      type: String,
      enum: PERSONAL_VALUE_ENUM,
      default: 'Any'
    },
    familyValueId: { type: String, default: "Any" },
    general: { type: String, default: "" }
  },
  
  // 🧠 NLP/AI-Generated data
  personalityMap: {
    tone: { type: String, index: true, default: "" },
    traits: [{ type: String, index: true }],
    hobbies: [{ type: String, index: true }],
    goals: [{ type: String, index: true }],
    about: { type: String, default: "" }
  },
}, {
  timestamps: true,
  // Secrets never leave the server, whichever serializer is used (A1.3)
  toJSON: { transform: stripSecrets },
  toObject: { transform: stripSecrets },
});

function stripSecrets(doc, ret) {
  if (!ret || typeof ret !== 'object') return ret;
  delete ret.password;
  delete ret.device_token;
  delete ret.firebase_uid;
  delete ret.__v;
  delete ret.blocked;
  if (ret.personalityMap && typeof ret.personalityMap === 'object') delete ret.personalityMap.prompt;
  return ret;
}

// ✅ Pre-save hook: Convert empty strings to null for unique sparse fields
userSchema.pre('save', function(next) {
  if (this.phone === '') this.phone = null;
  if (this.email === '') this.email = null;
  next();
});

// ✅ Pre-update hook: Convert empty strings to null for unique sparse fields
userSchema.pre('findOneAndUpdate', function(next) {
  const update = this.getUpdate();
  if (update.phone === '') update.phone = null;
  if (update.email === '') update.email = null;
  next();
});

userSchema.index({ coordinates: '2dsphere' });
userSchema.index({ gender: 1, is_block: 1, gotra: 1 });
userSchema.index({ 'family.motherGotra': 1 });
userSchema.index({ lastSeen: -1 });
userSchema.index({ is_verified: -1, createdAt: -1 });
// C4.6 dashboard counts
userSchema.index({ is_block: 1 });
userSchema.index({ is_verified: 1 });
userSchema.index({ 'profileCompletion.percentage': -1 });
userSchema.index({ gender: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1, email: 1 });
userSchema.index({ 'location.state': 1, is_block: 1 });
userSchema.index({ 'location.city': 1, is_block: 1 });

userSchema.statics.BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

module.exports = mongoose.model('User', userSchema);