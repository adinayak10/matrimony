// models/ActivityLog.js
const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
});
// A6.11: 90-day TTL + per-user lookup
activitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 90 * 86400 });
activitySchema.index({ userId: 1, timestamp: -1 });
module.exports = mongoose.model('ActivityLog', activitySchema);
