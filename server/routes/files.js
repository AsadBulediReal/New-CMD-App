const express = require("express");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const {
  detectAndCastSheet,
  extractDateRange,
  extractMetadata,
  getFileWithChunks
} = require("../utils/metaHelpers");

const router = express.Router();

// 1. Save uploaded file data with a custom filename
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
      rows: [],
      sheets: castedSheets.map(s => ({
        name: s.name,
        headers: s.headers,
        rows: []
      }))
    });

    await newFile.save();

    const CHUNK_SIZE = 5000;
    const chunkPromises = [];
    let chunkIndex = 0;

    for (const sheet of castedSheets) {
      const sRows = sheet.rows || [];
      for (let i = 0; i < sRows.length; i += CHUNK_SIZE) {
        chunkPromises.push(new FileChunk({
          fileId: newFile._id,
          sheetName: sheet.name,
          chunkIndex: chunkIndex++,
          rows: sRows.slice(i, i + CHUNK_SIZE)
        }).save());
      }
    }

    await Promise.all(chunkPromises);
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
          totalRecords: {
            $cond: {
              if: { $isNumber: "$totalRecords" },
              then: "$totalRecords",
              else: {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ["$rows", []] } }, 0] },
                  then: { $size: { $ifNull: ["$rows", []] } },
                  else: {
                    $let: {
                      vars: { firstSheet: { $arrayElemAt: ["$sheets", 0] } },
                      in: { $size: { $ifNull: ["$$firstSheet.rows", []] } }
                    }
                  }
                }
              }
            }
          },
          columnCount: {
            $cond: {
              if: { $isNumber: "$columnCount" },
              then: "$columnCount",
              else: { $size: { $ifNull: ["$headers", []] } }
            }
          },
          sheetCount: {
            $cond: {
              if: { $isNumber: "$sheetCount" },
              then: "$sheetCount",
              else: {
                $cond: {
                  if: { $gt: [{ $size: { $ifNull: ["$sheets", []] } }, 0] },
                  then: { $size: { $ifNull: ["$sheets", []] } },
                  else: 1
                }
              }
            }
          },
          sheets: {
            $map: {
              input: { $ifNull: ["$sheets", []] },
              as: "sheet",
              in: {
                name: "$$sheet.name",
                headers: "$$sheet.headers"
              }
            }
          },
          headers: {
            $cond: {
              if: { $gt: [{ $size: { $ifNull: ["$headers", []] } }, 0] },
              then: "$headers",
              else: {
                $let: {
                  vars: { firstSheet: { $arrayElemAt: ["$sheets", 0] } },
                  in: { $ifNull: ["$$firstSheet.headers", []] }
                }
              }
            }
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
    res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: "Failed to fetch file" });
  }
});

// 4. Delete a specific file by ID
router.delete("/files/:id", async (req, res) => {
  try {
    const file = await StoredFile.findByIdAndDelete(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });
    await FileChunk.deleteMany({ fileId: req.params.id });
    res.status(200).json({ message: "File deleted" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 4.1 Rename a specific file by ID
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
    res.status(200).json({ message: "File renamed", file });
  } catch (error) {
    console.error("Error renaming file:", error);
    res.status(500).json({ error: "Rename failed" });
  }
});

// 4.5 Bulk Delete files
router.post("/files/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No files selected" });
    }
    await StoredFile.deleteMany({ _id: { $in: ids } });
    await FileChunk.deleteMany({ fileId: { $in: ids } });
    res.status(200).json({ message: "Files deleted" });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    res.status(500).json({ error: "Delete failed" });
  }
});

// 4.6 Recompute meta for all files
router.post("/files/recompute-meta", async (req, res) => {
  try {
    const { all = false } = req.body;
    const query = all ? {} : {
      $or: [
        { "recordDateRange.start": null },
        { "recordDateRange.start": { $exists: false } },
        { "totalRecords": null },
        { "totalRecords": { $exists: false } },
        { "totalRecords": 0 }
      ]
    };
    const fileMetas = await StoredFile.find(query, "_id filename").lean();
    let updated = 0;
    let failed = 0;

    for (const meta of fileMetas) {
      try {
        const file = await getFileWithChunks(meta._id.toString());
        if (!file) continue;
        const sheets = file.sheets && file.sheets.length > 0 ? file.sheets : (
          file.rows && file.rows.length > 0
            ? [{ name: "Sheet1", headers: file.headers || [], rows: file.rows }]
            : []
        );
        if (sheets.length === 0) continue;
        const castedSheets = sheets.map(sheet => detectAndCastSheet(sheet));
        const { start, end } = extractDateRange(castedSheets);
        const { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary } = extractMetadata(castedSheets);

        await StoredFile.updateOne(
          { _id: meta._id },
          {
            $set: {
              recordDateRange: { start, end },
              totalRecords,
              columnCount,
              sheetCount,
              sheetMeta,
              financialSummary
            }
          }
        );

        await FileChunk.deleteMany({ fileId: meta._id });

        const CHUNK_SIZE = 5000;
        const chunkPromises = [];
        let chunkIndex = 0;

        for (const sheet of castedSheets) {
          const sRows = sheet.rows || [];
          for (let i = 0; i < sRows.length; i += CHUNK_SIZE) {
            chunkPromises.push(new FileChunk({
              fileId: meta._id,
              sheetName: sheet.name,
              chunkIndex: chunkIndex++,
              rows: sRows.slice(i, i + CHUNK_SIZE)
            }).save());
          }
        }

        await Promise.all(chunkPromises);
        updated++;
      } catch (e) {
        console.error(`Failed to recompute meta for ${meta.filename}:`, e.message);
        failed++;
      }
    }

    res.status(200).json({
      message: `Recomputed. Updated: ${updated}, Failed: ${failed}`
    });
  } catch (error) {
    console.error("Error in recompute-meta:", error);
    res.status(500).json({ error: "Recompute failed" });
  }
});

module.exports = router;
