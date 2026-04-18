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
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-blue-500/5 blur-[100px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[80px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-12 space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              TXT <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">Parser</span> Engine
            </h1>
            <p className="text-muted-foreground font-medium max-w-2xl">
              Upload plain text bank statements. The system will automatically detect headers, extract transactions, and match them with challan remarks.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowHelp(true)}
              className="border-blue-500/30 text-blue-600 hover:bg-blue-500/10 dark:text-blue-400 gap-2 h-10 px-4 rounded-xl font-bold"
            >
              <HelpCircle className="w-4 h-4" />
              Features & Tips
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground h-10 rounded-xl">
              <Link to="/" className="flex items-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Back to Tools
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
