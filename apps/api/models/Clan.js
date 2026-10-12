const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Represents a major Banjara lineage group (Gor Samuh / Clan)
// Each clan contains multiple gotras (sub-lineages)
const clanSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Display name with "Gor" suffix — e.g., "Banoth Gor"
  displayName: {
    type: String,
    trim: true,
  },

  // Short description of this clan's history and significance
  description: {
    type: String,
    default: '',
  },

  // Historical region of origin (e.g., "Rajasthan", "Central India")
  origin: {
    type: String,
    default: '',
  },

  // Other names this clan is known by across regions
  alternateNames: {
    type: [String],
    default: [],
  },

  // Whether scholars/sources dispute this clan's independent status
  // (e.g. Banoth and Turi are sometimes classified as Rathod sub-divisions)
  disputedStatus: {
    type: String,
    default: '',
  },

  // How this clan's name and presence varies by state
  statePresence: [
    {
      state: { type: String, required: true },     // e.g., "Telangana"
      localName: { type: String, default: '' },    // what the clan is called there
      strongholdDistricts: { type: [String], default: [] },
      commonSurnames: { type: [String], default: [] }, // surnames used in this state
    },
  ],

  // Whether to show this clan on public pages
  isActive: {
    type: Boolean,
    default: true,
  },

  sortOrder: {
    type: Number,
    default: 0,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

clanSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  if (!this.displayName) this.displayName = `${this.name} Gor`;
  next();
});

clanSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const Clan = mongoose.model('Clan', clanSchema);
module.exports = Clan;
