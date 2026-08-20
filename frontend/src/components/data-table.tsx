"use client"

import { useState, Fragment } from "react"
import { Button } from "@/components/ui/button"

export interface TableData {
  headers: string[]
  rows: Record<string, unknown>[]
  columnTypes?: string[]
}
import { Input } from "@/components/ui/input"
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card"

interface DataTableProps {
  data: TableData
  onDataUpdate: (data: TableData) => void
  isLoadingMore?: boolean
  onLoadingMore?: (loading: boolean) => void
  readonly?: boolean
}

export function DataTable({ data, onDataUpdate, isLoadingMore = false, readonly = false }: DataTableProps) {
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [editingHeader, setEditingHeader] = useState<string | null>(null)
  const [editingHeaderValue, setEditingHeaderValue] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const RECORDS_PER_PAGE = 30

  const formatCellValue = (value: unknown, header: string): string => {
    if (value === null || value === undefined) return ""

    // Check if this is likely a date column or an ISO date string
    const isDateColumn = header.toLowerCase().includes("date") || header.toLowerCase().includes("time")
    const isIsoDate = typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)

    if (isDateColumn || isIsoDate || value instanceof Date) {
      const stringValue = value instanceof Date ? value.toISOString() : String(value)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
      const hasMonthName = monthNames.some((month) => stringValue.includes(month))

      // If already formatted with month name, just return it
      if (hasMonthName) {
        return stringValue
      }

      // Try to parse numeric/ISO dates
      try {
        const dateObj = value instanceof Date ? value : new Date(stringValue)
        if (!isNaN(dateObj.getTime())) {
          return dateObj.toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })
        }
      } catch {
        // If parsing fails, fall back to default
      }
    }

    if (typeof value === "number") {
      return value.toString()
    }

    if (typeof value === "boolean") {
      return value ? "true" : "false"
    }

    return String(value)
  }

  const handleSort = (key: string) => {
    let direction: "asc" | "desc" = "asc"
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc"
    }
    setSortConfig({ key, direction })
    setCurrentPage(1) // Reset to first page on sort
  }

  const getProcessedRows = () => {
    let processedRows = [...data.rows]

    // 1. Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase()
      processedRows = processedRows.filter((row) =>
        Object.values(row).some((value) => String(value).toLowerCase().includes(lowerTerm)),
      )
    }

    // 2. Sort
    if (sortConfig) {
      processedRows.sort((a, b) => {
        const aValue = a[sortConfig.key]
        const bValue = b[sortConfig.key]

        if (aValue === bValue) return 0
        
        // Handle null/undefined
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1

        // Numeric sort
        if (typeof aValue === "number" && typeof bValue === "number") {
          return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue
        }

        // String sort
        const aString = String(aValue).toLowerCase()
        const bString = String(bValue).toLowerCase()
        if (aString < bString) return sortConfig.direction === "asc" ? -1 : 1
        if (aString > bString) return sortConfig.direction === "asc" ? 1 : -1
        return 0
      })
    }

    return processedRows
  }

  const processedRows = getProcessedRows()
  
  const getPaginatedRows = () => {
    const totalRows = processedRows.length

    if (totalRows <= RECORDS_PER_PAGE + 5) {
      return { rows: processedRows, indices: processedRows.map((_, i) => i), displayIndicesStart: 0 }
    }

    const maxPage = Math.ceil((totalRows - 5) / RECORDS_PER_PAGE)
    const page = Math.min(currentPage, maxPage)

    const startIdx = (page - 1) * RECORDS_PER_PAGE
    const endIdx = Math.min(startIdx + RECORDS_PER_PAGE, totalRows - 5)

    const mainPart = processedRows.slice(startIdx, endIdx)
    // For indices, we need to map back to original indices if we want strictly original row numbers, 
    // but usually in sorted/filtered view, line numbers 1...N relative to view is acceptable. 
    // If we strictly need original indices, we'd need to store them in the row object or map differently.
    // For now, let's just show the index relative to the filter result to avoid confusion.
    
    const lastPart = processedRows.slice(-5)
    
    return { 
      rows: [...mainPart, lastPart].flat(),
      // Just returning simple indices for display
      displayIndicesStart: startIdx
    }
  }

  const handleRemoveColumn = (columnName: string) => {
    const newHeaders = data.headers.filter((h: string) => h !== columnName)
    const newRows = data.rows.map((row) => {
      const rest = { ...row }
      delete rest[columnName]
      return rest
    })
    onDataUpdate({ headers: newHeaders, rows: newRows })
  }

  // Re-implementing handleRemoveRow to work with object reference
  const handleRemoveRowByRef = (rowRef: Record<string, unknown>) => {
      const newRows = data.rows.filter((r: unknown) => r !== rowRef)
      onDataUpdate({ headers: data.headers, rows: newRows })
  }

  const handleRenameHeader = (oldName: string, newName: string) => {
    if (!newName.trim()) {
      setEditingHeader(null)
      return
    }

    if (newName !== oldName && data.headers.includes(newName)) {
      alert("A column with this name already exists")
      return
    }

    const newHeaders = data.headers.map((h) => (h === oldName ? newName : h))
    const newRows = data.rows.map((row) => {
      const newRow: Record<string, unknown> = {}
      Object.entries(row).forEach(([key, value]) => {
        newRow[key === oldName ? newName : key] = value
      })
      return newRow
    })

    onDataUpdate({ headers: newHeaders, rows: newRows })
    setEditingHeader(null)
  }

  const totalFilteredRows = processedRows.length
  const totalPages = Math.ceil(Math.max(totalFilteredRows - 5, 0) / RECORDS_PER_PAGE) || 1
  const maxPage = totalPages

  const { rows: paginatedRows, displayIndicesStart } = getPaginatedRows()
  const hasGap = totalFilteredRows > RECORDS_PER_PAGE + 5 && currentPage < maxPage

  return (
    <div className="flex-1 flex flex-col h-full space-y-4 overflow-hidden p-4">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between text-xs sm:text-sm text-muted-foreground mb-4">
        <span>
          {totalFilteredRows} rows found (Total: {data.rows.length}) × {data.headers.length} columns
        </span>
        <div className="flex items-center gap-2 w-full sm:w-auto">
             {!readonly && (
               <HoverCard>
                  <HoverCardTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-indigo-600 shrink-0">
                          <span className="sr-only">Help</span>
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-circle-help"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
                      </Button>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80">
                      <div className="space-y-4">
                          <h4 className="text-sm font-semibold">Page Features</h4>
                          <div className="grid gap-3 text-sm">
                              <div className="flex gap-2">
                                  <span className="font-bold text-indigo-600 min-w-[60px]">Search</span>
                                  <span className="text-muted-foreground">Type in the box to filter rows across all columns instantly.</span>
                              </div>
                              <div className="flex gap-2">
                                  <span className="font-bold text-indigo-600 min-w-[60px]">Sort</span>
                                  <span className="text-muted-foreground">Click any column header text to sort A-Z or Z-A.</span>
                              </div>
                              <div className="flex gap-2">
                                  <span className="font-bold text-indigo-600 min-w-[60px]">Edit</span>
                                  <span className="text-muted-foreground">Hover header and click <span className="inline-block">✎</span> to rename.</span>
                              </div>
                              <div className="flex gap-2">
                                  <span className="font-bold text-indigo-600 min-w-[60px]">Sticky</span>
                                  <span className="text-muted-foreground">Header & first column stay visible while scrolling.</span>
                              </div>
                              <div className="flex gap-2">
                                  <span className="font-bold text-indigo-600 min-w-[60px]">Delete</span>
                                  <span className="text-muted-foreground">Use <span className="text-red-500">✕</span> to remove specific columns or rows.</span>
                              </div>
                          </div>
                      </div>
                  </HoverCardContent>
               </HoverCard>
             )}
             <span className="sr-only">Search</span>
             <Input 
                placeholder="Search all columns..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full sm:max-w-xs text-xs sm:text-sm"
             />
        </div>
      </div>

      <div className="flex-1 border border-border rounded-xl shadow-inner overflow-auto touch-pan-x touch-pan-y relative bg-background backdrop-blur-sm max-w-full">
        <table className="border-collapse w-full text-left">
          <thead>
            <tr className="bg-muted border-b border-border sticky top-0 z-20 shadow-xs">
              <th className="px-3 py-3 text-center text-xs sm:text-sm font-semibold text-foreground bg-muted border-r border-border sticky left-0 z-30 w-16 min-w-[64px] shrink-0">
                #
              </th>
              {data.headers.map((header, idx) => (
                <th
                  key={header}
                  className="px-4 py-3 text-left text-xs sm:text-sm font-bold text-foreground bg-muted/95 backdrop-blur-sm border-r border-border shrink-0 cursor-pointer hover:bg-muted transition-colors"
                  style={{ minWidth: "180px" }}
                  onClick={() => handleSort(header)}
                >
                  <div className="flex items-center justify-between gap-2 group w-full min-w-0">
                    {editingHeader === header ? (
                      <Input
                        autoFocus
                        value={editingHeaderValue}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setEditingHeaderValue(e.target.value)}
                        onBlur={() => handleRenameHeader(header, editingHeaderValue)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleRenameHeader(header, editingHeaderValue)
                          } else if (e.key === "Escape") {
                            setEditingHeader(null)
                          }
                        }}
                        className="h-7 text-xs px-2"
                      />
                    ) : (
                      <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden" title="Click to sort">
                        <span className="truncate">
                            {header}
                        </span>
                        {data.columnTypes && data.columnTypes[idx] && data.columnTypes[idx] !== 'string' && (
                            <span className="text-[10px] bg-muted-foreground/10 text-muted-foreground px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ml-1">
                                {data.columnTypes[idx]}
                            </span>
                        )}
                        {sortConfig?.key === header ? (
                            <span className="text-xs text-indigo-600 font-bold shrink-0 ml-1">
                                {sortConfig?.direction === "asc" ? "↑" : "↓"}
                            </span>
                        ) : (
                            <span className="text-xs text-muted-foreground/40 font-bold shrink-0 ml-1">
                                ↕
                            </span>
                        )}
                      </div>
                    )}
                    {!readonly && (
                      <div className="flex items-center gap-1 shrink-0">
                          {editingHeader !== header && (
                              <Button
                              onClick={(e) => {
                                  e.stopPropagation()
                                  setEditingHeader(header)
                                  setEditingHeaderValue(header)
                              }}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-indigo-600 hover:bg-muted"
                              title="Rename column"
                              >
                              ✎
                              </Button>
                          )}
                          <Button
                          onClick={(e) => { e.stopPropagation(); handleRemoveColumn(header); }}
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground/50 hover:text-red-600 hover:bg-destructive/10"
                          title="Remove column"
                          >
                          ✕
                          </Button>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={data.headers.length + 1} className="px-4 py-8 text-center text-muted-foreground text-xs sm:text-sm">
                  No data matches your search
                </td>
              </tr>
            ) : (
              paginatedRows.map((row, index) => {
                // Correctly calculate index based on pagination or last part logic
                let displayIndex = displayIndicesStart + index + 1
                const isLastFive = hasGap && index >= RECORDS_PER_PAGE
                if (isLastFive) {
                     // The last 5 are always the absolute last 5 of filter results
                     displayIndex = totalFilteredRows - 5 + (index - RECORDS_PER_PAGE) + 1
                }

                const isLastFiveStart = hasGap && index === RECORDS_PER_PAGE

                return (
                  <Fragment key={index}>
                    {isLastFiveStart && (
                      <tr className="bg-muted/30 hover:bg-muted/30">
                        <td
                          colSpan={data.headers.length + 1}
                          className="px-4 py-2 text-xs text-muted-foreground font-semibold bg-muted/30"
                        >
                          <div className="sticky left-1/2 -translate-x-1/2 w-fit">
                            ... {totalFilteredRows - RECORDS_PER_PAGE - 5} more records ...
                          </div>
                        </td>
                      </tr>
                    )}
                    {/* Using a composite key or object reference if available would be better, but index is okay for display-only mostly */}
                    <tr key={index} className="border-b border-border/60 hover:bg-muted/30 transition-colors">
                      <td className="px-3 py-3 text-xs sm:text-sm text-muted-foreground bg-card font-semibold text-center border-r border-border sticky left-0 z-10 w-16 min-w-[64px] shrink-0">
                        <div className="flex items-center justify-between gap-1">
                          <span>{displayIndex}</span>
                          {!readonly && (
                            <Button
                              onClick={() => handleRemoveRowByRef(row)}
                              variant="ghost"
                              size="sm"
                              className="h-5 w-5 p-0 text-muted-foreground/40 hover:text-red-600 hover:bg-destructive/10"
                              title="Remove row"
                            >
                              ✕
                            </Button>
                          )}
                        </div>
                      </td>
                      {data.headers.map((header) => (
                        <td
                          key={`${index}-${header}`}
                          className="px-4 py-3 text-xs sm:text-sm text-foreground/90 border-r border-border/60 whitespace-pre-wrap break-words leading-relaxed shrink-0 align-top"
                          style={{ minWidth: "180px" }}
                        >
                          {formatCellValue(row[header], header)}
                        </td>
                      ))}
                    </tr>
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalFilteredRows > RECORDS_PER_PAGE && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border text-xs sm:text-sm">
          <div className="text-muted-foreground text-center sm:text-left">
            Page <span className="font-semibold">{currentPage}</span> of{" "}
            <span className="font-semibold">{maxPage}</span>
            {" | "}
            <span>
              {((currentPage - 1) * RECORDS_PER_PAGE + 1).toLocaleString()} -{" "}
              {Math.min(currentPage * RECORDS_PER_PAGE, totalFilteredRows - 5).toLocaleString()} records + last 5
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center justify-center">
            <Button
              onClick={() => setCurrentPage(1)}
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoadingMore}
              className="px-2 sm:px-3 text-xs"
              title="Go to first page"
            >
              {"<<"}
            </Button>

            <Button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              variant="outline"
              size="sm"
              disabled={currentPage === 1 || isLoadingMore}
              className="px-2 sm:px-3 text-xs"
            >
              Prev
            </Button>

            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, maxPage) }, (_, i) => {
                let pageNum = i + 1
                if (maxPage > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i
                }
                if (pageNum > maxPage) return null

                return (
                  <Button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    className={`w-7 h-7 sm:w-8 sm:h-8 p-0 text-xs ${
                      currentPage === pageNum ? "bg-indigo-600 text-white" : "bg-background text-foreground border-border"
                    }`}
                    disabled={isLoadingMore}
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>

            <Button
              onClick={() => setCurrentPage(Math.min(maxPage, currentPage + 1))}
              variant="outline"
              size="sm"
              disabled={currentPage === maxPage || isLoadingMore}
              className="px-2 sm:px-3 text-xs"
            >
              Next
            </Button>

            <Button
              onClick={() => setCurrentPage(maxPage)}
              variant="outline"
              size="sm"
              disabled={currentPage === maxPage || isLoadingMore}
              className="px-2 sm:px-3 text-xs"
              title="Go to last page"
            >
              {">>"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
