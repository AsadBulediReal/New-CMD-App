const express = require("express");
const mongoose = require("mongoose");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");
const {
  detectAndCastSheet,
  extractDateRange,
  extractMetadata,
  getFileWithChunks
} = require("../utils/metaHelpers");

const router = express.Router();

// 1.1 Init chunked file save (bypasses Vercel payload limits)
router.post("/files/init", async (req, res) => {
  try {
    const { filename, sheets, overwrite = false } = req.body;
    if (!filename || !filename.trim()) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const trimmedName = filename.trim();
    const existingFile = await StoredFile.findOne({ filename: trimmedName });

    if (existingFile) {
      const isIncomplete = !existingFile.totalRecords || existingFile.totalRecords === 0;
      if (overwrite || isIncomplete) {
        await FileChunk.deleteMany({ fileId: existingFile._id });
        const initialSheets = (sheets || []).map(s => ({
          name: s.name,
          headers: s.headers || [],
          rows: []
        }));

        await StoredFile.updateOne(
          { _id: existingFile._id },
          {
            $set: {
              headers: initialSheets[0]?.headers || [],
              hasChunks: true,
              sheets: initialSheets,
              rows: [],
              totalRecords: 0,
              uploadDate: new Date()
            }
          }
        );
        return res.status(200).json({ fileId: existingFile._id });
      }

      return res.status(400).json({ error: "File already exists" });
    }

    const initialSheets = (sheets || []).map(s => ({
      name: s.name,
      headers: s.headers || [],
      rows: []
    }));

    const newFile = new StoredFile({
      filename: trimmedName,
      headers: initialSheets[0]?.headers || [],
      hasChunks: true,
      sheets: initialSheets,
      rows: []
    });

    await newFile.save();
    res.status(201).json({ fileId: newFile._id });
  } catch (error) {
    console.error("Error initializing upload:", error);
    res.status(500).json({ error: "Upload initialization failed" });
  }
});

// 1.2 Save a chunk of rows for a file
router.post("/files/:id/chunk", async (req, res) => {
  try {
    const { sheetName, chunkIndex, rows } = req.body;
    const fileId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(fileId)) {
      return res.status(400).json({ error: "Invalid file ID" });
    }

    await new FileChunk({
      fileId,
      sheetName,
      chunkIndex,
      rows: rows || []
    }).save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error saving chunk:", error);
    res.status(500).json({ error: "Chunk save failed" });
  }
});

// 1.3 Finalize chunked file save
router.post("/files/:id/finalize", async (req, res) => {
  try {
    const fileId = req.params.id;
    const file = await getFileWithChunks(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    const sheets = file.sheets && file.sheets.length > 0 ? file.sheets : (
      file.rows && file.rows.length > 0
        ? [{ name: "Sheet1", headers: file.headers || [], rows: file.rows }]
        : []
    );

    const castedSheets = sheets.map(s => detectAndCastSheet(s));
    const { start: minDate, end: maxDate } = extractDateRange(castedSheets);
    const { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary } = extractMetadata(castedSheets);

    await StoredFile.updateOne(
      { _id: fileId },
      {
        $set: {
          recordDateRange: { start: minDate, end: maxDate },
          totalRecords,
          columnCount,
          sheetCount,
          sheetMeta,
          financialSummary,
          sheets: castedSheets.map(s => ({
            name: s.name,
            headers: s.headers,
            rows: []
          }))
        }
      }
    );

    await FileChunk.deleteMany({ fileId });

    const CHUNK_SIZE = 5000;
    const chunkPromises = [];
    let chunkIndex = 0;

    for (const sheet of castedSheets) {
      const sRows = sheet.rows || [];
      for (let i = 0; i < sRows.length; i += CHUNK_SIZE) {
        chunkPromises.push(new FileChunk({
          fileId,
          sheetName: sheet.name,
          chunkIndex: chunkIndex++,
          rows: sRows.slice(i, i + CHUNK_SIZE)
        }).save());
      }
    }

    await Promise.all(chunkPromises);
    res.status(200).json({ message: "File saved successfully", fileId });
  } catch (error) {
    console.error("Error finalizing file upload:", error);
    res.status(500).json({ error: "Finalize failed" });
  }
});

module.exports = router;
