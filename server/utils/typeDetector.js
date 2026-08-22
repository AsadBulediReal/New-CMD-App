const MONTH_MAP = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
};

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
 * Detects column data types using smart sampling (max 100 rows).
 */
function detectColumnTypes(headers, rows) {
  if (!rows || rows.length === 0) return headers.map(() => "string");

  const isArrayRows = Array.isArray(rows[0]);
  const sampleLimit = Math.min(rows.length, 100);

  return headers.map((header, colIdx) => {
    let hasVal = false;
    let isNumber = true;
    let isBoolean = true;
    let isDate = true;
    let checkedCount = 0;

    for (let i = 0; i < rows.length && checkedCount < sampleLimit; i++) {
      const row = rows[i];
      if (!row) continue;
      const val = isArrayRows ? row[colIdx] : row[header];
      if (val === undefined || val === null || String(val).trim() === "") continue;

      hasVal = true;
      checkedCount++;
      const sVal = String(val).trim();

      if (isBoolean && !/^(true|false|yes|no|y|n)$/i.test(sVal)) isBoolean = false;
      if (isNumber) {
        const cleanedNum = sVal.replace(/,/g, "").replace(/^\$/, "");
        if (cleanedNum === "" || isNaN(Number(cleanedNum))) isNumber = false;
      }
      if (isDate && !parseDateFromCell(sVal)) isDate = false;
      if (!isBoolean && !isNumber && !isDate) break;
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
  if (val === undefined || val === null || String(val).trim() === "") return null;
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

  if (columnTypes.every(t => t === "string")) {
    return { ...sheet, columnTypes };
  }

  const castedRows = rows.map(row => {
    if (!row) return row;
    if (isArrayRows) {
      const newRow = [...row];
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const type = columnTypes[colIdx];
        if (type !== "string") newRow[colIdx] = castValue(newRow[colIdx], type);
      }
      return newRow;
    } else {
      const newRow = { ...row };
      for (let colIdx = 0; colIdx < headers.length; colIdx++) {
        const type = columnTypes[colIdx];
        if (type !== "string") newRow[headers[colIdx]] = castValue(newRow[headers[colIdx]], type);
      }
      return newRow;
    }
  });

  return { ...sheet, rows: castedRows, columnTypes };
}

module.exports = {
  parseDateFromCell,
  detectColumnTypes,
  castValue,
  detectAndCastSheet
};
