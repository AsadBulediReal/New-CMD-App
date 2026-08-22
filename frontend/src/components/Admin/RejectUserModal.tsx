import React from "react";
import { UserX, Loader2 } from "lucide-react";

export interface RejectModalUser {
  _id: string;
  name: string;
  email: string;
}

interface RejectUserModalProps {
  user: RejectModalUser | null;
  rejectionReason: string;
  actionLoading: boolean;
  onReasonChange: (reason: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RejectUserModal: React.FC<RejectUserModalProps> = ({
  user,
  rejectionReason,
  actionLoading,
  onReasonChange,
  onClose,
  onSubmit,
}) => {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        <div className="flex items-center gap-2 text-destructive font-semibold">
          <UserX className="w-5 h-5" />
          <span>Reject Registration: {user.name}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Please enter the reason for rejection. This explanation will be automatically emailed to{" "}
          <strong className="text-foreground">{user.email}</strong>.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <textarea
            value={rejectionReason}
            onChange={(e) => onReasonChange(e.target.value)}
            placeholder="e.g. Unverified employee ID or unauthorized department request..."
            rows={3}
            required
            className="w-full p-3 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-destructive/30"
          />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground rounded-lg cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-destructive text-destructive-foreground text-xs font-semibold rounded-lg hover:opacity-90 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            >
              {actionLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Confirm Rejection & Send Email</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
