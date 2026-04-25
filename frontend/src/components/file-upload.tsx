"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip"
import { HelpCircle, Info } from "lucide-react"
import type { SheetData } from "./multi-sheet-viewer"

interface RawSheetData {
  name: string;
  rawRows: string[][];
  guessedHeaderRowIndex: number;
}

export function FileUpload({
  onFileUpload,
  onLoadingStart,
  onLoadingEnd,
}: {
  onFileUpload: (data: SheetData[], originalFilename?: string) => void
  onLoadingStart?: () => void
  onLoadingEnd?: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const [rawSheets, setRawSheets] = useState<RawSheetData[] | null>(null)
  const [configStepIndex, setConfigStepIndex] = useState(0)
  const [configs, setConfigs] = useState<{ headerRowIndex: number, extractHeaderDetails: boolean, skipped?: boolean }[]>([])
  const [originalFilename, setOriginalFilename] = useState("")

  const fileInputRef = useRef<HTMLInputElement>(null)

  const guessHeaderRowIndex = (rows: string[][]): number => {
    let maxCols = 0;
    for (let i = 0; i < Math.min(rows.length, 50); i++) {
      const colCount = rows[i].filter(cell => cell && cell.trim() !== "").length;
      if (colCount > 2 && colCount >= maxCols) {
         return i;
      }
      if (colCount > maxCols) {
        maxCols = colCount;
      }
    }
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].some(cell => cell && cell.trim() !== "")) return i;
    }
    return 0;
  }

  const parseCSVFile = (file: File): Promise<RawSheetData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result
          if (typeof text !== "string") throw new Error("Failed to read file")
          
          const lines = text.trim().split("\n")
          if (lines.length === 0) throw new Error("Empty file")
          
          // Split by comma. Better to use a proper CSV parser, but this preserves legacy behavior
          const rawRows = lines.map(line => line.split(",").map(v => v.trim()))
          const guessedHeaderRowIndex = guessHeaderRowIndex(rawRows)

          resolve([{ name: "CSV Data", rawRows, guessedHeaderRowIndex }])
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse CSV file"))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsText(file)
    })
  }

  const parseExcel = (file: File): Promise<RawSheetData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          if (!data) throw new Error("Failed to read file")

          const XLSX = await import("xlsx")
          const workbook = XLSX.read(data, { type: "binary", raw: true, cellText: true })
          
          const sheets: RawSheetData[] = []

          for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName]
            if (!sheet["!ref"]) continue;

            const range = XLSX.utils.decode_range(sheet["!ref"])
            const rawRows: string[][] = []

            for (let row = range.s.r; row <= range.e.r; row++) {
              const rowData: string[] = []
              let hasAnyValue = false
              for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
                const cell = sheet[cellAddress]
                const value = cell ? cell.w || cell.v?.toString() || "" : ""
                rowData.push(value)
                if (value.trim()) hasAnyValue = true
              }
              if (hasAnyValue || rawRows.length > 0) {
                 rawRows.push(rowData)
              }
            }
            
            while(rawRows.length > 0 && !rawRows[rawRows.length-1].some(v => v && v.trim() !== "")) {
               rawRows.pop();
            }

            if (rawRows.length > 0) {
               sheets.push({ name: sheetName, rawRows, guessedHeaderRowIndex: guessHeaderRowIndex(rawRows) })
            }
          }

          if (sheets.length === 0) throw new Error("No valid data found in Excel file")
          resolve(sheets)
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse Excel file"))
        }
      }

      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsBinaryString(file)
    })
  }

  const handleFile = async (file: File) => {
    setError("")
    onLoadingStart?.()
    setOriginalFilename(file.name)

    try {
      if (!file.type && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
        throw new Error("Invalid file format. Please upload a CSV or Excel file.")
      }

      let data: RawSheetData[]

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("spreadsheet")) {
        data = await parseExcel(file)
      } else if (file.name.endsWith(".csv") || file.type === "text/csv") {
        data = await parseCSVFile(file)
      } else {
        throw new Error("Unsupported file format. Please upload CSV or Excel files.")
      }

      const hasHeaderSheet = data.some(d => d.name.toLowerCase().includes("header details"));

      setConfigs(data.map((d, index) => ({ 
        headerRowIndex: d.guessedHeaderRowIndex, 
        extractHeaderDetails: !hasHeaderSheet && d.guessedHeaderRowIndex > 0 && index === 0 
      })))
      setRawSheets(data)
      setConfigStepIndex(0)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to parse file"
      setError(errorMsg)
    } finally {
      onLoadingEnd?.()
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const files = e.dataTransfer?.files
    if (files && files.length > 0) handleFile(files[0])
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files
    if (files && files.length > 0) handleFile(files[0])
  }

  const confirmConfiguration = () => {
    if (!rawSheets) return;

    const finalSheets: SheetData[] = [];

    rawSheets.forEach((rs, index) => {
      const config = configs[index];
      if (config.skipped) return;

      const headerRowIndex = config.headerRowIndex;
      const rawRows = rs.rawRows;

      const rawHeaders = rawRows[headerRowIndex] || [];
      const headers: string[] = [];
      const headerCount: Record<string, number> = {};
      
      rawHeaders.forEach((h, i) => {
        let name = (h || `Column ${i + 1}`).trim();
        if (headerCount[name]) {
           headerCount[name]++;
           name = `${name} (${headerCount[name]})`;
        } else {
           headerCount[name] = 1;
        }
        headers.push(name);
      });

      const dataRows = rawRows.slice(headerRowIndex + 1).map(rowValues => {
        const rowData: Record<string, any> = {};
        let hasData = false;
        headers.forEach((header, i) => {
          const val = rowValues[i] || "";
          rowData[header] = val;
          if (val) hasData = true;
        });
        return hasData ? rowData : null;
      }).filter(Boolean);

      finalSheets.push({
         name: rs.name === "Transactions" ? "Transactions" : (index === 0 ? "Transactions" : rs.name),
         headers,
         rows: dataRows
      });

      if (config.extractHeaderDetails && headerRowIndex > 0) {
         const headerDataRows: Record<string, any>[] = [];
         for (let i = 0; i < headerRowIndex; i++) {
           const rowVals = rawRows[i].filter(v => v && v.trim() !== "");
           if (rowVals.length === 0) continue; 
           
           if (rowVals.length === 1) {
             headerDataRows.push({ Key: "Information", Value: rowVals[0] });
           } else {
             headerDataRows.push({ Key: rowVals[0], Value: rowVals.slice(1).join(" ") });
           }
         }
         if (headerDataRows.length > 0) {
            finalSheets.push({
               name: `Header Details${rawSheets.length > 1 ? ` - ${rs.name}` : ''}`,
               headers: ["Key", "Value"],
               rows: headerDataRows
            });
         }
      }
    });

    if (finalSheets.length === 0) {
      setError("All sheets were skipped. No data to process.");
      setRawSheets(null);
      setConfigs([]);
      return;
    }

    onFileUpload(finalSheets, originalFilename);
    // Reset so the configure UI clears immediately
    setRawSheets(null);
    setConfigs([]);
  }

  if (rawSheets) {
    const currentSheet = rawSheets[configStepIndex];
    const currentConfig = configs[configStepIndex];

    return (
      <Card className="p-8 border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 shadow-lg animate-in fade-in zoom-in duration-300">
        <div className="space-y-6">
          <div className="flex justify-between items-center border-b border-border pb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configure Data Structure</h2>
              <p className="text-muted-foreground">Sheet {configStepIndex + 1} of {rawSheets.length}: <span className="font-semibold text-indigo-600 dark:text-indigo-400">{currentSheet.name}</span></p>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-800/30">
               <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Step 1: Select Column Names Row</h3>
               <p className="text-sm text-blue-700/80 dark:text-blue-300/80 mb-4">
                  Click on the row below that contains your table's column headers (e.g. Date, Description, Amount).
               </p>
               
               <div className="max-h-[350px] overflow-auto border border-border rounded-xl bg-card shadow-inner">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-muted/80 backdrop-blur-md sticky top-0 z-10 shadow-sm">
                     <tr>
                       <th className="px-4 py-3 w-20 text-center text-muted-foreground font-semibold border-r border-border">Row</th>
                       {Array.from({ length: Math.min(10, Math.max(...currentSheet.rawRows.slice(0, 50).map(r => r.length))) }).map((_, i) => (
                         <th key={i} className="px-4 py-3 font-semibold text-foreground border-r border-border">Col {i + 1}</th>
                       ))}
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-border">
                     {currentSheet.rawRows.slice(0, 50).map((row, rowIndex) => (
                       <tr 
                         key={rowIndex} 
                         onClick={() => {
                           const newConfigs = [...configs];
                           newConfigs[configStepIndex].headerRowIndex = rowIndex;
                           if (rowIndex > 0 && !newConfigs[configStepIndex].extractHeaderDetails) {
                              newConfigs[configStepIndex].extractHeaderDetails = true;
                           } else if (rowIndex === 0) {
                              newConfigs[configStepIndex].extractHeaderDetails = false;
                           }
                           setConfigs(newConfigs);
                         }}
                         className={`cursor-pointer transition-all hover:bg-muted/60 ${
                           currentConfig.headerRowIndex === rowIndex 
                             ? "bg-indigo-100/80 dark:bg-indigo-900/40" 
                             : (rowIndex < currentConfig.headerRowIndex && currentConfig.extractHeaderDetails)
                               ? "bg-amber-50/60 dark:bg-amber-900/20"
                               : ""
                         }`}
                       >
                         <td className={`px-4 py-3 text-center font-mono border-r border-border relative ${
                            currentConfig.headerRowIndex === rowIndex ? "text-indigo-700 dark:text-indigo-300 border-l-4 border-l-indigo-500 bg-indigo-200/50 dark:bg-indigo-800/50" : "text-muted-foreground"
                         }`}>
                           <span className="text-base font-bold">{rowIndex + 1}</span>
                           {currentConfig.headerRowIndex === rowIndex && (
                             <span className="block text-[9px] uppercase tracking-wider text-indigo-600 dark:text-indigo-400 font-bold leading-tight mt-0.5">Headers</span>
                           )}
                           {(rowIndex < currentConfig.headerRowIndex && currentConfig.extractHeaderDetails) && (
                             <span className="block text-[9px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-bold leading-tight mt-0.5">Meta</span>
                           )}
                         </td>
                         {Array.from({ length: Math.min(10, Math.max(...currentSheet.rawRows.slice(0, 50).map(r => r.length))) }).map((_, i) => (
                           <td key={i} className={`px-4 py-3 border-r border-border ${!row[i] ? 'text-muted-foreground/30' : 'text-foreground font-medium'}`}>
                             <div className="truncate max-w-[200px]" title={row[i] || ""}>{row[i] || "-"}</div>
                           </td>
                         ))}
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
            </div>

            {currentConfig.headerRowIndex > 0 && (
              <div className="bg-amber-50/50 dark:bg-amber-900/10 p-5 rounded-2xl border border-amber-100 dark:border-amber-800/30 flex items-start gap-4">
                 <input 
                   type="checkbox" 
                   id="extract-header" 
                   className="mt-1 w-5 h-5 text-amber-600 rounded border-amber-300 focus:ring-amber-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                   checked={currentConfig.extractHeaderDetails}
                   disabled={rawSheets.some(s => s.name.toLowerCase().includes("header details"))}
                   onChange={(e) => {
                     const newConfigs = [...configs];
                     newConfigs[configStepIndex].extractHeaderDetails = e.target.checked;
                     setConfigs(newConfigs);
                   }}
                 />
                 <div>
                   <label htmlFor="extract-header" className="font-semibold text-amber-900 dark:text-amber-100 flex items-center gap-2 select-none">
                     Step 2: Extract Preceding Rows as "Header Details"
                     <TooltipProvider delayDuration={0}>
                       <Tooltip>
                         <TooltipTrigger type="button" className="cursor-help">
                           <HelpCircle className="w-4 h-4 text-amber-600/70 hover:text-amber-600" />
                         </TooltipTrigger>
                         <TooltipContent>
                           <p className="max-w-xs">Rows 1 to {currentConfig.headerRowIndex} will be separated into a dedicated Header Details sheet. If a Header sheet already exists in your file, this is disabled to prevent repeating the process.</p>
                         </TooltipContent>
                       </Tooltip>
                     </TooltipProvider>
                   </label>
                   <p className="text-sm text-amber-700/80 dark:text-amber-300/80 mt-1">
                     Useful for separating metadata from your main transaction records.
                   </p>
                 </div>
              </div>
            )}
          </div>

          <div className="space-y-4 pt-6 border-t border-border mt-6">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                className="px-6 rounded-xl border-border hover:bg-muted"
                onClick={() => {
                  setRawSheets(null);
                  setConfigs([]);
                }}
              >
                Cancel
              </Button>
              {rawSheets.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    className="px-6 rounded-xl border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-900 dark:text-amber-400 dark:hover:bg-amber-900/30"
                    onClick={() => {
                      const newConfigs = [...configs];
                      newConfigs[configStepIndex].skipped = true;
                      setConfigs(newConfigs);
                      if (configStepIndex < rawSheets.length - 1) {
                        setConfigStepIndex(configStepIndex + 1);
                      } else {
                        confirmConfiguration();
                      }
                    }}
                  >
                    Skip Sheet
                  </Button>
                  <TooltipProvider delayDuration={0}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="max-w-xs">Completely ignore the current sheet and exclude it from your final dataset.</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button 
                  variant="secondary"
                  className="px-6 rounded-xl font-semibold"
                  onClick={() => {
                    // Bypass remaining configuration and use current configs
                    confirmConfiguration();
                  }}
                >
                  Skip Config & Process All
                </Button>
                <TooltipProvider delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Instantly process this and all remaining sheets using the system's best guesses.</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 rounded-xl font-bold shadow-md shadow-indigo-500/20 active:scale-95 transition-all"
                onClick={() => {
                  if (configStepIndex < rawSheets.length - 1) {
                    setConfigStepIndex(configStepIndex + 1);
                  } else {
                    confirmConfiguration();
                  }
                }}
              >
                {configStepIndex < rawSheets.length - 1 ? "Next Sheet" : "Confirm Configuration"}
              </Button>
            </div>
          </div>
        </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-8 border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 shadow-lg rounded-3xl">
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upload Your Data File</h2>
          <p className="text-muted-foreground font-medium">Support for CSV and Excel files (.xlsx, .xls)</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-2xl p-12 transition-all duration-300 cursor-pointer ${
            isDragging
              ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 scale-[1.02]"
              : "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/80"
          }`}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleChange} className="hidden" />

          <div className="space-y-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
               <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
               </svg>
            </div>
            <div>
               <p className="text-lg font-bold text-gray-900 dark:text-gray-100">Drag and drop your file here</p>
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">or click to select from your computer</p>
            </div>
          </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl p-4 text-red-700 dark:text-red-400 text-sm font-medium animate-in slide-in-from-top-2">{error}</div>}

        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-6 rounded-xl font-bold shadow-lg shadow-indigo-500/20 active:scale-95 transition-all text-base"
        >
          Select File
        </Button>
      </div>
    </Card>
  )
}
