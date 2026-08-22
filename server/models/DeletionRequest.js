const mongoose = require("mongoose");

const deletionRequestSchema = new mongoose.Schema(
  {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    requestedByName: {
      type: String,
      default: "User",
    },
    requestedByEmail: {
      type: String,
      default: "",
    },
    targetModel: {
      type: String,
      default: "StoredFile",
      enum: ["StoredFile", "Other"],
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    targetName: {
      type: String,
      required: true,
    },
    reason: {
      type: String,
      default: "No specific reason provided",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    adminNote: {
      type: String,
      default: "",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

deletionRequestSchema.index({ createdAt: -1 });

module.exports = mongoose.model("DeletionRequest", deletionRequestSchema);
