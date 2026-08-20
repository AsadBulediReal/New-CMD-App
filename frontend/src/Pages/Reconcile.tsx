import { useState, useEffect } from "react";
import { getAutoMapping } from "../utils/dataProcessing";
import { MultiSheetViewer, type SheetData } from "../components/multi-sheet-viewer";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  GitCompare, 
  FileCheck2, 
  Map as MapIcon, 
  AlertCircle, 
  Loader2,
  Save,
  ArrowLeft,
  FileText,
  FileSpreadsheet,
  HelpCircle,
  Link as LinkIcon,
  Search,
  Database
} from "lucide-react";
import { Link } from "react-router";
import { HelpDialog } from "../components/shared/help-dialog";
import { AdvancedFileSelector, type DateFilter, type StoredFileMeta } from "../components/shared/advanced-file-selector";
import { getApiUrl } from "../utils/api";

// ── Required fields for BS and MIS ───────────────────────────────────────────
const BS_REQUIRED_FIELDS = [
  { key: "Challan No.", label: "BS Challan Number", description: "Reference column in bank statement" },
  { key: "Amount",      label: "BS Credit Amount",   description: "Credit transaction value in BS"       },
];

const MIS_REQUIRED_FIELDS = [
  { key: "Challan No.", label: "MIS Challan Number", description: "Reference column in MIS record"         },
  { key: "Amount",      label: "MIS Paid Amount",    description: "Amount paid as per MIS"               },
  { key: "Remarks",     label: "MIS Remarks",        description: "Contains corrections or actual numbers" },
];

type StoredFile = StoredFileMeta;

type FieldMap = Record<string, string>;

