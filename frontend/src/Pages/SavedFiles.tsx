import { useState, useEffect } from "react";
import { Link } from "react-router";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { MultiSheetViewer, type SheetData } from "../components/multi-sheet-viewer";
import { Search, RefreshCw, Trash2, Eye, ArrowLeft } from "lucide-react";

interface StoredFile {
  _id: string;
  filename: string;
  uploadDate: string;
  headers: string[];
  totalRecords?: number;
}

interface LoadedData {
  filename: string;
  sheets: SheetData[];
}

export default function SavedFiles() {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);
  
  // State for the preview modal
  const [fileData, setFileData] = useState<LoadedData | null>(null);
  
  // State for delete modal
  const [fileToDelete, setFileToDelete] = useState<{ id: string, filename: string } | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/files");
      if (!res.ok) {
        throw new Error(`Failed to fetch files: ${res.statusText}`);
      }
      const text = await res.text();
      const data = text ? JSON.parse(text) : [];
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadFile = async (id: string, filename: string) => {
    try {
      setLoadingId(id);
      const res = await fetch(`/api/files/${id}`);
      if (!res.ok) {
        throw new Error(`Failed to load file: ${res.statusText}`);
      }
      const data = await res.json();
      if (data) {
        let sheetsToLoad: SheetData[] = [];
        
        if (data.sheets && data.sheets.length > 0) {
           sheetsToLoad = data.sheets.map((s: any, idx: number) => ({
             name: s.name || `Sheet ${idx + 1}`,
             headers: s.headers || [],
             rows: s.rows || []
           }));
        } else {
           sheetsToLoad = [{
             name: "Sheet 1",
             headers: data.headers || [],
             rows: data.rows || []
           }];
        }

        setFileData({
          filename: data.filename || filename,
          sheets: sheetsToLoad
        });
      }
    } catch (error) {
      console.error("Failed to load file:", error);
      alert("Error loading file data. Ensure backend is running.");
    } finally {
      setLoadingId(null);
    }
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;
    try {
      const res = await fetch(`/api/files/${fileToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete file`);
      setFiles(files.filter(f => f._id !== fileToDelete.id));
      setFileToDelete(null);
    } catch (error) {
      console.error("Failed to delete file:", error);
    }
  };

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background ambient effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-5%] right-[-5%] w-[400px] h-[400px] rounded-full bg-blue-500/5 blur-[80px]" />
        <div className="absolute bottom-[-5%] left-[-5%] w-[300px] h-[300px] rounded-full bg-cyan-500/5 blur-[60px]" />
      </div>

      <div className="relative z-1 max-w-7xl mx-auto px-6 py-12">
        <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold tracking-tight text-foreground">
              Saved <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-cyan-500">Files</span>
            </h1>
            <p className="text-muted-foreground font-medium">Search and manage documents stored in the system vault.</p>
          </div>
          <Button asChild variant="ghost" className="text-muted-foreground hover:text-foreground">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Back to Tools
            </Link>
          </Button>
        </header>

        {/* Search & Actions Bar */}
        <div className="bg-card/50 backdrop-blur-xl rounded-2xl border border-border p-4 mb-8 flex flex-col sm:flex-row items-center gap-4 transition-all">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by filename..."
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button 
            variant="outline" 
            onClick={fetchFiles} 
            className="w-full sm:w-auto gap-2 border-border/60 hover:bg-muted text-foreground"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            <p className="text-muted-foreground font-medium animate-pulse">Syncing vault...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-20 bg-card/20 rounded-3xl border border-dashed border-border text-muted-foreground">
            <div className="mb-4 inline-flex w-12 h-12 rounded-full bg-muted items-center justify-center">
              <Search className="w-6 h-6 opacity-20" />
            </div>
            <p className="font-medium">No files found matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map(file => (
              <div 
                key={file._id} 
                className="group bg-card/40 backdrop-blur-xl border border-border rounded-2xl p-6 transition-all hover:border-blue-500/30 hover:shadow-xl hover:shadow-blue-500/5 hover:-translate-y-1"
              >
                <div className="flex-1 min-w-0 mb-6">
                  <h3 className="text-lg font-bold text-foreground truncate group-hover:text-blue-600 transition-colors" title={file.filename}>
                    {file.filename}
                  </h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex items-center text-xs text-muted-foreground font-medium">
                      <span className="w-24">Uploaded:</span>
                      <span className="text-foreground/80">{new Date(file.uploadDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground font-medium">
                      <span className="w-24">Columns:</span>
                      <span className="text-foreground/80">{file.headers?.length || 0}</span>
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground font-medium">
                      <span className="w-24">Records:</span>
                      <span className="text-foreground/80">{file.totalRecords ?? "—"}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 w-full pt-4 border-t border-border/50">
                  <Button 
                    className="flex-1 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs gap-2 py-2.5 h-auto transition-all shadow-lg shadow-blue-500/10"
                    onClick={() => handleLoadFile(file._id, file.filename)}
                    disabled={loadingId === file._id}
                  >
                    {loadingId === file._id ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Eye className="w-3 h-3" />
                    )}
                    Preview
                  </Button>
                  <Button 
                    variant="outline"
                    className="aspect-square p-0 rounded-xl border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all duration-300"
                    onClick={() => setFileToDelete({ id: file._id, filename: file.filename })}
                    title="Delete permanently"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modals integrated with theme */}
        <Dialog open={!!fileData} onOpenChange={(open) => !open && setFileData(null)}>
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
                <MultiSheetViewer 
                   sheets={fileData.sheets} 
                   readonly={true}
                   downloadFilename={fileData.filename}
                />
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
          <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black text-foreground">Confirm Deletion</DialogTitle>
            </DialogHeader>
            <div className="py-6 space-y-4">
              <p className="text-muted-foreground leading-relaxed">
                You are about to permanently remove <span className="text-foreground font-bold underline decoration-red-500/30 underline-offset-4">{fileToDelete?.filename}</span> from the vault.
              </p>
              <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/10 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-widest">
                ⚠ This action cannot be reversed
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-border">
              <Button variant="ghost" className="font-bold flex-1 sm:flex-none" onClick={() => setFileToDelete(null)}>Cancel</Button>
              <Button variant="destructive" className="font-bold flex-1 sm:flex-none bg-red-600 hover:bg-red-700 shadow-xl shadow-red-500/20" onClick={executeDelete}>Purge File</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
