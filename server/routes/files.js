const express = require("express");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const { optionalAuth } = require("../utils/authMiddleware");
const { logUserActivity } = require("../utils/logger");
const {
  detectAndCastSheet,
  extractDateRange,
  extractMetadata,
  getFileWithChunks,
  recomputeAllFilesMeta,
} = require("../utils/metaHelpers");

const router = express.Router();
router.use(optionalAuth);

// 1. Save uploaded file data
router.post("/files", async (req, res) => {
  try {
    const { filename, headers, rows, sheets, overwrite = false, visibility = "team" } = req.body;
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
    let finalSheets = sheets && sheets.length > 0 ? sheets : [];

    if (finalSheets.length > 0) {
      if (primaryHeaders.length === 0) primaryHeaders = finalSheets[0].headers || [];
      if (primaryRows.length === 0) primaryRows = finalSheets[0].rows || [];
    } else if (primaryRows.length > 0) {
      finalSheets = [
        {
          name: "Transactions",
          headers: primaryHeaders,
          rows: primaryRows,
        },
      ];
    }

    const castedSheets = finalSheets.map((s) => detectAndCastSheet(s));
    const { start: minDate, end: maxDate } = extractDateRange(castedSheets);
    const { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary } =
      extractMetadata(castedSheets);

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
      visibility: visibility === "private" ? "private" : "team",
      uploadedBy: req.user ? req.user._id : null,
      uploadedByName: req.user ? req.user.name : "System",
      rows: [],
      sheets: castedSheets.map((s) => ({
        name: s.name,
        headers: s.headers,
        rows: [],
      })),
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
          rows: sRows.slice(i, i + CHUNK_SIZE),
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
      resourceId: newFile._id.toString(),
      details: { filename: trimmedName, totalRecords, sheetCount, visibility: newFile.visibility },
    });

    res.status(200).json({
      message: "File and chunks saved successfully",
      id: newFile._id,
      file: newFile,
    });
  } catch (error) {
    console.error("Error saving file:", error);
    res.status(500).json({ error: "Failed to save file" });
  }
});

// 2. Fetch all saved files metadata (Respecting role and privacy visibility)
router.get("/files", async (req, res) => {
  try {
    const pipeline = [];

    // Filter by visibility for regular authenticated users
    if (req.user && req.user.role !== "admin") {
      pipeline.push({
        $match: {
          $or: [
            { visibility: "team" },
            { visibility: { $exists: false } },
            { visibility: null },
            { uploadedBy: req.user._id },
          ],
        },
      });
    }

    pipeline.push(
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
          visibility: { $ifNull: ["$visibility", "team"] },
          totalRecords: {
            $ifNull: [
              "$totalRecords",
              {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$rows", []] } }, 0] },
                  { $size: { $ifNull: ["$rows", []] } },
                  { $size: { $ifNull: [{ $arrayElemAt: ["$sheets.rows", 0] }, []] } },
                ],
              },
            ],
          },
          columnCount: { $ifNull: ["$columnCount", { $size: { $ifNull: ["$headers", []] } }] },
          sheetCount: {
            $ifNull: [
              "$sheetCount",
              {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ["$sheets", []] } }, 0] },
                  { $size: { $ifNull: ["$sheets", []] } },
                  1,
                ],
              },
            ],
          },
          sheets: {
            $map: {
              input: { $ifNull: ["$sheets", []] },
              as: "sheet",
              in: { name: "$$sheet.name", headers: "$$sheet.headers" },
            },
          },
          headers: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$headers", []] } }, 0] },
              "$headers",
              { $ifNull: [{ $arrayElemAt: ["$sheets.headers", 0] }, []] },
            ],
          },
        },
      },
      { $sort: { uploadDate: -1 } }
    );

    const files = await StoredFile.aggregate(pipeline);
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
      details: { filename: file.filename },
    });

    res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// 4. Update file visibility (Private vs Team)
router.patch("/files/:id/visibility", async (req, res) => {
  try {
    const { visibility } = req.body;
    if (!["team", "private"].includes(visibility)) {
      return res.status(400).json({ error: "Invalid visibility value" });
    }

    const file = await StoredFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });

    if (
      req.user &&
      req.user.role !== "admin" &&
      file.uploadedBy &&
      file.uploadedBy.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ error: "You can only change visibility for your own files" });
    }

    file.visibility = visibility;
    await file.save();

    return res.json({ message: "File visibility updated", visibility: file.visibility });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update visibility" });
  }
});

// 5. Rename a file
router.patch("/files/:id/rename", async (req, res) => {
  try {
    const { newFilename } = req.body;
    if (!newFilename || !newFilename.trim()) {
      return res.status(400).json({ error: "New filename required" });
    }

    const trimmedName = newFilename.trim();
    const existingFile = await StoredFile.findOne({ filename: trimmedName });
    if (existingFile) return res.status(400).json({ error: "Filename already taken" });

    const file = await StoredFile.findByIdAndUpdate(
      req.params.id,
      { filename: trimmedName },
      { new: true }
    );
    if (!file) return res.status(404).json({ error: "File not found" });

    logUserActivity({
      req,
      action: "RENAME_FILE",
      resourceType: "StoredFile",
      resourceId: req.params.id,
      details: { oldFilename: file.filename, newFilename: trimmedName },
    });

    res.status(200).json({ message: "File renamed", file });
  } catch (error) {
    console.error("Error renaming file:", error);
    res.status(500).json({ error: "Rename failed" });
  }
});

// 6. Recompute meta for all files
router.post("/files/recompute-meta", async (req, res) => {
  try {
    const { all = false } = req.body;
    const result = await recomputeAllFilesMeta(all);
    res.status(200).json({
      message: `Recomputed. Updated: ${result.updated}, Failed: ${result.failed}`,
    });
  } catch (error) {
    console.error("Error in recompute-meta:", error);
    res.status(500).json({ error: "Recompute failed" });
  }
});

module.exports = router;
