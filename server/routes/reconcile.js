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
      getFileWithChunks(bsFileId),
      getFileWithChunks(misFileId)
    ]);

    if (!bsFile || !misFile) {
      return res.status(404).json({ error: "Files not found" });
    }

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

    if (bsDateFilter) {
      bsTransactions = applyDateFilter(
        bsTransactions.map(r => Object.values(r)),
        bsHeaders,
        bsDateFilter
      ).map(r => decompressRow(r, bsHeaders));
    }
    if (misDateFilter) {
      misTransactions = applyDateFilter(
        misTransactions.map(r => Object.values(r)),
        misHeaders,
        misDateFilter
      ).map(r => decompressRow(r, misHeaders));
    }

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
