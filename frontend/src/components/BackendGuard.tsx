import React, { useState, useEffect, useRef } from "react";
import { RefreshCw, Server, Database, WifiOff } from "lucide-react";
import { getApiUrl } from "@/utils/api";

interface BackendHealthResponse {
  status: string;
  database: string;
  version?: string;
  message?: string;
}

export function BackendGuard({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [dbConnected, setDbConnected] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [version, setVersion] = useState<string>("1.0.0");

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    let timerId: NodeJS.Timeout | null = null;
    let heartbeatId: NodeJS.Timeout | null = null;

    const probeBackend = async () => {
      if (!isMountedRef.current) return;
      setAttempts(prev => prev + 1);

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);

        const response = await fetch(getApiUrl("/api/health"), {
          signal: controller.signal,
          cache: "no-store",
        });
        clearTimeout(timeout);

        if (!response.ok) {
          const data: BackendHealthResponse = await response.json().catch(() => ({}));
          setApiConnected(true);
          setDbConnected(false);
          setErrorMessage(data.message || `Backend returned HTTP ${response.status}`);
          setIsReady(false);
          timerId = setTimeout(probeBackend, 2000);
          return;
        }

        const data: BackendHealthResponse = await response.json();
        if (data.version) setVersion(data.version);

        const isDbOk = data.database === "connected";
        const isAppOk = data.status === "ok" && isDbOk;

        setApiConnected(true);
        setDbConnected(isDbOk);

        if (isAppOk) {
          setErrorMessage(null);
          setIsReady(true);
          setIsReconnecting(false);
        } else {
          setErrorMessage(data.message || "Database connection in progress...");
          setIsReady(false);
          timerId = setTimeout(probeBackend, 2000);
        }
      } catch (err: any) {
        if (!isMountedRef.current) return;
        setApiConnected(false);
        setDbConnected(false);
        setIsReady(false);

        if (err.name === "AbortError") {
          setErrorMessage("Connection timed out. Waiting for backend response...");
        } else {
          setErrorMessage(err.message || "Backend server unreachable");
        }

        timerId = setTimeout(probeBackend, 2500);
      }
    };

    // Immediate initial probe
    probeBackend();

    // Periodic heartbeat every 1 minute (60,000 ms) when ready
    heartbeatId = setInterval(() => {
      if (isMountedRef.current) {
        fetch(getApiUrl("/api/health"), { cache: "no-store" })
          .then(async res => {
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data: BackendHealthResponse = await res.json();
            if (data.status !== "ok" || data.database !== "connected") {
              throw new Error(data.message || "Database disconnected");
            }
          })
          .catch(err => {
            if (isMountedRef.current) {
              console.warn("Heartbeat lost:", err.message);
              setIsReady(false);
              setIsReconnecting(true);
              probeBackend();
            }
          });
      }
    }, 60000);

    return () => {
      isMountedRef.current = false;
      if (timerId) clearTimeout(timerId);
      if (heartbeatId) clearInterval(heartbeatId);
    };
  }, []);

  // Connection / Reconnection Screen
  if (!isReady) {
    return (
      <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-background px-6 overflow-hidden select-none font-sans">
        {/* Ambient glow background */}
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] rounded-full bg-blue-500/10 blur-[130px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-cyan-500/10 blur-[130px] animate-pulse" />

        <div className="relative flex flex-col items-center max-w-md w-full text-center z-10">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative w-20 h-20 rounded-2xl bg-card border border-border flex items-center justify-center shadow-2xl">
              {isReconnecting ? (
                <WifiOff className="w-9 h-9 text-amber-500 animate-bounce" />
              ) : (
                <RefreshCw className="w-9 h-9 text-blue-500 animate-spin" />
              )}
            </div>
          </div>

          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2">
            {isReconnecting ? "Connection Lost" : "Connecting to Backend"}
          </h2>
          <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed mb-6 max-w-sm">
            {isReconnecting
              ? "Backend connection dropped. Automatically attempting to reconnect..."
              : "Verifying connection with backend processing node and database repository."}
          </p>

          <div className="w-full space-y-3 mb-6">
            {/* API Node Status */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border backdrop-blur-sm transition-all ${
              apiConnected
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                : "border-border bg-card/60"
            }`}>
              <div className="flex items-center gap-3">
                <Server className={`w-4 h-4 ${apiConnected ? "text-emerald-500" : "text-blue-500 animate-pulse"}`} />
                <span className="text-xs font-bold text-foreground">API Node Server</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  apiConnected ? "text-emerald-500" : "text-blue-500"
                }`}>
                  {apiConnected ? "Connected" : "Connecting"}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  apiConnected ? "bg-emerald-500" : "bg-blue-500 animate-ping"
                }`} />
              </div>
            </div>

            {/* Database Status */}
            <div className={`flex items-center justify-between p-3.5 rounded-xl border backdrop-blur-sm transition-all ${
              dbConnected
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400"
                : apiConnected
                ? "border-amber-500/30 bg-amber-500/5"
                : "border-border bg-card/60 opacity-60"
            }`}>
              <div className="flex items-center gap-3">
                <Database className={`w-4 h-4 ${
                  dbConnected ? "text-emerald-500" : apiConnected ? "text-amber-500 animate-pulse" : "text-muted-foreground"
                }`} />
                <span className="text-xs font-bold text-foreground">Database Repository</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                  dbConnected ? "text-emerald-500" : apiConnected ? "text-amber-500" : "text-muted-foreground"
                }`}>
                  {dbConnected ? "Connected" : apiConnected ? "Connecting" : "Pending"}
                </span>
                <span className={`w-2 h-2 rounded-full ${
                  dbConnected ? "bg-emerald-500" : apiConnected ? "bg-amber-500 animate-ping" : "bg-muted"
                }`} />
              </div>
            </div>
          </div>

          {/* Diagnostics / Probe info */}
          <div className="w-full p-3 rounded-xl bg-muted/40 border border-border/60 text-xs font-medium text-muted-foreground space-y-1 mb-6">
            <div className="flex justify-between items-center text-[11px] font-mono">
              <span>Status Probe:</span>
              <span className="font-bold text-foreground">Attempt #{attempts}</span>
            </div>
            {errorMessage && (
              <p className="text-[11px] font-mono text-amber-600 dark:text-amber-400 truncate" title={errorMessage}>
                {errorMessage}
              </p>
            )}
          </div>

          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 rounded-xl bg-foreground text-background font-bold text-xs uppercase tracking-wider hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reload Page
          </button>
        </div>

        <div className="absolute bottom-8 text-[10px] font-mono uppercase tracking-[0.25em] text-muted-foreground/40">
          CMD SYSTEM · v{version}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
