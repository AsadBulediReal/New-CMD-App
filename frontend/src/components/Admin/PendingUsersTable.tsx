import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { Search, Loader2 } from "lucide-react";
import { UserActionsDropdown, type UserItem } from "./UserActionsDropdown";
import { toast } from "sonner";
import { RejectUserModal } from "./RejectUserModal";

export const PendingUsersTable: React.FC = () => {
  const { authFetch, user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || "all");
  const [search, setSearch] = useState("");

  const [rejectingUser, setRejectingUser] = useState<UserItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (urlStatus && ["all", "pending", "active", "rejected", "suspended"].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ status: statusFilter, search: search.trim() });
      const res = await authFetch(`/api/admin/users?${query.toString()}`);
      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("application/json")) {
          const data = await res.json();
          setUsers(data.users || []);
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || "Failed to load users");
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    window.addEventListener("cmd:refresh-data", fetchUsers);
    return () => {
      window.removeEventListener("cmd:refresh-data", fetchUsers);
    };
  }, [statusFilter, search]);

  const handleFilterChange = (st: string) => {
    setStatusFilter(st);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("status", st);
      return next;
    });
  };

  const handleApprove = async (u: UserItem) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/admin/users/${u._id}/approve`, { method: "POST" });
      if (res.ok) {
        toast.success(`Approved ${u.name} successfully`);
        fetchUsers();
      } else {
        toast.error("Failed to approve user");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateUser = async (userId: string, update: { role?: string; status?: string }) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      });
      if (res.ok) {
        toast.success("User permissions updated");
        fetchUsers();
      } else {
        toast.error("Failed to update user");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingUser) return;
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/admin/users/${rejectingUser._id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rejectionReason }),
      });
      if (res.ok) {
        toast.success(`Rejected registration for ${rejectingUser.name}`);
        setRejectingUser(null);
        setRejectionReason("");
        fetchUsers();
      } else {
        toast.error("Failed to reject user");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-full sm:w-auto overflow-x-auto">
          {["all", "pending", "active", "rejected", "suspended"].map((st) => (
            <button
              key={st}
              onClick={() => handleFilterChange(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                statusFilter === st ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-card border border-border/70 rounded-2xl overflow-hidden shadow-xs">
        {loading ? (
          <div className="p-12 flex justify-center items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">No users found matching current filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40 text-muted-foreground border-b border-border/70 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Registered</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u) => (
                  <tr key={u._id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 font-semibold text-foreground">{u.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[11px] uppercase">{u.role}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-md font-medium text-[11px] capitalize ${
                        u.status === "active" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" :
                        u.status === "pending" ? "bg-amber-500/10 text-amber-600 dark:text-amber-400" :
                        u.status === "suspended" ? "bg-rose-500/15 text-rose-500 font-bold" : "bg-destructive/10 text-destructive"
                      }`}>{u.status}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(u.createdAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right">
                      <UserActionsDropdown
                        user={u}
                        currentUserId={currentUser?._id}
                        actionLoading={actionLoading}
                        onApprove={handleApprove}
                        onReject={(usr) => { setRejectingUser(usr); setRejectionReason(""); }}
                        onUpdateUser={handleUpdateUser}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Rejection Modal */}
      <RejectUserModal
        user={rejectingUser}
        rejectionReason={rejectionReason}
        actionLoading={actionLoading}
        onReasonChange={setRejectionReason}
        onClose={() => setRejectingUser(null)}
        onSubmit={handleRejectSubmit}
      />
    </div>
  );
};
