import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Activity, Search, Download, RefreshCw, Loader2, User, Globe, Tag } from "lucide-react";
import { toast } from "sonner";

interface LogItem {
  _id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress?: string;
  status: "SUCCESS" | "FAILED" | "WARNING";
  createdAt: string;
}

export const AuditLogsViewer: React.FC = () => {
  const { authFetch } = useAuth();
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: String(page),
        limit: "40",
        search: search.trim(),
        action: actionFilter,
      });
      const res = await authFetch(`/api/admin/audit-logs?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch {
      toast.error("Failed to load audit trail");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, search]);

  const handleExport = async () => {
    try {
      const res = await authFetch("/api/admin/audit-logs/export");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `audit-logs-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        toast.success("Audit log exported");
      }
    } catch {
      toast.error("Export failed");
    }
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes("DELETE") || action.includes("REJECT")) return "bg-destructive/10 text-destructive";
    if (action.includes("APPROVE") || action.includes("LOGIN")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
    if (action.includes("UPLOAD") || action.includes("RECONCILE")) return "bg-primary/10 text-primary";
    return "bg-muted text-muted-foreground";
  };

  return (
    <div className="space-y-4">
      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search user, action, IP..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Actions</option>
            <option value="LOGIN">Logins</option>
            <option value="UPLOAD_FILE">Uploads</option>
            <option value="VIEW_FILE">Views</option>
            <option value="RUN_RECONCILIATION">Reconciliations</option>
            <option value="REQUEST_DELETE">Deletion Requests</option>
            <option value="APPROVE_DELETION">Deletion Approvals</option>
            <option value="APPROVE_USER">User Approvals</option>
            <option value="REJECT_USER">User Rejections</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchLogs()}
            className="p-1.5 rounded-xl border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            title="Refresh stream"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleExport}
            className="px-3 py-1.5 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No activity logged yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Target Resource</th>
                  <th className="px-4 py-3">Details</th>
                  <th className="px-4 py-3">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 font-mono">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2.5 text-muted-foreground font-sans whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2.5 font-sans">
                      <div className="font-semibold text-foreground">{log.userName}</div>
                      <div className="text-[11px] text-muted-foreground">{log.userEmail}</div>
                    </td>
                    <td className="px-4 py-2.5 font-sans">
                      <span className={`px-2 py-0.5 rounded-md font-semibold text-[10px] ${getActionBadgeColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-foreground font-sans">
                      {log.resourceType}: <span className="text-muted-foreground">{log.resourceId || "N/A"}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs font-sans text-muted-foreground max-w-xs truncate">
                      {log.details ? JSON.stringify(log.details) : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground font-sans text-[11px]">
                      {log.ipAddress || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span>Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="px-2.5 py-1 rounded-lg border border-border hover:bg-muted disabled:opacity-40 cursor-pointer"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
