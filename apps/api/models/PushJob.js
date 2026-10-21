'use strict';
// models/PushJob.js — one admin push send (feature expansion A3).
//   mode 'topic'    FCM topic broadcast (platform all|android|ios), results per topic
//   mode 'filtered' sendToUser loop over a member filter (cap 2000), sent/failed counters
//   mode 'user'     single test send
// source: 'manual' (push screen) | 'announcement' (publish with sendPush).
const mongoose = require('mongoose');

const pushJobSchema = new mongoose.Schema(
  {
    mode: { type: String, enum: ['topic', 'filtered', 'user'], required: true },
    source: { type: String, enum: ['manual', 'announcement'], default: 'manual' },
    status: { type: String, enum: ['running', 'completed', 'failed'], default: 'running' },
    title: { type: String, default: '' },
    body: { type: String, default: '' },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    platform: { type: String, default: null },
    filters: { type: mongoose.Schema.Types.Mixed, default: null },
    targetUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    announcement: { type: mongoose.Schema.Types.ObjectId, ref: 'Announcement', default: null },
    total: { type: Number, default: 0 },
    sent: { type: Number, default: 0 },
    failed: { type: Number, default: 0 },
    skipped: { type: Number, default: 0 },
    results: { type: mongoose.Schema.Types.Mixed, default: null },
    errorMessages: { type: [String], default: [] },
    startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    startedAt: { type: Date, default: Date.now },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

pushJobSchema.index({ createdAt: -1 });
pushJobSchema.index({ startedBy: 1, createdAt: -1 });

module.exports = mongoose.model('PushJob', pushJobSchema);
