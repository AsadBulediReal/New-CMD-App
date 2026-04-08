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
      alert("Error: Ensure the backend server is running on port 5000.");
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
      const text = await res.text();
      const data = text ? JSON.parse(text) : null;
      if (data) {
        let sheetsToLoad: SheetData[] = [];
        
        // Handle newer multi-sheet formats
        if (data.sheets && data.sheets.length > 0) {
           sheetsToLoad = data.sheets.map((s: any, idx: number) => ({
             name: s.name || `Sheet ${idx + 1}`,
             headers: s.headers || [],
             rows: s.rows || []
           }));
        } else {
           // Handle backwards compatibility for single-sheet data
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
      alert("Error loading file data from server. Ensure the backend server is running.");
    } finally {
      setLoadingId(null);
    }
  };

  const handleDeleteButtonClick = (id: string, filename: string) => {
    setFileToDelete({ id, filename });
  };

  const executeDelete = async () => {
    if (!fileToDelete) return;
    
    try {
      const res = await fetch(`/api/files/${fileToDelete.id}`, {
        method: "DELETE"
      });
      if (!res.ok) {
        throw new Error(`Failed to delete file`);
      }
      // Remove from UI state
      setFiles(files.filter(f => f._id !== fileToDelete.id));
      setFileToDelete(null); // Close modal
    } catch (error) {
      console.error("Failed to delete file:", error);
      alert("Error deleting file. Ensure the backend server is running.");
    }
  };

  const filteredFiles = files.filter(f => 
    f.filename.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Saved Files</h1>
            <p className="text-gray-600">Search and retrieve stored documents from the MongoDB database.</p>
          </div>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white">
            <Link to="/">Back to Dashboard</Link>
          </Button>
        </header>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <input
            type="text"
            placeholder="Search filenames..."
            className="w-full md:max-w-md border border-gray-300 rounded-lg px-4 py-2 text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button variant="outline" onClick={fetchFiles} className="whitespace-nowrap">
            Refresh List
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-12 text-gray-600 font-medium">Loading files...</div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-sm border border-gray-200 text-gray-600">
            No files found matching your criteria.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredFiles.map(file => (
              <div key={file._id} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2 truncate" title={file.filename}>
                    {file.filename}
                  </h3>
                  <div className="text-sm text-gray-500 mb-4 flex flex-col gap-1">
                    <span>Uploaded: {new Date(file.uploadDate).toLocaleString()}</span>
                    <span>Expected Columns: {file.headers?.length || 0}</span>
                    <span>Expected Records: {file.totalRecords !== undefined ? file.totalRecords : "Unknown"}</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full mt-2">
                  <Button 
                    variant="outline" 
                    className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50" 
                    onClick={() => handleLoadFile(file._id, file.filename)}
                    disabled={loadingId === file._id}
                  >
                    {loadingId === file._id ? "Loading..." : "Preview Data"}
                  </Button>
                  <Button 
                    variant="outline"
                    className="px-3 border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                    onClick={() => handleDeleteButtonClick(file._id, file.filename)}
                    title="Delete permanently"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Preview Modal */}
        <Dialog open={!!fileData} onOpenChange={(open) => !open && setFileData(null)}>
          <DialogContent className="max-w-[95vw] sm:max-w-[90vw] w-full max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold truncate pr-8">
                {fileData?.filename}
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto mt-4 px-1 bg-gray-50 rounded-lg">
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

        {/* Delete Confirmation Modal */}
        <Dialog open={!!fileToDelete} onOpenChange={(open) => !open && setFileToDelete(null)}>
          <DialogContent className="max-w-sm rounded-lg">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-gray-900 border-b pb-2">Delete File</DialogTitle>
            </DialogHeader>
            <div className="py-4 text-gray-700">
              Are you sure you want to permanently delete <strong className="text-indigo-600 truncate block mt-1">{fileToDelete?.filename}</strong>
              <div className="text-sm mt-3 text-red-600 font-medium">This action cannot be undone.</div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setFileToDelete(null)}>Cancel</Button>
              <Button variant="destructive" onClick={executeDelete} className="bg-red-600 hover:bg-red-700">Delete Permanently</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
