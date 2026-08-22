import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  MoreVertical,
  Check,
  X,
  Shield,
  ShieldAlert,
  UserCheck,
  RotateCcw,
  UserX,
  Search,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";
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
  const { authFetch, user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStatus = searchParams.get("status");

  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>(urlStatus || "active");
  const [search, setSearch] = useState("");

  const [rejectingUser, setRejectingUser] = useState<UserItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (urlStatus && ["pending", "active", "rejected", "suspended", "all"].includes(urlStatus)) {
      setStatusFilter(urlStatus);
    }
  }, [urlStatus]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({ status: statusFilter, search: search.trim() });
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
    const interval = setInterval(fetchUsers, 10000);
    window.addEventListener("focus", fetchUsers);
    window.addEventListener("cmd:refresh-data", fetchUsers);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", fetchUsers);
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
          {["active", "pending", "rejected", "suspended", "all"].map((st) => (
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            disabled={actionLoading}
                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer border border-border/60 shadow-2xs"
                            title="Actions Menu"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                            User Management
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />

                          {u.status === "pending" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprove(u)}
                                className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-500/10 font-medium text-xs flex items-center gap-2"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve Account</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => { setRejectingUser(u); setRejectionReason(""); }}
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 font-medium text-xs flex items-center gap-2"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject Request...</span>
                              </DropdownMenuItem>
                            </>
                          )}

                          {u.status === "active" && (
                            <>
                              {currentUser?._id !== u._id ? (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateUser(u._id, { role: u.role === "admin" ? "user" : "admin" })}
                                    className="cursor-pointer font-medium text-xs flex items-center gap-2"
                                  >
                                    <Shield className="w-3.5 h-3.5 text-primary" />
                                    <span>{u.role === "admin" ? "Demote to User" : "Promote to Admin"}</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => handleUpdateUser(u._id, { status: "suspended" })}
                                    className="cursor-pointer text-amber-600 dark:text-amber-400 focus:text-amber-600 focus:bg-amber-500/10 font-medium text-xs flex items-center gap-2"
                                  >
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    <span>Suspend Account</span>
                                  </DropdownMenuItem>
                                </>
                              ) : (
                                <div className="px-2 py-1.5 text-xs text-muted-foreground italic">Current Account (You)</div>
                              )}
                            </>
                          )}

                          {u.status === "suspended" && (
                            <DropdownMenuItem
                              onClick={() => handleUpdateUser(u._id, { status: "active" })}
                              className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-500/10 font-medium text-xs flex items-center gap-2"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>Reactivate Account</span>
                            </DropdownMenuItem>
                          )}

                          {u.status === "rejected" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => handleApprove(u)}
                                className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-500/10 font-medium text-xs flex items-center gap-2"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Re-Approve User</span>
                              </DropdownMenuItem>
                              {u.rejectionReason && (
                                <div className="px-2 py-1.5 text-[11px] text-muted-foreground italic border-t border-border/40">
                                  "{u.rejectionReason}"
                                </div>
                              )}
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
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
              Please enter the reason for rejection. This explanation will be automatically emailed to <strong className="text-foreground">{rejectingUser.email}</strong>.
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
                <button type="button" onClick={() => setRejectingUser(null)} className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer">
                  Cancel
                </button>
                <button type="submit" disabled={actionLoading} className="px-4 py-1.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer">
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
