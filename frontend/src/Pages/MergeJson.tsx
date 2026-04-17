import { useState, useEffect } from "react";
import { 
  compressSheetData
} from "../utils/dataProcessing";
import { MultiSheetViewer, type SheetData } from "../components/multi-sheet-viewer";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../components/ui/dialog";
import { 
  Combine,
  FileCheck2, 
  Map as MapIcon, 
  Database, 
  Loader2,
  Save,
  ArrowLeft,
  Plus,
  Trash2,
  Settings2
} from "lucide-react";
import { Link } from "react-router";

interface StoredFile {
  _id: string;
  filename: string;
  uploadDate: string;
  headers: string[];
  totalRecords?: number;
  sheets?: { name: string; headers: string[] }[];
}

interface SheetMapping {
  outputSheetName: string;
  sources: {
    fileId: string;
    sheetName: string;
  }[];
}

export default function MergeJson() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Selection
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  
  // Mapping
  const [mappings, setMappings] = useState<SheetMapping[]>([]);

  // Engine State
  const [isMerging, setIsMerging] = useState(false);
  const [mergeError, setMergeError] = useState("");
  const [mergedFilename, setMergedFilename] = useState("");
  const [mergedSheets, setMergedSheets] = useState<SheetData[] | null>(null);

  // Save Modal
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

  const selectedFilesData = files.filter(f => selectedFileIds.includes(f._id));

  // Initialize a default mapping when files are selected and mapping is empty
  useEffect(() => {
    if (selectedFilesData.length > 0 && mappings.length === 0) {
      addMappingRow();
    }
    // Remove sources from mappings if a file is deselected
    setMappings(prev => 
      prev.map(m => ({
        ...m,
        sources: m.sources.filter(s => selectedFileIds.includes(s.fileId))
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileIds]);

  const toggleFileSelection = (fileId: string) => {
    setSelectedFileIds(prev => 
      prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
    );
  };

  const addMappingRow = () => {
    setMappings(prev => [
      ...prev,
      {
        outputSheetName: `Merged Sheet ${prev.length + 1}`,
        sources: []
      }
    ]);
  };

  const updateMappingName = (index: number, newName: string) => {
    const updated = [...mappings];
    updated[index].outputSheetName = newName;
    setMappings(updated);
  };

  const updateSourceSheet = (mappingIndex: number, fileId: string, sheetName: string) => {
    const updated = [...mappings];
    const mapping = updated[mappingIndex];
    const existingSourceIndex = mapping.sources.findIndex(s => s.fileId === fileId);

    if (sheetName) {
      if (existingSourceIndex >= 0) {
        mapping.sources[existingSourceIndex].sheetName = sheetName;
      } else {
         mapping.sources.push({ fileId, sheetName });
      }
    } else {
      if (existingSourceIndex >= 0) {
         mapping.sources.splice(existingSourceIndex, 1);
      }
    }
    setMappings(updated);
  };

  const removeMappingRow = (index: number) => {
     setMappings(prev => prev.filter((_, i) => i !== index));
  };


  const handleMerge = async () => {
    if (mappings.length === 0 || selectedFileIds.length === 0) return;
    setIsMerging(true);
    setMergeError("");
    setMergedSheets(null);
    setSaveMessage("");

    try {
      const response = await fetch("/api/merge-files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mappings
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setMergedFilename(result.filename);
      setMergedSheets(result.sheets);
    } catch (err) {
      setMergeError(err instanceof Error ? err.message : "Failed to merge files");
    } finally {
      setIsMerging(false);
    }
  };

  const handleDataUpdate = (sheetIndex: number, updated: { headers: string[]; rows: any[] }) => {
    if (!mergedSheets) return;
    const next = [...mergedSheets];
    next[sheetIndex] = { ...next[sheetIndex], ...updated };
    setMergedSheets(next);
  };

  const handleSubmit = async () => {
    if (!mergedSheets || !newFilename.trim()) return;
    setIsModalOpen(false);
    setIsSaving(true);
    setSaveMessage("");
    
    const compressedSheets = compressSheetData(mergedSheets);

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


  return (
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[80px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[60px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Combine className="w-10 h-10 text-cyan-500" />
              Merge JSON <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-500 to-sky-600">Reports</span>
            </h1>
            <p className="text-muted-foreground font-medium">Consolidate multiple files and map matching sheets.</p>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
             <Link to="/" className="flex items-center gap-2">
               <ArrowLeft className="w-4 h-4" /> Back to Tools
             </Link>
          </Button>
        </div>

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Files Selection (Left Column) */}
          <div className="lg:col-span-4 space-y-4">
             <Card className="p-6 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative h-full flex flex-col">
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-cyan-500 to-sky-600 opacity-20" />
                
                <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60 mb-6">
                   <Database className="w-4 h-4 text-cyan-500" />
                   Select Vault Files
                </div>

                <div className="flex-1 overflow-y-auto max-h-[600px] pr-2 space-y-3">
                  {loadingFiles ? (
                     <div className="flex justify-center p-8 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : (
                    files.map(f => {
                       const isSelected = selectedFileIds.includes(f._id);
                       return (
                         <div 
                           key={f._id} 
                           onClick={() => toggleFileSelection(f._id)}
                           className={`p-4 rounded-xl border cursor-pointer transition-all ${
                             isSelected 
                               ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_15px_rgba(6,182,212,0.15)]" 
                               : "bg-muted/30 border-border hover:border-cyan-500/20"
                           }`}
                         >
                           <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-sm text-foreground truncate">{f.filename}</div>
                              <div className={`w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 transition-colors ${
                                  isSelected ? "bg-cyan-500 border-cyan-500" : "border-muted-foreground/30"
                              }`}>
                                  {isSelected && <div className="w-full h-full flex items-center justify-center text-white"><CheckIcon className="w-3 h-3"/></div>}
                              </div>
                           </div>
                           <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                              <span>{new Date(f.uploadDate).toLocaleDateString()}</span>
                              <span>{f.sheets?.length || 1} Sheets</span>
                           </div>
                         </div>
                       )
                    })
                  )}
                </div>

             </Card>
          </div>

          {/* Mapping & Action (Right Column) */}
          <div className="lg:col-span-8">
             <Card className="p-6 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative min-h-[500px]">
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-cyan-500 to-sky-600 opacity-20" />
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                     <MapIcon className="w-4 h-4 text-cyan-500" />
                     Sheet Mapping Configuration
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={addMappingRow}
                    className="h-8 gap-1.5 font-bold border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                    disabled={selectedFileIds.length === 0}
                  >
                     <Plus className="w-3.5 h-3.5" />
                     Add Merged Output
                  </Button>
                </div>

                {selectedFileIds.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center opacity-40 space-y-3">
                     <Settings2 className="w-12 h-12 mb-2" />
                     <p className="text-sm font-bold uppercase tracking-widest">Select files to configure mappings</p>
                  </div>
                ) : mappings.length === 0 ? (
                  <div className="h-64 flex flex-col items-center justify-center text-center opacity-40 space-y-3">
                     <MapIcon className="w-12 h-12 mb-2" />
                     <p className="text-sm font-bold uppercase tracking-widest">No mappings defined</p>
                     <Button variant="ghost" onClick={addMappingRow} className="font-bold">Initialize Mapping</Button>
                  </div>
                ) : (
                  <div className="space-y-6 mb-8">
                     {mappings.map((mapping, mIndex) => (
                       <div key={mIndex} className="p-5 rounded-2xl border border-border bg-background shadow-inner">
                         <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
                            <input 
                               value={mapping.outputSheetName}
                               onChange={e => updateMappingName(mIndex, e.target.value)}
                               className="bg-transparent border-none text-lg font-black text-foreground focus:outline-none focus:ring-0 placeholder-muted-foreground/40 w-full max-w-[300px]"
                               placeholder="Target Sheet Name"
                            />
                            <Button variant="ghost" size="icon" onClick={() => removeMappingRow(mIndex)} className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                               <Trash2 className="w-4 h-4" />
                            </Button>
                         </div>

                         <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-4 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 px-2">
                               <div className="col-span-5">Source File</div>
                               <div className="col-span-7">Source Sheet to Include</div>
                            </div>
                            
                            {selectedFilesData.map(file => {
                               const fileSheets = file.sheets && file.sheets.length > 0 
                                  ? file.sheets 
                                  : [{ name: "Transactions", headers: file.headers }];
                               
                               const currentSelectedSheet = mapping.sources.find(s => s.fileId === file._id)?.sheetName || "";
                               
                               return (
                                 <div key={file._id} className="grid grid-cols-12 gap-4 items-center bg-muted/20 p-2 rounded-lg border border-transparent hover:border-border transition-colors">
                                    <div className="col-span-5 text-sm font-semibold truncate px-2" title={file.filename}>
                                       {file.filename}
                                    </div>
                                    <div className="col-span-7">
                                       <select
                                          value={currentSelectedSheet}
                                          onChange={e => updateSourceSheet(mIndex, file._id, e.target.value)}
                                          className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20"
                                       >
                                          <option value="">-- Exclude from this sheet --</option>
                                          {fileSheets.map(s => (
                                             <option key={s.name} value={s.name}>{s.name} ({s.headers?.length || 0} cols)</option>
                                          ))}
                                       </select>
                                    </div>
                                 </div>
                               )
                            })}
                         </div>
                       </div>
                     ))}
                  </div>
                )}

                <div className="mt-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
                  {mergeError && (
                    <div className="flex-1 w-full text-sm font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                      ✗ {mergeError}
                    </div>
                  )}
                  <span className="flex-1"></span>
                  <Button
                    onClick={handleMerge}
                    disabled={mappings.length === 0 || selectedFileIds.length < 1 || isMerging}
                    className="w-full sm:w-auto rounded-xl px-10 h-12 font-black text-white bg-linear-to-r from-cyan-500 to-sky-600 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all text-sm"
                  >
                    {isMerging ? (
                       <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Merging...</>
                    ) : (
                       <><Combine className="w-4 h-4 mr-2" /> Execute Merge</>
                    )}
                  </Button>
                </div>
             </Card>
          </div>
        </div>


        {/* Output Section */}
        {mergedSheets && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <Card className="border-border bg-card/40 backdrop-blur-xl shadow-2xl overflow-hidden rounded-3xl">
                <div className="flex flex-col md:flex-row justify-between items-center p-6 border-b border-border gap-4">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                         <FileCheck2 className="w-6 h-6" />
                      </div>
                      <div>
                         <h2 className="text-lg font-black text-foreground">Merge Complete</h2>
                         <p className="text-xs font-bold text-muted-foreground truncate max-w-[200px] md:max-w-none">{mergedFilename}</p>
                      </div>
                   </div>
                   
                   <div className="flex items-center gap-4 w-full md:w-auto">
                      {saveMessage && (
                       <span className={`text-sm font-bold mr-2 ${saveMessage.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
                         {saveMessage}
                       </span>
                     )}
                      <Button
                       onClick={() => { setNewFilename(mergedFilename); setIsModalOpen(true); }}
                       disabled={isSaving}
                       className="w-full md:w-auto px-6 rounded-xl font-bold bg-foreground text-background hover:opacity-90 gap-2 shadow-lg active:scale-95 transition-all"
                     >
                       {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                       Save in Vault
                     </Button>
                   </div>
                </div>
                
                <div className="p-1 bg-muted/20 overflow-hidden">
                   <MultiSheetViewer sheets={mergedSheets} onDataUpdate={handleDataUpdate} />
                </div>
             </Card>
          </div>
        )}

      </div>


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
              placeholder="e.g. Consolidated FY26"
              value={newFilename}
              onChange={e => setNewFilename(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500/50 transition-all box-border"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold rounded-xl" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!newFilename.trim() || isSaving}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-black rounded-xl px-8 shadow-xl shadow-cyan-500/20 active:scale-95 transition-all"
            >
               {isSaving ? "Saving..." : "Save in Vault"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
