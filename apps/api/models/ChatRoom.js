const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  isGroup: { type: Boolean, default: false },
  // A6.10/A6.11: sorted participant ids joined with ':' — the real uniqueness
  // key for 1:1 rooms (a unique index on the `participants` array could never
  // be built: multikey unique would allow one room per user).
  pairKey: { type: String, default: null },
  // Who opened the room (send_message to a non-connection creates a pending room)
  initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  // deleteRoom hides the room for the caller only; send_message pulls them back in
  hiddenFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
}, { timestamps: true });

chatRoomSchema.index(
  { pairKey: 1 },
  { unique: true, partialFilterExpression: { isGroup: false, pairKey: { $type: 'string' } } }
);
chatRoomSchema.index({ participants: 1, status: 1 });

/** Sorted ids joined with ':' (tools/cleanup/dedupe-chat-rooms.js uses the same rule). */
chatRoomSchema.statics.pairKeyOf = function pairKeyOf(a, b) {
  return [String(a && a._id ? a._id : a), String(b && b._id ? b._id : b)].sort().join(':');
};

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
