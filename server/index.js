     require("dotenv").config();
const express = require("express");
const nodemailer = require("nodemailer");
const mongoose = require("mongoose");
const cors = require("cors");
const StoredFile = require("./models/StoredFile");
const FileChunk = require("./models/FileChunk");

const app = express();

app.use(cors());
app.use(express.json({ limit: '500mb' })); // Increase limit for massive payloads since DB chunks resolve 16MB BSON barrier

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cmd_app")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// API Routes

const { parse_txt_content_to_json } = require("./utils/txtToJsonParser");
const { analyze_transactions } = require("./utils/bsDataAnalytics");
const { reconcile_bs_vs_mis } = require("./utils/reconcileHelper");
const { audit_transactions, auditCategories } = require("./utils/auditHelper");

// ... existing code ...

const decompressRow = (row, headers) => {
  if (!Array.isArray(row)) return row;
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });
  return obj;
};

// Shared: parse a cell value that might be a date string, return Date or null
const MONTH_MAP = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function parseDateFromCell(val) {
  if (!val) return null;
  let dVal = String(val).trim();

  // "02Jan25" or "02-Jan-25" or "02 Jan 25"
  const compact = dVal.match(/^(\d{1,2})[-\s]?([A-Za-z]{3})[-\s]?(\d{2,4})$/);
  if (compact) {
    const day = parseInt(compact[1], 10);
    const mon = MONTH_MAP[compact[2].toLowerCase()];
    let yr = parseInt(compact[3], 10);
    if (yr < 100) yr += 2000;
    if (mon !== undefined) return new Date(yr, mon, day);
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY  — common in bank statements
  // Must be tried BEFORE new Date() because JS misparses "24/04/2026" as Invalid Date
  const slashDate = dVal.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashDate) {
    const p1 = parseInt(slashDate[1], 10);
    const p2 = parseInt(slashDate[2], 10);
    let yr  = parseInt(slashDate[3], 10);
    if (yr < 100) yr += 2000;
    if (yr >= 1900 && yr <= 2100) {
      // p1 > 12 → unambiguously DD/MM/YYYY (e.g. "24/04/2026")
      if (p1 > 12 && p2 >= 1 && p2 <= 12) return new Date(yr, p2 - 1, p1);
      // p2 > 12 → unambiguously MM/DD/YYYY (e.g. "04/24/2026")
      if (p2 > 12 && p1 >= 1 && p1 <= 12) return new Date(yr, p1 - 1, p2);
      // Ambiguous — default to DD/MM/YYYY (standard in financial/international docs)
      if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) return new Date(yr, p2 - 1, p1);
    }
  }

  // ISO or other locale date strings (e.g. "2026-04-24", "April 24, 2026")
  const parsed = new Date(dVal);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

// Detect column types based on values in the column
function detectColumnTypes(headers, rows) {
  if (!rows || rows.length === 0) {
    return headers.map(() => "string");
  }

  const isArrayRows = Array.isArray(rows[0]);

  return headers.map((header, colIdx) => {
    let hasVal = false;
    let isNumber = true;
    let isBoolean = true;
    let isDate = true;

    for (const row of rows) {
      if (!row) continue;
      const val = isArrayRows ? row[colIdx] : row[header];
      if (val === undefined || val === null || String(val).trim() === "") {
        continue;
      }
      
      hasVal = true;
      const sVal = String(val).trim();

      // Check Boolean
      if (!/^(true|false|yes|no|y|n)$/i.test(sVal)) {
        isBoolean = false;
      }

      // Check Number
      const cleanedNum = sVal.replace(/,/g, "").replace(/^\$/, "");
      if (cleanedNum === "" || isNaN(Number(cleanedNum))) {
        isNumber = false;
      }

      // Check Date
      if (!parseDateFromCell(sVal)) {
        isDate = false;
      }
    }

    if (!hasVal) {
      return "string";
    }

    if (isBoolean) return "boolean";
    if (isNumber) return "number";
    if (isDate) return "date";
    return "string";
  });
}

