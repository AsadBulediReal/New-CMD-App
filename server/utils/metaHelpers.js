const mongoose = require("mongoose");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");

const {
  parseDateFromCell,
  detectColumnTypes,
  castValue,
  detectAndCastSheet
} = require("./typeDetector");

/**
 * Decompresses an array-row into an object-row using provided headers.
 */
function decompressRow(row, headers) {
  if (!Array.isArray(row)) return row;
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });
  return obj;
}

/**
 * Extracts minimum and maximum dates across sheets.
 */
function extractDateRange(sheets) {
  let minDate = null;
  let maxDate = null;
  for (const sheet of sheets) {
    const hdrs = sheet.headers || [];
    for (const r of sheet.rows || []) {
      const rowObj = decompressRow(r, hdrs);
      for (const [key, val] of Object.entries(rowObj)) {
        if (!key || !val || !String(key).match(/date/i)) continue;
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

/**
 * Extracts comprehensive metadata and debit/credit summaries.
 */
function extractMetadata(sheets) {
  let totalRecords = 0;
  let columnCount = 0;
  const sheetCount = sheets.length;
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
      name: sheet.name || `Sheet ${i + 1}`,
      recordCount: recCount,
      columnCount: hdrs.length,
      columnTypes: sheet.columnTypes || []
    });

    const debitCol = hdrs.find(h => /^debit$/i.test(h.trim()));
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
    totalDebit: Math.round(totalDebit * 100) / 100,
    totalCredit: Math.round(totalCredit * 100) / 100,
    netFlow: Math.round((totalCredit - totalDebit) * 100) / 100,
    debitCount,
    creditCount,
    hasFinancialData: true,
  } : { hasFinancialData: false };

  return { totalRecords, columnCount, sheetCount, sheetMeta, financialSummary };
}

/**
 * Filters rows based on a specified date range.
 */
function applyDateFilter(rows, headers, dateFilter) {
  if (!dateFilter || !dateFilter.column || (!dateFilter.start && !dateFilter.end)) return rows;
  const colIdx = headers.indexOf(dateFilter.column);
  if (colIdx === -1 && !headers.includes(dateFilter.column)) return rows;

  const start = dateFilter.start ? new Date(dateFilter.start) : null;
  const end = dateFilter.end ? new Date(dateFilter.end) : null;
  if (start) start.setHours(0, 0, 0, 0);
  if (end) end.setHours(23, 59, 59, 999);

  return rows.filter(r => {
    const row = decompressRow(r, headers);
    const val = row[dateFilter.column];
    const d = parseDateFromCell(val);
    if (!d) return false;
    if (start && d < start) return false;
    if (end && d > end) return false;
    return true;
  });
}

/**
 * Retrieves a StoredFile document and reconstitutes its FileChunks.
 * @param {string} id - StoredFile ObjectId
 * @param {string|string[]|null} targetSheetNames - Optional sheet name(s) to fetch chunks for (speeds up single sheet operations)
 */
async function getFileWithChunks(id, targetSheetNames = null) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const file = await StoredFile.findById(id).lean();
  if (!file) return null;

  if (file.hasChunks) {
    const query = { fileId: id };
    if (targetSheetNames) {
      if (Array.isArray(targetSheetNames)) {
        query.sheetName = { $in: targetSheetNames };
      } else {
        query.sheetName = targetSheetNames;
      }
    }

    const chunks = await FileChunk.find(query)
      .select({ sheetName: 1, chunkIndex: 1, rows: 1 })
      .sort({ chunkIndex: 1 })
      .lean();

    if (!file.sheets) file.sheets = [];
    if (!file.rows) file.rows = [];

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

/**
 * Recompute metadata and rebuild chunks for files
 */
async function recomputeAllFilesMeta(all = false) {
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
      const chunkDocs = [];
      let chunkIndex = 0;

      for (const sheet of castedSheets) {
        const sRows = sheet.rows || [];
        for (let i = 0; i < sRows.length; i += CHUNK_SIZE) {
          chunkDocs.push({
            fileId: meta._id,
            sheetName: sheet.name,
            chunkIndex: chunkIndex++,
            rows: sRows.slice(i, i + CHUNK_SIZE)
          });
        }
      }

      if (chunkDocs.length > 0) {
        await FileChunk.insertMany(chunkDocs, { ordered: false });
      }
      updated++;
    } catch (e) {
      console.error(`Failed to recompute meta for ${meta.filename}:`, e.message);
      failed++;
    }
  }
  return { updated, failed };
}

module.exports = {
  decompressRow,
  parseDateFromCell,
  detectColumnTypes,
  castValue,
  detectAndCastSheet,
  extractDateRange,
  extractMetadata,
  applyDateFilter,
  getFileWithChunks,
  recomputeAllFilesMeta,
};
