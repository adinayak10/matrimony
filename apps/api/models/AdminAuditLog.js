'use strict';
/**
 * models/AdminAuditLog.js (C4.12) — one row per admin mutation.
 * Written only through services/auditLog.js record(); read by
 * GET /api/admin/audit-log and /api/admin/audit-log/actions.
 */
const mongoose = require('mongoose');

const adminAuditLogSchema = new mongoose.Schema({
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
  adminEmail: { type: String, default: null },
  action: { type: String, required: true, index: true }, // e.g. user.block, settings.update
  targetType: { type: String, default: null },           // user | report | settings | apk | blog | banner | constant | regionalPage | broadcast
  targetId: { type: String, default: null },
  before: { type: mongoose.Schema.Types.Mixed, default: null },
  after: { type: mongoose.Schema.Types.Mixed, default: null },
  ip: { type: String, default: null },
  userAgent: { type: String, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } });

adminAuditLogSchema.index({ createdAt: -1 });
adminAuditLogSchema.index({ targetType: 1, targetId: 1, createdAt: -1 });

module.exports = mongoose.model('AdminAuditLog', adminAuditLogSchema);
