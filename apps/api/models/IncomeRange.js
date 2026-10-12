// models/IncomeRange.js
const mongoose = require('mongoose');

const incomeRangeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  min: { type: Number, required: true },
  max: { type: Number, required: true },
  sortOrder: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('IncomeRange', incomeRangeSchema);
