// models/ActivityLog.js
const mongoose = require('mongoose');
const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  timestamp: { type: Date, default: Date.now },
});
module.exports = mongoose.model('ActivityLog', activitySchema);
