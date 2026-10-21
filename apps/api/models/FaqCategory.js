'use strict';
// models/FaqCategory.js — FAQ sections (feature expansion A3). No seeded content.
const mongoose = require('mongoose');

const faqCategorySchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 120 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

faqCategorySchema.index({ order: 1, createdAt: 1 });

module.exports = mongoose.model('FaqCategory', faqCategorySchema);
