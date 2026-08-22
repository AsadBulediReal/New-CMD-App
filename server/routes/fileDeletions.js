const express = require("express");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const DeletionRequest = require("../models/DeletionRequest");
const { optionalAuth } = require("../utils/authMiddleware");
const { logUserActivity } = require("../utils/logger");
const { sendAdminDeletionAlert } = require("../utils/mailer");
const { createNotification } = require("../utils/notify");

const router = express.Router();
router.use(optionalAuth);

/**
 * DELETE /api/files/:id
 * Delete a file:
 * - Admin: direct permanent deletion
 * - Regular user: guarded deletion request awaiting admin approval
 */
router.delete("/files/:id", async (req, res) => {
  try {
    const file = await StoredFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });

    const isAdmin = req.user && req.user.role === "admin";

    if (isAdmin) {
      await StoredFile.findByIdAndDelete(req.params.id);
      await FileChunk.deleteMany({ fileId: req.params.id });
      if (file.deletionRequestId) {
        await DeletionRequest.findByIdAndUpdate(file.deletionRequestId, {
          status: "approved",
          reviewedBy: req.user._id,
          reviewedAt: new Date(),
        });
      }

      logUserActivity({
        req,
        action: "DELETE_FILE",
        resourceType: "StoredFile",
        resourceId: req.params.id,
        details: { filename: file.filename },
      });

      return res.status(200).json({ message: "File permanently deleted" });
    }

    // Regular User: Guarded deletion request
    if (file.isPendingDeletion) {
      return res.status(400).json({ error: "File is already pending administrator deletion approval" });
    }

    const { reason = "User requested deletion" } = req.body;
    const delReq = new DeletionRequest({
      requestedBy: req.user ? req.user._id : file.uploadedBy,
      requestedByName: req.user ? req.user.name : "User",
      requestedByEmail: req.user ? req.user.email : "",
      targetId: file._id,
      targetName: file.filename,
      reason: reason.trim(),
    });
    await delReq.save();

    file.isPendingDeletion = true;
    file.deletionRequestId = delReq._id;
    await file.save();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@usindh.edu.pk";
    sendAdminDeletionAlert(adminEmail, delReq).catch((err) =>
      console.warn("Deletion alert email error:", err.message)
    );

    createNotification({
      recipientRole: "admin",
      title: "File Deletion Request",
      message: `${req.user ? req.user.name : "A user"} requested deletion of "${file.filename}".`,
      type: "deletion_requested",
      link: "/admin",
    }).catch(() => {});

    logUserActivity({
      req,
      action: "REQUEST_DELETE",
      resourceType: "StoredFile",
      resourceId: file._id.toString(),
      details: { filename: file.filename, reason: delReq.reason },
    });

    return res.status(202).json({
      message: "Deletion request submitted. Awaiting administrator approval.",
      isPendingDeletion: true,
      requestId: delReq._id,
    });
  } catch (error) {
    console.error("Error in delete file:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

/**
 * DELETE /api/files/deletion-request/:id/cancel
 * Cancel a pending deletion request
 */
router.delete("/files/deletion-request/:id/cancel", async (req, res) => {
  try {
    const delReq = await DeletionRequest.findById(req.params.id);
    if (!delReq) return res.status(404).json({ error: "Request not found" });

    if (delReq.status !== "pending") {
      return res.status(400).json({ error: "Request is no longer pending" });
    }

    delReq.status = "cancelled";
    await delReq.save();

    await StoredFile.findByIdAndUpdate(delReq.targetId, {
      isPendingDeletion: false,
      deletionRequestId: null,
    });

    logUserActivity({
      req,
      action: "CANCEL_DELETE_REQUEST",
      resourceType: "StoredFile",
      resourceId: delReq.targetId.toString(),
      details: { filename: delReq.targetName },
    });

    return res.status(200).json({ message: "Deletion request cancelled" });
  } catch (error) {
    console.error("Error cancelling deletion request:", error);
    res.status(500).json({ error: "Cancel request failed" });
  }
});

module.exports = router;
