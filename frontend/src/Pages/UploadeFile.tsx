import { FileUploadEditor } from "@/components/file-upload-editor";
import { ArrowLeft, Database } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";

export default function UploadeFile() {
  return (
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-12 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Data <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">Editor</span> Workspace
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Upload CSV or Excel files, perform on-the-fly edits, and manage structured datasets before archival.
            </p>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Tools
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
