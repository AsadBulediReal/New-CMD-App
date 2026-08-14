import { useState, useEffect, useMemo } from "react";
import { decompressSheetData } from "../utils/dataProcessing";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { MultiSheetViewer, type SheetData } from "../components/multi-sheet-viewer";
import {
  Search,
  RefreshCw,
  Trash2,
  Eye,
  Download,
  ArrowLeft,
  LayoutGrid,
  List,
  SortAsc,
  SortDesc,
  Calendar,
  Database,
  FileSpreadsheet,
  CheckSquare,
  Square,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowDownRight,
  HelpCircle,
  Scan,
  CalendarDays,
  Coins,
  ShieldCheck,
  Zap,
  Layers,
  ArrowUpRight
} from "lucide-react";
import { HelpDialog } from "../components/shared/help-dialog";
import {
  downloadSingleSavedFile,
  downloadBulkSavedFilesAsZip,
  type DownloadProgress
} from "../utils/fileExporter";

interface StoredFile {
  _id: string;
  filename: string;
  uploadDate: string;
  headers: string[];
  totalRecords?: number;
  recordDateRange?: { start: string | null; end: string | null };
  columnCount?: number;
  sheetCount?: number;
  sheetMeta?: {
    name: string;
    recordCount: number;
    columnCount: number;
  }[];
  financialSummary?: {
    totalDebit?: number;
    totalCredit?: number;
    netFlow?: number;
    debitCount?: number;
    creditCount?: number;
    hasFinancialData?: boolean;
  };
}

interface LoadedData {
  filename: string;
  sheets: SheetData[];
}

type SortField = "uploadDate" | "filename" | "totalRecords";
type SortDir = "asc" | "desc";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 12;

// Skeleton card
function SkeletonCard() {
  return (
    <div className="bg-card/40 border border-border rounded-2xl p-6 animate-pulse">
      <div className="h-5 bg-muted rounded-lg w-3/4 mb-4" />
      <div className="space-y-2 mb-6">
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-2/3" />
        <div className="h-3 bg-muted rounded w-1/2" />
      </div>
      <div className="flex gap-2 pt-4 border-t border-border/50">
        <div className="flex-1 h-9 bg-muted rounded-xl" />
        <div className="w-9 h-9 bg-muted rounded-xl" />
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-5 py-4 border-b border-border/40 animate-pulse">
      <div className="w-5 h-5 bg-muted rounded" />
      <div className="flex-1 h-4 bg-muted rounded" />
      <div className="w-24 h-4 bg-muted rounded" />
      <div className="w-16 h-4 bg-muted rounded" />
      <div className="w-28 h-4 bg-muted rounded" />
      <div className="w-20 h-8 bg-muted rounded-lg" />
      <div className="w-8 h-8 bg-muted rounded-lg" />
    </div>
  );
}

