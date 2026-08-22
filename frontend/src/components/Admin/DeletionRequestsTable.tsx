import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Trash2, X, ShieldAlert, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeletionRequestItem {
  _id: string;
  targetName: string;
  targetId: string;
  requestedByName: string;
  requestedByEmail: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  adminNote?: string;
  createdAt: string;
}

export const DeletionRequestsTable: React.FC = () => {
  const { authFetch } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");

  const [requests, setRequests] = useState<DeletionRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || "all");

  // Rejection modal
  const [rejectingReq, setRejectingReq] = useState<DeletionRequestItem | null>(null);
  const [adminNote, setAdminNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (urlStatus && ["all", "pending", "approved", "rejected"].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/admin/deletion-requests?status=${statusFilter}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setRequests(data.requests || []);
        }
      }
    } catch {
      toast.error("Failed to load deletion requests");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    window.addEventListener("cmd:refresh-data", fetchRequests);

    return () => {
      window.removeEventListener("cmd:refresh-data", fetchRequests);
    };
  }, [statusFilter]);

  const handleApprove = async (reqItem: DeletionRequestItem) => {
    if (!window.confirm(`Permanently purge "${reqItem.targetName}"? This action cannot be undone.`)) {
      return;
    }

    setActionLoading(true);
    try {
      const res = await authFetch(`/api/admin/deletion-requests/${reqItem._id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote: "Approved by administrator" }),
      });
      if (res.ok) {
        toast.success(`Permanently deleted ${reqItem.targetName}`);
        fetchRequests();
      } else {
        toast.error("Failed to approve deletion");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReq) return;

    setActionLoading(true);
    try {
      const res = await authFetch(`/api/admin/deletion-requests/${rejectingReq._id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminNote }),
      });
      if (res.ok) {
        toast.success(`Rejected deletion for ${rejectingReq.targetName}`);
        setRejectingReq(null);
        setAdminNote("");
        fetchRequests();
      } else {
        toast.error("Failed to reject deletion");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleFilterChange = (st: string) => {
    setStatusFilter(st);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("status", st);
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-fit">
        {["all", "pending", "approved", "rejected"].map((st) => (
          <button
            key={st}
            onClick={() => handleFilterChange(st)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
              statusFilter === st
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : requests.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No deletion requests in this queue.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">File Name</th>
                  <th className="px-4 py-3">Requested By</th>
                  <th className="px-4 py-3">User Reason</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {requests.map((r) => (
                  <tr key={r._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground flex items-center gap-2">
                      <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{r.targetName}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{r.requestedByName}</div>
                      <div className="text-[11px] text-muted-foreground">{r.requestedByEmail}</div>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-muted-foreground">
                      {r.reason || "N/A"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium text-[11px] capitalize ${
                          r.status === "approved"
                            ? "bg-destructive/10 text-destructive"
                            : r.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {r.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(r)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Approve Permanent Purge"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold pr-1">Approve Purge</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingReq(r);
                              setAdminNote("");
                            }}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Reject Deletion"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold pr-1">Reject</span>
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {rejectingReq && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-foreground font-semibold">
              <ShieldAlert className="w-5 h-5 text-amber-500" />
              <span>Reject Deletion: {rejectingReq.targetName}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter an optional admin explanation for why this file cannot be deleted.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. This file is required for quarterly fiscal reconciliation..."
                rows={3}
                className="w-full p-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingReq(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                >
                  Confirm Rejection & Retain File
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
