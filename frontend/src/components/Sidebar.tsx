import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LayoutDashboard,
  Database,
  FileText,
  GitCompare,
  Combine,
  BarChart3,
  ShieldCheck,
  FileSpreadsheet,
  Shield,
  LogOut
} from "lucide-react";

interface SidebarProps {
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps) {
  const location = useLocation();
  const { user, isAdmin, logout } = useAuth();

  const navigationGroups = [
    {
      title: "Main Workspace",
      items: [
        { name: "Dashboard Overview", href: "/", icon: LayoutDashboard, tag: "HOME" },
        { name: "Document Vault", href: "/saved-files", icon: Database, tag: "STORAGE" },
      ],
    },
    ...(isAdmin ? [{
      title: "Administration",
      items: [
        { name: "Admin Control Hub", href: "/admin", icon: Shield, tag: "ADMIN" },
      ],
    }] : []),
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

  const sidebarContent = (
    <aside className="w-full bg-sidebar border-r border-sidebar-border flex flex-col h-full select-none font-sans">
      {/* Institutional Branding */}
      <div className="p-4 border-b border-sidebar-border flex items-center justify-between gap-3">
        <Link
          to="/"
          onClick={() => onMobileClose?.()}
          className="flex items-center gap-3 min-w-0 hover:opacity-90 transition-opacity"
        >
          <div className="w-9 h-9 rounded-full bg-card border border-sidebar-border flex items-center justify-center p-0.5 shadow-xs shrink-0 overflow-hidden">
            <img src="/favicon.svg" alt="University of Sindh Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-extrabold tracking-tight text-sidebar-foreground truncate flex items-center gap-1">
              CMD <span className="text-primary font-bold">FINANCE</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground truncate">
              University of Sindh
            </span>
          </div>
        </Link>
        {onMobileClose && (
          <button
            onClick={onMobileClose}
            className="lg:hidden p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Navigation Groups */}
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
                  onClick={() => onMobileClose?.()}
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

                  {"code" in item && item.code && (
                    <span className={`text-[9px] font-mono font-medium px-1.5 py-0.5 rounded ${
                      isActive ? "bg-white/20 text-white" : "bg-muted text-muted-foreground group-hover:bg-background"
                    }`}>
                      {item.code}
                    </span>
                  )}
                  {"tag" in item && item.tag && (
                    <span className={`text-[9px] font-extrabold tracking-wider px-1.5 py-0.5 rounded ${
                      isActive ? "bg-white/20 text-white" : item.tag === "ADMIN" ? "bg-amber-500/20 text-amber-500 font-bold" : "bg-primary/10 text-primary"
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

      {/* User Profile & Logout */}
      {user && (
        <div className="p-3 border-t border-sidebar-border bg-sidebar-accent/30 space-y-2">
          <div className="flex items-center justify-between">
            <Link
              to="/profile"
              onClick={() => onMobileClose?.()}
              className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
              title="View Profile Settings"
            >
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-foreground truncate">{user.name}</div>
                <div className="text-[10px] text-muted-foreground truncate capitalize">{user.role}</div>
              </div>
            </Link>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );

  return (
    <>
      <div className="hidden lg:flex h-screen sticky top-0 z-40 shrink-0 w-64">
        {sidebarContent}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={onMobileClose} />
          <div className="relative z-50 flex flex-col h-[100dvh] w-64 max-w-[80vw] shadow-2xl animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
