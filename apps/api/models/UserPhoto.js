const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const userPhotoSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  imageUrl: { type: String, required: true },
  uploadedAt: { type: Date, default: Date.now },
  isProfile: { type: Boolean, default: false },

  // Drag-and-drop ordering
  order: { type: Number, default: 0 },

  // Photo moderation (A6.8): new uploads start as 'pending' so the admin has a
  // real review queue, but pending photos STAY VISIBLE (getUserPhotos only
  // hides 'rejected') — with one admin and no moderators, blocking uploads
  // would stall onboarding. tools/cleanup/backfill-photo-status.js sets the
  // legacy null rows to 'approved'.
  moderationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  moderatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  moderatedAt: { type: Date },
  rejectionReason: { type: String },
});

userPhotoSchema.index({ userId: 1, order: 1 });
// C4.6: moderation queue
userPhotoSchema.index({ moderationStatus: 1, uploadedAt: -1 });

module.exports = mongoose.model('UserPhoto', userPhotoSchema);
