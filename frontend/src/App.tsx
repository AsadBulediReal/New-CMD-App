import { useState } from "react";
import { Routes, Route } from "react-router";
import UploadeFile from "./Pages/UploadeFile";
import UploadTxtFile from "./Pages/UploadTxtFile";
import MainPage from "./Pages/MainPage";
import SavedFiles from "./Pages/SavedFiles";
import Analytics from "./Pages/Analytics";
import Reconcile from "./Pages/Reconcile";
import AuditTool from "./Pages/AuditTool";
import MergeJson from "./Pages/MergeJson";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import ScrollToTop from "./components/shared/scroll-to-top";
import { Toaster } from "./components/ui/sonner";
import { BackendGuard } from "./components/BackendGuard";

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full font-sans overflow-x-hidden">
      <ScrollToTop />
      <Toaster position="top-center" expand={false} richColors />
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header onMobileMenuToggle={() => setMobileOpen(prev => !prev)} />
        <div className="flex-1 min-w-0">
          <BackendGuard>
            <Routes>
              <Route path="/" element={<MainPage />} />
              <Route path="/upload" element={<UploadeFile />} />
              <Route path="/upload-txt" element={<UploadTxtFile />} />
              <Route path="/saved-files" element={<SavedFiles />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/reconcile" element={<Reconcile />} />
              <Route path="/audit" element={<AuditTool />} />
              <Route path="/merge-json" element={<MergeJson />} />
            </Routes>
          </BackendGuard>
        </div>
      </div>
    </div>
  );
}

export default App;

