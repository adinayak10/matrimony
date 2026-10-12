const mongoose = require('mongoose');

const RoomUserSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  room_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
  invited_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Reference to the user who invited
}, { timestamps: true });

module.exports = mongoose.model('RoomUser', RoomUserSchema);
