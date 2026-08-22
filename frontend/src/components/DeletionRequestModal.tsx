import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { ShieldAlert, Trash2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DeletionRequestModalProps {
  file: { id: string; filename: string } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const DeletionRequestModal: React.FC<DeletionRequestModalProps> = ({
  file,
  onClose,
  onSuccess,
}) => {
  const { authFetch, isAdmin } = useAuth();
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!file) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await authFetch(`/api/files/${file.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });

      const data = await res.json();

      if (res.status === 202 || data.isPendingDeletion) {
        toast.info("Deletion request submitted to Administrator for approval.");
        onSuccess();
        onClose();
      } else if (res.ok) {
        toast.success("File permanently purged.");
        onSuccess();
        onClose();
      } else {
        toast.error(data.error || "Action failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md border-border bg-background shadow-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-foreground flex items-center gap-2">
            {isAdmin ? (
              <>
                <Trash2 className="w-5 h-5 text-destructive" />
                <span>Confirm Permanent Deletion</span>
              </>
            ) : (
              <>
                <Clock className="w-5 h-5 text-amber-500" />
                <span>Request File Deletion</span>
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <p className="text-xs text-muted-foreground leading-relaxed">
            Target file: <strong className="text-foreground">{file.filename}</strong>
          </p>

          {!isAdmin ? (
            <div className="space-y-2">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                <p className="font-semibold mb-1">Guarded Deletion Workflow:</p>
                <p className="opacity-90">
                  As a standard user, file deletions require administrator approval before being permanently purged.
                </p>
              </div>

              <label className="text-xs font-semibold text-muted-foreground block pt-1">
                Reason for deletion (Optional):
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Outdated quarterly statement, duplicate report..."
                rows={2}
                className="w-full p-2.5 bg-background border border-border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-bold uppercase tracking-wider">
              ⚠ Administrator Direct Purge: This action cannot be reversed
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant={isAdmin ? "destructive" : "default"}
              size="sm"
              disabled={loading}
              className="text-xs font-semibold"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : isAdmin ? (
                "Purge File"
              ) : (
                "Submit Deletion Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
