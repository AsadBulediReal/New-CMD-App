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
