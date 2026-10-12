const mongoose = require('mongoose');

const RoomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  admin_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  interest_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Interest' }], // Array of interests
}, { timestamps: true });

RoomSchema.virtual('roomUsers', {
  ref: 'RoomUser',
  localField: '_id',
  foreignField: 'room_id',
});

module.exports = mongoose.model('Room', RoomSchema);
