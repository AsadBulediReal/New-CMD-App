import { Routes, Route } from "react-router";
import UploadeFile from "./Pages/UploadeFile";
import UploadTxtFile from "./Pages/UploadTxtFile";
import MainPage from "./Pages/MainPage";
import SavedFiles from "./Pages/SavedFiles";
import Analytics from "./Pages/Analytics";
import Reconcile from "./Pages/Reconcile";
import AuditTool from "./Pages/AuditTool";
import Navbar from "./components/Navbar";

function App() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
          <Route path="/about" element={<div>About Page</div>} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
