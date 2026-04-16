     require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const StoredFile = require("./models/StoredFile");

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increase limit for potentially large excel JSON conversions

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

// 1. Save uploaded file data with a custom filename
app.post("/api/files", async (req, res) => {
  try {
    const { filename, headers, rows, sheets } = req.body;
    
    if (!filename) {
      return res.status(400).json({ error: "Filename is required" });
    }

    const existingFile = await StoredFile.findOne({ filename });
    if (existingFile) {
      return res.status(400).json({ error: "A file with this name already exists. Please choose a different name." });
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

    const newFile = new StoredFile({
      filename: filename.trim(),
      headers: primaryHeaders,
      rows: primaryRows,
      sheets: finalSheets
    });

    await newFile.save();
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
          },
          totalRecords: {
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
    const file = await StoredFile.findById(req.params.id);
    if (!file) return res.status(404).json({ error: "File not found" });
    
    res.status(200).json(file);
  } catch (error) {
    console.error("Error fetching file details:", error);
    res.status(500).json({ error: "Failed to fetch file details" });
  }
});

// 4. Delete a specific file by ID
app.delete("/api/files/:id", async (req, res) => {
  try {
    const file = await StoredFile.findByIdAndDelete(req.params.id);
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }
    res.status(200).json({ message: "File successfully deleted" });
  } catch (error) {
    console.error("Error deleting file:", error);
    res.status(500).json({ error: "Failed to delete file" });
  }
});

// 5. Analyze a saved file (with optional field mapping)
app.post("/api/analyze-saved-file", async (req, res) => {
  try {
    const { fileId, fieldMap, sheetName } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const file = await StoredFile.findById(fileId).lean();
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

    const mappedRows = applyFieldMap(transactionsSheet.rows, fieldMap, transactionsSheet.headers);

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
    const { bsFileId, misFileId, bsMapping = {}, misMapping = {}, misSheetName, bsSheetName } = req.body;
    
    if (!bsFileId || !misFileId) {
      return res.status(400).json({ error: "Both bsFileId and misFileId are required" });
    }

    const [bsFile, misFile] = await Promise.all([
      StoredFile.findById(bsFileId).lean(),
      StoredFile.findById(misFileId).lean()
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
    const { fileId, sheetName, fieldMap, categories, validationMode } = req.body;
    
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const file = await StoredFile.findById(fileId).lean();
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

    const mappedRows = applyFieldMap(rowsData, fieldMap, headersData);

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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