export default function SavedFiles() {
  const [showHelp, setShowHelp] = useState(false);

  const features = [
    {
      icon: <Scan className="w-5 h-5 text-blue-500" />,
      title: "Metadata Scanning",
      desc: "Deep-scans Excel/JSON files to automatically extract dates, record counts, and sheet metadata."
    },
    {
      icon: <CalendarDays className="w-5 h-5 text-cyan-500" />,
      title: "Transaction Filters",
      desc: "Filter results by the actual transaction dates found inside records, not just by upload time."
    },
    {
      icon: <Coins className="w-5 h-5 text-emerald-500" />,
      title: "Financial Stats",
      desc: "Instantly view Net Flow and Credit/Debit tallies directly on document cards without opening them."
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-indigo-500" />,
      title: "Batch Management",
      desc: "Select and delete multiple reports at once to keep your workspace organized and efficient."
    },
    {
      icon: <Download className="w-5 h-5 text-emerald-500" />,
      title: "Bulk ZIP Export",
      desc: "Download multiple reports or all filtered files simultaneously in a single compressed .zip package."
    }
  ];
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [fileData, setFileData] = useState<LoadedData | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; filename: string } | null>(null);

  // Advanced controls
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [sortField, setSortField] = useState<SortField>("uploadDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [page, setPage] = useState(1);

  // Date range filter (based on recordDateRange from records, not upload date)
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [rescanLoading, setRescanLoading] = useState(false);
  const [rescanMsg, setRescanMsg] = useState<string | null>(null);

  const handleSingleDownload = async (id: string, filename: string) => {
    try {
      setDownloadingId(id);
      await downloadSingleSavedFile(id, filename);
    } catch (error) {
      console.error("Single download error:", error);
      alert("Failed to download file. Ensure backend server is running.");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleBulkDownloadSelected = async () => {
    const selectedFiles = files.filter(f => selectedIds.has(f._id));
    if (selectedFiles.length === 0) return;
    try {
      setBulkDownloading(true);
      await downloadBulkSavedFilesAsZip(
        selectedFiles.map(f => ({ id: f._id, filename: f.filename })),
        p => setDownloadProgress(p)
      );
    } catch (error) {
      console.error("Bulk download error:", error);
      alert("Bulk download failed. Please check network and try again.");
    } finally {
      setBulkDownloading(false);
    }
  };

  const handleBulkDownloadAll = async () => {
    if (processedFiles.length === 0) return;
    try {
      setBulkDownloading(true);
      await downloadBulkSavedFilesAsZip(
        processedFiles.map(f => ({ id: f._id, filename: f.filename })),
        p => setDownloadProgress(p)
      );
    } catch (error) {
      console.error("Bulk download error:", error);
      alert("Bulk download failed. Please check network and try again.");
    } finally {
      setBulkDownloading(false);
    }
  };

  useEffect(() => { fetchFiles(); }, []);
  // Reset page on search/filter change
  useEffect(() => { setPage(1); }, [search, sortField, sortDir, dateFrom, dateTo]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setRescanMsg(null);
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error(`Failed to fetch files: ${res.statusText}`);
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setFiles(data);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRescanDates = async () => {
    setRescanLoading(true);
    setRescanMsg(null);
    try {
      // Ensure the "Scanning..." state stays active for at least 1 second for visual feedback
      const [res] = await Promise.all([
        fetch("/api/files/recompute-meta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        }),
        new Promise(resolve => setTimeout(resolve, 1000))
      ]);
      const data = await res.json();
      setRescanMsg(data.message || "Done");
      // Refresh file list so new metadata appears
      await fetchFiles();
    } catch (err) {
      setRescanMsg("Re-scan failed. Check backend.");
    } finally {
      setRescanLoading(false);
    }
  };

  const handleLoadFile = async (id: string, filename: string) => {
    try {
      setLoadingId(id);
      const res = await fetch(`/api/files/${id}`);
      if (!res.ok) throw new Error(`Failed to load file: ${res.statusText}`);
      const data = await res.json();
      if (data) {
        let sheetsToLoad: SheetData[] = [];
        if (data.sheets && data.sheets.length > 0) {
          sheetsToLoad = decompressSheetData(data.sheets.map((s: any, idx: number) => {
            const meta = data.sheetMeta?.find((m: any) => m.name === s.name);
            return {
              name: s.name || `Sheet ${idx + 1}`,
              headers: s.headers || [],
              rows: s.rows || [],
              columnTypes: meta?.columnTypes || [],
            };
          }));
        } else {
          const firstMeta = data.sheetMeta?.[0];
          sheetsToLoad = decompressSheetData([{
            name: "Sheet 1",
            headers: data.headers || [],
            rows: data.rows || [],
            columnTypes: firstMeta?.columnTypes || [],
          }]);
        }
        setFileData({ filename: data.filename || filename, sheets: sheetsToLoad });
      }
    } catch (error) {
      console.error("Failed to load file:", error);
      alert("Error loading file data. Ensure backend is running.");
    } finally {
      setLoadingId(null);
    }
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;
    try {
      const res = await fetch(`/api/files/${fileToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete file`);
      setFiles(files.filter(f => f._id !== fileToDelete.id));
      setSelectedIds(prev => { const n = new Set(prev); n.delete(fileToDelete.id); return n; });
      setFileToDelete(null);
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const executeBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      const ids = Array.from(selectedIds);
      const res = await fetch("/api/files/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error("Bulk delete failed");
      setFiles(prev => prev.filter(f => !selectedIds.has(f._id)));
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
    } catch (error) {
      console.error("Bulk delete error:", error);
    } finally {
      setBulkDeleting(false);
    }
  };

  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);

  const toggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (e?.shiftKey && lastSelectedId && lastSelectedId !== id) {
      const currentIndex = processedFiles.findIndex(f => f._id === id);
      const lastIndex = processedFiles.findIndex(f => f._id === lastSelectedId);

      if (currentIndex !== -1 && lastIndex !== -1) {
        const start = Math.min(currentIndex, lastIndex);
        const end = Math.max(currentIndex, lastIndex);
        const rangeIds = processedFiles.slice(start, end + 1).map(f => f._id);

        setSelectedIds(prev => {
          const n = new Set(prev);
          rangeIds.forEach(rangeId => n.add(rangeId));
          return n;
        });
        setLastSelectedId(id);
        return;
      }
    }

    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setLastSelectedId(id);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === processedFiles.length) {
      setSelectedIds(new Set());
      setLastSelectedId(null);
    } else {
      setSelectedIds(new Set(processedFiles.map(f => f._id)));
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  // Filtering + Sorting
  const processedFiles = useMemo(() => {
    let result = files.filter(f =>
      f.filename.toLowerCase().includes(search.toLowerCase())
    );

    // Date range filter using recordDateRange (dates saved IN the records)
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(f => {
        const end = f.recordDateRange?.end ? new Date(f.recordDateRange.end) : null;
        return end ? end >= from : true;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(f => {
        const start = f.recordDateRange?.start ? new Date(f.recordDateRange.start) : null;
        return start ? start <= to : true;
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "uploadDate") {
        cmp = new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime();
      } else if (sortField === "filename") {
        cmp = a.filename.localeCompare(b.filename);
      } else if (sortField === "totalRecords") {
        cmp = (a.totalRecords ?? 0) - (b.totalRecords ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [files, search, sortField, sortDir, dateFrom, dateTo]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(processedFiles.length / PAGE_SIZE));
  const pagedFiles = processedFiles.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const SortButton = ({ field, label }: { field: SortField; label: string }) => (
    <button
      onClick={() => handleSort(field)}
      className={`flex items-center gap-1 text-xs font-semibold transition-colors ${
        sortField === field ? "text-blue-500" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
      {sortField === field ? (
        sortDir === "asc" ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
      ) : <SortAsc className="w-3 h-3 opacity-30" />}
    </button>
  );

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  const hasActiveFilters = dateFrom || dateTo;

  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Corporate Grid texture background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          color: "var(--border)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10">

        {/* ── Corporate Header ── */}
        <header className="mb-8 border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              Finance Wing · Vault Storage
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Document & Report Vault
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              {loading ? "Accessing vault repository…" : `Repository storing ${files.length} verified financial record set${files.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button 
               variant="outline" 
               onClick={() => setShowHelp(true)}
               className="border-border text-foreground hover:bg-muted gap-2 h-9 px-3.5 rounded-md font-semibold text-xs"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              Vault Guidelines
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground h-9 text-xs font-semibold">
              <Link to="/" className="flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>

        <HelpDialog 
          isOpen={showHelp}
          onOpenChange={setShowHelp}
          title="Vault Guidelines"
          subtitle="Manage and filter your processed processed data sets."
          features={features}
        />

        {/* ── Toolbar ── */}
        <div className="bg-card/40 backdrop-blur-xl rounded-2xl border border-border p-4 mb-4 space-y-3 transition-all">
          {/* Row 1: Search + View + Refresh */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search by filename…"
                className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Filter toggle */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(v => !v)}
                className={`gap-2 border-border/60 text-foreground transition-all ${showFilters || hasActiveFilters ? "bg-blue-500/10 border-blue-500/30 text-blue-500" : "hover:bg-muted"}`}
              >
                <Filter className="w-4 h-4" />
                Filters
                {hasActiveFilters && (
                  <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                )}
              </Button>
              {/* View toggle */}
              <div className="flex border border-border/60 rounded-xl overflow-hidden">
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:text-foreground"}`}
                  title="Grid view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2.5 transition-colors ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-background text-muted-foreground hover:text-foreground"}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchFiles}
                className="gap-2 border-border/60 hover:bg-muted text-foreground"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRescanDates}
                disabled={rescanLoading}
                className="gap-2 border-border/60 hover:bg-muted text-foreground"
                title="Scan existing files to extract and save their records counts, layouts, and date ranges."
              >
                <Zap className={`w-4 h-4 ${rescanLoading ? "animate-pulse text-yellow-500" : ""}`} />
                {rescanLoading ? "Scanning…" : "Re-scan Metadata"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkDownloadAll}
                disabled={bulkDownloading || processedFiles.length === 0}
                className="gap-2 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                title="Download all currently visible files in a single ZIP archive"
              >
                <Download className={`w-4 h-4 ${bulkDownloading ? "animate-bounce" : ""}`} />
                {bulkDownloading ? "Exporting..." : "Download All (ZIP)"}
              </Button>
            </div>
          </div>

          {/* Row 2: Date Range Filter (collapsible) */}
          {showFilters && (
            <div className="pt-3 border-t border-border/50 flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground shrink-0">
                <Calendar className="w-4 h-4 text-blue-500" />
                Record Date Range
              </div>
              <div className="flex flex-1 items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-muted-foreground">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                  />
                </div>
                {hasActiveFilters && (
                  <button
                    onClick={() => { setDateFrom(""); setDateTo(""); }}
                    className="text-xs text-red-500 hover:text-red-400 font-medium flex items-center gap-1"
                  >
                    <X className="w-3 h-3" /> Clear dates
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Rescan result */}
        {rescanMsg && (
          <div className="mb-4 flex items-center gap-3 px-4 py-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 text-xs font-medium">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            {rescanMsg}
            <button onClick={() => setRescanMsg(null)} className="ml-auto hover:opacity-70">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── Sort bar + Bulk action bar ── */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mb-6 px-1">
          <div className="flex items-center gap-5">
            <span className="text-xs text-muted-foreground font-medium">Sort by:</span>
            <SortButton field="uploadDate" label="Date Uploaded" />
            <SortButton field="filename" label="Name" />
            <SortButton field="totalRecords" label="Records" />
          </div>
          <span className="text-xs text-muted-foreground">
            {processedFiles.length} result{processedFiles.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="mb-4 flex items-center gap-4 px-5 py-3 bg-blue-500/10 border border-blue-500/25 rounded-2xl backdrop-blur-xl">
            <span className="text-sm font-bold text-blue-500">
              {selectedIds.size} file{selectedIds.size !== 1 ? "s" : ""} selected
            </span>
            <div className="flex-1" />
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedIds(new Set())}
            >
              <X className="w-4 h-4 mr-1" /> Deselect all
            </Button>
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 shadow-lg shadow-emerald-500/20 font-bold"
              onClick={handleBulkDownloadSelected}
              disabled={bulkDownloading}
            >
              {bulkDownloading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {bulkDownloading ? "Downloading..." : `Download Selected (${selectedIds.size})`}
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-lg shadow-red-500/20"
              onClick={() => setBulkDeleteOpen(true)}
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </Button>
          </div>
        )}

        {/* ── Content ── */}
        {loading ? (
          viewMode === "grid" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="bg-card/40 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
              {Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)}
            </div>
          )
        ) : pagedFiles.length === 0 ? (
          <div className="text-center py-24 bg-card/20 rounded-3xl border border-dashed border-border text-muted-foreground">
            <div className="inline-flex w-16 h-16 rounded-full bg-muted items-center justify-center mb-4">
              <FileSpreadsheet className="w-7 h-7 opacity-20" />
            </div>
            <p className="font-semibold text-lg">No files found</p>
            <p className="text-sm mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : viewMode === "grid" ? (
          // ── Grid View ──
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Select-all card */}
            {processedFiles.length > 1 && (
              <button
                onClick={toggleSelectAll}
                className="col-span-full flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground font-medium mb-1 transition-colors"
              >
                {selectedIds.size === processedFiles.length ? (
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                ) : (
                  <Square className="w-4 h-4" />
                )}
                {selectedIds.size === processedFiles.length ? "Deselect all" : "Select all"}
              </button>
            )}
            {pagedFiles.map(file => {
              const isSelected = selectedIds.has(file._id);
              return (
                <div
                  key={file._id}
                  onClick={(e) => toggleSelect(file._id, e)}
                  className={`group relative bg-card/40 backdrop-blur-xl border rounded-2xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl cursor-pointer select-none ${
                    isSelected
                      ? "border-blue-500/50 shadow-xl shadow-blue-500/10 bg-blue-500/5"
                      : "border-border hover:border-blue-500/30 hover:shadow-blue-500/5"
                  }`}
                >
                  {/* Selection checkbox */}
                  <button
                    onClick={(e) => toggleSelect(file._id, e)}
                    className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity z-10 p-1 rounded-md hover:bg-muted/50"
                    title="Click to select (Hold Shift for range select)"
                    style={{ opacity: isSelected ? 1 : undefined }}
                  >
                    {isSelected ? (
                      <CheckSquare className="w-5 h-5 text-blue-500" />
                    ) : (
                      <Square className="w-5 h-5 text-muted-foreground" />
                    )}
                  </button>

                  {/* Glow on selected */}
                  {isSelected && (
                    <div className="absolute inset-0 rounded-2xl bg-blue-500/5 pointer-events-none" />
                  )}

                  <div className="flex items-start gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-cyan-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1 pr-6">
                      <h3 className="text-sm font-bold text-foreground truncate group-hover:text-blue-500 transition-colors" title={file.filename}>
                        {file.filename}
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-2.5 mb-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-3">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Uploaded: <span className="text-foreground/80 font-medium">{formatDate(file.uploadDate)}</span></span>
                    </div>

                    {(file.recordDateRange?.start || file.recordDateRange?.end) && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-cyan-500" />
                        <span className="text-cyan-600 dark:text-cyan-400 font-medium truncate">
                          {formatDate(file.recordDateRange?.start)} – {formatDate(file.recordDateRange?.end)}
                        </span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                       <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded-lg border border-border/50">
                         <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Database className="w-3 h-3 text-blue-400"/> Records</div>
                         <span className="font-bold text-sm text-foreground">{file.totalRecords?.toLocaleString() ?? "—"}</span>
                       </div>
                       <div className="flex flex-col gap-1 p-2 bg-muted/30 rounded-lg border border-border/50">
                         <div className="flex items-center gap-1.5 text-xs text-muted-foreground"><Layers className="w-3 h-3 text-emerald-400"/> Sheets / Cols</div>
                         <span className="font-bold text-sm text-foreground">{file.sheetCount || 1} / {file.columnCount || (file.headers?.length || 0)}</span>
                       </div>
                    </div>

                    {file.sheetMeta && file.sheetMeta.length > 0 && (
                      <div className="mt-3 space-y-1.5">
                        <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Sheet Breakdown</div>
                        {file.sheetMeta.slice(0, 3).map((sm, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px] bg-muted/20 px-2 py-1.5 rounded-md border border-border/40">
                            <span className="truncate pr-2 font-medium text-foreground/80" title={sm.name}>{sm.name}</span>
                            <span className="text-muted-foreground shrink-0">{sm.recordCount} rows</span>
                          </div>
                        ))}
                        {file.sheetMeta.length > 3 && (
                          <div className="text-[10px] text-center text-muted-foreground pt-0.5 italic">
                            + {file.sheetMeta.length - 3} more sheets
                          </div>
                        )}
                      </div>
                    )}

                    {file.financialSummary?.hasFinancialData && (
                      <div className="flex flex-col gap-1.5 p-2 bg-blue-500/5 rounded-lg border border-blue-500/10 mt-2">
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><ArrowDownRight className="w-3 h-3 text-red-400"/> Db: {(file.financialSummary.totalDebit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                          <span className="flex items-center gap-1"><ArrowUpRight className="w-3 h-3 text-green-400"/> Cr: {(file.financialSummary.totalCredit || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-xs">
                          <span className="text-muted-foreground">Net Flow:</span>
                          <span className={(file.financialSummary.netFlow || 0) >= 0 ? "text-green-500" : "text-red-500"}>
                            {(file.financialSummary.netFlow || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 pt-4 border-t border-border/50" onClick={(e) => e.stopPropagation()}>
                    <Button
                      className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 py-2.5 h-auto transition-all shadow-lg shadow-blue-500/15"
                      onClick={(e) => { e.stopPropagation(); handleLoadFile(file._id, file.filename); }}
                      disabled={loadingId === file._id}
                    >
                      {loadingId === file._id ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        <Eye className="w-3 h-3" />
                      )}
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      className="aspect-square p-0 rounded-xl border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); handleSingleDownload(file._id, file.filename); }}
                      disabled={downloadingId === file._id}
                      title="Download Excel file"
                    >
                      {downloadingId === file._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      className="aspect-square p-0 rounded-xl border-red-500/20 text-red-500 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); setFileToDelete({ id: file._id, filename: file.filename }); }}
                      title="Delete permanently"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          // ── List View ──
          <div className="bg-card/40 backdrop-blur-xl border border-border rounded-2xl overflow-hidden">
            {/* List Header */}
            <div className="flex items-center gap-4 px-5 py-3 border-b border-border/60 bg-muted/30">
              <button onClick={toggleSelectAll} className="shrink-0">
                {selectedIds.size === processedFiles.length && processedFiles.length > 0 ? (
                  <CheckSquare className="w-4 h-4 text-blue-500" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
              <button className="flex-1 text-left text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => handleSort("filename")}>
                Filename {sortField === "filename" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
              <button className="w-32 text-left text-xs font-semibold text-muted-foreground hover:text-foreground hidden lg:block" onClick={() => handleSort("uploadDate")}>
                Uploaded {sortField === "uploadDate" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
              <button className="w-20 text-left text-xs font-semibold text-muted-foreground hover:text-foreground hidden sm:block" onClick={() => handleSort("totalRecords")}>
                Records {sortField === "totalRecords" && (sortDir === "asc" ? "↑" : "↓")}
              </button>
              <div className="w-24 text-left text-xs font-semibold text-muted-foreground hidden lg:block">
                Sheets/Cols
              </div>
              <div className="w-32 text-left text-xs font-semibold text-muted-foreground hidden xl:block">
                Net Flow
              </div>
              <div className="w-32 text-left text-xs font-semibold text-muted-foreground hidden xl:block">
                Record Dates
              </div>
              <div className="w-36 shrink-0" />
            </div>

            {pagedFiles.map((file, idx) => {
              const isSelected = selectedIds.has(file._id);
              return (
                <div
                  key={file._id}
                  onClick={(e) => toggleSelect(file._id, e)}
                  className={`flex items-center gap-4 px-5 py-4 transition-colors border-b border-border/30 last:border-b-0 group cursor-pointer select-none ${
                    isSelected ? "bg-blue-500/5" : idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                  } hover:bg-blue-500/5`}
                >
                  <button
                    onClick={(e) => toggleSelect(file._id, e)}
                    className="shrink-0 p-1 rounded-md hover:bg-muted/50"
                    title="Click to select (Hold Shift for range select)"
                  >
                    {isSelected ? (
                      <CheckSquare className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Square className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                      <FileSpreadsheet className="w-4 h-4 text-blue-500" />
                    </div>
                    <span className="text-sm font-semibold text-foreground truncate group-hover:text-blue-500 transition-colors" title={file.filename}>
                      {file.filename}
                    </span>
                  </div>
                  <div className="w-32 text-[11px] text-muted-foreground hidden lg:block">{formatDate(file.uploadDate)}</div>
                  <div className="w-20 hidden sm:block">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-sm text-[11px] font-bold ${
                      (file.totalRecords ?? 0) > 1000
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                        : "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                    }`}>
                      {file.totalRecords?.toLocaleString() ?? "—"}
                    </span>
                  </div>
                  <div 
                    className="w-24 text-[11px] text-muted-foreground hidden lg:block"
                    title={file.sheetMeta?.map(s => `${s.name}: ${s.recordCount} rows`).join('\n') || "Sheet Breakdown"}
                  >
                     {file.sheetCount || 1} Sheets / {file.columnCount || (file.headers?.length || 0)} Cols
                  </div>
                  <div className="w-32 hidden xl:block">
                     {file.financialSummary?.hasFinancialData ? (
                       <span className={`text-[11px] font-bold ${
                         (file.financialSummary.netFlow || 0) >= 0 ? "text-green-500" : "text-red-500"
                       }`}>
                         {(file.financialSummary.netFlow || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                       </span>
                     ) : (
                       <span className="text-[11px] text-muted-foreground">—</span>
                     )}
                  </div>
                  <div className="w-32 hidden xl:block">
                    {file.recordDateRange?.start ? (
                      <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-medium leading-tight">
                        {formatDate(file.recordDateRange?.start)} –<br />
                        {formatDate(file.recordDateRange?.end)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground">—</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      className="rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1.5 h-8 px-3 shadow-md shadow-blue-500/15"
                      onClick={(e) => { e.stopPropagation(); handleLoadFile(file._id, file.filename); }}
                      disabled={loadingId === file._id}
                    >
                      {loadingId === file._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                      Preview
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:border-emerald-500 hover:text-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); handleSingleDownload(file._id, file.filename); }}
                      disabled={downloadingId === file._id}
                      title="Download Excel file"
                    >
                      {downloadingId === file._id ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg border-red-500/20 text-red-500 hover:bg-red-500 hover:border-red-500 hover:text-white transition-all duration-200"
                      onClick={(e) => { e.stopPropagation(); setFileToDelete({ id: file._id, filename: file.filename }); }}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Pagination ── */}
        {!loading && processedFiles.length > PAGE_SIZE && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="gap-1 border-border/60"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </Button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                  if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) =>
                  p === "..." ? (
                    <span key={`ellipsis-${i}`} className="px-2 text-muted-foreground text-sm">…</span>
                  ) : (
                    <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                        page === p
                          ? "bg-blue-600 text-white shadow-lg shadow-blue-500/20"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  )
                )
              }
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="gap-1 border-border/60"
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* ── Preview Modal ── */}
      <Dialog open={!!fileData} onOpenChange={open => !open && setFileData(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[90vh] sm:h-[90vh] max-h-[95vh] flex flex-col border-border bg-background shadow-2xl overflow-hidden p-0 gap-0 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] duration-200">
          <DialogHeader className="p-4 border-b border-border bg-card/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black truncate text-foreground flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Eye className="w-4 h-4" />
                </div>
                Preview: {fileData?.filename}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
            {fileData && (
              <MultiSheetViewer sheets={fileData.sheets} readonly={true} downloadFilename={fileData.filename} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Single Delete Modal ── */}
      <Dialog open={!!fileToDelete} onOpenChange={open => !open && setFileToDelete(null)}>
        <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              You are about to permanently remove{" "}
              <span className="text-foreground font-bold underline decoration-red-500/30 underline-offset-4">{fileToDelete?.filename}</span>{" "}
              from the vault.
            </p>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
              ⚠ This action cannot be reversed
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold flex-1 sm:flex-none" onClick={() => setFileToDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="font-bold flex-1 sm:flex-none bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20" onClick={executeDelete}>
              Purge File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Delete Modal ── */}
      <Dialog open={bulkDeleteOpen} onOpenChange={open => !open && setBulkDeleteOpen(false)}>
        <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Bulk Delete</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              You are about to permanently delete{" "}
              <span className="text-foreground font-bold">{selectedIds.size} file{selectedIds.size !== 1 ? "s" : ""}</span>{" "}
              from the vault.
            </p>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
              ⚠ This action cannot be reversed
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold flex-1 sm:flex-none" onClick={() => setBulkDeleteOpen(false)} disabled={bulkDeleting}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="font-bold flex-1 sm:flex-none bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20 gap-2"
              onClick={executeBulkDelete}
              disabled={bulkDeleting}
            >
              {bulkDeleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {bulkDeleting ? "Deleting…" : `Purge ${selectedIds.size} File${selectedIds.size !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Bulk Download Progress Modal ── */}
      <Dialog open={!!downloadProgress} onOpenChange={open => !open && !bulkDownloading && setDownloadProgress(null)}>
        <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-extrabold text-foreground flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Download className="w-5 h-5" />
              </div>
              {downloadProgress?.phase === "complete" ? "Export Ready!" : "Preparing ZIP Archive"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>Progress ({downloadProgress?.current || 0} / {downloadProgress?.total || 0})</span>
              <span className="text-emerald-500 font-bold">
                {Math.round(((downloadProgress?.current || 0) / (downloadProgress?.total || 1)) * 100)}%
              </span>
            </div>

            <div className="w-full bg-muted/60 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.round(((downloadProgress?.current || 0) / (downloadProgress?.total || 1)) * 100))}%` }}
              />
            </div>

            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/50 text-xs flex items-center gap-3">
              {downloadProgress?.phase !== "complete" ? (
                <RefreshCw className="w-4 h-4 text-emerald-500 animate-spin shrink-0" />
              ) : (
                <CheckSquare className="w-4 h-4 text-emerald-500 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-foreground truncate">{downloadProgress?.currentFilename}</p>
                <p className="text-[11px] text-muted-foreground">
                  {downloadProgress?.phase === "fetching" && "Fetching spreadsheet records from server..."}
                  {downloadProgress?.phase === "zipping" && "Compressing Excel files into ZIP..."}
                  {downloadProgress?.phase === "complete" && "ZIP package downloaded to your device."}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              disabled={bulkDownloading}
              onClick={() => setDownloadProgress(null)}
              className="font-bold rounded-xl"
            >
              {downloadProgress?.phase === "complete" ? "Done" : "Hide"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
