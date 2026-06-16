"use client"

import { useState } from "react"
import { FileUpload } from "./file-upload"
import { MultiSheetViewer, type SheetData } from "./multi-sheet-viewer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Save, FileText, RefreshCcw } from "lucide-react"
import { separateRecordsByChannel, compressSheetData } from "../utils/dataProcessing"

export function FileUploadEditor() {
  const [sheets, setSheets] = useState<SheetData[] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Separation Workflow states
  const [pendingData, setPendingData] = useState<SheetData[] | null>(null)
  const [showChannelPicker, setShowChannelPicker] = useState(false)
  const [selectedChannelCol, setSelectedChannelCol] = useState("")

  // Date Column Picker states — runs BEFORE channel picker
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [pendingDateData, setPendingDateData] = useState<SheetData[] | null>(null)
  const [selectedDateCol, setSelectedDateCol] = useState("")
  // After date picker resolves, do we still need the channel picker?
  const [datePickerNeedsChannelCheck, setDatePickerNeedsChannelCheck] = useState(false)

  // Tracks which column is the "date" field (applied as rename only at save time)
  const [mappedDateCol, setMappedDateCol] = useState<string | null>(null)
  // Change-date-col panel state (shown inside Document Preview)
  const [showDateChangePanel, setShowDateChangePanel] = useState(false)
  const [newDateColValue, setNewDateColValue] = useState("")

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filename, setFilename] = useState("")
  const [originalFilename, setOriginalFilename] = useState("")

  /**
   * Runs channel separation then sets sheets.
   * Called after the date picker step is resolved.
   */
  const proceedWithChannelCheck = (data: SheetData[]) => {
    const primarySheet = data.find(s => s.name === "Transactions") || data[0];
    const hasChannel = primarySheet?.headers?.some(h => h.toUpperCase() === "CHANNEL");

    if (hasChannel) {
      setSheets(separateRecordsByChannel(data));
    } else {
      setPendingData(data);
      setShowChannelPicker(true);
      setSelectedChannelCol("");
    }
  }

  const handleFileUpload = (uploadedData: SheetData[], originalFile?: string) => {
    if (originalFile) {
       setOriginalFilename(originalFile.replace(/\.[^/.]+$/, ""))
    } else {
       setOriginalFilename("Document")
    }

    setSubmitMessage("")
    setIsLoading(false)

    // Step 1 — check for a date column first
    // Use \bdate\b so "Update", "Mandate", "Validate" etc. do NOT falsely match
    const primarySheet = uploadedData.find(s => s.name === "Transactions") || uploadedData[0];
    const detectedCol = primarySheet?.headers?.find(h => /\bdate\b/i.test(h)) ?? null;

    if (!detectedCol) {
      // No date column found — show picker; after it resolves run the channel check
      setPendingDateData(uploadedData);
      setDatePickerNeedsChannelCheck(true);
      setShowDatePicker(true);
      setSelectedDateCol("");
      setMappedDateCol(null);
    } else {
      // Date column auto-detected — store it, go straight to channel check
      setMappedDateCol(detectedCol);
      proceedWithChannelCheck(uploadedData);
    }
  }

  const handleManualSeparate = () => {
    if (!pendingData || !selectedChannelCol) return;
    const processedSheets = separateRecordsByChannel(pendingData, selectedChannelCol);
    setShowChannelPicker(false);
    setPendingData(null);
    setSheets(processedSheets);
  }

  const handleSkipSeparation = () => {
    if (!pendingData) return;
    const data = pendingData;
    setShowChannelPicker(false);
    setPendingData(null);
    setSheets(data);
  }

  /** Renames the selected column to "Date" in all sheets so the server can extract date ranges. */
  const applyDateColumnMapping = (data: SheetData[], col: string): SheetData[] => {
    return data.map(sheet => {
      if (!sheet.headers.includes(col)) return sheet;
      const newHeaders = sheet.headers.map(h => (h === col ? "Date" : h));
      const newRows = sheet.rows.map(row => {
        if (Array.isArray(row)) return row; // compressed rows — leave as-is
        const newRow: Record<string, any> = {};
        sheet.headers.forEach((h, i) => {
          newRow[h === col ? "Date" : h] = (row as Record<string, any>)[h];
        });
        return newRow;
      });
      return { ...sheet, headers: newHeaders, rows: newRows };
    });
  }

  const handleConfirmDateCol = () => {
    if (!pendingDateData || !selectedDateCol) return;
    // Store the mapping — rename happens only at save time, NOT in the live data
    setMappedDateCol(selectedDateCol);
    const data = pendingDateData;
    const needsChannel = datePickerNeedsChannelCheck;
    setShowDatePicker(false);
    setPendingDateData(null);
    setDatePickerNeedsChannelCheck(false);
    if (needsChannel) {
      proceedWithChannelCheck(data);
    } else {
      setSheets(data);
    }
  }

  const handleSkipDateCol = () => {
    if (!pendingDateData) return;
    const data = pendingDateData;
    const needsChannel = datePickerNeedsChannelCheck;
    setMappedDateCol(null);
    setShowDatePicker(false);
    setPendingDateData(null);
    setDatePickerNeedsChannelCheck(false);
    if (needsChannel) {
      proceedWithChannelCheck(data);
    } else {
      setSheets(data);
    }
  }

  const handleDataUpdate = (sheetIndex: number, updatedData: { headers: string[], rows: any[] }) => {
    if (!sheets) return;
    const newSheets = [...sheets];
    newSheets[sheetIndex] = { ...newSheets[sheetIndex], ...updatedData };
    setSheets(newSheets);
  }

  const generateDefaultFilename = () => {
    if (!sheets) return originalFilename || "Document";
    
    // Strip common date formats from the original filename to avoid duplicate dates
    let cleanOriginalFilename = (originalFilename || "Document")
        .replace(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/g, '')
        .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/gi, '')
        .replace(/\b\d{1,2}(?:st|nd|rd|th)? (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{4}\b/gi, '')
        .replace(/[-_\s]*\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-_\s]*\d{2,4}\b/gi, '') // Matches "-JAN-26", "March 2026", "_Jan_2024", etc.
        .replace(/[-_\s]+$/g, '') // Trim trailing hyphens, underscores and spaces
        .replace(/^[-\s]+|[-\s]+$/g, '') // Trim leading/trailing hyphens and spaces
        .trim();
        
    if (!cleanOriginalFilename) cleanOriginalFilename = "Document";

    let autoName = cleanOriginalFilename;
    let extractedDate = "";
    
    const headerSheet = sheets.find(s => s.name.startsWith("Header Details"));
    if (headerSheet && headerSheet.rows && headerSheet.rows.length > 0) {
       // Extract meaningful information from header values (first 2 valid values)
       const headerParts = headerSheet.rows
           .map(r => r.Value?.toString().trim())
           .filter(val => val && val.length > 0 && val.length < 50)
           .slice(0, 2);
           
       if (headerParts.length > 0) {
          autoName += ` - ${headerParts.join(" ")}`;
       }
       
       // Try to extract date from headers
       const dateRow = headerSheet.rows.find(r => {
          const keyMatch = r.Key?.toString().toLowerCase().includes("date") || r.Key?.toString().toLowerCase().includes("period");
          const valMatch = r.Value?.toString().match(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/) || r.Value?.toString().match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/i);
          return keyMatch || valMatch;
       });
       if (dateRow) {
           extractedDate = dateRow.Value?.toString().trim() || "";
       }
    }
    
    // Check main records for Date if not found in headers
    // Also consider the manually-mapped date column if set
    if (!extractedDate) {
        const dataSheet = sheets.find(s => s.name === "Transactions") || sheets[0];
        if (dataSheet && dataSheet.rows && dataSheet.rows.length > 0) {
            const dateHeaders = [
              ...dataSheet.headers.filter(h => /\bdate\b/i.test(h)),
              ...(mappedDateCol && !dataSheet.headers.some(h => /\bdate\b/i.test(h)) ? [mappedDateCol] : [])
            ];
            if (dateHeaders.length > 0) {
                for (let i = 0; i < Math.min(5, dataSheet.rows.length); i++) {
                    if (dataSheet.rows[i][dateHeaders[0]]) {
                        extractedDate = dataSheet.rows[i][dateHeaders[0]]?.toString().trim() || "";
                        break;
                    }
                }
            }
        }
    }

    let finalDateStr = "";
    if (extractedDate) {
        const dateMatch = extractedDate.match(/\b(\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4})\b/);
        const textDateMatch = extractedDate.match(/\b((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4})\b/i);
        
        if (dateMatch) {
            finalDateStr = dateMatch[1];
        } else if (textDateMatch) {
            finalDateStr = textDateMatch[1];
        } else if (extractedDate.length < 30) {
            finalDateStr = extractedDate;
        }
    }

    // Fallback to current date
    if (!finalDateStr) {
        finalDateStr = new Date().toISOString().split('T')[0];
    }
    
    // Append the final date if it's not already in the auto name string
    if (finalDateStr && !autoName.includes(finalDateStr)) {
        autoName += ` ${finalDateStr}`;
    }
    
    // Sanitize string for filename
    return autoName.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, ' ').trim();
  }

  const handleOpenSubmitModal = () => {
    if (!sheets) return
    setIsModalOpen(true)
    setFilename(generateDefaultFilename())
  }

  const handleSubmit = async () => {
    if (!sheets || !filename.trim()) return

    setIsModalOpen(false)
    setIsSubmitting(true)
    setSubmitMessage("")

    try {

      // Apply the date column rename (if manually mapped) just before saving
      const sheetsToSave = mappedDateCol ? applyDateColumnMapping(sheets, mappedDateCol) : sheets;
      const compressedSheets = compressSheetData(sheetsToSave);

      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: filename.trim(),
          sheets: compressedSheets 
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await response.json()
      setSubmitMessage(`✓ Document exported properly via sheets!`)

      setTimeout(() => {
        setIsSubmitting(false)
        setSheets(null)
      }, 2000)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setSubmitMessage(`✗ Failed to submit: ${errorMessage}`)
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">


      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="p-8 bg-background border-border rounded-lg shadow-xl">
             <p className="text-lg font-semibold text-foreground">Processing file via API...</p>
          </Card>
        </div>
      )}

      {showDatePicker ? (
        <Card className="p-8 border-2 border-amber-300 dark:border-amber-700 bg-white dark:bg-zinc-900 shadow-lg rounded-3xl animate-in fade-in zoom-in duration-300">
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-2xl p-5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-black text-amber-900 dark:text-amber-100 mb-1">Date Column Not Detected</h2>
                <p className="text-sm text-amber-800/80 dark:text-amber-200/80 leading-relaxed">
                  No column with <span className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">"date"</span> in its name was found in your file.
                  Without a date column, the system cannot extract date ranges for filtering and sorting in the Vault.
                  Please select which column represents the transaction date below.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-bold text-foreground">Select Date Column</label>
              <select
                className="w-full bg-background border-2 border-amber-200 dark:border-amber-700 rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 transition-all"
                value={selectedDateCol}
                onChange={(e) => setSelectedDateCol(e.target.value)}
              >
                <option value="">— Choose a column —</option>
                {(pendingDateData?.find(s => s.name === "Transactions") || pendingDateData?.[0])?.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              {selectedDateCol && (
                <p className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
                  ✓ Column <span className="font-mono font-bold text-foreground">"{selectedDateCol}"</span> will be used as the date field.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                onClick={handleConfirmDateCol}
                disabled={!selectedDateCol}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-white h-12 font-black rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40 transition-all active:scale-95"
              >
                Confirm Date Column
              </Button>
              <Button
                variant="outline"
                onClick={handleSkipDateCol}
                className="flex-1 border-border text-muted-foreground hover:bg-muted h-12 font-bold rounded-xl"
              >
                Skip — No Date Column
              </Button>
            </div>
          </div>
        </Card>
      ) : !sheets ? (
        <FileUpload 
          onFileUpload={handleFileUpload} 
          onLoadingStart={() => setIsLoading(true)} 
          onLoadingEnd={() => setIsLoading(false)}
        />
      ) : (
        <>
          <Card className="border-border bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
            <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-border gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-foreground">Document Preview</h2>
                  <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px] md:max-w-none">{sheets?.length} Sheet(s) extracted</p>
                </div>
              </div>
              
              <div className="flex flex-wrap justify-end items-center gap-4 w-full md:w-auto">
                {submitMessage && (
                   <span className={`text-sm font-bold mr-2 ${submitMessage.includes("✓") ? "text-emerald-500" : "text-red-500"}`}>
                     {submitMessage}
                   </span>
                )}
                <Button 
                  variant="outline" 
                  onClick={() => setSheets(null)}
                  className="rounded-xl font-bold border-border hover:bg-muted gap-2"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Upload New
                </Button>
                <Button 
                  onClick={handleOpenSubmitModal} 
                  disabled={isSubmitting} 
                  className="w-full md:w-auto px-6 rounded-xl font-bold bg-foreground text-background hover:opacity-90 gap-2 shadow-lg active:scale-95 transition-all"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save in Vault
                </Button>
              </div>
            </div>

            {/* ── Date Column Indicator & Change Panel ── */}
            <div className={`px-6 py-3 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3 ${
              mappedDateCol ? "bg-blue-50/40 dark:bg-blue-900/10" : "bg-amber-50/40 dark:bg-amber-900/10"
            }`}>
              <div className="flex items-center gap-2 flex-1">
                <svg className={`w-4 h-4 shrink-0 ${mappedDateCol ? "text-blue-500" : "text-amber-500"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-semibold text-muted-foreground">Date Field:</span>
                {mappedDateCol ? (
                  <span className="text-xs font-black text-foreground bg-blue-100 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 px-2 py-0.5 rounded-full font-mono">
                    {mappedDateCol}
                  </span>
                ) : (
                  <span className="text-xs font-bold text-amber-600 dark:text-amber-400">None selected</span>
                )}
              </div>
              <button
                onClick={() => {
                  setShowDateChangePanel(v => !v);
                  setNewDateColValue(mappedDateCol || "");
                }}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline shrink-0 transition-colors"
              >
                {showDateChangePanel ? "Cancel" : mappedDateCol ? "Change" : "Set Date Column"}
              </button>
            </div>

            {showDateChangePanel && (
              <div className="px-6 py-4 border-b border-border bg-muted/30 flex flex-col sm:flex-row items-start sm:items-center gap-3 animate-in slide-in-from-top-2 duration-200">
                <label className="text-sm font-bold text-foreground shrink-0">Select date column:</label>
                <select
                  className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-sm text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  value={newDateColValue}
                  onChange={e => setNewDateColValue(e.target.value)}
                >
                  <option value="">— None —</option>
                  {(sheets.find(s => s.name === "Transactions") || sheets[0])?.headers.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 font-bold shrink-0"
                  onClick={() => {
                    setMappedDateCol(newDateColValue || null);
                    setShowDateChangePanel(false);
                  }}
                >
                  Apply
                </Button>
              </div>
            )}
            
            <div className="p-1 bg-muted/20 overflow-hidden">
               <MultiSheetViewer 
                 sheets={sheets} 
                 onDataUpdate={handleDataUpdate} 
                 downloadFilename={filename || generateDefaultFilename()} 
               />
            </div>
          </Card>


        </>
      )}

      {/* Manual Channel Mapping Modal */}
      <Dialog open={showChannelPicker} onOpenChange={setShowChannelPicker}>
        <DialogContent className="max-w-md bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Separation Logic Calibration</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              We couldn't find a column named <span className="font-mono font-bold text-blue-500">"CHANNEL"</span> for automatic 1Bill/Auto separation. 
              Please select the column that identifies transaction channels, or skip this step.
            </p>
            
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground ml-1">Select Channel Column</label>
              <select 
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all box-border"
                value={selectedChannelCol}
                onChange={(e) => setSelectedChannelCol(e.target.value)}
              >
                <option value="">-- Choose Column --</option>
                {(pendingData?.find(s => s.name === "Transactions") || pendingData?.[0])?.headers.map(h => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4 border-t border-border mt-4">
            <Button 
              onClick={handleManualSeparate} 
              disabled={!selectedChannelCol}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-12 font-black rounded-xl shadow-lg shadow-blue-500/20 disabled:opacity-50 transition-all"
            >
              Separate Combined Records
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSkipSeparation}
              className="w-full border-border text-foreground hover:bg-muted h-12 font-bold rounded-xl"
            >
              Skip Separation & Save Original
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Filename Prompt Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Save to Vault</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-4">
            <p className="text-sm text-muted-foreground mb-4 font-medium">Please provide a descriptive filename for the Vault.</p>
            <input
              type="text"
              placeholder="e.g. Document Name April 2026"
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all box-border"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={() => setIsModalOpen(false)}
              className="font-bold rounded-xl hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!filename.trim() || isSubmitting}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-8 font-black shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Save in Vault
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
