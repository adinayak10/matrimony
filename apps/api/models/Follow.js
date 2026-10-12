const mongoose = require("mongoose");
const Follow = new mongoose.Schema({
  my_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});
Follow.index({ my_user_id: 1, user_id: 1 }, { unique: true });
module.exports = mongoose.model("FollowingList", Follow);