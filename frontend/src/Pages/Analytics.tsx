import { useState, useEffect } from "react";
import { 
  getAutoMapping, 
  compressSheetData
} from "../utils/dataProcessing";
import { MultiSheetViewer, type SheetData } from "../components/multi-sheet-viewer";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  BarChart3, 
  FileCheck2, 
  Map as MapIcon, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  ArrowLeft,
  HelpCircle,
  Zap,
  Repeat,
  TrendingDown,
  LineChart
} from "lucide-react";
import { Link } from "react-router";
import { HelpDialog } from "../components/shared/help-dialog";

// ── Required analytics fields ──────────────────────────────────────────────
const REQUIRED_FIELDS: { key: string; label: string; description: string }[] = [
  { key: "Particulars",  label: "Particulars / Description",   description: "Used to detect bulk payments (contains 'txn')" },
  { key: "Challan No.",  label: "Challan / Reference Number",  description: "Used to pair reversal transactions"           },
  { key: "Debit",        label: "Debit Amount",                description: "Debit transaction value"                      },
  { key: "Credit",       label: "Credit Amount",               description: "Credit transaction value"                     },
];

interface StoredFile {
  _id: string;
  filename: string;
  uploadDate: string;
  headers: string[];
  totalRecords?: number;
  sheets?: SheetData[];
}

type FieldMap = Record<string, string>;