// Cast a single value based on the detected type
function castValue(val, type) {
  if (val === undefined || val === null || String(val).trim() === "") {
    return null;
  }
  const sVal = String(val).trim();

  if (type === "boolean") {
    return /^(true|yes|y)$/i.test(sVal);
  }
  if (type === "number") {
    const cleanedNum = sVal.replace(/,/g, "").replace(/^\$/, "");
    return Number(cleanedNum);
  }
  if (type === "date") {
    const d = parseDateFromCell(sVal);
    if (d) {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }
    return val;
  }
  return val;
}

// Cast all rows in a sheet based on detected column types
function detectAndCastSheet(sheet) {
  const headers = sheet.headers || [];
  const rows = sheet.rows || [];
  if (headers.length === 0 || rows.length === 0) return sheet;

  const isArrayRows = Array.isArray(rows[0]);
  const columnTypes = detectColumnTypes(headers, rows);

  const castedRows = rows.map(row => {
    if (!row) return row;
    if (isArrayRows) {
      const newRow = [...row];
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const type = columnTypes[colIdx];
        newRow[colIdx] = castValue(newRow[colIdx], type);
      }
      return newRow;
    } else {
      const newRow = { ...row };
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx];
        const type = columnTypes[colIdx];
        newRow[header] = castValue(newRow[header], type);
      }
      return newRow;
    }
  });

  return {
    ...sheet,
    rows: castedRows,
    columnTypes
  };
}

// Extract the min/max date from an array of sheets (rows may be compressed or objects)
function extractDateRange(sheets) {
  let minDate = null;
  let maxDate = null;
  for (const sheet of sheets) {
    const hdrs = sheet.headers || [];
    for (const r of sheet.rows || []) {
      const rowObj = decompressRow(r, hdrs);
      for (const [key, val] of Object.entries(rowObj)) {
        if (!key || !val) continue;
        if (!String(key).match(/date/i)) continue;
        const d = parseDateFromCell(val);
        if (d) {
          if (!minDate || d < minDate) minDate = d;
          if (!maxDate || d > maxDate) maxDate = d;
        }
      }
    }
  }
  return { start: minDate, end: maxDate };
}

