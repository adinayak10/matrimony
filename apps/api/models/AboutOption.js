// models/AboutOption.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const aboutOptionSchema = new Schema({
  category: {
    type: String,
    enum: ['tone', 'trait', 'hobby', 'goal'],
    required: true,
  },
  value: { type: String, required: true },
});

module.exports = mongoose.model('AboutOption', aboutOptionSchema);
