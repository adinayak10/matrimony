'use strict';
/**
 * models/BiodataTemplateMeta.js — admin overrides for a kit template
 * (packages/shared/biodata/templates/*). The template itself lives in code;
 * this row only changes how it is listed (active, featured, order, name,
 * description, category, tags, thumbnail). Deleting the row resets it.
 */
const mongoose = require('mongoose');

const biodataTemplateMetaSchema = new mongoose.Schema(
  {
    templateId: { type: String, required: true, unique: true, maxlength: 60 },
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    order: { type: Number, default: null },
    displayName: { type: String, default: '', maxlength: 80 },
    description: { type: String, default: '', maxlength: 500 },
    category: { type: String, default: '', maxlength: 40 },
    tags: { type: [String], default: [] },
    // own-host /images/... only (validated in the admin controller)
    thumbnailUrl: { type: String, default: '', maxlength: 300 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.BiodataTemplateMeta || mongoose.model('BiodataTemplateMeta', biodataTemplateMetaSchema);
