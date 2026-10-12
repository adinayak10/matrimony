// models/RecentVisitor.js
const mongoose = require('mongoose');

const recentVisitorSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who visited
  visited: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // whose profile
  count: { type: Number, default: 1 },
  lastVisitedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// A6.9: one row per viewer/profile pair; rows expire 180 days after the last visit
recentVisitorSchema.index({ visitor: 1, visited: 1 }, { unique: true });
recentVisitorSchema.index({ visited: 1, lastVisitedAt: -1 });
recentVisitorSchema.index({ lastVisitedAt: 1 }, { expireAfterSeconds: 180 * 86400 });

module.exports = mongoose.model('RecentVisitor', recentVisitorSchema);
