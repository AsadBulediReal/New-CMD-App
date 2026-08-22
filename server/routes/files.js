const express = require("express");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const DeletionRequest = require("../models/DeletionRequest");
const { optionalAuth } = require("../utils/authMiddleware");
const { logUserActivity } = require("../utils/logger");
const { sendAdminDeletionAlert } = require("../utils/mailer");
const {
  detectAndCastSheet,
  extractDateRange,
  extractMetadata,
  getFileWithChunks,
  recomputeAllFilesMeta
} = require("../utils/metaHelpers");

const router = express.Router();
router.use(optionalAuth);

// 1. Save uploaded file data
router.post("/files", async (req, res) => {
  try {
    const { filename, headers, rows, sheets, overwrite = false } = req.body;
    if (!filename || !filename.trim()) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const trimmedName = filename.trim();
    const existingFile = await StoredFile.findOne({ filename: trimmedName });
    if (existingFile && !overwrite) {
      return res.status(400).json({ error: "File already exists" });
    }

    if (existingFile && overwrite) {
      await FileChunk.deleteMany({ fileId: existingFile._id });
      await StoredFile.deleteOne({ _id: existingFile._id });
    }

    let primaryHeaders = headers || [];
    let primaryRows = rows || [];
    let finalSheets = (sheets && sheets.length > 0) ? sheets : [];

    if (finalSheets.length > 0) {
      if (primaryHeaders.length === 0) primaryHeaders = finalSheets[0].headers || [];
      if (primaryRows.length === 0) primaryRows = finalSheets[0].rows || [];
    } else if (primaryRows.length > 0) {
      finalSheets = [{
        name: "Transactions",
        headers: primaryHeaders,
        rows: primaryRows
      }];
    }

    const castedSheets = finalSheets.map(s => detectAndCastSheet(s));
    const { start: minDate, end: maxDate } = extractDateRange(castedSheets);
    const { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary } = extractMetadata(castedSheets);

    const newFile = new StoredFile({
      filename: trimmedName,
      headers: primaryHeaders,
      hasChunks: true,
      recordDateRange: { start: minDate, end: maxDate },
      totalRecords,
      columnCount,
      sheetCount,
      sheetMeta,
      financialSummary,
      uploadedBy: req.user ? req.user._id : null,
      uploadedByName: req.user ? req.user.name : "System",
      rows: [],
      sheets: castedSheets.map(s => ({
        name: s.name,
        headers: s.headers,
        rows: []
      }))
    });

    await newFile.save();

    const CHUNK_SIZE = 5000;
    const chunkDocs = [];
    let chunkIndex = 0;

    for (const sheet of castedSheets) {
      const sRows = sheet.rows || [];
      for (let i = 0; i < sRows.length; i += CHUNK_SIZE) {
        chunkDocs.push({
          fileId: newFile._id,
          sheetName: sheet.name,
          chunkIndex: chunkIndex++,
          rows: sRows.slice(i, i + CHUNK_SIZE)
        });
      }
    }

    if (chunkDocs.length > 0) {
      await FileChunk.insertMany(chunkDocs, { ordered: false });
    }

    logUserActivity({
      req,
      action: "UPLOAD_FILE",
      resourceType: "StoredFile",
      resourceId: newFile._id,
      details: { filename: newFile.filename, totalRecords, sheetCount }
    });

    res.status(201).json({ message: "File saved successfully", fileId: newFile._id });
  } catch (error) {
    console.error("Error saving file:", error);
    res.status(500).json({ error: "Failed to save file" });
  }
});

