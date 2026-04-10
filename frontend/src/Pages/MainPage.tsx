import { Link } from "react-router";

/* ── Per-tool config ──────────────────────────────────────────────────────── */
const features = [
  {
    title: "Convert TXT to JSON",
    description: "Parse bank statement TXT files and convert them into structured JSON format for further processing.",
    link: "/upload-txt",
    status: "live",
    gradient: "from-blue-500 to-cyan-600",
    glow: "rgba(59,130,246,0.35)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    title: "Reconcile BS vs MIS",
    description: "Run primary reconciliation between Bank Statements and MIS data to identify discrepancies.",
    link: "/reconcile",
    status: "live",
    gradient: "from-sky-500 to-blue-600",
    glow: "rgba(14,165,233,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
  },
  {
    title: "JSON Summary to Excel",
    description: "Export processed JSON summary data into a formatted Excel workbook ready for reporting.",
    link: "#",
    status: "soon",
    gradient: "from-emerald-500 to-teal-600",
    glow: "rgba(16,185,129,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <line x1="3" y1="9" x2="21" y2="9"/>
        <line x1="3" y1="15" x2="21" y2="15"/>
        <line x1="9" y1="3" x2="9" y2="21"/>
      </svg>
    ),
  },
  {
    title: "Merge JSON Reports",
    description: "Combine multiple JSON report files into a single unified document for consolidated analysis.",
    link: "#",
    status: "soon",
    gradient: "from-cyan-500 to-sky-600",
    glow: "rgba(6,182,212,0.30)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <circle cx="18" cy="18" r="3"/>
        <circle cx="6" cy="6" r="3"/>
        <path d="M13 6h3a2 2 0 0 1 2 2v7"/>
        <line x1="6" y1="9" x2="6" y2="21"/>
      </svg>
    ),
  },
  {
    title: "Bank Statement Analytics",
    description: "Perform deep analytics on transaction data — categorisation, bulk payments, and balance tracking.",
    link: "/analytics",
    status: "live",
    gradient: "from-blue-600 to-indigo-700",
    glow: "rgba(37,99,235,0.35)",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6">
        <line x1="18" y1="20" x2="18" y2="10"/>
        <line x1="12" y1="20" x2="12" y2="4"/>
        <line x1="6"  y1="20" x2="6"  y2="14"/>
      </svg>
    ),
  },
];

/* ── Status badge ─────────────────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
      Coming Soon
    </span>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────────── */
export default function MainPage() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden font-sans transition-colors duration-300">
      
      {/* Ambient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/10 dark:bg-blue-600/5 blur-[80px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-cyan-500/10 dark:bg-cyan-600/5 blur-[60px]" />
        <div className="absolute top-[30%] left-[40%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 dark:bg-indigo-600/5 blur-[100px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-16 md:py-24">

        {/* ── Hero ─────────────────────────────────────────────────────────── */}
        <header className="text-center mb-16 md:mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-6 drop-shadow-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth={2.5} className="w-3.5 h-3.5 dark:stroke-blue-400">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
            </svg>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-700 dark:text-blue-400">
              Financial Operations Platform
            </span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 text-foreground">
            CMD <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">System</span> Dashboard
          </h1>

          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Select a processing tool below to perform advanced bank statement and MIS data transformations.
          </p>

          <div className="flex justify-center gap-12 mt-10">
            {[
              { label: "Tools", value: "5" },
              { label: "Ready", value: "2" },
              { label: "Formats", value: "4+" },
            ].map((s) => (
              <div key={s.label} className="text-center group">
                <div className="text-3xl font-black text-foreground group-hover:text-blue-600 transition-colors">{s.value}</div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </header>

        {/* ── Grid ─────────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {features.map((feature, i) => {
            const isLive = feature.status === "live";
            return (
              <div
                key={i}
                className={`group relative flex flex-col p-8 rounded-3xl border transition-all duration-300 ${
                  isLive 
                    ? "bg-card/50 backdrop-blur-xl border-border hover:border-blue-500/30 hover:shadow-2xl hover:shadow-blue-500/10 hover:-translate-y-1" 
                    : "bg-muted/30 border-border/50 opacity-80"
                }`}
              >
                {/* Accent top gradient bar */}
                <div className={`absolute top-0 left-8 right-8 h-1 rounded-b-full bg-linear-to-r ${feature.gradient} opacity-20 group-hover:opacity-100 transition-opacity`} />

                <div className="flex items-start justify-between mb-8">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 group-hover:scale-110 transition-transform shadow-inner">
                    {feature.icon}
                  </div>
                  <StatusBadge status={feature.status} />
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-3 text-foreground tracking-tight underline-offset-4 decoration-blue-500/30">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-secondary-foreground/70 leading-relaxed font-medium">
                    {feature.description}
                  </p>
                </div>

                <div className="mt-8">
                  {isLive ? (
                    <Link
                      to={feature.link}
                      className={`block w-full text-center py-3 rounded-xl text-sm font-bold transition-all duration-300 bg-linear-to-r ${feature.gradient} text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 hover:scale-[1.02] active:scale-95`}
                    >
                      Launch Tool →
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="w-full text-center py-3 rounded-xl text-sm font-bold bg-muted border border-border text-muted-foreground cursor-not-allowed"
                    >
                      Under Development
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ───────────────────────────────────────────────────────── */}
        <footer className="text-center mt-20 md:mt-32">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            CMD System · Operations Node 01 · 2026
          </p>
        </footer>
      </div>
    </main>
  );
}