export default function Analytics() {
  const [showHelp, setShowHelp] = useState(false);

  const features = [
    {
      icon: <Zap className="w-5 h-5 text-blue-500" />,
      title: "Bulk Detection",
      desc: "Scans descriptions for markers like 'txn' or 'batch' to identify and group bulk payment distributions."
    },
    {
      icon: <Repeat className="w-5 h-5 text-indigo-500" />,
      title: "Reversal Engine",
      desc: "Automatically pairs matching Debit and Credit entries with identical Challans to filter out internal reversals."
    },
    {
      icon: <TrendingDown className="w-5 h-5 text-cyan-500" />,
      title: "Flow Analysis",
      desc: "Isolates total incoming vs outgoing volume to highlight net positions across specific periods."
    },
    {
      icon: <LineChart className="w-5 h-5 text-purple-500" />,
      title: "Sheet Summaries",
      desc: "Generates high-level statistical overviews including total credit/debit volume and unique challan counts."
    }
  ];
  const [files, setFiles]           = useState<StoredFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [loadingFiles, setLoadingFiles]     = useState(true);

  // Field mapping
  const [fieldMap, setFieldMap]     = useState<FieldMap>({});
  const [needsMapping, setNeedsMapping]   = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [draftMap, setDraftMap]     = useState<FieldMap>({});

  // Analysis
  const [isAnalyzing, setIsAnalyzing]   = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [analyzedFilename, setAnalyzedFilename] = useState("");
  const [sheets, setSheets]             = useState<SheetData[] | null>(null);

  // Save
  const [isSaving, setIsSaving]         = useState(false);
  const [saveMessage, setSaveMessage]   = useState("");
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [newFilename, setNewFilename]   = useState("");

  useEffect(() => { fetchFiles(); }, []);

  const fetchFiles = async () => {
    try {
      setLoadingFiles(true);
      const res = await fetch("/api/files");
      if (!res.ok) throw new Error("Failed to fetch files");
      setFiles(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    setSelectedSheetName("");
    setSheets(null);
    setAnalyzeError("");
    setSaveMessage("");
    setFieldMap({});
    setNeedsMapping(false);

    if (!fileId) return;

    const file = files.find(f => f._id === fileId);
    if (!file) return;

    // If file only has one sheet (or legacy single-sheet), initialize mapping immediately
    const sheetCount = file.sheets?.length || 0;
    if (sheetCount <= 1) {
      const headers = file.sheets?.[0]?.headers || file.headers || [];
      const map = getAutoMapping(headers, REQUIRED_FIELDS.map(f => f.key));
      setFieldMap(map);
      setNeedsMapping(Object.values(map).some(v => !v));
    }
  };

  const handleSheetSelect = (sheetName: string) => {
    setSelectedSheetName(sheetName);
    setAnalyzeError("");
    setSaveMessage("");
    
    if (!sheetName) {
      setFieldMap({});
      setNeedsMapping(false);
      return;
    }

    const file = files.find(f => f._id === selectedFileId);
    if (!file) return;

    const sheet = file.sheets?.find(s => s.name === sheetName);
    const headers = sheet?.headers || file.headers || [];
    
    const map = getAutoMapping(headers, REQUIRED_FIELDS.map(f => f.key));
    setFieldMap(map);
    setNeedsMapping(Object.values(map).some(v => !v));
  };

  const openMappingModal = () => {
    setDraftMap({ ...fieldMap });
    setShowMappingModal(true);
  };

  const confirmMapping = () => {
    setFieldMap({ ...draftMap });
    const allMapped = REQUIRED_FIELDS.every(f => !!draftMap[f.key]);
    setNeedsMapping(!allMapped);
    setShowMappingModal(false);
  };

  const allMapped = REQUIRED_FIELDS.every(f => !!fieldMap[f.key]);

  const handleAnalyze = async () => {
    if (!selectedFileId || !allMapped) return;
    setIsAnalyzing(true);
    setAnalyzeError("");
    setSheets(null);
    setSaveMessage("");

    const resolvedMap: FieldMap = {};
    for (const f of REQUIRED_FIELDS) {
      if (fieldMap[f.key] && fieldMap[f.key] !== f.key) {
        resolvedMap[f.key] = fieldMap[f.key];
      }
    }

    try {
      const response = await fetch("/api/analyze-saved-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFileId,
          sheetName: selectedSheetName,
          fieldMap: Object.keys(resolvedMap).length > 0 ? resolvedMap : undefined,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setAnalyzedFilename(result.filename);
      setSheets(result.sheets);
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : "Failed to analyze file");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDataUpdate = (sheetIndex: number, updated: { headers: string[]; rows: any[] }) => {
    if (!sheets) return;
    const next = [...sheets];
    next[sheetIndex] = { ...next[sheetIndex], ...updated };
    setSheets(next);
  };

  const handleSubmit = async () => {
    if (!sheets || !newFilename.trim()) return;
    setIsModalOpen(false);
    setIsSaving(true);
    setSaveMessage("");
    // COMPRESSION: Use the standard optimization helper
    const compressedSheets = compressSheetData(sheets);

    try {
      const res = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: newFilename.trim(), sheets: compressedSheets }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setSaveMessage("✓ Saved successfully!");
      fetchFiles();
    } catch (e) {
      setSaveMessage(`✗ ${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  const selectedFile = files.find(f => f._id === selectedFileId);
  const selectedSheet = selectedFile?.sheets?.find(s => s.name === selectedSheetName);
  // Use the active sheet's headers when a specific sheet is selected;
  // fall back to the file's top-level headers for single-sheet / legacy files.
  const availableColumns =
    selectedSheet?.headers ||
    selectedFile?.sheets?.[0]?.headers ||
    selectedFile?.headers ||
    [];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[80px]" />
        <div className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[60px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Statement <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">Analytics</span>
            </h1>
            <p className="text-muted-foreground font-medium">Perform high-level financial reconciliation and mapping.</p>
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
        </div>

        <HelpDialog 
          isOpen={showHelp}
          onOpenChange={setShowHelp}
          title="Analytics Guidelines"
          subtitle="Advanced financial pattern detection and data cleaning."
          features={features}
        />

        {/* Configuration Card */}
        <Card className="p-8 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-blue-600 to-cyan-500 opacity-20" />
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left: Selection */}
            <div className="lg:col-span-5 space-y-6">
               <div className="space-y-4">
                 <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                   <Database className="w-4 h-4 text-blue-500" />
                   Source File Selection
                 </div>
                 <select
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all cursor-pointer box-border"
                  value={selectedFileId}
                  onChange={e => handleFileSelect(e.target.value)}
                  disabled={loadingFiles || isAnalyzing}
                >
                  <option value="">-- Choose a vault file --</option>
                  {files.map(f => (
                    <option key={f._id} value={f._id}>
                      {f.filename} • {new Date(f.uploadDate).toLocaleDateString()}
                    </option>
                  ))}
                </select>

                {selectedFileId && (files.find(f => f._id === selectedFileId)?.sheets?.length || 0) > 1 && (
                    <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-1">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                         <Database className="w-4 h-4 text-cyan-500" />
                         Target Sheet Selection
                      </div>
                      <select
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all cursor-pointer box-border"
                        value={selectedSheetName}
                        onChange={e => handleSheetSelect(e.target.value)}
                        disabled={isAnalyzing}
                      >
                        <option value="">-- Choose target sheet --</option>
                        {files.find(f => f._id === selectedFileId)?.sheets?.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                )}
                {!selectedFileId && (
                  <p className="text-xs text-muted-foreground font-medium italic">
                    Select a bank statement from the database to start analysis.
                  </p>
                )}
               </div>

               {selectedFileId && (
                 <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 space-y-3">
                   <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                     <span>File Context</span>
                     <span className="opacity-60">{selectedFile?.totalRecords ?? 0} records</span>
                   </div>
                   <div className="text-sm font-medium text-foreground truncate">
                     {selectedFile?.filename}
                   </div>
                 </div>
               )}
            </div>

            {/* Right: Mapping & Action */}
            <div className="lg:col-span-7">
               {selectedFileId ? (
                 <div className="h-full flex flex-col justify-between space-y-8">
                    <div className="space-y-5">
                      <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                         <MapIcon className="w-4 h-4 text-blue-500" />
                         Engine Field Mapping
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {REQUIRED_FIELDS.map(f => {
                          const mapped = fieldMap[f.key];
                          const isExact = mapped === f.key;
                          const isMissing = !mapped;
                          return (
                            <div
                              key={f.key}
                              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg font-bold border transition-all ${
                                isMissing
                                  ? "bg-red-500/10 text-red-600 border-red-500/20"
                                  : isExact
                                  ? "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                  : "bg-cyan-500/10 text-cyan-600 border-cyan-500/20"
                              }`}
                            >
                              {isMissing ? (
                                <AlertCircle className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              <span>{f.key}</span>
                              {!isMissing && !isExact && <span className="opacity-40 ml-1 truncate max-w-[80px]">← {mapped}</span>}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                       <Button
                        variant="ghost"
                        onClick={openMappingModal}
                        disabled={isAnalyzing}
                        className="flex-1 rounded-xl h-12 font-bold text-foreground border border-border hover:bg-muted"
                      >
                        {needsMapping ? "⚠️ Resolve Mappings" : "Adjust Calibration"}
                      </Button>
                      <Button
                        onClick={handleAnalyze}
                        disabled={!allMapped || isAnalyzing}
                        className="flex-[1.5] rounded-xl h-12 font-black text-white bg-linear-to-r from-blue-600 to-cyan-500 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Processing Engine...
                          </>
                        ) : (
                          <>
                            <BarChart3 className="w-4 h-4 mr-2" />
                            Initialize Analysis
                          </>
                        )}
                      </Button>
                    </div>
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center p-8 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-4 opacity-40">
                    <BarChart3 className="w-12 h-12" />
                    <p className="text-sm font-bold uppercase tracking-widest">Awaiting Command Selection</p>
                 </div>
               )}
            </div>
          </div>

          {analyzeError && (
            <div className="mt-8 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 font-bold text-sm">
              <AlertCircle className="w-5 h-5" />
              {analyzeError}
            </div>
          )}
        </Card>

        {/* Output Section */}
        {sheets && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Card className="border-border bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
              <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-border gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <FileCheck2 className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">Analysis Result</h2>
                    <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px] md:max-w-none">{analyzedFilename}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                   {saveMessage && (
                    <span className={`text-sm font-bold mr-2 ${saveMessage.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
                      {saveMessage}
                    </span>
                  )}
                   <Button
                    onClick={() => { setNewFilename(analyzedFilename); setIsModalOpen(true); }}
                    disabled={isSaving}
                    className="w-full md:w-auto px-6 rounded-xl font-bold bg-foreground text-background hover:opacity-90 gap-2 shadow-lg active:scale-95 transition-all"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save in Vault
                  </Button>
                </div>
              </div>
              
              <div className="p-1 bg-muted/20 overflow-hidden">
                <MultiSheetViewer sheets={sheets} onDataUpdate={handleDataUpdate} />
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ── Mapping Modal ─────────────────────────────────────────────────── */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="max-w-xl bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
               <MapIcon className="w-6 h-6 text-blue-600" />
               Logic-Field Mapping
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <p className="text-sm text-muted-foreground font-medium">
              Calibrate the system engine by matching the input file's columns to the required analytical categories.
            </p>

            <div className="space-y-5">
              {REQUIRED_FIELDS.map(field => {
                const current = draftMap[field.key] || "";
                const isExact = current === field.key;
                return (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border group hover:border-blue-500/40 transition-all">
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground group-hover:text-blue-600 transition-colors">{field.label}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{field.description}</p>
                    </div>
                    <select
                      className={`w-full sm:w-48 bg-background border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                        !current ? "border-red-500/40" : isExact ? "border-emerald-500/40" : "border-blue-500/40"
                      }`}
                      value={current}
                      onChange={e => setDraftMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">-- SELECT ID --</option>
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
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setShowMappingModal(false)}>Cancel</Button>
            <Button
              onClick={confirmMapping}
              disabled={REQUIRED_FIELDS.some(f => !draftMap[f.key])}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-6 min-w-32 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Verify Mapping
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Save Modal ────────────────────────────────────────────────────── */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Save to Vault</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-4">
             <p className="text-sm text-muted-foreground mb-4 font-medium">Please provide a descriptive filename for the Vault.</p>
             <input
              type="text"
              placeholder="e.g. Document Name April 2026"
              value={newFilename}
              onChange={e => setNewFilename(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all box-border"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!newFilename.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl px-8 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
            >
              Save in Vault
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
