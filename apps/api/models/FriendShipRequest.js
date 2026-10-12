const mongoose = require("mongoose");
const friendshipRequestSchema = new mongoose.Schema({
    requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ["pending", "accepted", "rejected"], default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  });
  // Unique index to avoid duplicate friendship requests
  friendshipRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
  module.exports = mongoose.model("FriendshipRequest", friendshipRequestSchema);
  