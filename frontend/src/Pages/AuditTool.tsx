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
  FileCheck2, 
  Map as MapIcon, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Save,
  ArrowLeft,
  Filter
} from "lucide-react";
import { Link } from "react-router";

// ── Required mappings for Audit ──────────────────────────────────────────────
const ALL_FIELDS = [
  { key: "CHALLAN_NO", label: "Challan No", description: "Unique transaction identifier" },
  { key: "TYPE_CODE", label: "Type Code", description: "Contains the 2-digit category prefix (e.g., 10-2025)" },
  { key: "AMOUNT", label: "Amount", description: "Transaction value for summaries" },
];

const AUDIT_CATEGORIES = [
  "examination_semester", "examination_semester_convocation_fee", "admission_processing_fee",
  "admission_fee", "admission_retain", "drgs_admission_processing_fee", "drgs_challan",
  "drgs_convocation_fee", "hostel_accomodation_fee_boys", "hostel_accomodation_fee_girls",
  "hostel_accomodation_fee_girls_pg", "examination_annual_certificate", "general_branch_annual",
  "examination_annual_exam_fee", "general_branch_on_campus", "examination_semester_affailated_college",
  "examination_annual_convocation_fee", "general_branch_graduate_studies", "sutc",
  "career_portal_challan", "miscellaneous_alumni_registration_fee"
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

export default function AuditTool() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>("");
  const [selectedSheetName, setSelectedSheetName] = useState<string>("");
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Field mapping
  const [fieldMap, setFieldMap] = useState<FieldMap>({});
  const [needsMapping, setNeedsMapping] = useState(false);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [draftMap, setDraftMap] = useState<FieldMap>({});

  // Categories Selection
  const [selectedCategories, setSelectedCategories] = useState<string[]>(AUDIT_CATEGORIES);
  const [validationMode, setValidationMode] = useState<"strict" | "type_code" | "challan_no">("strict");

  const REQUIRED_FIELDS = ALL_FIELDS.filter(f => {
    if (validationMode === "type_code" && f.key === "CHALLAN_NO") return false;
    if (validationMode === "challan_no" && f.key === "TYPE_CODE") return false;
    return true;
  });

  // Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [auditedFilename, setAuditedFilename] = useState("");
  const [sheets, setSheets] = useState<SheetData[] | null>(null);

  // Save State
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newFilename, setNewFilename] = useState("");

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
    setAuditError("");
    setSaveMessage("");
    setFieldMap({});
    setNeedsMapping(false);

    if (!fileId) return;

    const file = files.find(f => f._id === fileId);
    if (!file) return;

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
    setAuditError("");
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

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => 
      prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
    );
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === AUDIT_CATEGORIES.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories([...AUDIT_CATEGORIES]);
    }
  };

  const allMapped = REQUIRED_FIELDS.every(f => !!fieldMap[f.key]);

  const handleAudit = async () => {
    if (!selectedFileId || !allMapped) return;
    setIsAuditing(true);
    setAuditError("");
    setSheets(null);
    setSaveMessage("");

    const resolvedMap: FieldMap = {};
    for (const f of REQUIRED_FIELDS) {
      if (fieldMap[f.key] && fieldMap[f.key] !== f.key) {
        resolvedMap[f.key] = fieldMap[f.key];
      }
    }

    try {
      const response = await fetch("/api/audit-saved-file", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileId: selectedFileId,
          sheetName: selectedSheetName,
          fieldMap: Object.keys(resolvedMap).length > 0 ? resolvedMap : undefined,
          categories: selectedCategories,
          validationMode: validationMode
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setAuditedFilename(result.filename);
      setSheets(result.sheets);
    } catch (err) {
      setAuditError(err instanceof Error ? err.message : "Failed to audit file");
    } finally {
      setIsAuditing(false);
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
  const availableColumns =
    selectedSheet?.headers ||
    selectedFile?.sheets?.[0]?.headers ||
    selectedFile?.headers ||
    [];

  return (
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-purple-500/5 blur-[80px]" />
        <div className="absolute top-[20%] right-[-5%] w-[300px] h-[300px] rounded-full bg-indigo-500/5 blur-[60px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Audit <span className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-indigo-500">Categorizer</span>
            </h1>
            <p className="text-muted-foreground font-medium">Auto-classify transactions into predefined collections based on Type Codes.</p>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
             <Link to="/" className="flex items-center gap-2">
               <ArrowLeft className="w-4 h-4" /> Back to Tools
             </Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          <Card className="lg:col-span-4 p-8 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-purple-600 to-indigo-500 opacity-20" />
            
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                  <Database className="w-4 h-4 text-purple-500" />
                  Source Data
                </div>
                <select
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all cursor-pointer box-border"
                  value={selectedFileId}
                  onChange={e => handleFileSelect(e.target.value)}
                  disabled={loadingFiles || isAuditing}
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
                    <select
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all cursor-pointer box-border"
                      value={selectedSheetName}
                      onChange={e => handleSheetSelect(e.target.value)}
                      disabled={isAuditing}
                    >
                      <option value="">-- Choose target sheet --</option>
                      {files.find(f => f._id === selectedFileId)?.sheets?.map(s => (
                        <option key={s.name} value={s.name}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {selectedFileId && (
                <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/10 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-widest text-purple-600 dark:text-purple-400">
                    <span>File Records</span>
                    <span className="opacity-60">{selectedFile?.totalRecords ?? 0}</span>
                  </div>
                  <div className="text-sm font-medium text-foreground truncate">
                    {selectedFile?.filename}
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="lg:col-span-8 p-8 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-purple-600 to-indigo-500 opacity-20" />
            
             {selectedFileId ? (
                <div className="h-full flex flex-col justify-between space-y-8">
                  <div className="space-y-6">
                    
                    <div className="flex flex-col sm:flex-row gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                           <MapIcon className="w-4 h-4 text-purple-500" /> Field Configuration
                        </div>
                        <div className="flex flex-col gap-2">
                          {REQUIRED_FIELDS.map(f => {
                            const mapped = fieldMap[f.key];
                            const isExact = mapped === f.key;
                            const isMissing = !mapped;
                            return (
                              <div
                                key={f.key}
                                className={`flex items-center justify-between text-xs px-3 py-2 rounded-lg font-bold border transition-all ${
                                  isMissing
                                    ? "bg-red-500/10 text-red-600 border-red-500/20"
                                    : "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {isMissing ? <AlertCircle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                  <span>{f.key}</span>
                                </div>
                                {!isMissing && <span className="opacity-70 truncate max-w-[120px]">{mapped}</span>}
                              </div>
                            );
                          })}
                          <Button
                            variant="ghost"
                            onClick={openMappingModal}
                            disabled={isAuditing}
                            className="mt-2 w-full mx-auto rounded-xl h-10 text-xs font-bold text-foreground border border-border hover:bg-muted"
                          >
                            {needsMapping ? "Resolve Fields" : "Adjust Fields"}
                          </Button>
                        </div>
                      </div>

                      <div className="flex-1 space-y-4">
                         <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                            <CheckCircle2 className="w-4 h-4 text-purple-500" /> Comparison Logic
                         </div>
                         <select
                           className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all cursor-pointer box-border"
                           value={validationMode}
                           onChange={(e: any) => {
                             setValidationMode(e.target.value);
                           }}
                           disabled={isAuditing}
                         >
                           <option value="strict">Strict Dual Match (Type Code & Challan No)</option>
                           <option value="type_code">Type Code Only</option>
                           <option value="challan_no">Challan No Only</option>
                         </select>

                         <div className="flex items-center justify-between text-foreground font-bold text-sm uppercase tracking-widest opacity-60 pt-2">
                            <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-purple-500" /> Categories</span>
                            <button onClick={toggleAllCategories} className="text-purple-500 hover:text-purple-600 text-xs underline">
                              {selectedCategories.length === AUDIT_CATEGORIES.length ? "Deselect All" : "Select All"}
                            </button>
                         </div>
                         <div className="h-32 overflow-y-auto border border-border rounded-xl p-2 space-y-1 bg-background/50">
                            {AUDIT_CATEGORIES.map(cat => (
                               <label key={cat} className="flex items-center gap-2 px-2 py-1 hover:bg-muted/50 rounded cursor-pointer select-none">
                                  <input 
                                    type="checkbox" 
                                    checked={selectedCategories.includes(cat)}
                                    onChange={() => toggleCategory(cat)}
                                    className="rounded border-border accent-purple-600 cursor-pointer"
                                  />
                                  <span className="text-xs font-medium text-foreground truncate">{cat.replace(/_/g, " ")}</span>
                               </label>
                            ))}
                         </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center">
                    <Button
                      onClick={handleAudit}
                      disabled={!allMapped || isAuditing || selectedCategories.length === 0}
                      className="w-full rounded-xl h-12 font-black text-white bg-linear-to-r from-purple-600 to-indigo-500 shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
                    >
                      {isAuditing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Categorizing Records...
                        </>
                      ) : (
                        <>
                          <FileCheck2 className="w-4 h-4 mr-2" />
                          Initialize Audit Engine
                        </>
                      )}
                    </Button>
                  </div>
                </div>
             ) : (
                <div className="h-full min-h-[250px] flex flex-col items-center justify-center p-8 rounded-2xl bg-muted/20 border border-dashed border-border text-center space-y-4 opacity-40">
                  <Database className="w-12 h-12" />
                  <p className="text-sm font-bold uppercase tracking-widest">Select Data to Audit</p>
                </div>
             )}
          </Card>
        </div>

        {auditError && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-600 dark:text-red-400 font-bold text-sm">
            <AlertCircle className="w-5 h-5" />
            {auditError}
          </div>
        )}

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
                    <h2 className="text-lg font-black text-foreground">Audit Summary</h2>
                    <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px] md:max-w-none">{auditedFilename}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                   {saveMessage && (
                    <span className={`text-sm font-bold mr-2 ${saveMessage.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
                      {saveMessage}
                    </span>
                  )}
                   <Button
                    onClick={() => { setNewFilename(auditedFilename); setIsModalOpen(true); }}
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

      {/* Mapping Modal */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="max-w-xl bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground flex items-center gap-3">
               <MapIcon className="w-6 h-6 text-purple-600" />
               Audit Field Calibration
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-6 space-y-6">
            <p className="text-sm text-muted-foreground font-medium">
              Match the input file's columns to the required audit identifiers. TYPE_CODE is mandatory to identify the category.
            </p>

            <div className="space-y-5">
              {REQUIRED_FIELDS.map(field => {
                const current = draftMap[field.key] || "";
                const isExact = current === field.key;
                return (
                  <div key={field.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-muted/30 border border-border group hover:border-purple-500/40 transition-all">
                    <div className="flex-1">
                      <p className="text-sm font-black text-foreground group-hover:text-purple-600 transition-colors">{field.label}</p>
                      <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest mt-0.5">{field.description}</p>
                    </div>
                    <select
                      className={`w-full sm:w-48 bg-background border rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-purple-500/20 ${
                        !current ? "border-red-500/40" : isExact ? "border-emerald-500/40" : "border-purple-500/40"
                      }`}
                      value={current}
                      onChange={e => setDraftMap(prev => ({ ...prev, [field.key]: e.target.value }))}
                    >
                      <option value="">-- SELECT COL --</option>
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
              className="bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl px-6 min-w-32 shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
            >
              Verify Mapping
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md bg-background border-border shadow-2xl p-8 rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Save to Vault</DialogTitle>
          </DialogHeader>
          <div className="py-8 space-y-4">
             <p className="text-sm text-muted-foreground mb-4 font-medium">Please provide a descriptive filename.</p>
             <input
              type="text"
              placeholder="e.g. Audit Results March"
              value={newFilename}
              onChange={e => setNewFilename(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500/50 transition-all box-border"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!newFilename.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white font-black rounded-xl px-8 shadow-xl shadow-purple-500/20 active:scale-95 transition-all"
            >
              Confirm Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
