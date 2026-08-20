import { useState, useMemo, useRef, useEffect, type ReactNode } from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Search,
  ChevronDown,
  Database,
  CalendarRange,
  FileStack,
  X,
  CheckCircle2,
  Clock,
  ChevronUp,
  Filter,
} from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface StoredFileMeta {
  _id: string;
  filename: string;
  uploadDate: string;
  headers: string[];
  totalRecords?: number;
  recordDateRange?: { start?: string; end?: string };
  sheets?: { name: string; headers: string[] }[];
}

export interface DateFilter {
  column: string;
  start: string | undefined;   // ISO string
  end: string | undefined;     // ISO string
}

export interface AdvancedFileSelectorProps {
  /** All available files from the vault */
  files: StoredFileMeta[];
  /** Currently selected file id */
  selectedFileId: string;
  /** Callback when file selection changes */
  onFileChange: (fileId: string) => void;
  /** Currently selected sheet name (for multi-sheet files) */
  selectedSheetName?: string;
  /** Callback when sheet changes */
  onSheetChange?: (sheetName: string) => void;
  /** Whether to show date filter section */
  showDateFilter?: boolean;
  /** Current date filter state */
  dateFilter?: DateFilter;
  /** Callback when date filter changes */
  onDateFilterChange?: (filter: DateFilter) => void;
  /** Disabled state (e.g., while processing) */
  disabled?: boolean;
  /** Accent colour for focus rings etc. */
  accentColor?: "blue" | "sky" | "violet" | "purple" | "cyan";
  /** Label shown above the combobox */
  label?: string;
  /** Icon shown in label */
  labelIcon?: ReactNode;
  /** Loading state */
  loading?: boolean;
}

// ─── Accent helpers ───────────────────────────────────────────────────────────
function accent(color: string) {
  const map: Record<string, { ring: string; bg: string; text: string; border: string; badge: string }> = {
    blue:   { ring: "focus-within:ring-blue-500/20 focus-within:border-blue-500/40",   bg: "bg-blue-500/5",   text: "text-blue-600 dark:text-blue-400",   border: "border-blue-500/20",   badge: "bg-blue-500/10 text-blue-600 border-blue-500/20"   },
    sky:    { ring: "focus-within:ring-sky-500/20 focus-within:border-sky-500/40",     bg: "bg-sky-500/5",    text: "text-sky-600 dark:text-sky-400",     border: "border-sky-500/20",    badge: "bg-sky-500/10 text-sky-600 border-sky-500/20"     },
    violet: { ring: "focus-within:ring-violet-500/20 focus-within:border-violet-500/40", bg: "bg-violet-500/5", text: "text-violet-600 dark:text-violet-400", border: "border-violet-500/20", badge: "bg-violet-500/10 text-violet-600 border-violet-500/20" },
    purple: { ring: "focus-within:ring-purple-500/20 focus-within:border-purple-500/40", bg: "bg-purple-500/5", text: "text-purple-600 dark:text-purple-400", border: "border-purple-500/20", badge: "bg-purple-500/10 text-purple-600 border-purple-500/20" },
    cyan:   { ring: "focus-within:ring-cyan-500/20 focus-within:border-cyan-500/40",   bg: "bg-cyan-500/5",   text: "text-cyan-600 dark:text-cyan-400",   border: "border-cyan-500/20",   badge: "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"   },
  };
  return map[color] ?? map.blue;
}

// ─── Quick-filter presets ─────────────────────────────────────────────────────
const DATE_PRESETS = [
  { label: "All Time", days: 0 },
  { label: "Last 7 days", days: 7 },
  { label: "Last 30 days", days: 30 },
  { label: "Last 90 days", days: 90 },
];

