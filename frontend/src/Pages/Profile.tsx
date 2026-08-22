import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Lock, Shield, Mail, Calendar, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Profile: React.FC = () => {
  const { user, authFetch, refreshUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [updatingName, setUpdatingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setUpdatingName(true);
    try {
      const res = await authFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });

      if (res.ok) {
        toast.success("Profile name updated");
        await refreshUser();
      } else {
        toast.error("Failed to update name");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setUpdatingName(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    setChangingPass(true);
    try {
      const res = await authFetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json();
      if (res.ok) {
        toast.success("Password changed successfully");
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        toast.error(data.error || "Password change failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setChangingPass(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">User Profile & Security</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Manage your personal account settings, credentials, and access role.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Overview Card */}
        <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-4 md:col-span-1">
          <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xl font-extrabold mx-auto shadow-xs">
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-base font-bold text-foreground">{user?.name}</h2>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>

          <div className="pt-2 border-t border-border/70 space-y-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-primary" /> Role
              </span>
              <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-bold uppercase text-[10px]">
                {user?.role}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-500" /> Status
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 font-semibold capitalize text-[10px]">
                {user?.status}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" /> Member Since
              </span>
              <span className="text-foreground font-medium">
                {user?.registeredAt ? new Date(user.registeredAt).toLocaleDateString() : "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Forms Container */}
        <div className="md:col-span-2 space-y-6">
          {/* Edit Profile Form */}
          <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />
              <span>Personal Details</span>
            </h3>

            <form onSubmit={handleUpdateProfile} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Email Address (Read-Only)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                  <input
                    type="email"
                    value={user?.email || ""}
                    disabled
                    className="w-full pl-9 pr-3 py-2 bg-muted/40 border border-border rounded-xl text-xs text-muted-foreground cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={updatingName}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {updatingName && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          </div>

          {/* Change Password Form */}
          <div className="bg-card border border-border/70 rounded-2xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Lock className="w-4 h-4 text-primary" />
              <span>Change Password</span>
            </h3>

            <form onSubmit={handleChangePassword} className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    placeholder="Re-enter new password"
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={changingPass}
                  className="px-4 py-2 bg-primary text-primary-foreground font-semibold rounded-xl text-xs hover:opacity-90 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {changingPass && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Update Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
