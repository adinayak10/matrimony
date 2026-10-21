'use strict';
// models/SuccessStory.js — member-submitted success stories (feature expansion A3).
// Lifecycle: pending -> approved (moderated, not public) -> published (public)
//            any -> rejected (reason). Only `published` rows are ever public.
// submittedBy is nulled (not deleted) when the member deletes the account and
// the story is already published; see services/userCascade.js.
const mongoose = require('mongoose');

const STATUSES = ['pending', 'approved', 'published', 'rejected'];

const successStorySchema = new mongoose.Schema(
  {
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    partnerUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdByAdmin: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    groomName: { type: String, required: true, trim: true, maxlength: 80 },
    brideName: { type: String, required: true, trim: true, maxlength: 80 },
    story: { type: String, required: true, trim: true, maxlength: 5000 },
    weddingDate: { type: Date, default: null },
    city: { type: String, trim: true, maxlength: 80, default: '' },
    photo: { type: String, default: null }, // 'uploads/profile_images/<uuid>.jpg'
    status: { type: String, enum: STATUSES, default: 'pending' },
    rejectionReason: { type: String, default: null, maxlength: 500 },
    isFeatured: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

successStorySchema.index({ status: 1, isFeatured: -1, publishedAt: -1 });
successStorySchema.index({ submittedBy: 1, createdAt: -1 });
successStorySchema.index({ partnerUser: 1 });

const SuccessStory = mongoose.model('SuccessStory', successStorySchema);
SuccessStory.STATUSES = STATUSES;
module.exports = SuccessStory;