// ─── Component ────────────────────────────────────────────────────────────────
export function AdvancedFileSelector({
  files,
  selectedFileId,
  onFileChange,
  selectedSheetName = "",
  onSheetChange,
  showDateFilter = true,
  dateFilter,
  onDateFilterChange,
  disabled = false,
  accentColor = "blue",
  label = "Source File",
  labelIcon,
  loading = false,
}: AdvancedFileSelectorProps) {
  const ac = accent(accentColor);

  // ── Combobox state ─────────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [listPreset, setListPreset] = useState(0); // days filter for list; 0 = all
  const dropRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: globalThis.MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Date filter toggle ─────────────────────────────────────────────────────
  const [showFilter, setShowFilter] = useState(false);

  // ── Filtered file list ─────────────────────────────────────────────────────
  const filteredFiles = useMemo(() => {
    let list = files;
    if (listPreset > 0) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - listPreset);
      list = list.filter((f) => new Date(f.uploadDate) >= cutoff);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((f) => f.filename.toLowerCase().includes(q));
    }
    return list;
  }, [files, search, listPreset]);

  const selectedFile = files.find((f) => f._id === selectedFileId);
  const hasMultipleSheets = (selectedFile?.sheets?.length ?? 0) > 1;

  // Available columns for date column dropdown
  const availableColumns: string[] = useMemo(() => {
    if (!selectedFile) return [];
    if (selectedSheetName) {
      const sh = selectedFile.sheets?.find((s) => s.name === selectedSheetName);
      return sh?.headers ?? selectedFile.headers ?? [];
    }
    return selectedFile.sheets?.[0]?.headers ?? selectedFile.headers ?? [];
  }, [selectedFile, selectedSheetName]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleSelect = (fileId: string) => {
    onFileChange(fileId);
    setOpen(false);
    setSearch("");
    // Reset date filter on file change
    onDateFilterChange?.({ column: "", start: undefined, end: undefined });
    setShowFilter(false);
  };

  const handleClear = (e: ReactMouseEvent) => {
    e.stopPropagation();
    doClear();
  };

  const doClear = () => {
    onFileChange("");
    onDateFilterChange?.({ column: "", start: undefined, end: undefined });
    setShowFilter(false);
  };

  const updateDateFilter = (patch: Partial<DateFilter>) => {
    onDateFilterChange?.({ column: "", start: undefined, end: undefined, ...dateFilter, ...patch });
  };

  const hasActiveFilter =
    !!(dateFilter?.column && (dateFilter?.start || dateFilter?.end));

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-3">
      {/* Label */}
      <div className={cn("flex items-center gap-2 text-foreground font-bold text-xs uppercase tracking-widest opacity-60")}>
        {labelIcon ?? <Database className="w-3.5 h-3.5" />}
        {label}
      </div>

      {/* ── Combobox ── */}
      <div ref={dropRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-background text-left transition-all",
            "hover:border-muted-foreground/40 focus:outline-none ring-2 ring-transparent",
            ac.ring,
            disabled && "opacity-50 cursor-not-allowed"
          )}
        >
          {/* Icon */}
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", ac.bg)}>
            <FileStack className={cn("w-3.5 h-3.5", ac.text)} />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {selectedFile ? (
              <div>
                <p className="text-sm font-bold text-foreground truncate">{selectedFile.filename}</p>
                <p className="text-[10px] text-muted-foreground font-medium mt-0.5">
                  {selectedFile.totalRecords?.toLocaleString() ?? "?"} records
                  {selectedFile.recordDateRange?.start && (
                    <> &bull; {format(new Date(selectedFile.recordDateRange.start), "d MMM yy")}
                    {selectedFile.recordDateRange?.end && <> – {format(new Date(selectedFile.recordDateRange.end), "d MMM yy")}</>}</>
                  )}
                </p>
              </div>
            ) : (
              <p className={cn("text-sm font-medium", loading ? "text-muted-foreground animate-pulse" : "text-muted-foreground")}>
                {loading ? "Loading vault files…" : "Search and select a file…"}
              </p>
            )}
          </div>

          {/* Trailing */}
          <div className="flex items-center gap-1 shrink-0">
            {selectedFile && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                onKeyDown={(e) => {
                  if (e.key === "Enter") doClear();
                }}
                className="p-1 rounded-full hover:bg-muted opacity-50 hover:opacity-100 transition"
              >
                <X className="w-3.5 h-3.5" />
              </span>
            )}
            <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", open && "rotate-180")} />
          </div>
        </button>

        {/* Dropdown Panel */}
        {open && (
          <div className="absolute z-50 mt-2 w-full rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Search + Preset filters */}
            <div className="p-3 border-b border-border space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by filename…"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-muted/30 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
                />
              </div>
              {/* Date preset chips */}
              <div className="flex gap-1.5 flex-wrap">
                {DATE_PRESETS.map((p) => (
                  <button
                    key={p.days}
                    type="button"
                    onClick={() => setListPreset(p.days)}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-all",
                      listPreset === p.days
                        ? cn(ac.badge, ac.border)
                        : "bg-muted/30 border-border text-muted-foreground hover:bg-muted/60"
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* File list */}
            <ul className="max-h-60 overflow-y-auto divide-y divide-border/40">
              {loading ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground animate-pulse">
                  Loading files from vault…
                </li>
              ) : filteredFiles.length === 0 ? (
                <li className="px-4 py-6 text-center text-sm text-muted-foreground">
                  {files.length === 0 ? "No files saved in vault yet." : "No files match your search."}
                </li>
              ) : (
                filteredFiles.map((f) => {
                  const isSelected = f._id === selectedFileId;
                  return (
                    <li key={f._id}>
                      <button
                        type="button"
                        onClick={() => handleSelect(f._id)}
                        className={cn(
                          "w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
                          isSelected && cn(ac.bg)
                        )}
                      >
                        <div className={cn("w-6 h-6 rounded-md flex items-center justify-center shrink-0", isSelected ? ac.bg : "bg-muted/50")}>
                          {isSelected ? (
                            <CheckCircle2 className={cn("w-3.5 h-3.5", ac.text)} />
                          ) : (
                            <FileStack className="w-3.5 h-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn("text-sm font-bold truncate", isSelected ? ac.text : "text-foreground")}>{f.filename}</p>
                          <p className="text-[10px] text-muted-foreground font-medium mt-0.5 flex items-center gap-1">
                            <Clock className="w-2.5 h-2.5" />
                            {new Date(f.uploadDate).toLocaleDateString()}
                            {f.totalRecords !== undefined && <> &bull; {f.totalRecords.toLocaleString()} rows</>}
                            {f.sheets && f.sheets.length > 1 && <> &bull; {f.sheets.length} sheets</>}
                          </p>
                        </div>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {/* ── Sheet selector (for multi-sheet files) ── */}
      {selectedFileId && hasMultipleSheets && onSheetChange && (
        <div className="animate-in fade-in slide-in-from-top-1 duration-200">
          <div className={cn("flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest opacity-60 mb-2", "text-foreground")}>
            <FileStack className="w-3 h-3" />
            Target Sheet
          </div>
          <select
            value={selectedSheetName}
            onChange={(e) => onSheetChange(e.target.value)}
            disabled={disabled}
            className={cn(
              "w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm text-foreground font-medium",
              "focus:outline-none transition-all cursor-pointer box-border",
              ac.ring
            )}
          >
            <option value="">-- Choose target sheet --</option>
            {selectedFile?.sheets?.map((s) => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Date Content Filter toggle ── */}
      {showDateFilter && selectedFileId && onDateFilterChange && (
        <div>
          <button
            type="button"
            onClick={() => setShowFilter((v) => !v)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-2.5 rounded-xl border transition-all text-sm font-bold",
              showFilter || hasActiveFilter
                ? cn(ac.bg, ac.border, ac.text)
                : "border-dashed border-border text-muted-foreground hover:border-muted-foreground/40 hover:bg-muted/30"
            )}
          >
            <span className="flex items-center gap-2">
              <CalendarRange className="w-4 h-4" />
              Content Date Filter
              {hasActiveFilter && (
                <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-md border", ac.badge, ac.border)}>
                  Active
                </span>
              )}
            </span>
            {showFilter ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showFilter && (
            <div className={cn("mt-2 p-4 rounded-xl border space-y-4 animate-in fade-in slide-in-from-top-2 duration-200", ac.bg, ac.border)}>
              {/* Column picker */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  <Filter className="w-3 h-3" />
                  Date Column
                </label>
                <select
                  value={dateFilter?.column ?? ""}
                  onChange={(e) => updateDateFilter({ column: e.target.value })}
                  disabled={disabled}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-sm text-foreground font-medium focus:outline-none transition-all cursor-pointer box-border"
                >
                  <option value="">-- Select the date column --</option>
                  {availableColumns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              {/* Date range pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">From</label>
                  <DatePicker
                    date={dateFilter?.start ? new Date(dateFilter.start) : undefined}
                    onChange={(d) => updateDateFilter({ start: d?.toISOString() })}
                    placeholder="Start date"
                    disabled={disabled || !dateFilter?.column}
                    accentColor={accentColor}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">To</label>
                  <DatePicker
                    date={dateFilter?.end ? new Date(dateFilter.end) : undefined}
                    onChange={(d) => updateDateFilter({ end: d?.toISOString() })}
                    placeholder="End date"
                    disabled={disabled || !dateFilter?.column}
                    accentColor={accentColor}
                  />
                </div>
              </div>

              {/* Clear filter */}
              {hasActiveFilter && (
                <button
                  type="button"
                  onClick={() => onDateFilterChange({ column: "", start: undefined, end: undefined })}
                  className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                  Clear Filter
                </button>
              )}

              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Only rows whose selected date column falls within this range will be processed.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
