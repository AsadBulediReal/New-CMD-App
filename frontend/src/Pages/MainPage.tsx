import { Link } from "react-router";
import { useEffect, useState } from "react";
import {
  FileText,
  GitCompare,
  Combine,
  BarChart3,
  ShieldCheck,
  FileSpreadsheet,
  Database,
  ArrowRight,
  Shield,
  Activity,
  CheckCircle2
} from "lucide-react";

/* ── Tool Data ───────────────────────────────────────────────────────────── */
const tools = [
  {
    id: "txt-json",
    title: "TXT → JSON Statement Parser",
    subtitle: "Statement Ingestion & Cleaning",
    description:
      "Parse raw bank statement text files, strip system noise, extract transaction rows, and emit validated JSON records.",
    link: "/upload-txt",
    badge: "INGESTION",
    code: "MOD-01",
    icon: FileText,
  },
  {
    id: "reconcile",
    title: "BS ↔ MIS Reconciliation Engine",
    subtitle: "Automated Data Matching",
    description:
      "Cross-verify Bank Statement entries against internal MIS management logs with delta calculations and discrepancy flagging.",
    link: "/reconcile",
    badge: "RECONCILIATION",
    code: "MOD-02",
    icon: GitCompare,
  },
  {
    id: "merge",
    title: "Report Consolidation Engine",
    subtitle: "Workbook Report Merger",
    description:
      "Combine multiple heterogeneous Excel report files into unified, structured master workbooks with deduplication.",
    link: "/merge-json",
    badge: "CONSOLIDATION",
    code: "MOD-03",
    icon: Combine,
  },
  {
    id: "analytics",
    title: "Financial Analytics Portal",
    subtitle: "Deep Executive Insights",
    description:
      "Analyze cashflow trends, variance anomalies, bulk transaction distributions, and structural balance metrics.",
    link: "/analytics",
    badge: "ANALYTICS",
    code: "MOD-04",
    icon: BarChart3,
  },
  {
    id: "audit",
    title: "Audit Categorizer Engine",
    subtitle: "Rule-Based Auto-Classification",
    description:
      "Auto-classify transaction records into predefined audit collections based on Type Code rule sets.",
    link: "/audit",
    badge: "COMPLIANCE",
    code: "MOD-05",
    icon: ShieldCheck,
  },
  {
    id: "upload",
    title: "Excel Data Workbench",
    subtitle: "Spreadsheet Editor & Archival",
    description:
      "Upload CSV/Excel spreadsheets, perform on-the-fly cell edits, calibrate columns, and commit to vault storage.",
    link: "/upload",
    badge: "WORKBENCH",
    code: "MOD-06",
    icon: FileSpreadsheet,
  },
];

