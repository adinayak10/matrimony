const mongoose = require('mongoose');

const documentTypeSchema = new mongoose.Schema({
  title: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('DocumentType', documentTypeSchema);
