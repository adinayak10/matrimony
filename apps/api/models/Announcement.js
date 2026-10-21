'use strict';
// models/Announcement.js — admin-authored platform announcements (feature expansion A3).
// Served to members by POST /api/fetchPlatformNotification while published and
// not expired. Optional FCM topic push on publish (result kept in pushResult).
const mongoose = require('mongoose');

const TYPES = ['announcement', 'update', 'maintenance', 'event'];
const PLATFORMS = ['all', 'android', 'ios'];
const STATUSES = ['draft', 'published', 'archived'];

const announcementSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    type: { type: String, enum: TYPES, default: 'announcement' },
    platform: { type: String, enum: PLATFORMS, default: 'all' },
    linkUrl: { type: String, trim: true, maxlength: 500, default: '' },
    expiresAt: { type: Date, default: null },
    status: { type: String, enum: STATUSES, default: 'draft' },
    publishedAt: { type: Date, default: null },
    publishedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    archivedAt: { type: Date, default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    pushResult: { type: mongoose.Schema.Types.Mixed, default: null },
    pushSentAt: { type: Date, default: null },
  },
  { timestamps: true }
);

announcementSchema.index({ status: 1, publishedAt: -1 });

const Announcement = mongoose.model('Announcement', announcementSchema);
Announcement.TYPES = TYPES;
Announcement.PLATFORMS = PLATFORMS;
Announcement.STATUSES = STATUSES;
module.exports = Announcement;