export default function Reconcile() {
  const [showHelp, setShowHelp] = useState(false);

  const features = [
    {
      icon: <LinkIcon className="w-5 h-5 text-sky-500" />,
      title: "Dual-Source Mapping",
      desc: "Connect columns from both Bank Statements and MIS reports into a single matching logic stream."
    },
    {
      icon: <Search className="w-5 h-5 text-blue-500" />,
      title: "Matching Engine",
      desc: "Identifies exact pairs based on Challan Number and Amount, while flagging partial discrepancies."
    },
    {
      icon: <MapIcon className="w-5 h-5 text-cyan-500" />,
      title: "Sheet Flexibility",
      desc: "Directly target specific sheets within multi-page workbooks for precise data comparison."
    },
    {
      icon: <Database className="w-5 h-5 text-indigo-500" />,
      title: "Vault Integration",
      desc: "Commit finalized reconciliation results back to the secure vault for historical tracking."
    }
  ];
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedMisSheetName, setSelectedMisSheetName] = useState<string>("");
  const [selectedBsSheetName, setSelectedBsSheetName] = useState<string>("");

  // File Selections
  const [bsFileId, setBsFileId] = useState<string>("");
  const [misFileId, setMisFileId] = useState<string>("");

  // Date Filters
  const [bsDateFilter, setBsDateFilter] = useState<DateFilter>({ column: "", start: undefined, end: undefined });
  const [misDateFilter, setMisDateFilter] = useState<DateFilter>({ column: "", start: undefined, end: undefined });

  // Mappings
  const [bsFieldMap, setBsFieldMap] = useState<FieldMap>({});
  const [misFieldMap, setMisFieldMap] = useState<FieldMap>({});
  
  // Mapping Modal State
  const [mappingTarget, setMappingTarget] = useState<"BS" | "MIS" | null>(null);
  const [draftMap, setDraftMap] = useState<FieldMap>({});

  // Result State
  const [isReconciling, setIsReconciling] = useState(false);
  const [error, setError] = useState("");
  const [resultFilename, setResultFilename] = useState("");
  const [sheets, setSheets] = useState<SheetData[] | null>(null);

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [newFilename, setNewFilename] = useState("");

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      const res = await fetch(getApiUrl("/api/files"));
      if (!res.ok) throw new Error("Failed to fetch files");
      setFiles(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const handleFileSelect = (type: "BS" | "MIS", id: string) => {
    if (type === "BS") {
      setBsFileId(id);
      const file = files.find(f => f._id === id);
      const sheets = file?.sheets || [];
      
      if (sheets.length === 1) {
        // Auto-select if ONLY one sheet
        handleBsSheetSelect(sheets[0].name);
      } else if (sheets.length === 0 && file) {
        // Legacy file support
        handleBsSheetSelect("Main Sheet");
      } else {
        setSelectedBsSheetName("");
        setBsFieldMap({});
      }
    } else {
      setMisFileId(id);
      const file = files.find(f => f._id === id);
      const sheets = file?.sheets || [];

      if (sheets.length === 1) {
        handleMisSheetSelect(sheets[0].name);
      } else if (sheets.length === 0 && file) {
        handleMisSheetSelect("Main Sheet");
      } else {
        setSelectedMisSheetName("");
        setMisFieldMap({});
      }
    }
    setSheets(null);
    setError("");
  };

  const handleBsSheetSelect = (sheetName: string) => {
    setSelectedBsSheetName(sheetName);
    setError("");
    
    if (!sheetName) {
      setBsFieldMap({});
      return;
    }

    const file = files.find(f => f._id === bsFileId);
    let headers = [];
    
    if (sheetName === "Main Sheet") {
      headers = file?.headers || [];
    } else {
      const sheet = file?.sheets?.find(s => s.name === sheetName);
      headers = sheet?.headers || file?.headers || [];
    }
    
    const map = getAutoMapping(headers, BS_REQUIRED_FIELDS.map(f => f.key));
    setBsFieldMap(map);
  };

  const handleMisSheetSelect = (sheetName: string) => {
    setSelectedMisSheetName(sheetName);
    setError("");
    
    if (!sheetName) {
      setMisFieldMap({});
      return;
    }

    const file = files.find(f => f._id === misFileId);
    let headers = [];
    
    if (sheetName === "Main Sheet") {
      headers = file?.headers || [];
    } else {
      const sheet = file?.sheets?.find(s => s.name === sheetName);
      headers = sheet?.headers || file?.headers || [];
    }
    
    const map = getAutoMapping(headers, MIS_REQUIRED_FIELDS.map(f => f.key));
    setMisFieldMap(map);
  };

  const openMappingModal = (target: "BS" | "MIS") => {
    setMappingTarget(target);
    setDraftMap(target === "BS" ? { ...bsFieldMap } : { ...misFieldMap });
  };

  const confirmMapping = () => {
    if (mappingTarget === "BS") {
      setBsFieldMap({ ...draftMap });
    } else {
      setMisFieldMap({ ...draftMap });
    }
    setMappingTarget(null);
  };

  const handleReconcile = async () => {
    if (!bsFileId || !misFileId) return;
    setIsReconciling(true);
    setError("");
    setSheets(null);
    setSaveMessage("");

    try {
      const response = await fetch(getApiUrl("/api/reconcile-bs-mis"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bsFileId,
          misFileId,
          bsSheetName: selectedBsSheetName,
          misSheetName: selectedMisSheetName,
          bsMapping: bsFieldMap,
          misMapping: misFieldMap,
          bsDateFilter: bsDateFilter.column ? bsDateFilter : undefined,
          misDateFilter: misDateFilter.column ? misDateFilter : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setResultFilename(result.filename);
      setSheets(result.sheets);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reconcile files");
    } finally {
      setIsReconciling(false);
    }
  };

  const handleSaveResult = async () => {
    if (!sheets || !newFilename.trim()) return;
    setIsSaveModalOpen(false);
    setIsSaving(true);
    setSaveMessage("");
    try {
      const res = await fetch(getApiUrl("/api/files"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: newFilename.trim(), sheets }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setSaveMessage("✓ Reconciliation saved!");
      fetchFiles();
    } catch (e) {
      setSaveMessage(`✗ ${e instanceof Error ? e.message : "Save failed"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const bsFile = files.find(f => f._id === bsFileId);
  const misFile = files.find(f => f._id === misFileId);

  const isBsMapped = BS_REQUIRED_FIELDS.every(f => !!bsFieldMap[f.key]);
  const isMisMapped = MIS_REQUIRED_FIELDS.every(f => !!misFieldMap[f.key]);

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
        {/* Header */}
        <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <GitCompare className="w-3.5 h-3.5" />
              Engine MOD-02 · BS ↔ MIS Matching
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
              Bank Statement Reconciliation
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium">
              Primary verification engine matching Bank Statements against MIS records with delta reporting.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowHelp(true)}
              className="border-border text-foreground hover:bg-muted gap-2 h-9 px-3.5 rounded-md font-semibold text-xs"
            >
              <HelpCircle className="w-4 h-4 text-primary" />
              Engine Guidelines
            </Button>
            <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground h-9 text-xs font-semibold">
               <Link to="/" className="flex items-center gap-1.5">
                 <ArrowLeft className="w-4 h-4" /> Back to Dashboard
               </Link>
            </Button>
          </div>
        </div>

        <HelpDialog 
          isOpen={showHelp}
          onOpenChange={setShowHelp}
          title="Reconciliation Guidelines"
          subtitle="Tips for matching Bank Statements against MIS records."
          features={features}
        />

        {/* Configuration Card */}
        <Card className="p-8 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative group">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-sky-500 to-blue-600 opacity-20" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Left: Bank Statement Selection */}
            <div className="space-y-6">
               <AdvancedFileSelector
                 files={files}
                 selectedFileId={bsFileId}
                 onFileChange={(id) => handleFileSelect("BS", id)}
                 selectedSheetName={selectedBsSheetName}
                 onSheetChange={handleBsSheetSelect}
                 showDateFilter={true}
                 dateFilter={bsDateFilter}
                 onDateFilterChange={setBsDateFilter}
                 disabled={isReconciling}
                 accentColor="sky"
                 label="1. Bank Statement (BS)"
                 labelIcon={<FileText className="w-3.5 h-3.5 text-sky-500" />}
               />

               {bsFile && selectedBsSheetName && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-sky-500/5 border border-sky-500/10 animate-in fade-in zoom-in-95 duration-300">
                      <div className="space-y-3 flex-1">
                        <div className="flex flex-wrap gap-2">
                          {BS_REQUIRED_FIELDS.map(f => {
                            const mapped = bsFieldMap[f.key];
                            const isMissing = !mapped;
                            return (
                              <div key={f.key} className={`text-[10px] px-2 py-1 rounded-md font-bold border ${isMissing ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-sky-500/10 text-sky-600 border-sky-500/20"}`}>
                                {f.key}: {mapped || "MISSING"}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => openMappingModal("BS")} className="text-sky-600 font-bold ml-4">
                        Map
                      </Button>
                   </div>
               )}
            </div>

            {/* Right: MIS Data Selection */}
            <div className="space-y-6">
               <AdvancedFileSelector
                 files={files}
                 selectedFileId={misFileId}
                 onFileChange={(id) => handleFileSelect("MIS", id)}
                 selectedSheetName={selectedMisSheetName}
                 onSheetChange={handleMisSheetSelect}
                 showDateFilter={true}
                 dateFilter={misDateFilter}
                 onDateFilterChange={setMisDateFilter}
                 disabled={isReconciling}
                 accentColor="blue"
                 label="2. MIS Record Data"
                 labelIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-blue-500" />}
               />

               {misFile && selectedMisSheetName && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 animate-in fade-in zoom-in-95 duration-300">
                     <div className="space-y-3 flex-1">
                       <div className="flex flex-wrap gap-2">
                         {MIS_REQUIRED_FIELDS.map(f => {
                           const mapped = misFieldMap[f.key];
                           const isMissing = !mapped;
                           return (
                             <div key={f.key} className={`text-[10px] px-2 py-1 rounded-md font-bold border ${isMissing ? "bg-red-500/10 text-red-600 border-red-500/20" : "bg-blue-500/10 text-blue-600 border-blue-500/20"}`}>
                               {f.key}: {mapped || "MISSING"}
                             </div>
                           );
                         })}
                       </div>
                     </div>
                     <Button variant="ghost" size="sm" onClick={() => openMappingModal("MIS")} className="text-blue-600 font-bold ml-4">
                       Map
                     </Button>
                  </div>
               )}
            </div>
          </div>

          <div className="mt-12 flex flex-col items-center">
             <Button
                onClick={handleReconcile}
                disabled={!bsFileId || !misFileId || !isBsMapped || !isMisMapped || isReconciling}
                className="w-full max-w-md rounded-2xl h-14 font-black text-lg text-white bg-linear-to-r from-sky-500 to-blue-600 shadow-2xl shadow-blue-500/20 active:scale-95 transition-all"
              >
                {isReconciling ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    Executing Data Matching...
                  </>
                ) : (
                  <>
                    <GitCompare className="w-6 h-6 mr-3" />
                    Start Reconciliation
                  </>
                )}
              </Button>
              {(!isBsMapped || !isMisMapped) && bsFileId && misFileId && (
                <p className="mt-4 text-xs font-bold text-red-500 animate-pulse">
                  ⚠️ Some fields are not mapped. Please calibrate the engine before running.
                </p>
              )}
          </div>

          {error && (
            <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
        </Card>

        {/* Results */}
        {sheets && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
             <Card className="border-border bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
              <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-border gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <FileCheck2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-black text-foreground">Reconciliation Finished</h2>
                    <p className="text-xs font-bold text-muted-foreground">{resultFilename}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                   {saveMessage && (
                    <span className={`text-sm font-bold ${saveMessage.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
                      {saveMessage}
                    </span>
                  )}
                   <Button
                    onClick={() => { setNewFilename(resultFilename); setIsSaveModalOpen(true); }}
                    disabled={isSaving}
                    className="w-full md:w-auto px-8 py-6 rounded-2xl font-black bg-foreground text-background hover:opacity-90 gap-2 shadow-xl active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-5 h-5" />}
                    Store in Vault
                  </Button>
                </div>
              </div>
              
              <div className="p-2 bg-muted/10">
                <MultiSheetViewer sheets={sheets} downloadFilename={resultFilename} />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Mapping Modal ─────────────────────────────────────────────────── */}
      <Dialog open={!!mappingTarget} onOpenChange={() => setMappingTarget(null)}>
        <DialogContent className="max-w-xl bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
               <MapIcon className="w-6 h-6 text-sky-600" />
               Logic-Field Calibration ({mappingTarget})
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <p className="text-sm text-muted-foreground font-medium">
              Calibrate the system engine by matching the {mappingTarget} file columns to the required reconciliation categories.
            </p>

            <div className="space-y-5">
              {(mappingTarget === "BS" ? BS_REQUIRED_FIELDS : MIS_REQUIRED_FIELDS).map(field => {
                const current = draftMap[field.key] || "";
                const availableColumns = (mappingTarget === "BS" ? bsFile : misFile)?.headers || [];
                return (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border group hover:border-sky-500/40 transition-all">
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground group-hover:text-sky-600 transition-colors">{field.label}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{field.description}</p>
                    </div>
                    <select
                      className={`w-full sm:w-48 bg-background border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-sky-500/20 ${
                        !current ? "border-red-500/40" : "border-sky-500/40"
                      }`}
                      value={current}
                      onChange={e => setDraftMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">-- SELECT --</option>
                      {availableColumns.map(col => (
                        <option key={col} value={col}>{col}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-border">
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setMappingTarget(null)}>Cancel</Button>
            <Button
              onClick={confirmMapping}
              disabled={(mappingTarget === "BS" ? BS_REQUIRED_FIELDS : MIS_REQUIRED_FIELDS).some(f => !draftMap[f.key])}
              className="bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl px-6 min-w-32 shadow-xl shadow-sky-500/20 active:scale-95 transition-all"
            >
              Verify Mapping
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Save Modal ────────────────────────────────────────────────────── */}
      <Dialog open={isSaveModalOpen} onOpenChange={setIsSaveModalOpen}>
        <DialogContent className="max-w-md bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Archive Result Set</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-2">
             <label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Archive Identity</label>
             <input
              type="text"
              placeholder="Designate filename..."
              value={newFilename}
              onChange={e => setNewFilename(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500/50 transition-all box-border"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsSaveModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveResult}
              disabled={!newFilename.trim() || isSaving}
              className="bg-sky-600 hover:bg-sky-700 text-white font-black rounded-xl px-8 shadow-xl shadow-sky-500/20 active:scale-95 transition-all"
            >
              Commit Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
