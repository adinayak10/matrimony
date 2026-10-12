const mongoose = require('mongoose');

const searchLogSchema = new mongoose.Schema({
  searcher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  searchedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SearchLog', searchLogSchema);
