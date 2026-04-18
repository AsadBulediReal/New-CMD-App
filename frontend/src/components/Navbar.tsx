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
    <nav className="sticky top-0 z-100 bg-background/80 backdrop-blur-md border-b border-border font-sans transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group transition-all">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-linear-to-br from-blue-600 to-cyan-500 shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={2.5} strokeLinecap="round" className="w-4 h-4">
              <rect x="3" y="3" width="18" height="18" rx="3"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight text-foreground">
            CMD<span className="text-blue-600 dark:text-blue-400">System</span>
          </span>
        </Link>

        {/* Links & Toggle */}
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-1">
            {links.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.name}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground border border-transparent"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>
          
          <div className="h-8 w-px bg-border hidden md:block mx-1" />
          
          <BugReportDialog />
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
}
