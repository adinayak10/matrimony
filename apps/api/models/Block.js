const mongoose = require("mongoose");

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

// Unique index to prevent duplicate block entries
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });
// Reverse lookups (who blocked me) — services/blocks.js getBlockedIds
blockSchema.index({ blocked: 1 });

module.exports = mongoose.model("Block", blockSchema);
