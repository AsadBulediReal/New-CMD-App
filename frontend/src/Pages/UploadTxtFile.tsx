import { TxtUploadEditor } from "@/components/txt-upload-editor";
import { ArrowLeft, FileText, HelpCircle, Eraser, Calendar, ScanLine, Combine } from "lucide-react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import { useState } from "react";
import { HelpDialog } from "../components/shared/help-dialog";

export default function UploadTxtFile() {
  const [showHelp, setShowHelp] = useState(false);

  const features = [
    {
      icon: <Eraser className="w-5 h-5 text-cyan-500" />,
      title: "Noise Reduction",
      desc: "Automatically identifies and strips away system headers, page numbers, and repetitive bank footers."
    },
    {
      icon: <Calendar className="w-5 h-5 text-blue-500" />,
      title: "Date Extraction",
      desc: "Parses multiple date formats (DD/MM/YYYY, DD-MMM-YY, etc.) into a standardized system format."
    },
    {
      icon: <ScanLine className="w-5 h-5 text-purple-500" />,
      title: "Smart Remarks",
      desc: "Isolates transaction particulars from transaction IDs and other metadata for cleaner reporting."
    },
    {
      icon: <Combine className="w-5 h-5 text-emerald-500" />,
      title: "Challan Detection",
      desc: "Specifically scans descriptions for Challan Numbers to enable downstream reconciliation."
    }
  ];
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

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6 sm:space-y-8">
        <header className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <FileText className="w-3.5 h-3.5" />
              Ingestion MOD-01 · Statement Parser
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground">
              TXT Bank Statement Ingestion
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium max-w-2xl">
              Upload raw bank-statement files. Automatically strip noise, extract transactions, and output structured JSON records.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            <Button 
              variant="outline" 
              onClick={() => setShowHelp(true)}
              className="border-border text-foreground hover:bg-muted gap-2 h-9 px-3.5 rounded-md font-semibold text-xs"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              Parser Guidelines
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground h-9 text-xs font-semibold">
              <Link to="/" className="flex items-center gap-1.5">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
              </Link>
            </Button>
          </div>
        </header>

        <HelpDialog 
          isOpen={showHelp}
          onOpenChange={setShowHelp}
          title="Parser Engine Guidelines"
          subtitle="How the system transforms raw text into structured data."
          features={features}
        />

        <div className="bg-card/40 backdrop-blur-xl border border-border rounded-3xl p-2 shadow-2xl relative">
          <div className="p-6">
            <div className="flex items-center gap-3 mb-6">
               <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <FileText className="w-5 h-5" />
               </div>
               <h2 className="text-lg font-black text-foreground uppercase tracking-widest">Input Stream</h2>
            </div>
            <TxtUploadEditor />
          </div>
        </div>
      </div>
    </main>
  );
}
