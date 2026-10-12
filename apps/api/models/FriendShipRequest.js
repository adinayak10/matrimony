const mongoose = require("mongoose");

const friendshipRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "accepted", "rejected"], default: null },
  // A6.3: sorted ids joined with ':' so two users can never hold two rows
  // (one in each direction) — the race the old requester/recipient index allowed.
  pairKey: { type: String, required: true },
}, { timestamps: true });

friendshipRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });
// partial: legacy rows without pairKey (pre-A6.3) must not block the build
friendshipRequestSchema.index({ pairKey: 1 }, { unique: true, partialFilterExpression: { pairKey: { $type: 'string' } } });
friendshipRequestSchema.index({ recipient: 1, status: 1 });
friendshipRequestSchema.index({ requester: 1, createdAt: -1 });

friendshipRequestSchema.statics.pairKeyOf = function pairKeyOf(a, b) {
  return [String(a && a._id ? a._id : a), String(b && b._id ? b._id : b)].sort().join(':');
};

// Rows created without pairKey (factory/legacy call sites) get it derived.
friendshipRequestSchema.pre('validate', function setPairKey(next) {
  if (!this.pairKey && this.requester && this.recipient) {
    this.pairKey = [String(this.requester), String(this.recipient)].sort().join(':');
  }
  next();
});

module.exports = mongoose.model("FriendshipRequest", friendshipRequestSchema);
