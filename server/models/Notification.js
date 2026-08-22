const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  // Specific user recipient or 'admin' for all admins
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  recipientRole: {
    type: String,
    enum: ["admin", "user", null],
    default: null,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: [
      "user_registered",
      "user_approved",
      "user_rejected",
      "deletion_requested",
      "deletion_approved",
      "deletion_rejected",
      "system",
      "info",
    ],
    default: "info",
  },
  link: {
    type: String,
    default: null,
  },
  read: {
    type: Boolean,
    default: false,
    index: true,
  },
  readAt: {
    type: Date,
    default: null,
  },
  isCompleted: {
    type: Boolean,
    default: false,
    index: true,
  },
  completedAt: {
    type: Date,
    default: null,
  },
  relatedId: {
    type: mongoose.Schema.Types.ObjectId,
    default: null,
    index: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model("Notification", notificationSchema);
