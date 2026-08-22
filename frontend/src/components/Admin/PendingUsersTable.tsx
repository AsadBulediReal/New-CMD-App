import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Check, X, UserX, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "active" | "rejected" | "suspended";
  rejectionReason?: string;
  createdAt: string;
}

export const PendingUsersTable: React.FC = () => {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [search, setSearch] = useState("");

  // Rejection modal state
  const [rejectingUser, setRejectingUser] = useState<UserItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        status: statusFilter,
        search: search.trim(),
      });
      const res = await authFetch(`/api/admin/users?${query.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, search]);

  const handleApprove = async (user: UserItem) => {
    setActionLoading(true);
    try {
      const res = await authFetch(`/api/admin/users/${user._id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success(`Approved ${user.name} successfully`);
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
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl w-full sm:w-auto">
          {["pending", "active", "rejected", "all"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
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
          <div className="p-12 flex justify-center items-center">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground text-sm">
            No users found matching current filter.
          </div>
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
                      <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-medium text-[11px]">
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium text-[11px] capitalize ${
                          u.status === "active"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                            : u.status === "pending"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                            : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {u.status === "pending" && (
                        <>
                          <button
                            onClick={() => handleApprove(u)}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Approve User"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-semibold pr-1">Approve</span>
                          </button>

                          <button
                            onClick={() => {
                              setRejectingUser(u);
                              setRejectionReason("");
                            }}
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Reject User"
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

      {/* Rejection Modal */}
      {rejectingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-destructive font-semibold">
              <UserX className="w-5 h-5" />
              <span>Reject Registration: {rejectingUser.name}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Please enter the reason for rejection. This explanation will be automatically emailed to{" "}
              <strong className="text-foreground">{rejectingUser.email}</strong>.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-3">
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Unverified employee ID or unauthorized department request..."
                rows={3}
                required
                className="w-full p-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-destructive/30"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingUser(null)}
                  className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer"
                >
                  Confirm Rejection & Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
