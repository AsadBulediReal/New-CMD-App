import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Clock, RefreshCw, LogOut, ShieldCheck, Mail } from "lucide-react";
import { toast } from "sonner";

export const PendingApproval: React.FC = () => {
  const { user, refreshUser, logout } = useAuth();
  const [checking, setChecking] = useState(false);

  const handleCheckStatus = async () => {
    setChecking(true);
    await refreshUser();
    setChecking(false);
    toast.info("Status updated. If approved, you will be redirected automatically.");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md bg-card border border-border/80 rounded-2xl p-8 text-center space-y-6 shadow-sm">
        {/* Animated Icon */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-500 mx-auto">
          <Clock className="w-10 h-10 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-background border border-border flex items-center justify-center text-primary">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Account Pending Approval</h1>
          <p className="text-sm text-muted-foreground">
            Welcome, <span className="font-semibold text-foreground">{user?.name || "User"}</span>! Your account has been registered and is currently awaiting administrator review.
          </p>
        </div>

        {/* Info Card */}
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-left text-xs text-amber-800 dark:text-amber-300 space-y-2.5">
          <div className="flex items-center gap-2 font-semibold">
            <Mail className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span>Email Confirmation</span>
          </div>
          <p className="opacity-90 leading-relaxed">
            An email notification will be sent to <strong className="text-foreground">{user?.email}</strong> once your account is activated.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3 pt-2">
          <button
            onClick={handleCheckStatus}
            disabled={checking}
            className="w-full py-2.5 px-4 bg-primary text-primary-foreground font-semibold rounded-xl text-sm hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
            <span>Check Approval Status</span>
          </button>

          <button
            onClick={logout}
            className="w-full py-2.5 px-4 bg-muted/60 text-muted-foreground hover:text-foreground font-medium rounded-xl text-sm hover:bg-muted transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;
