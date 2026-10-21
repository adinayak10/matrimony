'use strict';
// models/IceBreakerQuestion.js — the Ice Breaker question bank (feature expansion A3).
// Moved out of models/IceBreakerGame.js (which requires this file, so the model
// registers exactly once). `key` identifies a seeded default ('q1'..'q50') so
// seedDefaults() is idempotent; admin-created questions have no key.
const mongoose = require('mongoose');

const CATEGORIES = ['personality', 'lifestyle', 'values', 'interests', 'relationships', 'goals'];
const DIFFICULTIES = ['easy', 'medium', 'deep'];

const iceBreakerQuestionSchema = new mongoose.Schema({
  key: { type: String, trim: true, default: undefined },
  question: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator(options) {
        return Array.isArray(options) && options.length >= 2 && options.length <= 6;
      },
      message: 'Question must have between 2 and 6 options',
    },
  },
  category: {
    type: String,
    enum: CATEGORIES,
    default: 'personality',
  },
  difficulty: {
    type: String,
    enum: DIFFICULTIES,
    default: 'medium',
  },
  order: { type: Number, default: 0 },
  isActive: {
    type: Boolean,
    default: true,
  },
  usageCount: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: { type: Date, default: Date.now },
});

iceBreakerQuestionSchema.pre('save', function touch(next) {
  this.updatedAt = new Date();
  next();
});

iceBreakerQuestionSchema.index({ key: 1 }, { unique: true, sparse: true });
iceBreakerQuestionSchema.index({ isActive: 1, order: 1 });
iceBreakerQuestionSchema.index({ category: 1, isActive: 1 });
iceBreakerQuestionSchema.index({ difficulty: 1, isActive: 1 });

const IceBreakerQuestion = mongoose.model('IceBreakerQuestion', iceBreakerQuestionSchema);
IceBreakerQuestion.CATEGORIES = CATEGORIES;
IceBreakerQuestion.DIFFICULTIES = DIFFICULTIES;

module.exports = IceBreakerQuestion;
