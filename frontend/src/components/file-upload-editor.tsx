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

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filename, setFilename] = useState("")
  const [originalFilename, setOriginalFilename] = useState("")

  const handleFileUpload = (uploadedData: SheetData[], originalFile?: string) => {
    if (originalFile) {
       setOriginalFilename(originalFile.replace(/\.[^/.]+$/, ""))
    } else {
       setOriginalFilename("Document")
    }
    // Check if CHANNEL column exists to decide if we need a prompt
    const primarySheet = uploadedData.find(s => s.name === "Transactions") || uploadedData[0];
    const hasChannel = primarySheet?.headers?.some(h => h.toUpperCase() === "CHANNEL");

    if (hasChannel) {
      const processedSheets = separateRecordsByChannel(uploadedData);
      setSheets(processedSheets)
    } else {
      setPendingData(uploadedData)
      setShowChannelPicker(true)
      setSelectedChannelCol("")
    }
    
    setSubmitMessage("")
    setIsLoading(false)
  }

  const handleManualSeparate = () => {
    if (!pendingData || !selectedChannelCol) return;
    const processedSheets = separateRecordsByChannel(pendingData, selectedChannelCol);
    setSheets(processedSheets);
    setShowChannelPicker(false);
    setPendingData(null);
  }

  const handleSkipSeparation = () => {
    if (!pendingData) return;
    setSheets(pendingData);
    setShowChannelPicker(false);
    setPendingData(null);
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
    if (!extractedDate) {
        const dataSheet = sheets.find(s => s.name === "Transactions") || sheets[0];
        if (dataSheet && dataSheet.rows && dataSheet.rows.length > 0) {
            const dateHeaders = dataSheet.headers.filter(h => h.toLowerCase().includes("date"));
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

      const compressedSheets = compressSheetData(sheets);

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

      {!sheets ? (
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
            
            <div className="p-1 bg-muted/20 overflow-hidden">
               <MultiSheetViewer 
                 sheets={sheets} 
                 onDataUpdate={handleDataUpdate} 
                 downloadFilename={generateDefaultFilename()} 
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
