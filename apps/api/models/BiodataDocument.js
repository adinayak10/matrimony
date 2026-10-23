'use strict';
/**
 * models/BiodataDocument.js — a member's saved marriage biodata (biodata maker, Phase 2).
 *
 * `data` and `design` are Mixed: they are validated by the shared kit
 * (K.schema.clean / cleanDesign) in services/biodataService.js before every
 * write, never by mongoose. `photo.file` is a BASENAME inside
 * PRIVATE_UPLOADS_DIR/biodata (never a path, never under uploads/).
 *
 * shareToken: 48 lowercase hex chars (192 bit). Lowercase because the web's
 * canonicalUrl lowercases paths. Unique only where set (partial index).
 */
const mongoose = require('mongoose');

const MAX_PER_USER = 10;
const TITLE_MAX = 80;

const photoSchema = new mongoose.Schema(
  {
    file: { type: String, required: true },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
    size: { type: Number, default: 0 },
  },
  { _id: false }
);

const biodataDocumentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, default: 'My biodata', maxlength: TITLE_MAX, trim: true },
    templateId: { type: String, required: true, maxlength: 60 },
    design: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    data: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
    photo: { type: photoSchema, default: null },
    status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
    version: { type: Number, default: 1, min: 1 },
    lastRenderedAt: { type: Date, default: null },
    shareToken: { type: String, default: undefined, match: /^[a-f0-9]{48}$/ },
    shareExpiresAt: { type: Date, default: null },
    shareViews: { type: Number, default: 0 },
  },
  { timestamps: true, minimize: false }
);

biodataDocumentSchema.index({ user: 1, updatedAt: -1 });
biodataDocumentSchema.index(
  { shareToken: 1 },
  { unique: true, partialFilterExpression: { shareToken: { $type: 'string' } } }
);
biodataDocumentSchema.index({ templateId: 1 });

const BiodataDocument = mongoose.models.BiodataDocument || mongoose.model('BiodataDocument', biodataDocumentSchema);

module.exports = BiodataDocument;
module.exports.MAX_PER_USER = MAX_PER_USER;
module.exports.TITLE_MAX = TITLE_MAX;
