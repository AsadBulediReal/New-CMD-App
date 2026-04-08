"use client"

import { useState } from "react"
import { FileUpload } from "./file-upload"
import { DataTable } from "./data-table"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

export interface TableData {
  headers: string[]
  rows: Record<string, any>[]
}

export function FileUploadEditor() {
  const [data, setData] = useState<TableData | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [submissionProgress, setSubmissionProgress] = useState(0)
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [filename, setFilename] = useState("")

  const handleFileUpload = (uploadedData: TableData) => {
    setData(uploadedData)
    setSubmitMessage("")
    setIsLoading(false)
  }

  const handleDataUpdate = (updatedData: TableData) => {
    setData(updatedData)
  }

  const handleOpenSubmitModal = () => {
    if (!data) return
    setIsModalOpen(true)
    setFilename("") // Reset filename
  }

  const handleSubmit = async () => {
    if (!data || !filename.trim()) return

    setIsModalOpen(false)
    setIsSubmitting(true)
    setSubmitMessage("")
    setSubmissionProgress(0)

    try {
      // Start progress animation that continues until response is received
      const progressInterval = setInterval(() => {
        setSubmissionProgress((prev) => {
          if (prev < 85) {
            return prev + Math.random() * 12
          }
          return prev
        })
      }, 150)

      const response = await fetch("/api/files", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filename: filename.trim(),
          headers: data.headers,
          rows: data.rows
        }),
      })

      clearInterval(progressInterval)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const result = await response.json()

      setSubmissionProgress(100)

      setSubmitMessage(`✓ ${result.message || "Data submitted successfully"}`)

      // Clear data after success
      setData(null)

      // Keep showing 100% for a moment before resetting
      setTimeout(() => {
        setSubmissionProgress(0)
        setIsSubmitting(false)
      }, 2000)
    } catch (error) {
      setSubmissionProgress(0)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      setSubmitMessage(`✗ Failed to submit: ${errorMessage}`)
      setIsSubmitting(false)
      console.error("Submit error:", error)
    }
  }

  return (
    <div className="space-y-6">
      {isSubmitting && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 bg-white rounded-lg shadow-lg max-w-md w-full mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin">
                <svg
                  className="w-12 h-12 text-indigo-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900">Submitting data...</p>
              <p className="text-sm text-gray-600">Please wait while your data is being processed</p>
              <div className="w-full mt-4">
                <div className="flex justify-between mb-2">
                  <span className="text-xs font-medium text-gray-600">Progress</span>
                  <span className="text-xs font-medium text-gray-600">{Math.round(submissionProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-indigo-500 to-indigo-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${submissionProgress}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {isLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="p-8 bg-white rounded-lg shadow-lg">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin">
                <svg
                  className="w-12 h-12 text-indigo-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              </div>
              <p className="text-lg font-semibold text-gray-900">Processing file...</p>
              <p className="text-sm text-gray-600">Please wait while we parse your data</p>
            </div>
          </Card>
        </div>
      )}

      {!data ? (
        <FileUpload onFileUpload={handleFileUpload} onLoadingStart={() => setIsLoading(true)} />
      ) : (
        <>
          <Card className="p-6 border-2 border-indigo-200">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900">Data Preview</h2>
              <Button
                variant="outline"
                onClick={() => setData(null)}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Upload New File
              </Button>
            </div>
            <DataTable
              data={data}
              onDataUpdate={handleDataUpdate}
              isLoadingMore={isLoadingMore}
              onLoadingMore={(loading) => {
                setIsLoadingMore(loading)
              }}
            />
          </Card>

          <div className="flex gap-3 justify-end">
            {submitMessage && (
              <div className={`text-sm font-medium ${submitMessage.includes("✓") ? "text-green-600" : "text-red-600"}`}>
                {submitMessage}
              </div>
            )}
            <Button
              onClick={handleOpenSubmitModal}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6"
            >
              {isSubmitting ? "Submitting..." : "Submit Data"}
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
