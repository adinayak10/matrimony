'use strict';
// Saved searches (feature expansion A2). `filters` uses the searchProfiles
// vocabulary: {age_range, height_range, marital_status[], caste[], gotra[],
// qualification[], profession[], incomeRange, isVerify, recentlyActive}.
const mongoose = require('mongoose');

const MAX_PER_USER = 10;

const savedSearchSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 60 },
    filters: { type: Object, default: {} },
    alertEnabled: { type: Boolean, default: false },
    lastNotifiedAt: { type: Date, default: null },
    lastRunAt: { type: Date, default: null },
  },
  { timestamps: true, minimize: false }
);

savedSearchSchema.index({ user: 1, createdAt: -1 });
savedSearchSchema.index({ alertEnabled: 1, lastNotifiedAt: 1 });

savedSearchSchema.statics.MAX_PER_USER = MAX_PER_USER;

module.exports = mongoose.model('SavedSearch', savedSearchSchema);
