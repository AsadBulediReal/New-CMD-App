const express = require("express");
const { audit_transactions } = require("../utils/auditHelper");
const {
  decompressRow,
  applyDateFilter,
  getFileWithChunks
} = require("../utils/metaHelpers");

const router = express.Router();

// 7. Audit specific categories using TYPE_CODE
router.post("/audit-saved-file", async (req, res) => {
  try {
    const { fileId, sheetName, fieldMap, categories, validationMode, dateFilter } = req.body;
    if (!fileId) return res.status(400).json({ error: "File ID required" });

    const file = await getFileWithChunks(fileId);
    if (!file) return res.status(404).json({ error: "File not found" });

    const allSheets = file.sheets || [];
    let targetSheet;
    if (sheetName) {
      targetSheet = allSheets.find(s => s.name === sheetName);
    } else {
      targetSheet = allSheets.find(s => s.name === "Transactions") || allSheets[0];
    }

    if (!targetSheet && (!file.rows || file.rows.length === 0)) {
      return res.status(400).json({ error: "No audit data found" });
    }

    const rowsData = targetSheet ? targetSheet.rows : file.rows;
    const headersData = targetSheet ? targetSheet.headers : file.headers;

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

    const filteredRows = applyDateFilter(rowsData, headersData, dateFilter);
    const mappedRows = applyFieldMap(filteredRows, fieldMap, headersData);

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

    if (summaryRows.length > 0) {
      resultingSheets.push({
        name: "Summary",
        headers: ["Category", "Records Count", "Total Amount"],
        rows: summaryRows
      });
    }

    for (const [catName, catRows] of Object.entries(categoryData)) {
      if (catRows && catRows.length > 0) {
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
    res.status(500).json({ error: "Audit failed" });
  }
});

module.exports = router;