// Extract rich metadata from sheets
function extractMetadata(sheets) {
  let totalRecords = 0;
  let columnCount = 0;
  let sheetCount = sheets.length;
  const sheetMeta = [];

  let totalDebit = 0, totalCredit = 0, debitCount = 0, creditCount = 0;
  let hasFinancialData = false;

  for (let i = 0; i < sheets.length; i++) {
    const sheet = sheets[i];
    const hdrs = sheet.headers || [];
    const rows = sheet.rows || [];
    const recCount = rows.length;
    totalRecords += recCount;
    if (i === 0) columnCount = hdrs.length;

    sheetMeta.push({ 
      name: sheet.name || `Sheet ${i+1}`, 
      recordCount: recCount, 
      columnCount: hdrs.length,
      columnTypes: sheet.columnTypes || []
    });

    // Detect debit / credit columns (case-insensitive)
    const debitCol  = hdrs.find(h => /^debit$/i.test(h.trim()));
    const creditCol = hdrs.find(h => /^credit$/i.test(h.trim()));

    if (debitCol || creditCol) {
      hasFinancialData = true;
      for (const r of rows) {
        const row = decompressRow(r, hdrs);
        if (debitCol) {
          const v = parseFloat(String(row[debitCol] || "0").replace(/,/g, "")) || 0;
          totalDebit += v;
          if (v > 0) debitCount++;
        }
        if (creditCol) {
          const v = parseFloat(String(row[creditCol] || "0").replace(/,/g, "")) || 0;
          totalCredit += v;
          if (v > 0) creditCount++;
        }
      }
    }
  }

  const financialSummary = hasFinancialData ? {
    totalDebit:  Math.round(totalDebit  * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    netFlow:     Math.round((totalCredit - totalDebit) * 100) / 100,
    debitCount,
    creditCount,
    hasFinancialData: true,
  } : { hasFinancialData: false };

  return { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary };
}

// Filter rows by date range
function applyDateFilter(rows, headers, dateFilter) {
  if (!dateFilter || !dateFilter.column || (!dateFilter.start && !dateFilter.end)) return rows;
  const colIdx = headers.indexOf(dateFilter.column);
  
  // If column doesn't exist, just return all rows
  if (colIdx === -1 && !headers.includes(dateFilter.column)) return rows;
  
  const start = dateFilter.start ? new Date(dateFilter.start) : null;
  const end = dateFilter.end ? new Date(dateFilter.end) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  return rows.filter(r => {
    const row = decompressRow(r, headers);
    const val = row[dateFilter.column];
    const d = parseDateFromCell(val);
    if (!d) return false; // Exclude rows with unparseable dates
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}


// ── Chunking helper
async function getFileWithChunks(id) {
  // Validate ObjectId before hitting the DB to avoid CastError
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const file = await StoredFile.findById(id).lean();
  if (!file) return null;
  
  if (file.hasChunks) {
    const chunks = await FileChunk.find({ fileId: id }).sort({ chunkIndex: 1 }).lean();
    
    // Build a mutable map of sheets so we can push rows into them
    if (!file.sheets) file.sheets = [];
    if (!file.rows) file.rows = [];

    // Convert the lean sheet array to a map for O(1) lookup
    const sheetMap = new Map();
    file.sheets.forEach(s => {
      if (!s.rows) s.rows = [];
      sheetMap.set(s.name, s);
    });

    for (const chunk of chunks) {
      if (chunk.sheetName) {
        let sheet = sheetMap.get(chunk.sheetName);
        if (!sheet) {
          sheet = { name: chunk.sheetName, headers: [], rows: [] };
          file.sheets.push(sheet);
          sheetMap.set(chunk.sheetName, sheet);
        }
        sheet.rows.push(...chunk.rows);
      } else {
        file.rows.push(...chunk.rows);
      }
    }
  }
  return file;
}

// 1. Save uploaded file data with a custom filename
app.post("/api/files", async (req, res) => {
  try {
    const { filename, headers, rows, sheets } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const existingFile = await StoredFile.findOne({ filename: filename.trim() });
    if (existingFile) {
      return res.status(400).json({ error: "File already saved" });
    }

    let primaryHeaders = headers || [];
    let primaryRows = rows || [];
    let finalSheets = (sheets && sheets.length > 0) ? sheets : [];
    
    // Normalize: Ensure sheets always has at least one entry for consistency
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

    // Detect column types and cast values
    const castedSheets = finalSheets.map(s => detectAndCastSheet(s));

    // Extract Date Range from records using shared helper
    const { start: minDate, end: maxDate } = extractDateRange(castedSheets);

    // Extract rich metadata
    const { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary } = extractMetadata(castedSheets);

    const newFile = new StoredFile({
      filename: filename.trim(),
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
      const rows = sheet.rows || [];
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        chunkPromises.push(new FileChunk({
          fileId: newFile._id,
          sheetName: sheet.name,
          chunkIndex: chunkIndex++,
          rows: rows.slice(i, i + CHUNK_SIZE)
        }).save());
      }
    }

    await Promise.all(chunkPromises);
    res.status(201).json({ message: "File saved successfully", fileId: newFile._id });
  } catch (error) {
    console.error("Error saving file:", error);
    res.status(500).json({ error: "Failed to save file data" });
  }
});

// 1.5 Parse TXT content string to JSON format
app.post("/api/parse-txt", (req, res) => {
  try {
    const { textContent } = req.body;
    if (!textContent) {
      return res.status(400).json({ error: "Text content is required" });
    }
    
    const parsedData = parse_txt_content_to_json(textContent);
    res.status(200).json(parsedData);
  } catch (error) {
    console.error("Error parsing txt file:", error);
    res.status(500).json({ error: "Failed to parse TXT file" });
  }
});

// 2. Fetch all saved files metadata (No row data to keep response small)
app.get("/api/files", async (req, res) => {
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
    res.status(500).json({ error: "Failed to fetch files list" });
  }
});

// 3. Fetch a specific file by ID (includes row data)
app.get("/api/files/:id", async (req, res) => {
  try {
    const file = await getFileWithChunks(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });
    
    res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: `Failed to fetch file details: ${error.message}` });
  }
});

