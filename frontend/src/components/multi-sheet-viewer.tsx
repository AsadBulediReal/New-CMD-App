import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import { DataTable } from "./data-table";
import { decompressSheetData, detectAndCastSheet } from "../utils/dataProcessing";

export interface SheetData {
  name: string;
  headers: string[];
  rows: any[]; // Can be Record<string, any>[] or any[][]
  columnTypes?: string[];
}

interface MultiSheetViewerProps {
  sheets: SheetData[];
  onDataUpdate?: (sheetIndex: number, updatedData: { headers: string[], rows: any[] }) => void;
  isLoadingMore?: boolean;
  onLoadingMore?: (loading: boolean) => void;
  readonly?: boolean;
  downloadFilename?: string;
}

export function MultiSheetViewer({
  sheets: rawSheets,
  onDataUpdate,
  isLoadingMore,
  onLoadingMore,
  readonly = false,
  downloadFilename = "exported_data.xlsx"
}: MultiSheetViewerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  // DECOMPRESSION: Ensure data is in object format for DataTable and Export
  const sheets = useMemo(() => {
    const decompressed = decompressSheetData(rawSheets);
    return decompressed.map(sheet => {
      if (!sheet.columnTypes || sheet.columnTypes.length === 0) {
        return detectAndCastSheet(sheet);
      }
      return sheet;
    });
  }, [rawSheets]);

  const handleDownload = () => {
    if (!sheets || sheets.length === 0) return;

    setIsExporting(true);

    // Timeout allows UI to update before long-running XLSX operations block the thread
    setTimeout(() => {
      try {
        const wb = XLSX.utils.book_new();
        
        sheets.forEach((sheet, idx) => {
          let safeName = (sheet.name || `Sheet ${idx + 1}`).substring(0, 31).replace(/[\][*?:\/\\]/g, "");
          if (!safeName) safeName = `Sheet ${idx + 1}`;
          
          const ws = XLSX.utils.json_to_sheet(sheet.rows);
          
          // Apply cell types and format strings to columns based on columnTypes
          if (sheet.columnTypes && sheet.columnTypes.length > 0) {
            const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
            for (let C = range.s.c; C <= range.e.c; ++C) {
              const type = sheet.columnTypes[C];
              if (!type) continue;
              
              for (let R = range.s.r + 1; R <= range.e.r; ++R) { // Skip header row (R=0)
                const cellRef = XLSX.utils.encode_cell({ r: R, c: C });
                const cell = ws[cellRef];
                if (!cell) continue;

                if (type === 'number') {
                  const valStr = String(cell.v);
                  if (valStr.includes('.')) {
                    cell.z = '0.00';
                  } else {
                    cell.z = '0';
                  }
                  cell.t = 'n'; // ensure type is number
                } else if (type === 'boolean') {
                  cell.z = '@';
                  cell.t = 'b'; // ensure type is boolean
                } else if (type === 'date') {
                  cell.z = 'mmm d, yyyy';
                  cell.t = 'd'; // ensure type is date
                }
              }
            }
          }
          
          XLSX.utils.book_append_sheet(wb, ws, safeName);
        });
        
        const finalFilename = downloadFilename.endsWith('.xlsx') ? downloadFilename : `${downloadFilename}.xlsx`;
        XLSX.writeFile(wb, finalFilename, { compression: true });
      } catch (error) {
        console.error("Error generating Excel download:", error);
        alert("Failed to create Excel file for download.");
      } finally {
        setIsExporting(false);
      }
    }, 50);
  };

  if (!sheets || sheets.length === 0) {
    return <div className="p-4 text-muted-foreground">No sheets available</div>;
  }

  const currentSheet = sheets[activeTab];

  return (
    <div className="flex flex-col relative w-full h-full">
      <div className="flex justify-between items-center border-b border-border">
        <div className="flex overflow-x-auto hide-scrollbar flex-1">
          {sheets.map((sheet, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-3 px-6 text-sm font-medium transition-colors border-b-2 focus:outline-none ${
                activeTab === index
                  ? "border-indigo-500 text-indigo-500 bg-indigo-500/10"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {sheet.name || `Sheet ${index + 1}`}
            </button>
          ))}
        </div>
        
        <button 
          onClick={handleDownload}
          disabled={isExporting}
          title="Download as Microsoft Excel"
          className={`ml-4 mr-2 mb-1 hidden sm:flex items-center gap-2 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            isExporting ? "opacity-70 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          {isExporting ? (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          )}
          {isExporting ? "Exporting..." : "Export Excel"}
        </button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentSheet && (
          <DataTable
            data={{ headers: currentSheet.headers, rows: currentSheet.rows, columnTypes: currentSheet.columnTypes }}
            onDataUpdate={(newData) => {
              if (onDataUpdate) {
                onDataUpdate(activeTab, newData);
              }
            }}
            isLoadingMore={isLoadingMore}
            onLoadingMore={onLoadingMore}
            readonly={readonly}
          />
        )}
      </div>
    </div>
  );
}
