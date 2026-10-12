const mongoose = require('mongoose');

// A6.9: one row per SEARCH (target:null, query = the filters used), not one
// per impression. Rows expire after 90 days.
const searchLogSchema = new mongoose.Schema({
  searcher: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  target: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  query: { type: Object, default: null },
  resultCount: { type: Number, default: 0 },
  searchedAt: { type: Date, default: Date.now }
});

searchLogSchema.index({ searchedAt: 1 }, { expireAfterSeconds: 90 * 86400 });
searchLogSchema.index({ searcher: 1, searchedAt: -1 });

module.exports = mongoose.model('SearchLog', searchLogSchema);
