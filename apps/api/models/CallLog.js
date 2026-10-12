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
  endedAt: { type: Date },
}, { timestamps: true });

module.exports = mongoose.model('CallLog', callLogSchema);
