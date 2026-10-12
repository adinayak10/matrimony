const mongoose = require('mongoose');

const chatIntentLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  openedAt: { type: Date, default: Date.now },
  duration: { type: Number, default: 0 } // in seconds
}, { timestamps: true });

module.exports = mongoose.model('ChatIntentLog', chatIntentLogSchema);
