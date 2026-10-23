'use strict';
/**
 * models/BiodataDocumentVersion.js — content snapshots of a BiodataDocument.
 *
 * Written only when title/templateId/design/data changed (save), on restore
 * and on duplicate. services/biodataService.snapshot() keeps the newest
 * VERSIONS_KEPT per document and deletes the rest.
 */
const mongoose = require('mongoose');

const VERSIONS_KEPT = 20;

const biodataDocumentVersionSchema = new mongoose.Schema(
  {
    document: { type: mongoose.Schema.Types.ObjectId, ref: 'BiodataDocument', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    version: { type: Number, required: true },
    title: { type: String, default: '' },
    templateId: { type: String, default: '' },
    design: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    data: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    reason: { type: String, enum: ['save', 'restore', 'duplicate'], default: 'save' },
  },
  { timestamps: { createdAt: true, updatedAt: false }, minimize: false }
);

biodataDocumentVersionSchema.index({ document: 1, version: -1 });
biodataDocumentVersionSchema.index({ user: 1 });

const BiodataDocumentVersion =
  mongoose.models.BiodataDocumentVersion || mongoose.model('BiodataDocumentVersion', biodataDocumentVersionSchema);

module.exports = BiodataDocumentVersion;
module.exports.VERSIONS_KEPT = VERSIONS_KEPT;
