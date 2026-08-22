import { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ProtectedRoute, AdminRoute, PublicOnlyRoute } from "./components/Guards/ProtectedRoute";

import Login from "./Pages/Auth/Login";
import Register from "./Pages/Auth/Register";
import PendingApproval from "./Pages/Auth/PendingApproval";
import AdminDashboard from "./Pages/Admin/AdminDashboard";

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

function WorkspaceLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex w-full font-sans">
      <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <Header onMobileMenuToggle={() => setMobileOpen((prev) => !prev)} />
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
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BackendGuard>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <ScrollToTop />
      <Toaster position="top-center" expand={false} richColors />
      <Routes>
        {/* Public / Auth routes */}
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <Login />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnlyRoute>
              <Register />
            </PublicOnlyRoute>
          }
        />
        <Route path="/pending-approval" element={<PendingApproval />} />

        {/* Protected workspace routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <WorkspaceLayout />
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
