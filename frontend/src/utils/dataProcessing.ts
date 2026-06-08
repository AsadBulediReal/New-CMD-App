import type { SheetData } from "../components/multi-sheet-viewer";

/**
 * Removes entirely empty rows and columns, and strips hidden Excel parser metadata.
 */
export function optimizeSheetMetadata(sheets: SheetData[]): SheetData[] {
  if (!sheets || sheets.length === 0) return sheets;

  return sheets.map(sheet => {
    const headers = (sheet.headers || []).map(h => String(h || "").trim()).filter(h => h !== "");
    
    // 1. Filter out completely empty rows and strip extra properties
    const cleanRows = (sheet.rows || []).map(row => {
      const cleanRow: Record<string, any> = {};
      let hasData = false;
      
      headers.forEach(h => {
        let val = row[h];
        // Normalize value
        if (typeof val === "string") val = val.trim();
        if (val !== undefined && val !== null && val !== "") {
          hasData = true;
          cleanRow[h] = val;
        } else {
          cleanRow[h] = "";
        }
      });
      
      return hasData ? cleanRow : null;
    }).filter(row => row !== null) as Record<string, any>[];

    // 2. Identify and remove completely empty columns across all rows
    const activeHeaders = headers.filter(h => {
      return cleanRows.some(row => row[h] !== "");
    });

    // 3. Re-map rows to only include active headers (to save space)
    const finalRows = cleanRows.map(row => {
      const rowData: Record<string, any> = {};
      activeHeaders.forEach(h => {
        rowData[h] = row[h];
      });
      return rowData;
    });

    return {
      ...sheet,
      headers: activeHeaders,
      rows: finalRows
    };
  }).filter(sheet => sheet.rows.length > 0);
}

/**
 * Separates records based on the CHANNEL column criteria.
 * 1Bill: BRANCH, 1BILL_PAY, MV-FW
 * Auto: Everything else
 */
export function separateRecordsByChannel(sheets: SheetData[], manualChannelCol?: string): SheetData[] {
  if (!sheets || sheets.length === 0) return sheets;

  // First, optimize the data to remove bloat
  const optimized = optimizeSheetMetadata(sheets);
  if (optimized.length === 0) return [];

  // Find the primary data sheet (usually 'Transactions' or the first one)
  const primarySheet = optimized.find(s => s.name === "Transactions") || optimized[0];
  const rows = primarySheet.rows || [];
  const headers = primarySheet.headers || [];

  // Use manual column name if provided, otherwise search for "CHANNEL"
  const channelCol = manualChannelCol || headers.find(h => h.toUpperCase() === "CHANNEL");

  if (!channelCol) {
    console.warn("CHANNEL column not found. Skipping separation.");
    return optimized;
  }

  const oneBillCriteria = ["BRANCH", "1BILL_PAY", "MV-FW"];

  const oneBillRows = rows.filter(row => {
    const val = String(row[channelCol] || "").toUpperCase().trim();
    return oneBillCriteria.includes(val);
  });

  const autoRows = rows.filter(row => {
    const val = String(row[channelCol] || "").toUpperCase().trim();
    return val !== "" && !oneBillCriteria.includes(val);
  });

  const newSheets = [...optimized];

  if (oneBillRows.length > 0) {
    newSheets.push({
      name: "1Bill Records",
      headers: headers,
      rows: oneBillRows
    });
  }

  if (autoRows.length > 0) {
    newSheets.push({
      name: "Auto Records",
      headers: headers,
      rows: autoRows
    });
  }

  return newSheets;
}

/**
 * Converts Object-rows {"Header": "Value"} to Array-rows ["Value"] for storage efficiency.
 */
export function compressSheetData(sheets: SheetData[]): SheetData[] {
  if (!sheets) return [];
  return sheets.map(sheet => {
    const headers = sheet.headers || [];
    const rows = (sheet.rows || []).map(row => {
      let r: any[];

      if (Array.isArray(row)) {
        r = [...row];
        // Convert empty strings to null for BSON optimization
        for (let i = 0; i < r.length; i++) {
          if (r[i] === "") r[i] = null;
        }
      } else {
        // Convert object to array based on header order
        r = headers.map(h => {
          const val = row[h];
          return (val === "" || val == null) ? null : val;
        });
      }

      // Trim trailing nulls to minimize array size in BSON
      while (r.length > 0 && r[r.length - 1] === null) {
        r.pop();
      }

      return r;
    });
    return { ...sheet, rows };
  });
}

/**
 * Converts Array-rows back to Object-rows for UI and analysis usage.
 */
export function decompressSheetData(sheets: SheetData[]): SheetData[] {
  if (!sheets) return [];
  return sheets.map(sheet => {
    const headers = sheet.headers || [];
    const rows = (sheet.rows || []).map(row => {
      // If already an object, skip
      if (!Array.isArray(row)) return row;
      // Convert array back to object
      const obj: Record<string, any> = {};
      headers.forEach((h, i) => {
        obj[h] = row[i] ?? "";
      });
      return obj;
    });
    return { ...sheet, rows };
  });
}

/**
 * Helper to decompress a single row array if needed.
 */
export function decompressRow(row: any, headers: string[]): Record<string, any> {
  if (!Array.isArray(row)) return row;
  const obj: Record<string, any> = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });
  return obj;
}

/**
 * Fuzzy matching to find initial mapping for required fields.
 */
export function getAutoMapping(headers: string[], requiredFields: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

  requiredFields.forEach(req => {
    const normReq = normalize(req);
    
    // Exact match first
    let match = headers.find(h => normalize(h) === normReq);

    // Common synonyms/aliases if no exact match
    if (!match) {
      const aliases: Record<string, string[]> = {
        "challanno": ["consumerno", "refno", "referenceno", "slipno"],
        "amount": ["paidamount", "credit", "cramount", "txnammount", "value"],
        "remarks": ["description", "narrative", "comments", "memo"],
        "particulars": ["description", "remarks", "narration"],
      };

      const possibleAliases = aliases[normReq] || [];
      match = headers.find(h => possibleAliases.includes(normalize(h)));
    }

    mapping[req] = match || "";
  });

  return mapping;
}

const MONTH_MAP: Record<string, number> = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };

function parseDateFromCell(val: any): Date | null {
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

  // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
  const slashDate = dVal.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (slashDate) {
    const p1 = parseInt(slashDate[1], 10);
    const p2 = parseInt(slashDate[2], 10);
    let yr  = parseInt(slashDate[3], 10);
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

export function detectColumnTypes(headers: string[], rows: any[]): string[] {
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

export function castValue(val: any, type: string): any {
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

export function detectAndCastSheet(sheet: SheetData): SheetData {
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
