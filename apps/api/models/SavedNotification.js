const mongoose = require("mongoose");

const SavedNotificationSchema = new mongoose.Schema({
  my_user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true },
  message: { type: String },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("SavedNotification", SavedNotificationSchema);
