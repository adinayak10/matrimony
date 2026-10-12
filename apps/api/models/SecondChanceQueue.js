const mongoose = require('mongoose');

const secondChanceSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profileId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  rejectedAt: { type: Date, required: true },
  reminded: { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model('SecondChanceQueue', secondChanceSchema);
