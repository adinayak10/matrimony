const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const gotraSchema = new Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },

  // Which major Banjara clan (Gor Samuh) this gotra belongs to
  clan: {
    type: Schema.Types.ObjectId,
    ref: 'Clan',
    default: null,
  },

  // Other spellings / regional names for this gotra
  alternateNames: {
    type: [String],
    default: [],
  },

  // Brief description of this gotra's history
  description: {
    type: String,
    default: '',
  },

  // Historical region of origin
  origin: {
    type: String,
    default: '',
  },

  // Gotra deity (different from clan kuldevi in some cases)
  deity: {
    type: String,
    default: '',
  },

  // State-wise: what this gotra is called locally and what surnames are used
  statePresence: [
    {
      state: { type: String, required: true },
      // How this gotra name is written/pronounced in that state
      localGotraName: { type: String, default: '' },
      // Surnames (family names) used by this gotra's families in that state
      // e.g., in Telangana a Mudavath person may use "Mudavath" or "Mudavath Raju"
      commonSurnames: { type: [String], default: [] },
    },
  ],

  // Whether this gotra is active / shown in dropdowns
  isActive: {
    type: Boolean,
    default: true,
  },

  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

gotraSchema.pre('findOneAndUpdate', function (next) {
  this.set({ updatedAt: new Date() });
  next();
});

gotraSchema.index({ clan: 1 });
gotraSchema.index({ name: 'text', alternateNames: 'text' });

const Gotra = mongoose.model('Gotra', gotraSchema);
module.exports = Gotra;
