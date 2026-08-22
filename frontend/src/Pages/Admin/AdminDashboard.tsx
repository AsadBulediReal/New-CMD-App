import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { PendingUsersTable } from "../../components/Admin/PendingUsersTable";
import { DeletionRequestsTable } from "../../components/Admin/DeletionRequestsTable";
import { AuditLogsViewer } from "../../components/Admin/AuditLogsViewer";
import { SystemHealthPanel } from "../../components/Admin/SystemHealthPanel";
import { Shield, Users, Trash2, Activity, Server } from "lucide-react";

export const AdminDashboard: React.FC = () => {
  const { authFetch } = useAuth();
  const [activeTab, setActiveTab] = useState<"users" | "deletions" | "audit" | "health">("users");
  const [stats, setStats] = useState({
    pendingUsers: 0,
    pendingDeletions: 0,
    totalLogsToday: 0,
  });

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const [usersRes, delRes, auditRes] = await Promise.all([
          authFetch("/api/admin/users?status=pending&limit=1"),
          authFetch("/api/admin/deletion-requests?status=pending&limit=1"),
          authFetch("/api/admin/audit-logs/stats"),
        ]);

        const usersData = usersRes.ok ? await usersRes.json() : { total: 0 };
        const delData = delRes.ok ? await delRes.json() : { total: 0 };
        const auditData = auditRes.ok ? await auditRes.json() : { todayLogs: 0 };

        setStats({
          pendingUsers: usersData.total || 0,
          pendingDeletions: delData.total || 0,
          totalLogsToday: auditData.todayLogs || 0,
        });
      } catch (err) {
        console.warn("Failed to load admin stats:", err);
      }
    };

    loadOverview();
    const interval = setInterval(loadOverview, 10000); // 10s live auto-refresh
    window.addEventListener("focus", loadOverview);
    window.addEventListener("cmd:refresh-data", loadOverview);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", loadOverview);
      window.removeEventListener("cmd:refresh-data", loadOverview);
    };
  }, [activeTab]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5" />
            <span>Administration Control Hub</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Admin Workspace</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Approve user accounts, review guarded deletion requests, and monitor audit trails.
          </p>
        </div>

        {/* Quick Stat Badges */}
        <div className="flex items-center gap-3">
          <div className="px-4 py-2.5 bg-card border border-border/70 rounded-xl shadow-xs text-center min-w-[100px]">
            <div className="text-lg font-bold text-amber-500">{stats.pendingUsers}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Pending Users</div>
          </div>
          <div className="px-4 py-2.5 bg-card border border-border/70 rounded-xl shadow-xs text-center min-w-[100px]">
            <div className="text-lg font-bold text-destructive">{stats.pendingDeletions}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Pending Deletions</div>
          </div>
          <div className="px-4 py-2.5 bg-card border border-border/70 rounded-xl shadow-xs text-center min-w-[100px]">
            <div className="text-lg font-bold text-primary">{stats.totalLogsToday}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Actions Today</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border/70 pb-3 overflow-x-auto">
        <button
          onClick={() => setActiveTab("users")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "users"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Approvals</span>
          {stats.pendingUsers > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
              {stats.pendingUsers}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("deletions")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "deletions"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Trash2 className="w-4 h-4" />
          <span>Deletion Queue</span>
          {stats.pendingDeletions > 0 && (
            <span className="ml-1 px-1.5 py-0.5 rounded-full bg-destructive text-white text-[10px] font-bold">
              {stats.pendingDeletions}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "audit"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Audit Trail</span>
        </button>

        <button
          onClick={() => setActiveTab("health")}
          className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
            activeTab === "health"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground hover:bg-muted"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>System Health & Backups</span>
        </button>
      </div>

      {/* Tab Content */}
      <div className="pt-2">
        {activeTab === "users" && <PendingUsersTable />}
        {activeTab === "deletions" && <DeletionRequestsTable />}
        {activeTab === "audit" && <AuditLogsViewer />}
        {activeTab === "health" && <SystemHealthPanel />}
      </div>
    </div>
  );
};

export default AdminDashboard;
