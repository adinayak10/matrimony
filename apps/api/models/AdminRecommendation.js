'use strict';
// models/AdminRecommendation.js — an admin suggests `target` to `user` (feature expansion A3).
// One row per (user, target) pair; the member sees it in POST /api/fetchRecommendations
// and gets an `admin_recommendation` Notification with fromUser = target.
const mongoose = require('mongoose');

const adminRecommendationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    note: { type: String, trim: true, maxlength: 500, default: '' },
    notifyBoth: { type: Boolean, default: false },
    warnings: { type: [String], default: [] },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

adminRecommendationSchema.index({ user: 1, target: 1 }, { unique: true });
adminRecommendationSchema.index({ user: 1, createdAt: -1 });
adminRecommendationSchema.index({ target: 1 });
adminRecommendationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminRecommendation', adminRecommendationSchema);
