import { Link, useLocation } from "react-router";
import {
  LayoutDashboard,
  Database,
  FileText,
  GitCompare,
  Combine,
  BarChart3,
  ShieldCheck,
  FileSpreadsheet,
  Building2,
  Shield,
  Activity
} from "lucide-react";

export function Sidebar() {
  const location = useLocation();

  const navigationGroups = [
    {
      title: "Main Workspace",
      items: [
        { name: "Dashboard Overview", href: "/", icon: LayoutDashboard, tag: "HOME" },
        { name: "Document Vault", href: "/saved-files", icon: Database, tag: "STORAGE" },
      ],
    },
    {
      title: "Data Processing Engines",
      items: [
        { name: "TXT Statement Ingestion", href: "/upload-txt", icon: FileText, code: "MOD-01" },
        { name: "BS ↔ MIS Reconciliation", href: "/reconcile", icon: GitCompare, code: "MOD-02" },
        { name: "Report Consolidation", href: "/merge-json", icon: Combine, code: "MOD-03" },
      ],
    },
    {
      title: "Analytics & Compliance",
      items: [
        { name: "Financial Analytics", href: "/analytics", icon: BarChart3, code: "MOD-04" },
        { name: "Audit Categorizer", href: "/audit", icon: ShieldCheck, code: "MOD-05" },
        { name: "Excel Workbench", href: "/upload", icon: FileSpreadsheet, code: "MOD-06" },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col h-screen sticky top-0 z-40 select-none font-sans shrink-0">
      {/* ── Institutional Header Branding ── */}
      <div className="p-4 border-b border-sidebar-border flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground shadow-xs shrink-0">
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-extrabold tracking-tight text-sidebar-foreground truncate flex items-center gap-1">
            CMD <span className="text-primary font-bold">FINANCE</span>
          </span>
          <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground truncate">
            University of Sindh
          </span>
        </div>
      </div>

      {/* ── Navigation Menu Groups ── */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navigationGroups.map((group, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70 mb-2">
              {group.title}
            </h3>
            {group.items.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-md text-xs font-semibold transition-all duration-150 ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-xs font-bold"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-sidebar-primary-foreground" : "text-muted-foreground group-hover:text-sidebar-foreground"}`} />
                    <span className="truncate">{item.name}</span>
                  </div>

                  {item.code && (
                    <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-muted text-muted-foreground group-hover:bg-background"
                    }`}>
                      {item.code}
                    </span>
                  )}
                  {item.tag && (
                    <span className={`text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded ${
                      isActive 
                        ? "bg-white/20 text-white" 
                        : "bg-primary/10 text-primary"
                    }`}>
                      {item.tag}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* ── System Status & Security Footer ── */}
      <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/50 space-y-2">
        <div className="flex items-center justify-between text-[11px]">
          <span className="flex items-center gap-1.5 text-emerald-500 font-bold uppercase tracking-wider text-[10px]">
            <Activity className="w-3 h-3 animate-pulse" /> Node-01 Active
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">v2.4</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-medium">
          <Shield className="w-3 h-3 text-primary shrink-0" />
          <span>AES-256 Enterprise Encryption</span>
        </div>
      </div>
    </aside>
  );
}
