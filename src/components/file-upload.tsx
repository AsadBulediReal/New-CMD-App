"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import type { TableData } from "./file-upload-editor"

export function FileUpload({
  onFileUpload,
  onLoadingStart,
}: {
  onFileUpload: (data: TableData) => void
  onLoadingStart?: () => void
}) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const parseCSV = (text: string): TableData => {
    const lines = text.trim().split("\n")
    if (lines.length === 0) throw new Error("Empty file")

    const headers = lines[0].split(",").map((h) => h.trim())
    const rows = lines.slice(1).map((line) => {
      const values = line.split(",").map((v) => v.trim())
      const row: Record<string, any> = {}
      headers.forEach((header, index) => {
        row[header] = values[index] || ""
      })
      return row
    })

    return { headers, rows }
  }

  const parseExcel = (file: File): Promise<TableData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = async (e) => {
        try {
          const data = e.target?.result
          if (!data) {
            throw new Error("Failed to read file")
          }

          const XLSX = await import("xlsx")

          const workbook = XLSX.read(data, { type: "binary", raw: true, cellText: true })
          const sheetName = workbook.SheetNames[0]
          const sheet = workbook.Sheets[sheetName]

          // First, get the range to understand the dimensions
          const range = XLSX.utils.decode_range(sheet["!ref"] || "A1")

          const headers: string[] = []
          const rows: Record<string, any>[] = []

          // Start by finding the first row with actual data
          let headerRowIndex = 0
          let dataStartRowIndex = 0

          for (let row = range.s.r; row <= range.e.r; row++) {
            let rowHasData = false
            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
              const cell = sheet[cellAddress]
              if (cell && (cell.w || cell.v)) {
                rowHasData = true
                break
              }
            }
            if (rowHasData) {
              headerRowIndex = row
              dataStartRowIndex = row + 1
              break
            }
          }

          // Extract headers from the first data row
          for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col })
            const cell = sheet[cellAddress]
            const headerValue = cell ? cell.w || cell.v?.toString() || "" : ""
            headers.push(headerValue || `Column ${col + 1}`)
          }

          // Extract data rows
          for (let row = dataStartRowIndex; row <= range.e.r; row++) {
            const rowData: Record<string, any> = {}
            let hasAnyValue = false

            for (let col = range.s.c; col <= range.e.c; col++) {
              const cellAddress = XLSX.utils.encode_cell({ r: row, c: col })
              const cell = sheet[cellAddress]
              const value = cell ? cell.w || cell.v?.toString() || "" : ""

              rowData[headers[col]] = value
              if (value) hasAnyValue = true
            }

            // Only add rows that have at least some data
            if (hasAnyValue) {
              rows.push(rowData)
            }
          }

          if (headers.length === 0) {
            throw new Error("No data found in Excel file")
          }

          console.log("[v0] File parsed successfully:", { headers, rowCount: rows.length })
          resolve({ headers, rows })
        } catch (err) {
          console.error("[v0] Excel parsing error:", err)
          reject(err instanceof Error ? err : new Error("Failed to parse Excel file"))
        }
      }

      reader.onerror = () => {
        reject(new Error("Failed to read file"))
      }

      reader.readAsBinaryString(file)
    })
  }

  const parseCSVFile = (file: File): Promise<TableData> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()

      reader.onload = (e) => {
        try {
          const text = e.target?.result
          if (typeof text !== "string") {
            throw new Error("Failed to read file")
          }
          resolve(parseCSV(text))
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to parse CSV file"))
        }
      }

      reader.onerror = () => {
        reject(new Error("Failed to read file"))
      }

      reader.readAsText(file)
    })
  }

  const handleFile = async (file: File) => {
    setError("")
    onLoadingStart?.()
    console.log("[v0] handleFile called with:", file.name, file.type)

    try {
      if (!file.type && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls") && !file.name.endsWith(".csv")) {
        throw new Error("Invalid file format. Please upload a CSV or Excel file.")
      }

      let data: TableData

      if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls") || file.type.includes("spreadsheet")) {
        console.log("[v0] Parsing as Excel file")
        data = await parseExcel(file)
      } else if (file.name.endsWith(".csv") || file.type === "text/csv") {
        console.log("[v0] Parsing as CSV file")
        data = await parseCSVFile(file)
      } else {
        throw new Error("Unsupported file format. Please upload CSV or Excel files.")
      }

      console.log("[v0] File parsed successfully:", data)
      onFileUpload(data)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to parse file"
      console.error("[v0] Error:", errorMsg)
      setError(errorMsg)
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

  return (
    <Card className="p-8 border-2 border-indigo-200 bg-white shadow-lg">
      <div className="text-center space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Your Data File</h2>
          <p className="text-gray-600">Support for CSV and Excel files (.xlsx, .xls)</p>
        </div>

        <div
          className={`border-2 border-dashed rounded-lg p-12 transition-colors cursor-pointer ${
            isDragging ? "border-indigo-500 bg-indigo-50" : "border-indigo-300 bg-indigo-50/50 hover:border-indigo-400"
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

          <div className="space-y-2">
            <svg className="w-12 h-12 mx-auto text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <p className="text-lg font-semibold text-gray-900">Drag and drop your file here</p>
            <p className="text-sm text-gray-600">or click to select from your computer</p>
          </div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 text-sm">{error}</div>}

        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-2"
        >
          Select File
        </Button>
      </div>
    </Card>
  )
}