// 4. Delete a specific file by ID
app.delete("/api/files/:id", async (req, res) => {
  try {
    const file = await StoredFile.findByIdAndDelete(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    await FileChunk.deleteMany({ fileId: req.params.id });
    res.status(200).json({ message: "File successfully deleted" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// 4.1 Rename a specific file by ID
app.patch("/api/files/:id/rename", async (req, res) => {
  try {
    const { newFilename } = req.body;
    if (!newFilename) return res.status(400).json({ error: "newFilename is required" });
    
    const trimmedName = newFilename.trim();
    const existingFile = await StoredFile.findOne({ filename: trimmedName });
    if (existingFile) {
      return res.status(400).json({ error: "File already saved" });
    }

    const file = await StoredFile.findByIdAndUpdate(req.params.id, { filename: trimmedName }, { new: true });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(200).json({ message: "File successfully renamed", file });
  } catch (error) {
    console.error("Error renaming file:", error);
    res.status(500).json({ error: "Failed to rename file" });
  }
});

// 4.5 Bulk Delete files
app.post("/api/files/bulk-delete", async (req, res) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "No IDs provided" });
    }
    await StoredFile.deleteMany({ _id: { $in: ids } });
    await FileChunk.deleteMany({ fileId: { $in: ids } });
    res.status(200).json({ message: "Files successfully deleted" });
  } catch (error) {
    console.error("Error in bulk delete:", error);
    res.status(500).json({ error: "Failed to delete files" });
  }
});

// 4.6 Recompute meta for all files (migration endpoint)
app.post("/api/files/recompute-meta", async (req, res) => {
  try {
    // Optionally target only files missing the start date, or all files
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
          { $set: { 
            recordDateRange: { start, end },
            totalRecords,
            columnCount,
            sheetCount,
            sheetMeta,
            financialSummary
          } }
        );

        // Delete existing FileChunks and re-write them with casted values
        await FileChunk.deleteMany({ fileId: meta._id });

        const CHUNK_SIZE = 5000;
        const chunkPromises = [];
        let chunkIndex = 0;

        for (const sheet of castedSheets) {
          const rows = sheet.rows || [];
          for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
            chunkPromises.push(new FileChunk({
              fileId: meta._id,
              sheetName: sheet.name,
              chunkIndex: chunkIndex++,
              rows: rows.slice(i, i + CHUNK_SIZE)
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
      message: `Recomputed metadata. Updated: ${updated}, Failed: ${failed}, Total scanned: ${fileMetas.length}`
    });
  } catch (error) {
    console.error("Error in recompute-meta:", error);
    res.status(500).json({ error: "Failed to recompute metadata" });
  }
});

// 5. Analyze a saved file (with optional field mapping)
app.post("/api/analyze-saved-file", async (req, res) => {
  try {
    const { fileId, fieldMap, sheetName, dateFilter } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const file = await getFileWithChunks(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Extract sheets
    const allSheets = file.sheets || [];
    
    // Select transaction sheet: either use explicitly requested sheetName, or find 'Transactions', 
    // or fallback to '1Bill Records'/'Auto Records' if specifically present.
    let transactionsSheet;
    if (sheetName) {
      transactionsSheet = allSheets.find(s => s.name === sheetName);
    } else {
      transactionsSheet = allSheets.find(s => s.name === "Transactions");
    }

    const summarySheet   = allSheets.find(s => s.name === "Summary Details");
    const headerSheet    = allSheets.find(s => s.name === "Header Details");

    if (!transactionsSheet) {
      // Fallback: legacy single-sheet files or first sheet if none matched
      if (allSheets.length > 0) {
          transactionsSheet = allSheets[0];
      } else if (file.rows && file.rows.length > 0) {
        transactionsSheet = { name: "Transactions", headers: file.headers || [], rows: file.rows };
      } else {
        return res.status(400).json({ error: "No transaction data found in this file." });
      }
    }

    // ── Apply field mapping (renames columns to expected names) ──────────────
    const applyFieldMap = (rows, map, headers) => {
      if (!rows) return [];
      return rows.map(r => {
        const row = decompressRow(r, headers);
        if (!map || Object.keys(map).length === 0) return row;
        const out = { ...row }; 
        for (const [requiredField, sourceField] of Object.entries(map)) {
          if (sourceField && sourceField !== requiredField) {
            out[requiredField] = row[sourceField]; 
          }
        }
        return out;
      });
    };

    // ── Apply Date Filter ────────────────────────────────────────────────────
    const filteredRows = applyDateFilter(transactionsSheet.rows, transactionsSheet.headers, dateFilter);

    const mappedRows = applyFieldMap(filteredRows, fieldMap, transactionsSheet.headers);

    // ── Opening / Closing Balance from Summary sheet ─────────────────────────
    let openingBalance = "";
    let closingBalance = "";
    if (summarySheet && summarySheet.rows) {
      const obRow = summarySheet.rows.find(r => r.Metric === "Opening Balance");
      if (obRow) openingBalance = obRow.Value;
      const cbRow = summarySheet.rows.find(r => r.Metric === "Closing Balance");
      if (cbRow) closingBalance = cbRow.Value;
    }

    // ── Run analytics ────────────────────────────────────────────────────────
    const {
      ValidTransactions,
      InvalidTransactions,
      BalanceOrder,
      BulkPayments,
      ChallanRepeatStats,
      Summary
    } = analyze_transactions(mappedRows, openingBalance, closingBalance);

    // ── Build output sheets ──────────────────────────────────────────────────
    // For transaction sheets: use original headers + add any mapped field names
    const txHeaders = transactionsSheet.headers || [];
    const resultingSheets = [];

    if (headerSheet) {
      resultingSheets.push({ name: "Header Details", headers: headerSheet.headers, rows: headerSheet.rows });
    }

    if (ValidTransactions.length > 0)   resultingSheets.push({ name: "Valid Transactions",   headers: txHeaders, rows: ValidTransactions });
    if (InvalidTransactions.length > 0) resultingSheets.push({ name: "Invalid Transactions", headers: txHeaders, rows: InvalidTransactions });
    if (BalanceOrder.length > 0)        resultingSheets.push({ name: "Balance Order",         headers: txHeaders, rows: BalanceOrder });
    if (BulkPayments.length > 0)        resultingSheets.push({ name: "Bulk Payments",         headers: txHeaders, rows: BulkPayments });

    if (ChallanRepeatStats.length > 0) {
      const statsHeaders = ["challan no.", "challan debited", "challan credited", "Remaing Credit Challan", "Debit Amount"];
      resultingSheets.push({ name: "Challan Repeat Stats", headers: statsHeaders, rows: ChallanRepeatStats });
    }

    // Flatten summary into Category / Metric / Value rows
    if (Summary && Object.keys(Summary).length > 0) {
      const summRows = [];
      summRows.push({ Category: "General", Metric: "Opening Balance", Value: Summary["Opening Balance"] });
      summRows.push({ Category: "General", Metric: "Closing Balance", Value: Summary["Closing Balance"] });

      for (const [section, items] of [["Debit Transactions", Summary["Debit Transactions"]], ["Credit Transactions", Summary["Credit Transactions"]]]) {
        if (items) {
          for (const [key, details] of Object.entries(items)) {
            summRows.push({ Category: section, Metric: `${key} Count`,  Value: details.Count  });
            summRows.push({ Category: section, Metric: `${key} Amount`, Value: details.Amount });
          }
        }
      }
      resultingSheets.push({ name: "Detailed Summary", headers: ["Category", "Metric", "Value"], rows: summRows });
    }

    res.status(200).json({ filename: `Analyzed-${file.filename}`, sheets: resultingSheets });
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({ error: "Failed to analyze file" });
  }
});

// 6. Reconcile BS vs MIS
app.post("/api/reconcile-bs-mis", async (req, res) => {
  try {
    const { bsFileId, misFileId, bsMapping = {}, misMapping = {}, misSheetName, bsSheetName, bsDateFilter, misDateFilter } = req.body;
    
    if (!bsFileId || !misFileId) {
      return res.status(400).json({ error: "Both bsFileId and misFileId are required" });
    }

    const [bsFile, misFile] = await Promise.all([
      getFileWithChunks(bsFileId),
      getFileWithChunks(misFileId)
    ]);

    if (!bsFile || !misFile) {
      return res.status(404).json({ error: "One or both files not found" });
    }

    // Extract transaction data from BS (usually the first sheet or legacy rows)
    let bsTransactions = [];
    let bsHeaders = bsFile.headers || [];
    if (bsFile.sheets && bsFile.sheets.length > 0) {
      let ts;
      if (bsSheetName) {
        ts = bsFile.sheets.find(s => s.name === bsSheetName);
      }
      if (!ts) {
        ts = bsFile.sheets.find(s => s.name === "Transactions") || bsFile.sheets[0];
      }
      bsHeaders = ts.headers || bsFile.headers || [];
      bsTransactions = (ts.rows || []).map(r => decompressRow(r, bsHeaders));
    } else {
      bsTransactions = (bsFile.rows || []).map(r => decompressRow(r, bsHeaders));
    }

    // Extract transaction data from MIS (usually the first sheet or legacy rows)
    let misTransactions = [];
    let misHeaders = misFile.headers || [];
    if (misFile.sheets && misFile.sheets.length > 0) {
      let ts;
      if (misSheetName) {
        ts = misFile.sheets.find(s => s.name === misSheetName);
      }
      if (!ts) {
        ts = misFile.sheets.find(s => s.name === "Transactions") || misFile.sheets[0];
      }
      misHeaders = ts.headers || misFile.headers || [];
      misTransactions = (ts.rows || []).map(r => decompressRow(r, misHeaders));
    } else {
      misTransactions = (misFile.rows || []).map(r => decompressRow(r, misHeaders));
    }

    // Apply Date Filters
    if (bsDateFilter) {
      bsTransactions = applyDateFilter(bsTransactions.map(r => Object.values(r)), bsHeaders, bsDateFilter).map(r => decompressRow(r, bsHeaders));
    }
    if (misDateFilter) {
      misTransactions = applyDateFilter(misTransactions.map(r => Object.values(r)), misHeaders, misDateFilter).map(r => decompressRow(r, misHeaders));
    }

    // Run reconciliation
    const {
      verified_mis,
      not_verified_bs,
      not_verified_mis,
      summary
    } = reconcile_bs_vs_mis(bsTransactions, misTransactions, bsMapping, misMapping);

    // Build output sheets
    const resultingSheets = [
      { name: "Verified MIS", headers: misHeaders, rows: verified_mis },
      { name: "Not Verified BS", headers: bsHeaders, rows: not_verified_bs },
      { name: "Not Verified MIS", headers: misHeaders, rows: not_verified_mis },
    ];

    // Summary sheet
    const summRows = [
      { Metric: "Verified MIS Records", Value: summary.verified_mis_count },
      { Metric: "Not Verified BS Records", Value: summary.not_verified_bs_count },
      { Metric: "Not Verified MIS Records", Value: summary.not_verified_mis_count },
      { Metric: "Total Verified Amount", Value: summary.verified_total_amount.toFixed(2) },
      { Metric: "Total Unverified (BS) Amount", Value: summary.unverified_bs_total.toFixed(2) },
      { Metric: "Total Unverified (MIS) Amount", Value: summary.unverified_mis_total.toFixed(2) },
    ];
    resultingSheets.push({ name: "Summary", headers: ["Metric", "Value"], rows: summRows });

    res.status(200).json({ 
      filename: `Reconciliation-${bsFile.filename}-vs-${misFile.filename}`, 
      sheets: resultingSheets 
    });
  } catch (error) {
    console.error("Error in reconciliation:", error);
    res.status(500).json({ error: "Failed to perform reconciliation" });
  }
});
// 7. Audit specific categories using TYPE_CODE
app.post("/api/audit-saved-file", async (req, res) => {
  try {
    const { fileId, sheetName, fieldMap, categories, validationMode, dateFilter } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const file = await getFileWithChunks(fileId);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Extract sheet
    const allSheets = file.sheets || [];
    let targetSheet;
    if (sheetName) {
      targetSheet = allSheets.find(s => s.name === sheetName);
    } else {
      targetSheet = allSheets.find(s => s.name === "Transactions") || allSheets[0];
    }

    if (!targetSheet && (!file.rows || file.rows.length === 0)) {
       return res.status(400).json({ error: "No data found to audit." });
    }

    const rowsData = targetSheet ? targetSheet.rows : file.rows;
    const headersData = targetSheet ? targetSheet.headers : file.headers;

    // Apply field map
    const applyFieldMap = (rows, map, headers) => {
      if (!rows) return [];
      return rows.map(r => {
        const row = decompressRow(r, headers);
        if (!map || Object.keys(map).length === 0) return row;
        for (const [requiredField, sourceField] of Object.entries(map)) {
          if (sourceField && sourceField !== requiredField) {
            row[requiredField] = row[sourceField]; 
          }
        }
        return row;
      });
    };

    // ── Apply Date Filter ────────────────────────────────────────────────────
    const filteredRows = applyDateFilter(rowsData, headersData, dateFilter);

    const mappedRows = applyFieldMap(filteredRows, fieldMap, headersData);

    // Free the raw massive payload from DB
    if (file) {
       file.rows = null;
       file.sheets = null;
    }

    const {
      categoryData,
      nullData,
      summaryRows
    } = audit_transactions(mappedRows, categories || [], validationMode || "strict");

    const resultingSheets = [];
    
    // Add Summary sheet first
    if (summaryRows.length > 0) {
      resultingSheets.push({
        name: "Summary",
        headers: ["Category", "Records Count", "Total Amount"],
        rows: summaryRows
      });
    }

    // Filter and add category sheets that have data
    for (const [catName, catRows] of Object.entries(categoryData)) {
      if (catRows && catRows.length > 0) {
        // Collect all unique keys for headers, appending to standard ones
        const keys = new Set();
        catRows.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
        const catHeaders = Array.from(keys);
        
        resultingSheets.push({
          name: catName,
          headers: catHeaders.length > 0 ? catHeaders : headersData,
          rows: catRows
        });
      }
    }

    // Add nullData sheet if unmapped/invalid TYPE_CODE records exist
    if (nullData.length > 0) {
       const keys = new Set();
       nullData.forEach(r => Object.keys(r).forEach(k => keys.add(k)));
       const nullHeaders = Array.from(keys);

       resultingSheets.push({
         name: "nullData",
         headers: nullHeaders.length > 0 ? nullHeaders : headersData,
         rows: nullData
       });
    }

    res.status(200).json({
      filename: `Audit-${file.filename}`,
      sheets: resultingSheets
    });

  } catch (error) {
    console.error("Error in audit:", error);
    res.status(500).json({ error: "Failed to perform audit" });
  }
});

// 8. Merge multiple JSON Reports (Files) into one
app.post("/api/merge-files", async (req, res) => {
  try {
    const { mappings } = req.body;
    // mappings format:
    // [
    //   {
    //     outputSheetName: "Merged Transactions",
    //     sources: [ { fileId: "id1", sheetName: "Sheet1" }, { fileId: "id2", sheetName: "Trans" } ]
    //   }
    // ]

    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: "Mappings are required" });
    }

    // Collect all unique fileIds requested
    const fileIds = new Set();
    mappings.forEach(m => {
      m.sources.forEach(s => {
        if (s.fileId) fileIds.add(s.fileId);
      });
    });

    // Fetch all files
    const filesMap = new Map();
    for (const id of Array.from(fileIds)) {
      const file = await getFileWithChunks(id);
      if (file) filesMap.set(id, file);
    }

    const resultingSheets = [];

    for (const mapping of mappings) {
      const targetName = mapping.outputSheetName || "Merged Sheet";
      let mergedRows = [];
      const mergedHeadersSet = new Set();

      for (const source of mapping.sources) {
        if (!source.fileId) continue;
        const file = filesMap.get(source.fileId);
        if (!file) continue;

        let targetSheet;
        const allSheets = file.sheets || [];
        if (source.sheetName) {
          targetSheet = allSheets.find(s => s.name === source.sheetName);
        } else {
          targetSheet = allSheets[0]; // fallback
        }

        const headers = targetSheet ? targetSheet.headers : file.headers;
        const rows = targetSheet ? targetSheet.rows : file.rows;

        if (headers) {
          headers.forEach(h => mergedHeadersSet.add(h));
        }

        if (rows && rows.length > 0) {
          rows.forEach(r => {
            const decompressed = decompressRow(r, headers);
            // Optionally, we could tag the row with source filename: decompressed["_SourceFile"] = file.filename;
            mergedRows.push(decompressed);
          });
        }
      }

      resultingSheets.push({
        name: targetName,
        headers: Array.from(mergedHeadersSet),
        rows: mergedRows
      });
    }

    res.status(200).json({
      filename: `Merged-Report-${new Date().getTime()}`,
      sheets: resultingSheets
    });
  } catch (error) {
    console.error("Error merging files:", error);
    res.status(500).json({ error: "Failed to merge files" });
  }
});