/* ── Live Clock ──────────────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB"));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString("en-GB")), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs">{time}</span>;
}

export default function MainPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/files")
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setFiles(Array.isArray(data) ? data : []))
      .catch(() => setFiles([]))
      .finally(() => setLoading(false));
  }, []);

  const totalRecords = files.reduce((acc, f) => acc + (f.totalRecords || 0), 0);
  const totalSheets = files.reduce((acc, f) => acc + (f.sheetCount || 1), 0);

  return (
    <div className="p-6 md:p-8 space-y-8 max-w-7xl mx-auto font-sans">
      {/* ── Executive Welcome & Status Banner ────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-6 rounded-lg bg-card border border-border shadow-xs">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold uppercase tracking-wider">
            <Building2Icon />
            Finance Wing · University of Sindh
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
            Executive Operations Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Centralized financial digital processing, automated bank statement reconciliation, and compliance platform.
          </p>
        </div>
      </div>

      {/* ── Dynamic Real Financial KPI Metric Cards ──────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Stored Reports</span>
            <Database className="w-4 h-4 text-primary" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {loading ? "..." : `${files.length} Files`}
          </div>
          <span className="text-[11px] text-muted-foreground block">Active in Vault Repository</span>
        </div>

        <div className="p-5 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Processed Records</span>
            <Activity className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {loading ? "..." : totalRecords.toLocaleString()}
          </div>
          <span className="text-[11px] text-muted-foreground block">Total row entries ingested</span>
        </div>

        <div className="p-5 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Sheets</span>
            <FileSpreadsheet className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-black text-foreground">
            {loading ? "..." : `${totalSheets} Sheets`}
          </div>
          <span className="text-[11px] text-muted-foreground block">Parsed workbook tabs</span>
        </div>

        <div className="p-5 rounded-lg bg-card border border-border space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-[11px] font-bold uppercase tracking-wider">Security & Encryption</span>
            <Shield className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">AES-256</div>
          <span className="text-[11px] text-emerald-500 font-semibold block">Audit Compliance Verified</span>
        </div>
      </div>

      {/* ── REAL RECENT ACTIVITIES & VAULT FEEDS AT TOP ─────────────────── */}
      <RecentActivitySection files={files} loading={loading} />

      {/* ── Section Header: Processing Engines ───────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border pb-3 pt-4">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Operational Processing Engines
          </h2>
          <p className="text-xs text-muted-foreground">
            Launch a specialized module to ingest statements, reconcile records, or generate financial reports
          </p>
        </div>
      </div>

      {/* ── High-Density Module Grid ────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.id}
              to={tool.link}
              className="group flex flex-col rounded-lg bg-card border border-border p-5 hover:border-primary/50 hover:shadow-md transition-all duration-200 focus:outline-none"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-medium text-muted-foreground uppercase tracking-widest block">
                      {tool.code}
                    </span>
                    <span className="text-[11px] font-semibold text-muted-foreground truncate block">
                      {tool.subtitle}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded bg-secondary text-secondary-foreground border border-border">
                  {tool.badge}
                </span>
              </div>

              <div className="flex-1 my-2">
                <h3 className="text-base font-bold tracking-tight text-foreground group-hover:text-primary transition-colors mb-1.5">
                  {tool.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {tool.description}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-[11px] font-semibold text-emerald-500 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
                </span>
                <span className="text-xs font-bold text-primary group-hover:translate-x-1 transition-transform flex items-center gap-1">
                  Launch Engine <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────── */}
      <footer className="pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between text-xs text-muted-foreground gap-4">
        <div>
          <span className="font-bold text-foreground">CMD System</span> · Finance Wing, University of Sindh
        </div>
        <div className="font-mono text-[11px]">
          Internal Financial Operations Portal © 2026
        </div>
      </footer>
    </div>
  );
}

/* ── Relative Time Formatter ─────────────────────────────────────────────── */
function formatTimeAgo(dateInput: string | Date): string {
  if (!dateInput) return "Just now";
  const date = new Date(dateInput);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return "Just now";
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes} ${diffInMinutes === 1 ? "min" : "mins"} ago`;
  }
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} ${diffInHours === 1 ? "hour" : "hours"} ago`;
  }
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} ${diffInDays === 1 ? "day" : "days"} ago`;
  }
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return `${diffInMonths} ${diffInMonths === 1 ? "month" : "months"} ago`;
  }
  const diffInYears = Math.floor(diffInDays / 365);
  return `${diffInYears} ${diffInYears === 1 ? "year" : "years"} ago`;
}

/* ── Recent Activity & Vault Files Component ────────────────────────────── */
function RecentActivitySection({ files, loading }: { files: any[]; loading: boolean }) {
  const recentFiles = files.slice(0, 5);

  return (
    <div className="space-y-4 pt-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold tracking-tight text-foreground uppercase">
            Recent Vault Reports ({files.length} Total Files Stored)
          </h3>
        </div>
        <Link
          to="/saved-files"
          className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
        >
          View Full Vault Repository ({files.length}) →
        </Link>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-medium">
            Loading real vault repository data...
          </div>
        ) : recentFiles.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground font-medium">
            No files currently stored in vault. Upload an Excel or TXT file using the engines below to see live data here.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {recentFiles.map((file) => (
              <div
                key={file._id}
                className="p-4 flex items-center justify-between hover:bg-muted/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 pr-4">
                  <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <FileSpreadsheet className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-foreground truncate" title={file.filename}>
                        {file.filename}
                      </h4>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-primary/10 text-primary shrink-0">
                        {formatTimeAgo(file.uploadDate)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-1">
                      <span>Date: {new Date(file.uploadDate).toLocaleDateString("en-GB")}</span>
                      <span>•</span>
                      <span className="font-semibold text-foreground">{file.totalRecords?.toLocaleString() || 0} records</span>
                      <span>•</span>
                      <span>{file.sheetCount || 1} sheet(s)</span>
                    </div>
                  </div>
                </div>

                <Link
                  to="/saved-files"
                  className="text-xs font-bold px-3.5 py-1.5 rounded bg-primary/10 hover:bg-primary/20 text-primary transition-colors shrink-0 flex items-center gap-1"
                >
                  Open File
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Building2Icon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-3.5 h-3.5">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4" />
      <path d="M8 6h.01M16 6h.01M8 10h.01M16 10h.01M8 14h.01M16 14h.01" />
    </svg>
  );
}
