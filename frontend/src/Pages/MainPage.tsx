import { Link } from "react-router";
import { useEffect, useRef, useState } from "react";

/* ── Particle canvas background ─────────────────────────────────────────── */
function ParticleCanvas({ dark }: { dark: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf: number;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const count = 50;
    const dots = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.4 + 0.4,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      alpha: Math.random() * 0.45 + 0.1,
    }));

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const baseColor = dark ? "99,179,237" : "37,99,235";
      dots.forEach((d) => {
        d.x += d.vx;
        d.y += d.vy;
        if (d.x < 0) d.x = canvas.width;
        if (d.x > canvas.width) d.x = 0;
        if (d.y < 0) d.y = canvas.height;
        if (d.y > canvas.height) d.y = 0;

        ctx.beginPath();
        ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${baseColor},${d.alpha * (dark ? 1 : 0.6)})`;
        ctx.fill();
      });

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const dx = dots[i].x - dots[j].x;
          const dy = dots[i].y - dots[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(dots[i].x, dots[i].y);
            ctx.lineTo(dots[j].x, dots[j].y);
            ctx.strokeStyle = `rgba(${baseColor},${0.10 * (1 - dist / 120) * (dark ? 1 : 0.5)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [dark]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-0 pointer-events-none opacity-40"
    />
  );
}

/* ── Tool data ───────────────────────────────────────────────────────────── */
const tools = [
  {
    id: "txt-json",
    title: "TXT → JSON",
    subtitle: "Statement Parser",
    description:
      "Ingest raw bank-statement TXT files and emit clean, validated JSON records ready for downstream processing.",
    link: "/upload-txt",
    color: "#3b82f6",
    colorDimDark: "rgba(59,130,246,0.12)",
    colorDimLight: "rgba(59,130,246,0.08)",
    colorBorderDark: "rgba(59,130,246,0.30)",
    colorBorderLight: "rgba(59,130,246,0.25)",
    colorGlow: "rgba(59,130,246,0.40)",
    tag: "PARSER",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: "reconcile",
    title: "BS ↔ MIS",
    subtitle: "Reconciliation Engine",
    description:
      "Cross-match Bank Statement entries against MIS data with delta reporting and discrepancy flagging.",
    link: "/reconcile",
    color: "#06b6d4",
    colorDimDark: "rgba(6,182,212,0.12)",
    colorDimLight: "rgba(6,182,212,0.08)",
    colorBorderDark: "rgba(6,182,212,0.30)",
    colorBorderLight: "rgba(6,182,212,0.25)",
    colorGlow: "rgba(6,182,212,0.40)",
    tag: "ENGINE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
  },
  {
    id: "merge",
    title: "Merge Reports",
    subtitle: "Excel Consolidator",
    description:
      "Combine multiple Excel report slices into one unified workbook — deduped, sorted, and export-ready.",
    link: "/merge-json",
    color: "#8b5cf6",
    colorDimDark: "rgba(139,92,246,0.12)",
    colorDimLight: "rgba(139,92,246,0.08)",
    colorBorderDark: "rgba(139,92,246,0.30)",
    colorBorderLight: "rgba(139,92,246,0.25)",
    colorGlow: "rgba(139,92,246,0.40)",
    tag: "MERGE",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <circle cx="18" cy="18" r="3" />
        <circle cx="6" cy="6" r="3" />
        <path d="M13 6h3a2 2 0 0 1 2 2v7" />
        <line x1="6" y1="9" x2="6" y2="21" />
      </svg>
    ),
  },
  {
    id: "analytics",
    title: "Analytics",
    subtitle: "Deep Insights Module",
    description:
      "Categorise transactions, track balance drift, spot bulk payments — powered by full dataset scanning.",
    link: "/analytics",
    color: "#f59e0b",
    colorDimDark: "rgba(245,158,11,0.12)",
    colorDimLight: "rgba(245,158,11,0.08)",
    colorBorderDark: "rgba(245,158,11,0.30)",
    colorBorderLight: "rgba(245,158,11,0.25)",
    colorGlow: "rgba(245,158,11,0.40)",
    tag: "INSIGHT",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "audit",
    title: "Audit Categorizer",
    subtitle: "Auto-Classifier",
    description:
      "Auto-classify every transaction into predefined audit collections using Type Code rule sets.",
    link: "/audit",
    color: "#ec4899",
    colorDimDark: "rgba(236,72,153,0.12)",
    colorDimLight: "rgba(236,72,153,0.08)",
    colorBorderDark: "rgba(236,72,153,0.30)",
    colorBorderLight: "rgba(236,72,153,0.25)",
    colorGlow: "rgba(236,72,153,0.40)",
    tag: "AUDIT",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7}
        strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

/* ── Live clock ──────────────────────────────────────────────────────────── */
function LiveClock() {
  const [time, setTime] = useState(() => new Date().toLocaleTimeString("en-GB"));
  useEffect(() => {
    const id = setInterval(() => setTime(new Date().toLocaleTimeString("en-GB")), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="font-mono">{time}</span>;
}

/* ── Tool card ───────────────────────────────────────────────────────────── */
function ToolCard({ tool, dark }: { tool: typeof tools[0]; dark: boolean }) {
  const [hovered, setHovered] = useState(false);
  const colorDim = dark ? tool.colorDimDark : tool.colorDimLight;
  const colorBorder = dark ? tool.colorBorderDark : tool.colorBorderLight;

  return (
    <Link
      to={tool.link}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="group relative flex flex-col rounded-2xl overflow-hidden transition-all duration-500 focus:outline-none"
      style={{
        background: hovered
          ? `linear-gradient(135deg, ${colorDim} 0%, transparent 100%)`
          : dark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)",
        border: `1px solid ${hovered ? colorBorder : dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.09)"}`,
        boxShadow: hovered
          ? `0 0 40px ${tool.colorGlow}, 0 20px 60px ${dark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.12)"}`
          : dark ? "0 1px 3px rgba(0,0,0,0.3)" : "0 1px 4px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-6px) scale(1.01)" : "translateY(0) scale(1)",
      }}
    >
      {/* top accent line */}
      <div
        className="absolute inset-x-0 top-0 h-[2px] transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${tool.color}, transparent)`,
          opacity: hovered ? 1 : 0.25,
        }}
      />

      {/* inner glow orb */}
      <div
        className="absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl transition-opacity duration-500 pointer-events-none"
        style={{ background: tool.color, opacity: hovered ? (dark ? 0.13 : 0.08) : 0 }}
      />

      <div className="relative flex flex-col flex-1 p-7">
        {/* header row */}
        <div className="flex items-center justify-between mb-6">
          <div
            className="w-14 h-14 rounded-xl flex items-center justify-center transition-all duration-300"
            style={{
              background: colorDim,
              border: `1px solid ${colorBorder}`,
              color: tool.color,
              boxShadow: hovered ? `0 0 20px ${tool.colorGlow}` : "none",
            }}
          >
            {tool.icon}
          </div>

          <span
            className="text-[10px] font-black tracking-[0.2em] px-3 py-1 rounded-full"
            style={{
              color: tool.color,
              background: colorDim,
              border: `1px solid ${colorBorder}`,
            }}
          >
            {tool.tag}
          </span>
        </div>

        {/* text */}
        <div className="flex-1">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ color: tool.color, opacity: 0.8 }}
          >
            {tool.subtitle}
          </p>
          <h3 className="text-2xl font-black tracking-tight mb-3 text-foreground">
            {tool.title}
          </h3>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {tool.description}
          </p>
        </div>

        {/* CTA */}
        <div className="mt-7 flex items-center gap-2">
          <div
            className="flex-1 h-px transition-all duration-300"
            style={{
              background: hovered ? colorBorder : dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)",
            }}
          />
          <span
            className="text-xs font-bold tracking-widest uppercase transition-colors duration-300"
            style={{
              color: hovered ? tool.color : dark ? "rgba(255,255,255,0.22)" : "rgba(0,0,0,0.28)",
            }}
          >
            Launch →
          </span>
        </div>
      </div>

      {/* live dot */}
      <div className="absolute bottom-4 left-7 flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-500/70">Live</span>
      </div>
    </Link>
  );
}

