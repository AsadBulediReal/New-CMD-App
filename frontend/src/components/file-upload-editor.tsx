"use client"

import { useState } from "react"
import { FileUpload } from "./file-upload"
import { MultiSheetViewer, type SheetData } from "./multi-sheet-viewer"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export function FileUploadEditor() {
  const [sheets, setSheets] = useState<SheetData[] | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [submissionProgress, setSubmissionProgress] = useState(0)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filename, setFilename] = useState("")

  const handleFileUpload = (uploadedData: SheetData[]) => {
    setSheets(uploadedData)
    setSubmitMessage("")
    setIsLoading(false)
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
          sheets: sheets // Saving multi-sheet data directly
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      await response.json()
      setSubmissionProgress(100)
      setSubmitMessage(`✓ Document exported properly via sheets!`)

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
        <FileUpload onFileUpload={handleFileUpload} onLoadingStart={() => setIsLoading(true)} />
      ) : (
        <>
          <Card className="p-0 border-2 border-indigo-200 overflow-hidden bg-white">
            <div className="flex justify-between items-center p-6 border-b border-gray-100">
              <h2 className="text-xl font-bold text-gray-900">Document Preview</h2>
              <Button variant="outline" onClick={() => setSheets(null)}>Upload New</Button>
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

      {/* Filename Prompt Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Save File</h3>
            <p className="text-gray-600 mb-4 text-sm">Please provide a descriptive filename to store this document in the database.</p>
            <input
              type="text"
              placeholder="e.g. Bank Statement March 2026"
              className="w-full border border-gray-300 rounded px-3 py-2 mb-6 text-gray-900"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-700 hover:bg-gray-50 border-gray-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!filename.trim()}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Save to Database
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
