import * as XLSX from "xlsx";
import JSZip from "jszip";
import { decompressSheetData } from "./dataProcessing";
import type { SheetData } from "../components/multi-sheet-viewer";
import { getApiUrl } from "./api";

export interface DownloadProgress {
  current: number;
  total: number;
  currentFilename: string;
  phase: "fetching" | "zipping" | "complete" | "error";
  error?: string;
}

/**
 * Builds an XLSX workbook object from stored file raw data.
 */
export function buildWorkbookFromFileData(fileData: any): XLSX.WorkBook {
  let sheetsToLoad: SheetData[] = [];
  if (fileData.sheets && fileData.sheets.length > 0) {
    sheetsToLoad = decompressSheetData(
      fileData.sheets.map((s: any, idx: number) => {
        const meta = fileData.sheetMeta?.find((m: any) => m.name === s.name);
        return {
          name: s.name || `Sheet ${idx + 1}`,
          headers: s.headers || [],
          rows: s.rows || [],
          columnTypes: meta?.columnTypes || [],
        };
      })
    );
  } else {
    const firstMeta = fileData.sheetMeta?.[0];
    sheetsToLoad = decompressSheetData([
      {
        name: "Sheet 1",
        headers: fileData.headers || [],
        rows: fileData.rows || [],
        columnTypes: firstMeta?.columnTypes || [],
      },
    ]);
  }

  const wb = XLSX.utils.book_new();

  sheetsToLoad.forEach((sheet, idx) => {
    let safeName = (sheet.name || `Sheet ${idx + 1}`)
      .substring(0, 31)
      .replace(/[\][*?:\/\\]/g, "");
    if (!safeName) safeName = `Sheet ${idx + 1}`;

    const ws = XLSX.utils.json_to_sheet(sheet.rows || []);

    if (sheet.columnTypes && sheet.columnTypes.length > 0) {
      const range = XLSX.utils.decode_range(ws["!ref"] || "A1:A1");
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const type = sheet.columnTypes[C];
        if (!type) continue;

        for (let R = range.s.r + 1; R <= range.e.r; ++R) {
          const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
          const cell = ws[cellRef];
          if (!cell || cell.v === null || cell.v === undefined || cell.v === "") continue;

          if (type === "number") {
            if (typeof cell.v !== "number") {
              const num = Number(String(cell.v).replace(/,/g, "").replace(/^\$/, ""));
              if (!isNaN(num)) cell.v = num;
            }
            if (typeof cell.v === "number") {
              cell.z = String(cell.v).includes(".") ? "0.00" : "0";
              cell.t = "n";
            }
          } else if (type === "boolean") {
            if (typeof cell.v === "string") {
              cell.v = /^(true|yes|y)$/i.test(cell.v);
            }
            cell.t = "b";
          } else if (type === "date") {
            cell.z = "mmm d, yyyy";
            if (!(cell.v instanceof Date)) {
              const d = new Date(cell.v);
              if (!isNaN(d.getTime())) {
                cell.v = d;
                cell.t = "d";
              }
            } else {
              cell.t = "d";
            }
          }
        }
      }
    }

    XLSX.utils.book_append_sheet(wb, ws, safeName);
  });

  return wb;
}

/**
 * Triggers browser download for a Blob.
 */
export function triggerBlobDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/**
 * Downloads a single saved file as an .xlsx file.
 */
export async function downloadSingleSavedFile(id: string, filename: string): Promise<void> {
  const res = await fetch(getApiUrl(`/api/files/${id}`));
  if (!res.ok) {
    throw new Error(`Failed to load file (${res.statusText})`);
  }
  const fileData = await res.json();
  const wb = buildWorkbookFromFileData(fileData);

  const cleanName = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, cleanName, { compression: true });
}

/**
 * Downloads multiple saved files packaged into a single ZIP archive.
 */
export async function downloadBulkSavedFilesAsZip(
  files: { id: string; filename: string }[],
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  if (!files || files.length === 0) return;

  const zip = new JSZip();
  const total = files.length;
  const usedFilenames = new Set<string>();

  for (let i = 0; i < total; i++) {
    const file = files[i];
    if (onProgress) {
      onProgress({
        current: i + 1,
        total,
        currentFilename: file.filename,
        phase: "fetching",
      });
    }

    const res = await fetch(getApiUrl(`/api/files/${file.id}`));
    if (!res.ok) {
      throw new Error(`Failed to fetch file "${file.filename}"`);
    }
    const fileData = await res.json();
    const wb = buildWorkbookFromFileData(fileData);

    // Convert workbook to Uint8Array buffer
    const arrayBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });

    // Ensure unique filename inside zip archive
    let baseName = file.filename.endsWith(".xlsx")
      ? file.filename.slice(0, -5)
      : file.filename;
    baseName = baseName.replace(/[\/\\?%*:|"<>]/g, "_");

    let entryName = `${baseName}.xlsx`;
    let counter = 1;
    while (usedFilenames.has(entryName.toLowerCase())) {
      entryName = `${baseName}_(${counter}).xlsx`;
      counter++;
    }
    usedFilenames.add(entryName.toLowerCase());

    zip.file(entryName, arrayBuffer);
  }

  if (onProgress) {
    onProgress({
      current: total,
      total,
      currentFilename: "Compressing archive...",
      phase: "zipping",
    });
  }

  const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
  const dateStr = new Date().toISOString().slice(0, 10);
  const zipFilename = `Saved_Files_Export_${dateStr}.zip`;

  triggerBlobDownload(zipBlob, zipFilename);

  if (onProgress) {
    onProgress({
      current: total,
      total,
      currentFilename: zipFilename,
      phase: "complete",
    });
  }
}
