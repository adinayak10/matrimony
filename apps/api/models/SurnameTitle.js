const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Represents an honorific/title-derived surname used by Banjara families
// that cuts ACROSS clans and gotras (e.g., "Naik" was the title of a Tanda
// chief and became a hereditary surname regardless of which gotra the
// family belonged to). These are different from clan/gotra-derived
// surnames (which live on Clan.statePresence / Gotra.statePresence).
const surnameTitleSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  alternateSpellings: {
    type: [String],
    default: [],
  },

  // What the title/surname literally means
  meaning: {
    type: String,
    default: '',
  },

  // Historical origin of how it became a surname
  origin: {
    type: String,
    default: '',
  },

  // How it's typically combined with a gotra/clan name
  usagePattern: {
    type: String,
    default: '',
  },

  // 'title-suffix' (Naik, Rao, Raju), 'occupational' (Patil/Patel),
  // 'status' (Thakur), etc.
  usageType: {
    type: String,
    enum: ['title-suffix', 'occupational', 'status', 'regional-honorific'],
    default: 'title-suffix',
  },

  // Clan names this is especially associated with — empty array means
  // it is used universally across all clans
  applicableClans: {
    type: [String],
    default: [],
  },

  statePresence: [
    {
      state: { type: String, required: true },
      prevalence: {
        type: String,
        enum: ['very common', 'common', 'occasional'],
        default: 'common',
      },
      exampleNames: { type: [String], default: [] },
      notes: { type: String, default: '' },
    },
  ],

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

surnameTitleSchema.pre('save', function (next) {
  this.updatedAt = new Date();
  next();
});

surnameTitleSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

const SurnameTitle = mongoose.model('SurnameTitle', surnameTitleSchema);
module.exports = SurnameTitle;
