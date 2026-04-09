import { useState } from "react";
import * as XLSX from "xlsx";
import { DataTable } from "./data-table";

export interface SheetData {
  name: string;
  headers: string[];
  rows: Record<string, any>[];
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
  sheets,
  onDataUpdate,
  isLoadingMore,
  onLoadingMore,
  readonly = false,
  downloadFilename = "exported_data.xlsx"
}: MultiSheetViewerProps) {
  const [activeTab, setActiveTab] = useState(0);

  const handleDownload = () => {
    if (!sheets || sheets.length === 0) return;

    try {
      const wb = XLSX.utils.book_new();
      
      sheets.forEach((sheet, idx) => {
        // Enforce max 31 characters for Excel sheet names and sanitize
        let safeName = (sheet.name || `Sheet ${idx + 1}`).substring(0, 31).replace(/[\][*?:\/\\]/g, "");
        if (!safeName) safeName = `Sheet ${idx + 1}`;
        
        // Ensure rows populate correctly mapping exactly to the custom headers first if preferred,
        // but json_to_sheet is very robust natively.
        const ws = XLSX.utils.json_to_sheet(sheet.rows);
        XLSX.utils.book_append_sheet(wb, ws, safeName);
      });
      
      const finalFilename = downloadFilename.endsWith('.xlsx') ? downloadFilename : `${downloadFilename}.xlsx`;
      XLSX.writeFile(wb, finalFilename, { compression: true });
    } catch (error) {
      console.error("Error generating Excel download:", error);
      alert("Failed to create Excel file for download.");
    }
  };

  if (!sheets || sheets.length === 0) {
    return <div className="p-4 text-gray-500">No sheets available</div>;
  }

  const currentSheet = sheets[activeTab];

  return (
    <div className="flex flex-col relative w-full h-full">
      <div className="flex justify-between items-center border-b border-gray-200">
        <div className="flex overflow-x-auto hide-scrollbar flex-1">
          {sheets.map((sheet, index) => (
            <button
              key={index}
              onClick={() => setActiveTab(index)}
              className={`whitespace-nowrap py-3 px-6 text-sm font-medium transition-colors border-b-2 focus:outline-none ${
                activeTab === index
                  ? "border-indigo-500 text-indigo-600 bg-indigo-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {sheet.name || `Sheet ${index + 1}`}
            </button>
          ))}
        </div>
        
        <button 
          onClick={handleDownload}
          title="Download as Microsoft Excel"
          className="ml-4 mr-2 mb-1 hidden sm:flex items-center gap-2 whitespace-nowrap bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Export Excel
        </button>
      </div>
      
      <div className="flex-1 flex flex-col overflow-hidden">
        {currentSheet && (
          <DataTable
            data={{ headers: currentSheet.headers, rows: currentSheet.rows }}
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
