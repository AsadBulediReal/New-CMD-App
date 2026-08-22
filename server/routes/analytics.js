const express = require("express");
const { analyze_transactions } = require("../utils/bsDataAnalytics");
const {
  decompressRow,
  applyDateFilter,
  getFileWithChunks
} = require("../utils/metaHelpers");

const router = express.Router();

// 5. Analyze a saved file (with optional field mapping)
router.post("/analyze-saved-file", async (req, res) => {
  try {
    const { fileId, fieldMap, sheetName, dateFilter } = req.body;
    const targetSheets = sheetName 
      ? [sheetName, "Summary Details", "Header Details", "Transactions"]
      : ["Transactions", "Summary Details", "Header Details"];
    const file = await getFileWithChunks(fileId, targetSheets);
    if (!file) return res.status(404).json({ error: "File not found" });

    const allSheets = file.sheets || [];

    let transactionsSheet;
    if (sheetName) {
      transactionsSheet = allSheets.find(s => s.name === sheetName);
    } else {
      transactionsSheet = allSheets.find(s => s.name === "Transactions");
    }

    const summarySheet = allSheets.find(s => s.name === "Summary Details");
    const headerSheet = allSheets.find(s => s.name === "Header Details");

    if (!transactionsSheet) {
      if (allSheets.length > 0) {
        transactionsSheet = allSheets[0];
      } else if (file.rows && file.rows.length > 0) {
        transactionsSheet = { name: "Transactions", headers: file.headers || [], rows: file.rows };
      } else {
        return res.status(400).json({ error: "No transaction data" });
      }
    }

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

    const filteredRows = applyDateFilter(transactionsSheet.rows, transactionsSheet.headers, dateFilter);
    const mappedRows = applyFieldMap(filteredRows, fieldMap, transactionsSheet.headers);

    let openingBalance = "";
    let closingBalance = "";
    if (summarySheet && summarySheet.rows) {
      const obRow = summarySheet.rows.find(r => r.Metric === "Opening Balance");
      if (obRow) openingBalance = obRow.Value;
      const cbRow = summarySheet.rows.find(r => r.Metric === "Closing Balance");
      if (cbRow) closingBalance = cbRow.Value;
    }

    const {
      ValidTransactions,
      InvalidTransactions,
      BalanceOrder,
      BulkPayments,
      ChallanRepeatStats,
      Summary
    } = analyze_transactions(mappedRows, openingBalance, closingBalance);

    const txHeaders = transactionsSheet.headers || [];
    const resultingSheets = [];

    if (headerSheet) {
      resultingSheets.push({ name: "Header Details", headers: headerSheet.headers, rows: headerSheet.rows });
    }

    if (ValidTransactions.length > 0) resultingSheets.push({ name: "Valid Transactions", headers: txHeaders, rows: ValidTransactions });
    if (InvalidTransactions.length > 0) resultingSheets.push({ name: "Invalid Transactions", headers: txHeaders, rows: InvalidTransactions });
    if (BalanceOrder.length > 0) resultingSheets.push({ name: "Balance Order", headers: txHeaders, rows: BalanceOrder });
    if (BulkPayments.length > 0) resultingSheets.push({ name: "Bulk Payments", headers: txHeaders, rows: BulkPayments });

    if (ChallanRepeatStats.length > 0) {
      const statsHeaders = ["challan no.", "challan debited", "challan credited", "Remaing Credit Challan", "Debit Amount"];
      resultingSheets.push({ name: "Challan Repeat Stats", headers: statsHeaders, rows: ChallanRepeatStats });
    }

    if (Summary && Object.keys(Summary).length > 0) {
      const summRows = [];
      summRows.push({ Category: "General", Metric: "Opening Balance", Value: Summary["Opening Balance"] });
      summRows.push({ Category: "General", Metric: "Closing Balance", Value: Summary["Closing Balance"] });

      for (const [section, items] of [["Debit Transactions", Summary["Debit Transactions"]], ["Credit Transactions", Summary["Credit Transactions"]]]) {
        if (items) {
          for (const [key, details] of Object.entries(items)) {
            summRows.push({ Category: section, Metric: `${key} Count`, Value: details.Count });
            summRows.push({ Category: section, Metric: `${key} Amount`, Value: details.Amount });
          }
        }
      }
      resultingSheets.push({ name: "Detailed Summary", headers: ["Category", "Metric", "Value"], rows: summRows });
    }

    res.status(200).json({ filename: `Analyzed-${file.filename}`, sheets: resultingSheets });
  } catch (error) {
    console.error("Error analyzing file:", error);
    res.status(500).json({ error: "Analysis failed" });
  }
});

// 8. Merge multiple JSON Reports (Files) into one
router.post("/merge-files", async (req, res) => {
  try {
    const { mappings } = req.body;
    if (!mappings || !Array.isArray(mappings) || mappings.length === 0) {
      return res.status(400).json({ error: "Mappings required" });
    }

    const fileIds = new Set();
    mappings.forEach(m => {
      m.sources.forEach(s => {
        if (s.fileId) fileIds.add(s.fileId);
      });
    });

    const filesMap = new Map();
    for (const id of Array.from(fileIds)) {
      const file = await getFileWithChunks(id);
      if (file) filesMap.set(id, file);
    }

    const resultingSheets = [];

    for (const mapping of mappings) {
      const targetName = mapping.outputSheetName || "Merged Sheet";
      const mergedRows = [];
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
          targetSheet = allSheets[0];
        }

        const headers = targetSheet ? targetSheet.headers : file.headers;
        const rows = targetSheet ? targetSheet.rows : file.rows;

        if (headers) {
          headers.forEach(h => mergedHeadersSet.add(h));
        }

        if (rows && rows.length > 0) {
          rows.forEach(r => {
            const decompressed = decompressRow(r, headers);
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
    res.status(500).json({ error: "Merge failed" });
  }
});

module.exports = router;
