import { FileUploadEditor } from "@/components/file-upload-editor";
import { ArrowLeft, Database } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";

export default function UploadeFile() {
  return (
    <main className="min-h-screen bg-background text-foreground relative overflow-hidden font-sans">
      {/* Corporate Grid texture background */}
      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-40 dark:opacity-20"
        style={{
          backgroundImage: `
            linear-gradient(to right, currentColor 1px, transparent 1px),
            linear-gradient(to bottom, currentColor 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          color: "var(--border)",
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-10 space-y-8">
        <header className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <Database className="w-3.5 h-3.5" />
              Dataset Workspace · Excel & CSV Editor
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Excel Data Workbench
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl">
              Upload CSV or Excel spreadsheets, edit values on-the-fly, calibrate columns, and commit structured datasets to the vault.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground h-9 text-xs font-semibold">
            <Link to="/" className="flex items-center gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>
          </Button>
        </header>

        <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-2 shadow-2xl relative">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Database className="w-5 h-5" />
               </div>
               <h2 className="text-lg font-black text-foreground uppercase tracking-widest">Dataset Workbench</h2>
            </div>
            <FileUploadEditor />
          </div>
        </div>
      </div>
    </main>
  );
}
