const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const shortlistSchema = new Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  shortlistedUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// ✅ Enforce uniqueness for each user-shortlisted pair
shortlistSchema.index({ userId: 1, shortlistedUserId: 1 }, { unique: true });

const Shortlist = mongoose.model('Shortlist', shortlistSchema);
module.exports = Shortlist;
