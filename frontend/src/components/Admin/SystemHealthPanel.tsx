import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Database,
  Server,
  Activity,
  Download,
  RefreshCw,
  Clock,
  Cpu,
  HardDrive,
  Users,
  FileSpreadsheet,
  Layers,
  ShieldAlert,
  Loader2,
  CheckCircle2,
  Mail,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface SystemHealthData {
  database: {
    status: string;
    dbName: string;
    pingLatencyMs: number;
    counts: {
      files: number;
      chunks: number;
      users: number;
      auditLogs: number;
      deletionRequests: number;
      notifications: number;
    };
  };
  server: {
    uptimeSeconds: number;
    nodeVersion: string;
    platform: string;
    arch: string;
    memory: { rssMb: number; heapTotalMb: number; heapUsedMb: number };
  };
  smtp?: {
    configured: boolean;
    connected: boolean;
    status: string;
    mode: string;
    host?: string;
    port?: number;
    sender?: string;
    error?: string;
  };
  timestamp: string;
}

export const SystemHealthPanel: React.FC = () => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const fetchHealth = async () => {
    setLoading(true);
    try {
      const res = await authFetch("/api/admin/system-health");
      if (res.ok) {
        setData(await res.json());
      }
    } catch {
      toast.error("Failed to query system diagnostics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    window.addEventListener("focus", fetchHealth);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchHealth);
    };
  }, []);

  const handleDownloadBackup = async () => {
    setExporting(true);
    try {
      const res = await authFetch("/api/admin/database/backup");
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cmd-database-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Database snapshot downloaded successfully");
      } else {
        toast.error("Failed to generate database backup");
      }
    } catch {
      toast.error("Backup export failed");
    } finally {
      setExporting(false);
    }
  };

  const formatUptime = (sec: number) => {
    const d = Math.floor(sec / 86400), h = Math.floor((sec % 86400) / 3600), m = Math.floor((sec % 3600) / 60);
    return d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m` : `${m}m ${sec % 60}s`;
  };

  if (loading && !data) {
    return (
      <div className="p-12 flex justify-center items-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card border border-border/70 rounded-2xl p-4 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-500" />
            <span>Infrastructure & Health Diagnostics</span>
          </h2>
          <p className="text-xs text-muted-foreground">Real-time cluster health, SMTP status, and disaster recovery snapshot backups.</p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button onClick={fetchHealth} disabled={loading} className="flex-1 sm:flex-none px-3 py-2 bg-muted/60 hover:bg-muted text-foreground border border-border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>
          <button onClick={handleDownloadBackup} disabled={exporting} className="flex-1 sm:flex-none px-3.5 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50">
            {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>Export DB Snapshot</span>
          </button>
        </div>
      </div>

      {/* Grid Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">MongoDB Cluster</span>
            <div className={`w-2 h-2 rounded-full ${data?.database.status === "Connected" ? "bg-emerald-500 animate-pulse" : "bg-destructive"}`} />
          </div>
          <div className="text-lg font-bold text-foreground flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-500" />
            <span>{data?.database.status}</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
            <span>Ping Latency:</span>
            <span className="font-bold text-foreground">{data?.database.pingLatencyMs} ms</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground">Server Uptime</span>
          <div className="text-lg font-bold text-foreground flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>{formatUptime(data?.server.uptimeSeconds || 0)}</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
            <span>Node Version:</span>
            <span className="font-mono text-foreground font-semibold">{data?.server.nodeVersion}</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground">Memory (RSS)</span>
          <div className="text-lg font-bold text-foreground flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-amber-500" />
            <span>{data?.server.memory.rssMb} MB</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
            <span>Heap Used:</span>
            <span className="font-bold text-foreground">{data?.server.memory.heapUsedMb} MB</span>
          </div>
        </div>

        <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-2">
          <span className="text-xs font-semibold text-muted-foreground">OS Architecture</span>
          <div className="text-lg font-bold text-foreground flex items-center gap-2">
            <Cpu className="w-4 h-4 text-indigo-500" />
            <span className="capitalize">{data?.server.platform} ({data?.server.arch})</span>
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center justify-between pt-1 border-t border-border/50">
            <span>Database Name:</span>
            <span className="font-mono text-foreground font-semibold truncate max-w-[100px]">{data?.database.dbName}</span>
          </div>
        </div>
      </div>

      {/* SMTP Email Service Status */}
      <div className="bg-card border border-border/70 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/50 pb-3">
          <div className="flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">SMTP Email Delivery Service</h3>
          </div>
          <div className="flex items-center gap-2">
            {data?.smtp?.connected ? (
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Connected & Verified
              </span>
            ) : data?.smtp?.configured ? (
              <span className="px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20 text-[11px] font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3 h-3" />
                Connection Offline
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px] font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Not Configured (Simulation Mode)
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-2.5 bg-muted/30 rounded-xl border border-border/40 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Delivery Mode</span>
            <div className="font-semibold text-foreground">{data?.smtp?.mode || "Simulation Mode"}</div>
          </div>
          <div className="p-2.5 bg-muted/30 rounded-xl border border-border/40 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">SMTP Host</span>
            <div className="font-mono text-foreground font-semibold">{data?.smtp?.host || "None"}</div>
          </div>
          <div className="p-2.5 bg-muted/30 rounded-xl border border-border/40 space-y-0.5">
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Sender Identity</span>
            <div className="text-foreground truncate font-medium" title={data?.smtp?.sender}>{data?.smtp?.sender || "Default System Sender"}</div>
          </div>
        </div>

        {data?.smtp?.error && (
          <p className="text-[11px] text-destructive font-mono bg-destructive/5 p-2 rounded-lg border border-destructive/15">
            Error: {data.smtp.error}
          </p>
        )}
      </div>

      {/* Collection Stats Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/70 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Database Collection Footprint</h3>
          </div>
          <span className="text-[11px] text-muted-foreground">Indexed in MongoDB</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-border/60 text-center">
          <div className="p-4 space-y-1">
            <FileSpreadsheet className="w-4 h-4 text-blue-500 mx-auto" />
            <div className="text-base font-extrabold text-foreground">{data?.database.counts.files}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Stored Files</div>
          </div>
          <div className="p-4 space-y-1">
            <Layers className="w-4 h-4 text-indigo-500 mx-auto" />
            <div className="text-base font-extrabold text-foreground">{data?.database.counts.chunks}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Data Chunks</div>
          </div>
          <div className="p-4 space-y-1">
            <Users className="w-4 h-4 text-emerald-500 mx-auto" />
            <div className="text-base font-extrabold text-foreground">{data?.database.counts.users}</div>
            <div className="text-[11px] text-muted-foreground font-medium">User Accounts</div>
          </div>
          <div className="p-4 space-y-1">
            <Activity className="w-4 h-4 text-amber-500 mx-auto" />
            <div className="text-base font-extrabold text-foreground">{data?.database.counts.auditLogs}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Audit Trail</div>
          </div>
          <div className="p-4 space-y-1">
            <ShieldAlert className="w-4 h-4 text-rose-500 mx-auto" />
            <div className="text-base font-extrabold text-foreground">{data?.database.counts.deletionRequests}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Deletion Reqs</div>
          </div>
          <div className="p-4 space-y-1">
            <CheckCircle2 className="w-4 h-4 text-primary mx-auto" />
            <div className="text-base font-extrabold text-foreground">{data?.database.counts.notifications}</div>
            <div className="text-[11px] text-muted-foreground font-medium">Notifications</div>
          </div>
        </div>
      </div>
    </div>
  );
};
