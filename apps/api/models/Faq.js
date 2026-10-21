'use strict';
// models/Faq.js — one question/answer inside a FaqCategory (feature expansion A3).
// Plain text only (clients escape); order is the position inside its category.
const mongoose = require('mongoose');

const faqSchema = new mongoose.Schema(
  {
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'FaqCategory', required: true },
    question: { type: String, required: true, trim: true, maxlength: 300 },
    answer: { type: String, required: true, trim: true, maxlength: 5000 },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

faqSchema.index({ category: 1, order: 1 });

module.exports = mongoose.model('Faq', faqSchema);
