"use client"

import { useState, useRef } from "react"
import { MultiSheetViewer, type SheetData } from "./multi-sheet-viewer"
import { compressSheetData } from "../utils/dataProcessing"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2, Save, FileText, RefreshCcw } from "lucide-react"
import { getApiUrl, saveFileToDatabase } from "../utils/api"

export function TxtUploadEditor() {
  const [sheets, setSheets] = useState<SheetData[] | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filename, setFilename] = useState("")
  const [originalFilename, setOriginalFilename] = useState("")

  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseTxtFile = async (file: File): Promise<SheetData[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const textContent = e.target?.result
          if (typeof textContent !== "string") {
            throw new Error("Failed to read file as text")
          }
          
          setIsLoading(true)
          const response = await fetch(getApiUrl("/api/parse-txt"), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ textContent }),
          })

          if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`)
          }
          
          const result = await response.json()
          
          const { Header, Transactions, Summary } = result
          
          const newSheets: SheetData[] = [];

          // 1. Transactions Sheet
          const txRows = Transactions || []
          const txHeaders = txRows.length > 0 ? Object.keys(txRows[0]) : ["Challan No.", "Date", "Value Date", "Particulars", "Debit", "Credit", "Balance", "Remarks"]
          newSheets.push({ name: "Transactions", headers: txHeaders, rows: txRows })

          // 2. Header Sheet
          if (Header && Object.keys(Header).length > 0) {
            const headRows = Object.entries(Header).map(([key, value]) => ({ Key: key, Value: value }))
            newSheets.push({ name: "Header Details", headers: ["Key", "Value"], rows: headRows })
          }

          // 3. Summary Sheet
          if (Summary && Object.keys(Summary).length > 0) {
             const sumRows = Object.entries(Summary).map(([key, value]) => ({ Metric: key, Value: value }))
             newSheets.push({ name: "Summary Details", headers: ["Metric", "Value"], rows: sumRows })
          }
          
          resolve(newSheets)
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse TXT file via backend API"))
        } finally {
          setIsLoading(false)
        }
      }

      reader.onerror = () => {
        reject(new Error("Failed to read file"))
        setIsLoading(false)
      }

      reader.readAsText(file)
    })
  }

  const handleFile = async (file: File) => {
    setError("")
    console.log("[v0] handleFile txt called with:", file.name, file.type)
    setOriginalFilename(file.name.replace(/\.[^/.]+$/, ""))

    try {
      if (!file.name.endsWith(".txt")) {
        throw new Error("Invalid file format. Please upload a plain text (.txt) bank statement file.")
      }

      console.log("[v0] Parsing as TXT file")
      const parsedSheets = await parseTxtFile(file)
      
      console.log("[v0] TXT file parsed successfully into multiple sheets.")
      setSheets(parsedSheets)
      setSubmitMessage("")
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to parse file"
      console.error("[v0] Error:", errorMsg)
      setError(errorMsg)
      setIsLoading(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    const files = e.dataTransfer?.files
    if (files && files.length > 0) {
      handleFile(files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target?.files
    if (files && files.length > 0) {
      handleFile(files[0])
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
        .replace(/[-_\s]*\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[-_\s]*\d{2,4}\b/gi, '')
        .replace(/[-_\s]+$/g, '') // Trim trailing hyphens, underscores and spaces
        .replace(/^[-\s]+|[-\s]+$/g, '') // Trim leading/trailing hyphens and spaces
        .trim();
        
    if (!cleanOriginalFilename) cleanOriginalFilename = "Document";

    let autoName = cleanOriginalFilename;
    let extractedDate = "";
    
    const headerSheet = sheets.find(s => s.name.startsWith("Header Details"));
    if (headerSheet && headerSheet.rows && headerSheet.rows.length > 0) {
       const headerParts = headerSheet.rows
           .map(r => r.Value?.toString().trim())
           .filter(val => val && val.length > 0 && val.length < 50)
           .slice(0, 2);
           
       if (headerParts.length > 0) {
          autoName += ` - ${headerParts.join(" ")}`;
       }
       
       const dateRow = headerSheet.rows.find(r => {
          const keyMatch = r.Key?.toString().toLowerCase().includes("date") || r.Key?.toString().toLowerCase().includes("period");
          const valMatch = r.Value?.toString().match(/\b\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}\b/) || r.Value?.toString().match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b/i);
          return keyMatch || valMatch;
       });
       if (dateRow) {
           extractedDate = dateRow.Value?.toString().trim() || "";
       }
    }
    
    if (!extractedDate) {
        const dataSheet = sheets.find(s => s.name === "Transactions") || sheets[0];
        if (dataSheet && dataSheet.rows && dataSheet.rows.length > 0) {
            const dateHeaders = dataSheet.headers.filter(h => /\bdate\b/i.test(h));
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

    if (!finalDateStr) {
        finalDateStr = new Date().toISOString().split('T')[0];
    }
    
    if (finalDateStr && !autoName.includes(finalDateStr)) {
        autoName += ` ${finalDateStr}`;
    }
    
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
      const compressedSheets = compressSheetData(sheets)

      await saveFileToDatabase({
        filename: filename.trim(),
        sheets: compressedSheets
      });

      setSubmitMessage(`✓ All sheets saved successfully!`)

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

  const resetUploader = () => {
      setSheets(null);
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

      {!sheets ? (
        <Card className="p-4 sm:p-8 border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 shadow-lg">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Upload Bank Statement (TXT)</h2>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Only plain text (.txt) files are supported here</p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-6 sm:p-12 cursor-pointer ${isDragging ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30" : "border-indigo-300 dark:border-indigo-700 bg-indigo-50/50 dark:bg-indigo-900/10"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".txt" onChange={handleChange} className="hidden" />
              <div className="space-y-2">
                <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">Drag and drop your file</p>
              </div>
            </div>

            {error && <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 text-xs sm:text-sm">{error}</div>}
          </div>
        </Card>
      ) : (
        <>
          <Card className="border-border bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
            <div className="flex flex-col md:flex-row justify-between items-center p-4 sm:p-6 border-b border-border gap-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-foreground">Document Preview</h2>
                  <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px] md:max-w-none">{sheets?.length} Sheet(s) extracted</p>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full md:w-auto">
                {submitMessage && (
                   <span className={`text-xs sm:text-sm font-bold text-center sm:text-left ${submitMessage.includes("✓") ? "text-emerald-500" : "text-red-500"}`}>
                     {submitMessage}
                   </span>
                )}
                <Button 
                  variant="outline" 
                  onClick={resetUploader}
                  className="rounded-xl font-bold border-border hover:bg-muted gap-2 text-xs sm:text-sm"
                >
                  <RefreshCcw className="w-4 h-4" />
                  Upload New
                </Button>
                <Button 
                  onClick={handleOpenSubmitModal} 
                  disabled={isSubmitting} 
                  className="w-full sm:w-auto px-6 rounded-xl font-bold bg-foreground text-background hover:opacity-90 gap-2 shadow-lg active:scale-95 transition-all text-xs sm:text-sm"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save in Vault
                </Button>
              </div>
            </div>
            
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
