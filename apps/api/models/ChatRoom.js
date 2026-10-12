const mongoose = require('mongoose');

const chatRoomSchema = new mongoose.Schema({
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending',
  },
  isGroup: { type: Boolean, default: false },
}, { timestamps: true });

// Prevent duplicate 1-on-1 rooms (only 2 participants)
chatRoomSchema.index(
  { participants: 1, isGroup: 1 },
  {
    unique: true,
    partialFilterExpression: { isGroup: false, 'participants.2': { $exists: false } },
  }
);

module.exports = mongoose.model('ChatRoom', chatRoomSchema);
