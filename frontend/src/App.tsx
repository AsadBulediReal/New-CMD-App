import { Routes, Route } from "react-router";
import UploadeFile from "./Pages/UploadeFile";
import UploadTxtFile from "./Pages/UploadTxtFile";
import MainPage from "./Pages/MainPage";
import SavedFiles from "./Pages/SavedFiles";
import Analytics from "./Pages/Analytics";
import Reconcile from "./Pages/Reconcile";
import AuditTool from "./Pages/AuditTool";
import MergeJson from "./Pages/MergeJson";
import Navbar from "./components/Navbar";
import ScrollToTop from "./components/shared/scroll-to-top";
import { Toaster } from "./components/ui/sonner";

function App() {
  return (
    <div className="min-h-screen bg-transparent flex flex-col">
      <ScrollToTop />
      <Toaster position="top-center" expand={false} richColors />
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<MainPage />} />
          <Route path="/upload" element={<UploadeFile />} />
          <Route path="/upload-txt" element={<UploadTxtFile />} />
          <Route path="/saved-files" element={<SavedFiles />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/reconcile" element={<Reconcile />} />
          <Route path="/audit" element={<AuditTool />} />
          <Route path="/merge-json" element={<MergeJson />} />
          <Route path="/about" element={<div>About Page</div>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
