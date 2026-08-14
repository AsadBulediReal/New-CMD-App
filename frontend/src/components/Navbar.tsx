import { Link, useLocation } from "react-router";
import { ModeToggle } from "./ModeToggle";
import { BugReportDialog } from "./BugReportDialog";

export default function Navbar() {
  const location = useLocation();

  const links = [
    { name: "Dashboard", href: "/" },
    { name: "Upload Excel", href: "/upload" },
    { name: "Saved Files", href: "/saved-files" },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b border-border font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo & Corporate Branding */}
        <Link to="/" className="flex items-center gap-3 group transition-all">
          <div className="w-9 h-9 rounded-md flex items-center justify-center bg-primary text-primary-foreground shadow-xs group-hover:opacity-90 transition-opacity">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight text-foreground flex items-center gap-1.5 leading-tight">
              CMD <span className="text-primary font-bold">SYSTEM</span>
            </span>
            <span className="text-[10px] tracking-wider uppercase font-semibold text-muted-foreground/80">
              Finance Wing · University of Sindh
            </span>
          </div>
        </Link>

        {/* Links & Toggle */}
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1 bg-muted/70 p-1 rounded-lg border border-border">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-semibold tracking-wide transition-all duration-150 ${
                    isActive
                      ? "bg-card text-foreground shadow-xs border border-border"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="h-5 w-px bg-border hidden md:block mx-1" />

          <BugReportDialog />
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
