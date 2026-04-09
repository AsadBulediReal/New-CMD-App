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
    
    // Backfill top-level properties so aggregations still work perfectly
    if (sheets && sheets.length > 0) {
      if (primaryHeaders.length === 0) {
        primaryHeaders = sheets[0].headers || [];
      }
      if (primaryRows.length === 0) {
        primaryRows = sheets[0].rows || [];
      }
    }

    const newFile = new StoredFile({
      filename,
      headers: primaryHeaders,
      rows: primaryRows,
      sheets: sheets || []
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
    const { fileId, fieldMap } = req.body;
    if (!fileId) {
      return res.status(400).json({ error: "fileId is required" });
    }

    const file = await StoredFile.findById(fileId).lean();
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    // Extract sheets
    const allSheets = file.sheets || [];
    let transactionsSheet = allSheets.find(s => s.name === "Transactions");
    const summarySheet   = allSheets.find(s => s.name === "Summary Details");
    const headerSheet    = allSheets.find(s => s.name === "Header Details");

    if (!transactionsSheet) {
      // Fallback: legacy single-sheet files
      if (file.rows && file.rows.length > 0) {
        transactionsSheet = { name: "Transactions", headers: file.headers || [], rows: file.rows };
      } else {
        return res.status(400).json({ error: "No transaction data found in this file." });
      }
    }

    // ── Apply field mapping (renames columns to expected names) ──────────────
    // fieldMap shape: { "Particulars": "Description", "Challan No.": "Consumer No.", ... }
    const applyFieldMap = (rows, map) => {
      if (!map || Object.keys(map).length === 0) return rows;
      return rows.map(row => {
        const out = { ...row }; // keep all original fields
        for (const [requiredField, sourceField] of Object.entries(map)) {
          if (sourceField && sourceField !== requiredField) {
            out[requiredField] = row[sourceField]; // copy with required name
          }
        }
        return out;
      });
    };

    const mappedRows = applyFieldMap(transactionsSheet.rows, fieldMap);

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

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
