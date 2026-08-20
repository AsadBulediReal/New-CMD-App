import { useLocation, useNavigate } from "react-router";
import { useEffect, useState } from "react";
import { ModeToggle } from "./ModeToggle";
import { BugReportDialog } from "./BugReportDialog";
import {
  Search,
  Clock,
  ChevronRight,
  LayoutDashboard,
  Database,
  FileText,
  GitCompare,
  Combine,
  BarChart3,
  ShieldCheck,
  FileSpreadsheet,
  ArrowRight,
  Menu,
  X
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader } from "./ui/dialog";

function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB"));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString("en-GB")), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono text-xs font-medium">{time}</span>;
}

const searchItems = [
  { name: "Executive Dashboard", path: "/", code: "HOME", category: "Workspace", icon: LayoutDashboard, desc: "Overview & system metrics" },
  { name: "Document Vault", path: "/saved-files", code: "STORAGE", category: "Workspace", icon: Database, desc: "File repository & compressed sets" },
  { name: "TXT Statement Ingestion", path: "/upload-txt", code: "MOD-01", category: "Engine", icon: FileText, desc: "Raw statement noise reduction & JSON output" },
  { name: "BS ↔ MIS Reconciliation", path: "/reconcile", code: "MOD-02", category: "Engine", icon: GitCompare, desc: "Bank statement vs MIS matching" },
  { name: "Report Consolidation Engine", path: "/merge-json", code: "MOD-03", category: "Engine", icon: Combine, desc: "Combine multiple Excel report slices" },
  { name: "Financial Statement Analytics", path: "/analytics", code: "MOD-04", category: "Analytics", icon: BarChart3, desc: "Cashflow trend & variance analysis" },
  { name: "Audit Categorizer Engine", path: "/audit", code: "MOD-05", category: "Compliance", icon: ShieldCheck, desc: "Type Code rule-based auto-classification" },
  { name: "Excel Dataset Workbench", path: "/upload", code: "MOD-06", category: "Workbench", icon: FileSpreadsheet, desc: "CSV/Excel on-the-fly spreadsheet editor" },
];

interface HeaderProps {
  onMobileMenuToggle?: () => void;
}

export function Header({ onMobileMenuToggle }: HeaderProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // Keyboard shortcut Ctrl+K or Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredItems = searchItems.filter((item) =>
    item.name.toLowerCase().includes(query.toLowerCase()) ||
    item.code.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase()) ||
    item.desc.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (path: string) => {
    setOpen(false);
    setQuery("");
    navigate(path);
  };

  const getPageTitle = (path: string) => {
    switch (path) {
      case "/": return "Executive Dashboard";
      case "/saved-files": return "Document Vault";
      case "/upload-txt": return "TXT Ingestion";
      case "/reconcile": return "BS ↔ MIS Reconciliation";
      case "/merge-json": return "Report Consolidation";
      case "/analytics": return "Financial Analytics";
      case "/audit": return "Audit Categorizer";
      case "/upload": return "Excel Workbench";
      default: return "Portal Module";
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 h-14 bg-card/90 backdrop-blur-md border-b border-border px-3 sm:px-6 flex items-center justify-between font-sans shrink-0">
        {/* ── Left Navigation Toggle & Breadcrumb ── */}
        <div className="flex items-center gap-2 text-xs font-semibold min-w-0">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={onMobileMenuToggle}
            className="lg:hidden p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors shrink-0"
            title="Open navigation menu"
          >
            <Menu className="w-5 h-5 text-foreground" />
          </button>

          <span className="text-muted-foreground hidden sm:inline truncate">Finance Wing</span>
          <ChevronRight className="w-3 h-3 text-muted-foreground/50 hidden sm:inline shrink-0" />
          <span className="text-foreground font-bold truncate">{getPageTitle(location.pathname)}</span>
        </div>

        {/* ── Right Actions & Status ── */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Desktop Search Trigger */}
          <button
            onClick={() => setOpen(true)}
            className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/60 hover:bg-muted border border-border text-xs text-muted-foreground transition-colors cursor-pointer select-none"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="hidden md:inline">Search modules, tools, or pages...</span>
            <span className="md:hidden">Search...</span>
            <kbd className="ml-2 font-mono text-[10px] bg-background px-1.5 py-0.5 rounded border border-border">Ctrl K</kbd>
          </button>

          {/* Mobile Search Trigger Icon */}
          <button
            onClick={() => setOpen(true)}
            className="sm:hidden p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Search"
          >
            <Search className="w-4 h-4 text-primary" />
          </button>

          <div className="h-4 w-px bg-border hidden sm:block" />

          {/* Live Clock Badge */}
          <div className="hidden md:flex items-center gap-1.5 text-muted-foreground px-2 py-1 rounded bg-muted/40 border border-border/50">
            <Clock className="w-3.5 h-3.5 text-primary" />
            <LiveClock />
          </div>

          <div className="h-4 w-px bg-border hidden md:block" />

          <BugReportDialog />
          <ModeToggle />
        </div>
      </header>

      {/* ── Global Search & Command Palette Modal ── */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl bg-background border border-border shadow-2xl p-0 gap-0 overflow-hidden rounded-xl font-sans">
          <DialogHeader className="px-4 py-3 border-b border-border flex flex-row items-center justify-between space-y-0">
            <div className="flex items-center gap-2.5 flex-1 pr-4">
              <Search className="w-4 h-4 text-primary shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search tools, modules, or codes (e.g., MOD-02, Vault)..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
              />
            </div>
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}
          </DialogHeader>

          <div className="max-h-[350px] overflow-y-auto p-2 space-y-1">
            {filteredItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground font-medium">
                No matching tools or modules found.
              </div>
            ) : (
              filteredItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => handleSelect(item.path)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted/70 text-left transition-colors group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                          <span className="truncate">{item.name}</span>
                          <span className="text-[9px] font-mono font-medium px-1.5 py-0.2 rounded bg-muted text-muted-foreground">
                            {item.code}
                          </span>
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate block">
                          {item.desc}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                );
              })
            )}
          </div>

          <div className="px-4 py-2 bg-muted/40 border-t border-border flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Use <kbd className="font-mono bg-background px-1 py-0.5 rounded border border-border">Ctrl K</kbd> to search anytime</span>
            <span>Finance Wing · University of Sindh</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