/* ── Detect dark mode ────────────────────────────────────────────────────── */
function useDark() {
  const [dark, setDark] = useState(
    () => document.documentElement.classList.contains("dark")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.classList.contains("dark"))
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function MainPage() {
  const dark = useDark();

  return (
    <main className="relative min-h-screen bg-background overflow-hidden font-sans transition-colors duration-300">
      <ParticleCanvas dark={dark} />

      {/* dot-grid texture */}
      <div
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(${dark ? "rgba(99,179,237,0.04)" : "rgba(37,99,235,0.04)"} 1px, transparent 1px), linear-gradient(90deg, ${dark ? "rgba(99,179,237,0.04)" : "rgba(37,99,235,0.04)"} 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      {/* ambient orbs */}
      <div className={`fixed top-[-200px] left-[-80px] w-[600px] h-[600px] rounded-full blur-[120px] pointer-events-none z-0 transition-opacity duration-500 ${dark ? "bg-blue-600/10 opacity-100" : "bg-blue-400/10 opacity-60"}`} />
      <div className={`fixed bottom-[-120px] right-[-100px] w-[500px] h-[500px] rounded-full blur-[100px] pointer-events-none z-0 transition-opacity duration-500 ${dark ? "bg-violet-600/10 opacity-100" : "bg-violet-400/8 opacity-50"}`} />
      <div className={`fixed top-[40%] left-[45%] w-[300px] h-[300px] rounded-full blur-[80px] pointer-events-none z-0 transition-opacity duration-500 ${dark ? "bg-cyan-500/5 opacity-100" : "bg-cyan-400/5 opacity-60"}`} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pt-12 pb-24">

        {/* ── System status bar ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-16 px-5 py-3 rounded-xl border border-border bg-card/40 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-500 dark:text-emerald-400/80">
              All systems operational
            </span>
          </div>
          <div className="hidden sm:flex items-center gap-6">
            <span className="text-[11px] font-mono text-muted-foreground/50 uppercase tracking-widest">Node-01</span>
            <div className="h-3 w-px bg-border" />
            <span className="text-[11px] text-muted-foreground/50 tracking-widest">
              <LiveClock />
            </span>
          </div>
        </div>

        {/* ── Hero ───────────────────────────────────────────────────────── */}
        <header className="flex flex-col items-center text-center mb-20">

          {/* pre-heading */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-8 h-8 text-foreground">
              <line x1="3" y1="22" x2="21" y2="22" />
              <line x1="6" y1="18" x2="6" y2="11" />
              <line x1="10" y1="18" x2="10" y2="11" />
              <line x1="14" y1="18" x2="14" y2="11" />
              <line x1="18" y1="18" x2="18" y2="11" />
              <polygon points="12 2 20 7 4 7" />
            </svg>
            <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-foreground">
              Finance Wing,{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, #3b82f6 0%, #818cf8 40%, #c084fc 80%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                University
              </span>
              {" "}<span className="text-black dark:text-white font-medium">of Sindh</span>
            </h2>
          </div>

          {/* headline */}
          <h1 className="text-5xl sm:text-7xl font-semibold tracking-tight leading-[1.05] text-foreground mb-10">
            CMD{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #818cf8 40%, #c084fc 80%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              System
            </span>
            {" "}<span className="text-black dark:text-white font-medium">Dashboard</span>
          </h1>

          {/* eyebrow chip (moved from top) */}
          <div className="inline-flex items-center gap-4 px-6 py-3 mt-6 rounded-full border border-blue-500/25 bg-blue-500/10 backdrop-blur-sm">
            <svg viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth={2.5}
              className="w-7 h-7 dark:stroke-blue-400 stroke-blue-600">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            <span className="text-2xl font-black uppercase tracking-[0.22em] text-blue-600 dark:text-blue-400">
              Financial Digital Platform
            </span>
          </div>
        </header>

        {/* ── Section divider ────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 mb-8">
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="text-xl font-black uppercase tracking-[0.3em] text-black dark:text-white">
            Operations Center
          </span>
          <div className="flex-1 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
        </div>

        {/* ── Tool cards grid ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <ToolCard key={tool.id} tool={tool} dark={dark} />
          ))}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <footer className="mt-24 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em] text-muted-foreground/40">
              CMD System · 2026
            </span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
          </div>
          <p className="text-[10px] text-muted-foreground/30 font-mono tracking-widest">
            Operations Node 01 · Internal Build
          </p>
        </footer>
      </div>
    </main>
  );
}
