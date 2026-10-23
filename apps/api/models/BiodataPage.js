'use strict';
/**
 * models/BiodataPage.js — CMS pages of the biodata maker (landing, guides,
 * template-category pages). Rendered by apps/web; written by the admin
 * controller (controllers/admin/biodataAdminController.js) and the seed tool
 * (tools/seedBiodataPages.js), both of which sanitize every field:
 * html fields through sanitizeRich, everything else as plain text.
 *
 * kinds and slugs:
 *   landing   'biodata-maker' (exactly one; cannot be deleted)
 *   guide     ^(marriage|banjara)-biodata-[a-z0-9-]{2,60}$
 *   category  a K.registry.CATEGORIES slug
 * A published page's slug is frozen.
 */
const mongoose = require('mongoose');

const BLOCK_TYPES = ['richText', 'steps', 'checklist', 'table', 'callout', 'cta'];

const blockSchema = new mongoose.Schema(
  {
    type: { type: String, enum: BLOCK_TYPES, required: true },
    heading: { type: String, default: '' },
    html: { type: String, default: '' },
    items: { type: [String], default: [] },
    rows: { type: [[String]], default: [] },
    ctaLabel: { type: String, default: '' },
    ctaHref: { type: String, default: '' },
  },
  { _id: false }
);

const faqSchema = new mongoose.Schema({ question: { type: String, default: '' }, answer: { type: String, default: '' } }, { _id: false });
const linkSchema = new mongoose.Schema({ label: { type: String, default: '' }, href: { type: String, default: '' } }, { _id: false });

const biodataPageSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, maxlength: 80 },
    kind: { type: String, enum: ['landing', 'guide', 'category'], required: true },
    metaTitle: { type: String, default: '', maxlength: 70 },
    metaDescription: { type: String, default: '', maxlength: 170 },
    canonicalOverride: { type: String, default: '' },
    ogImage: { type: String, default: '' },
    h1: { type: String, default: '' },
    intro: { type: String, default: '' },
    contentBlocks: { type: [blockSchema], default: [] },
    faqs: { type: [faqSchema], default: [] },
    ctaConfig: {
      heading: { type: String, default: '' },
      text: { type: String, default: '' },
      primaryLabel: { type: String, default: '' },
      primaryHref: { type: String, default: '' },
      secondaryLabel: { type: String, default: '' },
      secondaryHref: { type: String, default: '' },
    },
    relatedLinks: { type: [linkSchema], default: [] },
    isPublished: { type: Boolean, default: false },
    publishedAt: { type: Date, default: null },
    contentWords: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

biodataPageSchema.index({ kind: 1, isPublished: 1 });

module.exports = mongoose.models.BiodataPage || mongoose.model('BiodataPage', biodataPageSchema);
module.exports.BLOCK_TYPES = BLOCK_TYPES;
