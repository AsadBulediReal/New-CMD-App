import { useState, useEffect } from "react";
import { RefreshCw, ShieldAlert, ShieldCheck, Database, Server } from "lucide-react";

interface BackendStatus {
  status: string;
  database: string;
  version: string;
}

export function BackendGuard({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(() => {
    return sessionStorage.getItem("cmd_backend_initialized") === "true";
  });
  const [loading, setLoading] = useState(!isInitialized);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<BackendStatus | null>(null);

  useEffect(() => {
    if (isInitialized) return;

    const checkBackend = async (retries = 3) => {
      try {
        setLoading(true);
        const start = Date.now();
        
        const response = await fetch("/api/health");
        
        // If we get a proxy error or server not ready, it might throw or return non-ok
        if (!response.ok) {
           throw new Error(`System reported status: ${response.status}`);
        }

        const data = await response.json();

        const elapsed = Date.now() - start;
        if (elapsed < 1200) {
          await new Promise(resolve => setTimeout(resolve, 1200 - elapsed));
        }

        if (data.status === "ok") {
          if (data.database !== "connected") {
            throw new Error("Core database is unreachable.");
          }
          setStatus(data);
          setIsInitialized(true);
          sessionStorage.setItem("cmd_backend_initialized", "true");
        } else {
          throw new Error(data.message || "Unexpected response from control node.");
        }
      } catch (err: any) {
        if (retries > 0) {
          console.log(`Backend probe failed, retrying... (${retries} left)`);
          await new Promise(resolve => setTimeout(resolve, 1500));
          return checkBackend(retries - 1);
        }
        setError(err.message || "Secure link to backend could not be established.");
      } finally {
        setLoading(false);
      }
    };

    checkBackend();
  }, [isInitialized]);

  if (loading) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background overflow-hidden">
        {/* Animated Background Elements */}
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-cyan-500/10 blur-[120px] animate-pulse" />
        
        <div className="relative flex flex-col items-center max-w-md w-full px-6 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center shadow-2xl">
              <RefreshCw className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Initializing System
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            Establishing secure handshake with the core processing node and synchronizing datasets.
          </p>

          <div className="w-full space-y-4">
            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <Server className="w-4 h-4 text-blue-500" />
                <span className="text-xs font-semibold text-foreground">API Node-01</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Connecting</span>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-card/50 backdrop-blur-sm opacity-50">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">Main Repository</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Pending</span>
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
              </div>
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-12 text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground/30">
          CMD SYSTEM · v{status?.version || "1.0.0"}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6">
        <div className="max-w-md w-full bg-card border border-destructive/20 rounded-3xl p-8 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-destructive/30" />
          
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-destructive" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-3">
            Connection Barrier
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            The system was unable to establish a connection with the backend services. 
            <span className="block mt-2 font-mono text-[11px] bg-muted/50 p-2 rounded-lg text-destructive/80">
              {error}
            </span>
          </p>

          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="p-3 rounded-xl border border-border bg-muted/30 text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Status</p>
              <p className="text-xs font-bold text-destructive flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-destructive" />
                Offline
              </p>
            </div>
            <div className="p-3 rounded-xl border border-border bg-muted/30 text-left">
              <p className="text-[10px] font-bold text-muted-foreground uppercase mb-1">Database</p>
              <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted" />
                Unknown
              </p>
            </div>
          </div>

          <button 
            onClick={() => window.location.reload()}
            className="w-full py-3.5 rounded-xl bg-foreground text-background font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Retry Connection
          </button>
        </div>
        
        <p className="mt-8 text-[11px] text-muted-foreground/50 font-medium">
          Contact System Administrator if the issue persists.
        </p>
      </div>
    );
  }

  return (
    <>
      {children}
      {/* Subtle Success Indicator (Optional) */}
      {!sessionStorage.getItem("cmd_notified_init") && (
        <div className="fixed bottom-6 right-6 z-[100] animate-in fade-in slide-in-from-bottom-10 duration-700">
           <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-emerald-500 text-white shadow-2xl shadow-emerald-500/20 border border-white/10">
              <ShieldCheck className="w-5 h-5" />
              <div>
                <p className="text-xs font-bold leading-none">System Active</p>
                <p className="text-[10px] opacity-80 leading-none mt-1">Verified connection to Node-01</p>
              </div>
              <button 
                onClick={() => {
                  sessionStorage.setItem("cmd_notified_init", "true");
                  const el = document.getElementById("init-toast");
                  if (el) el.style.display = "none";
                }}
                className="ml-2 hover:opacity-70"
              >
                <RefreshCw className="w-3 h-3 rotate-45" />
              </button>
           </div>
        </div>
      )}
    </>
  );
}
