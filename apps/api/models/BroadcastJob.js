'use strict';
/**
 * models/BroadcastJob.js (C4.6) — progress record for an admin broadcast email.
 */
const mongoose = require('mongoose');

const broadcastJobSchema = new mongoose.Schema({
  status: { type: String, enum: ['queued', 'running', 'completed', 'failed'], default: 'queued' },
  subject: { type: String, default: '' },
  filter: { type: Object, default: {} },
  total: { type: Number, default: 0 },
  sent: { type: Number, default: 0 },
  failed: { type: Number, default: 0 },
  errors: { type: [String], default: [] },
  startedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  startedAt: { type: Date, default: null },
  finishedAt: { type: Date, default: null },
}, { timestamps: true });

broadcastJobSchema.index({ createdAt: -1 });
broadcastJobSchema.index({ startedBy: 1, createdAt: -1 });

module.exports = mongoose.model('BroadcastJob', broadcastJobSchema);
