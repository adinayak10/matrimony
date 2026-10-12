// models/RecentVisitor.js
const mongoose = require('mongoose');

const recentVisitorSchema = new mongoose.Schema({
  visitor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // who visited
  visited: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // whose profile
  count: { type: Number, default: 1 },
  lastVisitedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('RecentVisitor', recentVisitorSchema);
