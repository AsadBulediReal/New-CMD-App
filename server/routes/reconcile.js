const express = require("express");
const { reconcile_bs_vs_mis } = require("../utils/reconcileHelper");
const {
  decompressRow,
  applyDateFilter,
  getFileWithChunks
} = require("../utils/metaHelpers");

const router = express.Router();

// 6. Reconcile BS vs MIS
router.post("/reconcile-bs-mis", async (req, res) => {
  try {
    const {
      bsFileId,
      misFileId,
      bsMapping = {},
      misMapping = {},
      misSheetName,
      bsSheetName,
      bsDateFilter,
      misDateFilter
    } = req.body;

    if (!bsFileId || !misFileId) {
      return res.status(400).json({ error: "Both files required" });
    }

    const [bsFile, misFile] = await Promise.all([
      getFileWithChunks(bsFileId, bsSheetName ? [bsSheetName, "Transactions"] : null),
      getFileWithChunks(misFileId, misSheetName ? [misSheetName, "Transactions"] : null)
    ]);

    if (!bsFile || !misFile) {
      return res.status(404).json({ error: "Files not found" });
    }

    let bsRawRows = [];
    let bsHeaders = bsFile.headers || [];
    if (bsFile.sheets && bsFile.sheets.length > 0) {
      const ts = (bsSheetName ? bsFile.sheets.find(s => s.name === bsSheetName) : null)
        || bsFile.sheets.find(s => s.name === "Transactions")
        || bsFile.sheets[0];
      bsHeaders = ts.headers || bsFile.headers || [];
      bsRawRows = ts.rows || [];
    } else {
      bsRawRows = bsFile.rows || [];
    }

    let misRawRows = [];
    let misHeaders = misFile.headers || [];
    if (misFile.sheets && misFile.sheets.length > 0) {
      const ts = (misSheetName ? misFile.sheets.find(s => s.name === misSheetName) : null)
        || misFile.sheets.find(s => s.name === "Transactions")
        || misFile.sheets[0];
      misHeaders = ts.headers || misFile.headers || [];
      misRawRows = ts.rows || [];
    } else {
      misRawRows = misFile.rows || [];
    }

    if (bsDateFilter) {
      bsRawRows = applyDateFilter(bsRawRows, bsHeaders, bsDateFilter);
    }
    if (misDateFilter) {
      misRawRows = applyDateFilter(misRawRows, misHeaders, misDateFilter);
    }

    const bsTransactions = bsRawRows.map(r => decompressRow(r, bsHeaders));
    const misTransactions = misRawRows.map(r => decompressRow(r, misHeaders));

    const {
      verified_mis,
      not_verified_bs,
      not_verified_mis,
      summary
    } = reconcile_bs_vs_mis(bsTransactions, misTransactions, bsMapping, misMapping);

    const resultingSheets = [
      { name: "Verified MIS", headers: misHeaders, rows: verified_mis },
      { name: "Not Verified BS", headers: bsHeaders, rows: not_verified_bs },
      { name: "Not Verified MIS", headers: misHeaders, rows: not_verified_mis },
    ];

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
    res.status(500).json({ error: "Reconciliation failed" });
  }
});

module.exports = router;