// 2. Fetch all saved files metadata
router.get("/files", async (req, res) => {
  try {
    const files = await StoredFile.aggregate([
      {
        $project: {
          filename: 1,
          uploadDate: 1,
          recordDateRange: 1,
          sheetMeta: 1,
          financialSummary: 1,
          uploadedBy: 1,
          uploadedByName: 1,
          isPendingDeletion: 1,
          deletionRequestId: 1,
          totalRecords: {
            $ifNull: [
              "$totalRecords",
              {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$rows", []] } }, 0] },
                  { $size: { $ifNull: ["$rows", []] } },
                  { $size: { $ifNull: [{ $arrayElemAt: ["$sheets.rows", 0] }, []] } }
                ]
              }
            ]
          },
          columnCount: { $ifNull: ["$columnCount", { $size: { $ifNull: ["$headers", []] } }] },
          sheetCount: {
            $ifNull: [
              "$sheetCount",
              { $cond: [{ $gt: [{ $size: { $ifNull: ["$sheets", []] } }, 0] }, { $size: { $ifNull: ["$sheets", []] } }, 1] }
            ]
          },
          sheets: {
            $map: {
              input: { $ifNull: ["$sheets", []] },
              as: "sheet",
              in: { name: "$$sheet.name", headers: "$$sheet.headers" }
            }
          },
          headers: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$headers", []] } }, 0] },
              "$headers",
              { $ifNull: [{ $arrayElemAt: ["$sheets.headers", 0] }, []] }
            ]
          }
        }
      },
      { $sort: { uploadDate: -1 } }
    ]);
    res.status(200).json(files);
  } catch (error) {
    console.error("Error fetching files:", error);
    res.status(500).json({ error: "Failed to fetch files" });
  }
});

// 3. Fetch a specific file by ID
router.get("/files/:id", async (req, res) => {
  try {
    const file = await getFileWithChunks(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });

    logUserActivity({
      req,
      action: "VIEW_FILE",
      resourceType: "StoredFile",
      resourceId: req.params.id,
      details: { filename: file.filename }
    });

    res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// 4. Delete a file (Admin = direct delete, User = guarded deletion request)
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
          reviewedAt: new Date()
        });
      }

      logUserActivity({
        req,
        action: "DELETE_FILE",
        resourceType: "StoredFile",
        resourceId: req.params.id,
        details: { filename: file.filename }
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
      reason: reason.trim()
    });
    await delReq.save();

    file.isPendingDeletion = true;
    file.deletionRequestId = delReq._id;
    await file.save();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@usindh.edu.pk";
    sendAdminDeletionAlert(adminEmail, delReq).catch((err) =>
      console.warn("Deletion alert email error:", err.message)
    );

    logUserActivity({
      req,
      action: "REQUEST_DELETE",
      resourceType: "StoredFile",
      resourceId: file._id.toString(),
      details: { filename: file.filename, reason: delReq.reason }
    });

    return res.status(202).json({
      message: "Deletion request submitted. Awaiting administrator approval.",
      isPendingDeletion: true,
      requestId: delReq._id
    });
  } catch (error) {
    console.error("Error in delete file:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 4.1 Cancel a pending deletion request
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
      deletionRequestId: null
    });

    logUserActivity({
      req,
      action: "CANCEL_DELETE_REQUEST",
      resourceType: "StoredFile",
      resourceId: delReq.targetId.toString(),
      details: { filename: delReq.targetName }
    });

    return res.status(200).json({ message: "Deletion request cancelled" });
  } catch (error) {
    console.error("Error cancelling deletion request:", error);
    res.status(500).json({ error: "Cancel request failed" });
  }
});

// 4.2 Rename a file
router.patch("/files/:id/rename", async (req, res) => {
  try {
    const { newFilename } = req.body;
    if (!newFilename || !newFilename.trim()) {
      return res.status(400).json({ error: "New filename required" });
    }

    const trimmedName = newFilename.trim();
    const existingFile = await StoredFile.findOne({ filename: trimmedName });
    if (existingFile) return res.status(400).json({ error: "Filename already taken" });

    const file = await StoredFile.findByIdAndUpdate(req.params.id, { filename: trimmedName }, { new: true });
    if (!file) return res.status(404).json({ error: "File not found" });

    logUserActivity({
      req,
      action: "RENAME_FILE",
      resourceType: "StoredFile",
      resourceId: req.params.id,
      details: { oldFilename: file.filename, newFilename: trimmedName }
    });

    res.status(200).json({ message: "File renamed", file });
  } catch (error) {
    console.error("Error renaming file:", error);
    res.status(500).json({ error: "Rename failed" });
  }
});

// 4.3 Recompute meta for all files
router.post("/files/recompute-meta", async (req, res) => {
  try {
    const { all = false } = req.body;
    const result = await recomputeAllFilesMeta(all);
    res.status(200).json({
      message: `Recomputed. Updated: ${result.updated}, Failed: ${result.failed}`
    });
  } catch (error) {
    console.error("Error in recompute-meta:", error);
    res.status(500).json({ error: "Recompute failed" });
  }
});

module.exports = router;
