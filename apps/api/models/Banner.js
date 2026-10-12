const mongoose = require('mongoose');

// C4.9: isActive/order/type were written by bannerController but silently
// dropped by the old 4-field schema.
const bannerSchema = new mongoose.Schema({
  title: String,
  imageUrl: String,
  link: String,
  isActive: { type: Boolean, default: true },
  order: { type: Number, default: 0 },
  type: { type: String, default: 'general' },
  createdAt: { type: Date, default: Date.now }
});

bannerSchema.index({ isActive: 1, order: 1 });

module.exports = mongoose.model('Banner', bannerSchema);
