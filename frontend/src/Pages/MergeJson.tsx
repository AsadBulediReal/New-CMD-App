import { useState, useEffect, useMemo, useRef } from "react";
import { 
  compressSheetData,
  decompressSheetData
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
  Settings2,
  Search,
  Eye,
  Filter,
  RefreshCw,
  Edit,
  Wand2, // for Auto map
  HelpCircle,
  CheckCircle2,
  FileText
} from "lucide-react";
import { Link } from "react-router";
import { HelpDialog } from "../components/shared/help-dialog";

interface StoredFile {
  _id: string;
  filename: string;
  uploadDate: string;
  headers: string[];
  totalRecords?: number;
  recordDateRange?: { start: string | null; end: string | null };
  sheets?: { name: string; headers: string[] }[];
}

interface SheetMapping {
  outputSheetName: string;
  sources: {
    fileId: string;
    sheetName: string;
  }[];
}

interface LoadedData {
  filename: string;
  sheets: SheetData[];
}

export default function MergeJson() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);

  // Selection
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const lastClickedIndexRef = useRef<number | null>(null);
  
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

  // Filtering
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Preview / Delete / Rename
  const [fileData, setFileData] = useState<LoadedData | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [fileToDelete, setFileToDelete] = useState<{ id: string; filename: string } | null>(null);
  const [fileToRename, setFileToRename] = useState<{ id: string; filename: string } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const features = [
    {
      icon: <Combine className="w-5 h-5 text-cyan-500" />,
      title: "Consolidation Engine",
      desc: "Merge data from dozens of files into single sheets based on matching names or custom rules."
    },
    {
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
      title: "Smart Select",
      desc: "Click to toggle or use Shift + Click to select a range of files instantly."
    },
    {
      icon: <Wand2 className="w-5 h-5 text-purple-500" />,
      title: "Auto-Mapping",
      desc: "Instantly link sheets with identical names across all selected files for one-click setup."
    },
    {
      icon: <Eye className="w-5 h-5 text-blue-500" />,
      title: "Live Previews",
      desc: "Inspect source files and merged results before saving to ensure data integrity."
    },
    {
      icon: <Filter className="w-5 h-5 text-amber-500" />,
      title: "File Discovery",
      desc: "Use full-text search and date range filters to quickly locate the reports you need."
    },
    {
      icon: <FileText className="w-5 h-5 text-rose-500" />,
      title: "Vault Storage",
      desc: "Save consolidated results directly back to the vault with custom naming and compression."
    }
  ];

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

  // Filter activity is visually reflected in the UI via button styling

  const processedFiles = useMemo(() => {
    let result = files.filter(f =>
      f.filename.toLowerCase().includes(search.toLowerCase())
    );

    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter(f => {
        const end = f.recordDateRange?.end ? new Date(f.recordDateRange.end) : null;
        return end ? end >= from : true;
      });
    }
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      result = result.filter(f => {
        const start = f.recordDateRange?.start ? new Date(f.recordDateRange.start) : null;
        return start ? start <= to : true;
      });
    }

    return result;
  }, [files, search, dateFrom, dateTo]);

  const selectedFilesData = files.filter(f => selectedFileIds.includes(f._id));

  // Initialize auto map when files are selected and mapping is empty
  useEffect(() => {
    // Remove sources from mappings if a file is deselected
    setMappings(prev => 
      prev.map(m => ({
        ...m,
        sources: m.sources.filter(s => selectedFileIds.includes(s.fileId))
      }))
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFileIds]);

  const toggleFileSelection = (fileId: string, index: number, shiftKey: boolean) => {
    if (shiftKey && lastClickedIndexRef.current !== null) {
      const start = Math.min(lastClickedIndexRef.current, index);
      const end = Math.max(lastClickedIndexRef.current, index);
      const rangeIds = processedFiles.slice(start, end + 1).map(f => f._id);
      // Determine whether to add or remove based on the anchor item
      const anchorId = processedFiles[lastClickedIndexRef.current]?._id;
      const shouldSelect = anchorId ? selectedFileIds.includes(anchorId) : true;
      setSelectedFileIds(prev => {
        const set = new Set(prev);
        rangeIds.forEach(id => shouldSelect ? set.add(id) : set.delete(id));
        return Array.from(set);
      });
    } else {
      lastClickedIndexRef.current = index;
      setSelectedFileIds(prev =>
        prev.includes(fileId) ? prev.filter(id => id !== fileId) : [...prev, fileId]
      );
    }
  };

  const selectAllFiltered = () => {
    const ids = new Set(selectedFileIds);
    let changed = false;
    processedFiles.forEach(f => {
      if (!ids.has(f._id)) {
        ids.add(f._id);
        changed = true;
      }
    });

    if (!changed && processedFiles.length > 0) {
      // If all are already selected, we might want to toggle them off
      processedFiles.forEach(f => ids.delete(f._id));
    }
    
    setSelectedFileIds(Array.from(ids));
  };

  const autoMapSheets = () => {
    if (selectedFileIds.length < 1) return;

    const allSheetNames = new Set<string>();
    selectedFilesData.forEach(file => {
      const fileSheets = file.sheets && file.sheets.length > 0 
        ? file.sheets 
        : [{ name: "Transactions", headers: file.headers }];
      fileSheets.forEach(s => allSheetNames.add(s.name));
    });

    const newMappings: SheetMapping[] = [];

    Array.from(allSheetNames).forEach(sheetName => {
      const sources: { fileId: string; sheetName: string }[] = [];
      selectedFilesData.forEach(file => {
        const fileSheets = file.sheets && file.sheets.length > 0 
          ? file.sheets 
          : [{ name: "Transactions", headers: file.headers }];
        const hasSheet = fileSheets.find(s => s.name === sheetName);
        if (hasSheet) {
          sources.push({ fileId: file._id, sheetName: hasSheet.name });
        }
      });
      if (sources.length > 0) {
        newMappings.push({
          outputSheetName: sheetName,
          sources
        });
      }
    });

    setMappings(newMappings);
  };

  const addMappingRow = () => {
    setMappings(prev => [
      ...prev,
      {
        outputSheetName: `Merged Sheet \${prev.length + 1}`,
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
        throw new Error(errData.error || `HTTP \${response.status}`);
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
        throw new Error(err.error || `HTTP \${res.status}`);
      }
      setSaveMessage("✓ Saved successfully!");
      fetchFiles();
    } catch (e) {
      setSaveMessage(`✗ \${e instanceof Error ? e.message : "Unknown error"}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Preview Load
  const handleLoadFile = async (e: React.MouseEvent, id: string, filename: string) => {
    e.stopPropagation();
    try {
      setLoadingId(id);
      const res = await fetch(`/api/files/${id}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server error: ${res.status} ${res.statusText}`);
      }
      const data = await res.json();
      if (data) {
        let sheetsToLoad: SheetData[] = [];
        if (data.sheets && data.sheets.length > 0) {
          sheetsToLoad = decompressSheetData(data.sheets.map((s: any, idx: number) => ({
            name: s.name || `Sheet ${idx + 1}`,
            headers: s.headers || [],
            rows: s.rows || [],
          })));
        } else {
          sheetsToLoad = decompressSheetData([{ name: "Sheet 1", headers: data.headers || [], rows: data.rows || [] }]);
        }
        setFileData({ filename: data.filename || filename, sheets: sheetsToLoad });
      }
    } catch (error) {
      console.error("Preview load error:", error);
      alert(`Error loading file: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setLoadingId(null);
    }
  };

  // Delete File
  const executeDelete = async () => {
    if (!fileToDelete) return;
    try {
      const res = await fetch(`/api/files/\${fileToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete file");
      setFiles(files.filter(f => f._id !== fileToDelete.id));
      setSelectedFileIds(prev => prev.filter(id => id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  // Rename File
  const executeRename = async () => {
    if (!fileToRename || !renameValue.trim()) return;
    setIsRenaming(true);
    try {
      const res = await fetch(`/api/files/\${fileToRename.id}/rename`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newFilename: renameValue }),
      });
      if (!res.ok) throw new Error("Rename failed");
      const data = await res.json();
      setFiles(files.map(f => f._id === fileToRename.id ? { ...f, filename: data.file.filename } : f));
      setFileToRename(null);
    } catch (error) {
      console.error("Failed to rename:", error);
    } finally {
      setIsRenaming(false);
    }
  };

  return (
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] rounded-full bg-cyan-500/5 blur-[80px]" />
        <div className="absolute bottom-[20%] right-[-5%] w-[300px] h-[300px] rounded-full bg-sky-500/5 blur-[60px]" />
      </div>

      <div className="relative z-1 max-w-[90rem] mx-auto px-6 py-12 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
              <Combine className="w-10 h-10 text-cyan-500" />
              Merge Excel <span className="text-transparent bg-clip-text bg-linear-to-r from-cyan-500 to-sky-600">Reports</span>
            </h1>
            <p className="text-muted-foreground font-medium">Consolidate multiple files and map matching sheets.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              onClick={() => setShowHelp(true)}
              className="border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400 gap-2 h-10 px-4 rounded-xl font-bold"
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

        {/* Form Container */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Files Selection (Left Column) */}
          <div className="lg:col-span-4 space-y-4 flex flex-col max-h-[800px]">
             <Card className="p-4 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative flex flex-col flex-1 overflow-hidden">
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-cyan-500 to-sky-600 opacity-20" />
                
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                     <Database className="w-4 h-4 text-cyan-500" />
                     Vault Files
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={selectAllFiltered}
                    className="h-7 text-xs font-bold border-cyan-500/30 text-cyan-600 hover:bg-cyan-500/10 dark:text-cyan-400"
                  >
                     Select Visible
                  </Button>
                </div>

                {/* Filter Toolbar */}
                <div className="space-y-2 mb-4">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search files..."
                      className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(v => !v)}
                      className={`flex-1 h-7 text-xs gap-1 transition-all \${showFilters || dateFrom || dateTo ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-500" : ""}`}
                    >
                      <Filter className="w-3 h-3" />
                      Date Filters
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchFiles} className="h-7 w-7 p-0" title="Refresh list">
                      <RefreshCw className={`w-3 h-3 \${loadingFiles ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                  
                  {showFilters && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">From</label>
                        <input
                          type="date"
                          value={dateFrom}
                          onChange={e => setDateFrom(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground block mb-1">To</label>
                        <input
                          type="date"
                          value={dateTo}
                          onChange={e => setDateTo(e.target.value)}
                          className="w-full bg-background border border-border rounded-md px-2 py-1 text-xs focus:outline-none"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto pr-1 space-y-2 pb-4 select-none">
                  {loadingFiles ? (
                     <div className="flex justify-center py-8 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" /></div>
                  ) : processedFiles.length === 0 ? (
                     <div className="text-center py-8 text-sm text-muted-foreground opacity-60">No files found.</div>
                  ) : (
                    processedFiles.map(f => {
                       const isSelected = selectedFileIds.includes(f._id);
                       return (
                         <div 
                           key={f._id} 
                           onClick={(e) => toggleFileSelection(f._id, processedFiles.indexOf(f), e.shiftKey)}
                           className={`p-3 rounded-xl border transition-all cursor-pointer \${
                             isSelected 
                               ? "bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.1)]" 
                               : "bg-muted/30 border-border hover:border-cyan-500/20"
                           }`}
                         >
                           <div className="flex items-start justify-between gap-2">
                              <div className="font-bold text-sm text-foreground truncate">{f.filename}</div>
                              <div className={`w-4 h-4 rounded-full border flex-shrink-0 mt-0.5 transition-colors \${
                                  isSelected ? "bg-cyan-500 border-cyan-500" : "border-muted-foreground/30"
                              }`}>
                                  {isSelected && <div className="w-full h-full flex items-center justify-center text-white"><CheckIcon className="w-3 h-3"/></div>}
                              </div>
                           </div>
                           <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-2">
                              <div className="flex items-center gap-2">
                                <span>{new Date(f.uploadDate).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{f.sheets?.length || 1} Sheets</span>
                              </div>
                              <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-6 w-6 p-0 hover:text-cyan-500 hover:bg-cyan-500/10"
                                   title="Preview/Export"
                                   onClick={(e) => handleLoadFile(e, f._id, f.filename)}
                                 >
                                    {loadingId === f._id ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Eye className="w-3.5 h-3.5"/>}
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-6 w-6 p-0 hover:text-blue-500 hover:bg-blue-500/10"
                                   title="Rename"
                                   onClick={() => { setFileToRename({ id: f._id, filename: f.filename }); setRenameValue(f.filename); }}
                                 >
                                    <Edit className="w-3.5 h-3.5" />
                                 </Button>
                                 <Button 
                                   variant="ghost" 
                                   size="sm" 
                                   className="h-6 w-6 p-0 hover:text-red-500 hover:bg-red-500/10 text-muted-foreground/60"
                                   title="Delete"
                                   onClick={() => setFileToDelete({ id: f._id, filename: f.filename })}
                                 >
                                    <Trash2 className="w-3 h-3" />
                                 </Button>
                              </div>
                           </div>
                         </div>
                       )
                    })
                  )}
                </div>

             </Card>
          </div>

          {/* Mapping & Action (Right Column) */}
          <div className="lg:col-span-8 flex flex-col">
             <Card className="p-6 border-border bg-card/40 backdrop-blur-xl shadow-2xl relative flex-1 flex flex-col min-h-[600px]">
                <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-cyan-500 to-sky-600 opacity-20" />
                
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2 text-foreground font-bold text-sm uppercase tracking-widest opacity-60">
                     <MapIcon className="w-4 h-4 text-cyan-500" />
                     Sheet Mapping Configuration
                  </div>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={autoMapSheets}
                      className="h-8 gap-1.5 font-bold border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10 dark:text-emerald-400"
                      disabled={selectedFileIds.length === 0}
                      title="Automatically map exactly matching sheets together"
                    >
                       <Wand2 className="w-3.5 h-3.5" />
                       Auto-Map
                    </Button>
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
                </div>

                {selectedFileIds.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 space-y-3">
                     <Settings2 className="w-12 h-12 mb-2" />
                     <p className="text-sm font-bold uppercase tracking-widest">Select files to configure mappings</p>
                  </div>
                ) : mappings.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center opacity-40 space-y-3">
                     <MapIcon className="w-12 h-12 mb-2" />
                     <p className="text-sm font-bold uppercase tracking-widest">No mappings defined</p>
                     <div className="flex gap-3">
                       <Button variant="ghost" onClick={autoMapSheets} className="font-bold gap-2">
                         <Wand2 className="w-4 h-4"/> Auto-Map matching sheets
                       </Button>
                       <Button variant="ghost" onClick={addMappingRow} className="font-bold gap-2">
                         <Plus className="w-4 h-4"/> Manually initialize
                       </Button>
                     </div>
                  </div>
                ) : (
                  <div className="space-y-6 mb-8 flex-1 overflow-y-auto pr-2">
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

                <div className="mt-auto pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 shrink-0">
                  {mergeError && (
                    <div className="flex-1 w-full text-sm font-bold text-red-500 bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                      ✗ {mergeError}
                    </div>
                  )}
                  {isMerging && !mergeError && (
                    <div className="flex-1 flex gap-2 items-center w-full text-sm font-bold text-cyan-500 px-4">
                      <div className="h-1.5 flex-1 bg-cyan-500/20 rounded-full overflow-hidden">
                         <div className="h-full bg-cyan-500 rounded-full w-full animate-progress origin-left"></div>
                      </div>
                      Processing...
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
                       <span className={`text-sm font-bold mr-2 \${saveMessage.startsWith("✓") ? "text-emerald-500" : "text-red-500"}`}>
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
                
                <div className="p-1 bg-muted/20 overflow-hidden" style={{ minHeight: '500px' }}>
                   <MultiSheetViewer sheets={mergedSheets} onDataUpdate={handleDataUpdate} downloadFilename={mergedFilename} />
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

      {/* ── Preview Modal ── */}
      <Dialog open={!!fileData} onOpenChange={open => !open && setFileData(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[90vh] sm:h-[90vh] max-h-[95vh] flex flex-col border-border bg-background shadow-2xl overflow-hidden p-0 gap-0 left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] duration-200">
          <DialogHeader className="p-4 border-b border-border bg-card/30 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black truncate text-foreground flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                  <Eye className="w-4 h-4" />
                </div>
                Preview: {fileData?.filename}
              </DialogTitle>
            </div>
          </DialogHeader>
          <div className="flex-1 flex flex-col overflow-hidden bg-muted/20">
            {fileData && (
              <MultiSheetViewer sheets={fileData.sheets} readonly={true} downloadFilename={fileData.filename} />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Single Delete Modal ── */}
      <Dialog open={!!fileToDelete} onOpenChange={open => !open && setFileToDelete(null)}>
        <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Confirm Deletion</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <p className="text-muted-foreground leading-relaxed">
              You are about to permanently remove{" "}
              <span className="text-foreground font-bold underline decoration-red-500/30 underline-offset-4">{fileToDelete?.filename}</span>{" "}
              from the vault.
            </p>
            <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
              ⚠ This action cannot be reversed
            </div>
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold flex-1 sm:flex-none" onClick={() => setFileToDelete(null)}>Cancel</Button>
            <Button variant="destructive" className="font-bold flex-1 sm:flex-none bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20" onClick={executeDelete}>
              Purge File
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Rename Modal ── */}
      <Dialog open={!!fileToRename} onOpenChange={open => !open && setFileToRename(null)}>
        <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black text-foreground">Rename File</DialogTitle>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <input
              type="text"
              placeholder="New filename"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all box-border"
            />
          </div>
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
            <Button variant="ghost" className="font-bold flex-1 sm:flex-none" onClick={() => setFileToRename(null)}>Cancel</Button>
            <Button 
              className="font-bold flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 shadow-xl shadow-blue-500/20 text-white" 
              onClick={executeRename}
              disabled={!renameValue.trim() || isRenaming}
            >
              {isRenaming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Changes"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

        <HelpDialog 
          isOpen={showHelp}
          onOpenChange={setShowHelp}
          title="Consolidation Guidelines"
          subtitle="Master the Merge Excel tool with these tips."
          features={features}
        />
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