// 9. Report Bug / Feedback
app.post("/api/report-bug", async (req, res) => {
  try {
    const { email, description, photo, metadata } = req.body;

    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }

    // Configure Nodemailer
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_PORT == 465, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const attachments = [];
    if (photo && photo.startsWith("data:image")) {
      const base64Data = photo.split(",")[1];
      const extension = photo.split(";")[0].split("/")[1];
      attachments.push({
        filename: `screenshot.${extension}`,
        content: base64Data,
        encoding: "base64",
      });
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: process.env.REPORT_RECIPIENT || "bulediasadjamil@gmail.com",
      subject: "New Bug Report - CMD System",
      text: `
User Email: ${email || "Not provided"}
Description: ${description}

Metadata:
${JSON.stringify(metadata, null, 2)}
      `,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: "Bug report sent successfully" });
  } catch (error) {
    console.error("Error sending bug report:", error);
    res.status(500).json({ error: "Failed to send bug report. Please check SMTP settings." });
  }
});

// 10. Health Check / Initialization
app.get("/api/health", async (req, res) => {
  try {
    const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
    res.status(200).json({
      status: "ok",
      database: dbStatus,
      timestamp: new Date().toISOString(),
      version: "1.0.0"
    });
  } catch (error) {
    res.status(500).json({ status: "error", message: error.message });
  }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
