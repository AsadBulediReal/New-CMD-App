const mongoose = require("mongoose");
const StoredFile = require("../models/StoredFile");
const FileChunk = require("../models/FileChunk");

const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

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
 * Parses a cell value into a valid Date object or null.
 */
function parseDateFromCell(val) {
  if (!val) return null;
  const dVal = String(val).trim();

  // "02Jan25" or "02-Jan-25" or "02 Jan 25"
  const compact = dVal.match(/^(\d{1,2})[-\s]?([A-Za-z]{3})[-\s]?(\d{2,4})$/);
  if (compact) {
    const day = parseInt(compact[1], 10);
    const mon = MONTH_MAP[compact[2].toLowerCase()];
    let yr = parseInt(compact[3], 10);
    if (yr < 100) yr += 2000;
    if (mon !== undefined) return new Date(yr, mon, day);
  }

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const slashDate = dVal.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashDate) {
    const p1 = parseInt(slashDate[1], 10);
    const p2 = parseInt(slashDate[2], 10);
    let yr = parseInt(slashDate[3], 10);
    if (yr < 100) yr += 2000;
    if (yr >= 1900 && yr <= 2100) {
      if (p1 > 12 && p2 >= 1 && p2 <= 12) return new Date(yr, p2 - 1, p1);
      if (p2 > 12 && p1 >= 1 && p1 <= 12) return new Date(yr, p1 - 1, p2);
      if (p1 >= 1 && p1 <= 31 && p2 >= 1 && p2 <= 12) return new Date(yr, p2 - 1, p1);
    }
  }

  const parsed = new Date(dVal);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

/**
 * Detects column data types (string, number, boolean, date).
 */
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

      if (!/^(true|false|yes|no|y|n)$/i.test(sVal)) isBoolean = false;

      const cleanedNum = sVal.replace(/,/g, "").replace(/^\$/, "");
      if (cleanedNum === "" || isNaN(Number(cleanedNum))) isNumber = false;

      if (!parseDateFromCell(sVal)) isDate = false;
    }

    if (!hasVal) return "string";
    if (isBoolean) return "boolean";
    if (isNumber) return "number";
    if (isDate) return "date";
    return "string";
  });
}

/**
 * Casts a single value based on detected column type.
 */
function castValue(val, type) {
  if (val === undefined || val === null || String(val).trim() === "") {
    return null;
  }
  const sVal = String(val).trim();

  if (type === "boolean") return /^(true|yes|y)$/i.test(sVal);
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

/**
 * Casts all rows in a sheet based on detected column types.
 */
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
        newRow[colIdx] = castValue(newRow[colIdx], columnTypes[colIdx]);
      }
      return newRow;
    } else {
      const newRow = { ...row };
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const header = headers[colIdx];
        newRow[header] = castValue(newRow[header], columnTypes[colIdx]);
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
 */
async function getFileWithChunks(id) {
  if (!mongoose.Types.ObjectId.isValid(id)) return null;

  const file = await StoredFile.findById(id).lean();
  if (!file) return null;

  if (file.hasChunks) {
    const chunks = await FileChunk.find({ fileId: id }).sort({ chunkIndex: 1 }).lean();
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

module.exports = {
  decompressRow,
  parseDateFromCell,
  detectColumnTypes,
  castValue,
  detectAndCastSheet,
  extractDateRange,
  extractMetadata,
  applyDateFilter,
  getFileWithChunks
};
