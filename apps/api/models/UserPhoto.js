const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userPhotoSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  isProfile: { type: Boolean, default: false },

  // 🆕 Added for drag-and-drop reordering
  order: { type: Number, default: 0 },

  // Photo moderation — defaults to 'approved' so existing photos (and new
  // uploads, given there's no moderation staffing yet) stay visible; the
  // report queue is the primary safety net, this is a proactive-review option.
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  rejectionReason: { type: String },
});

module.exports = mongoose.model('UserPhoto', userPhotoSchema);
