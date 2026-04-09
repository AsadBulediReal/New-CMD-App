"use client"

import { useState, useRef } from "react"
import { MultiSheetViewer, type SheetData } from "./multi-sheet-viewer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function TxtUploadEditor() {
  const [sheets, setSheets] = useState<SheetData[] | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submissionProgress, setSubmissionProgress] = useState(0)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filename, setFilename] = useState("")

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
          const response = await fetch("/api/parse-txt", {
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

  const handleOpenSubmitModal = () => {
    if (!sheets) return
    setIsModalOpen(true)
    setFilename("") // Reset filename
  }

  const handleSubmit = async () => {
    if (!sheets || !filename.trim()) return

    setIsModalOpen(false)
    setIsSubmitting(true)
    setSubmitMessage("")
    setSubmissionProgress(0)

    try {
      const progressInterval = setInterval(() => {
        setSubmissionProgress((prev) => (prev < 85 ? prev + Math.random() * 12 : prev))
      }, 150)

      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: filename.trim(),
          sheets: sheets // Pass the multi-sheet data directly
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await response.json()
      setSubmissionProgress(100)
      setSubmitMessage(`✓ All sheets saved successfully!`)

      setTimeout(() => {
        setSubmissionProgress(0)
        setIsSubmitting(false)
        setSheets(null)
      }, 2000)
    } catch (error) {
      setSubmissionProgress(0)
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
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
             <div className="flex flex-col items-center gap-4">
               <div className="animate-spin text-indigo-600">
                  <svg className="w-12 h-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                     <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                     <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
               </div>
               <p className="text-lg font-semibold text-gray-900">Saving multisheet data...</p>
               <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-2">
                 <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${submissionProgress}%` }}></div>
               </div>
             </div>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 bg-white rounded-lg shadow-lg">
             <p className="text-lg font-semibold text-gray-900">Processing file via API...</p>
          </Card>
        </div>
      )}

      {!sheets ? (
        <Card className="p-8 border-2 border-indigo-200 bg-white shadow-lg">
          <div className="text-center space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Bank Statement (TXT)</h2>
              <p className="text-gray-600">Only plain text (.txt) files are supported here</p>
            </div>

            <div
              className={`border-2 border-dashed rounded-lg p-12 cursor-pointer ${isDragging ? "border-indigo-500 bg-indigo-50" : "border-indigo-300 bg-indigo-50/50"}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input ref={fileInputRef} type="file" accept=".txt" onChange={handleChange} className="hidden" />
              <div className="space-y-2">
                <p className="text-lg font-semibold text-gray-900">Drag and drop your file</p>
              </div>
            </div>

            {error && <div className="bg-red-50 p-4 text-red-700">{error}</div>}
          </div>
        </Card>
      ) : (
        <>
          <Card className="p-0 border-2 border-indigo-200 overflow-hidden bg-white">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Document Preview</h2>
              <Button variant="outline" onClick={resetUploader}>Upload New</Button>
            </div>
            
            <div className="bg-gray-50 p-6">
               <MultiSheetViewer sheets={sheets} onDataUpdate={handleDataUpdate} />
            </div>
          </Card>

          <div className="flex gap-3 justify-end items-center">
            {submitMessage && (
               <div className={`text-sm font-medium ${submitMessage.includes("✓") ? "text-green-600" : "text-red-600"}`}>
                 {submitMessage}
               </div>
            )}
            <Button onClick={handleOpenSubmitModal} disabled={isSubmitting} className="bg-indigo-600 text-white hover:bg-indigo-700">
              {isSubmitting ? "Saving..." : "Save Document to Database"}
            </Button>
          </div>
        </>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Save Statement</h3>
            <input type="text" placeholder="Filename" value={filename} onChange={(e) => setFilename(e.target.value)} className="w-full border rounded px-3 py-2 mb-4" />
            <div className="flex justify-end gap-3">
               <Button variant="outline" onClick={() => setIsModalOpen(false)}>Cancel</Button>
               <Button onClick={handleSubmit} disabled={!filename.trim()} className="bg-indigo-600 text-white">Save Database</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
