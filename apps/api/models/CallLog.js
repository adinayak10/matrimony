const mongoose = require('mongoose');

const callLogSchema = new mongoose.Schema({
  caller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  callee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  chatRoom: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatRoom', required: true },
  channelName: { type: String, required: true },
  callType: { type: String, enum: ['audio', 'video'], default: 'audio' },
  status: {
    type: String,
    enum: ['ringing', 'accepted', 'rejected', 'ended', 'missed'],
    default: 'ringing',
  },
  startedAt: { type: Date, default: Date.now },
  // set when the callee accepts; durationSeconds = endedAt - answeredAt
  answeredAt: { type: Date, default: null },
  endedAt: { type: Date },
}, { timestamps: true });

// History (both directions, newest first), busy checks, token lookups (feature expansion A5)
callLogSchema.index({ caller: 1, createdAt: -1 });
callLogSchema.index({ callee: 1, createdAt: -1 });
callLogSchema.index({ callee: 1, status: 1, updatedAt: -1 });
callLogSchema.index({ caller: 1, status: 1, updatedAt: -1 });
callLogSchema.index({ channelName: 1 });

module.exports = mongoose.model('CallLog', callLogSchema);
