import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";
import { Shield, User, Globe, Calendar, CheckCircle2, XCircle, Copy, Check } from "lucide-react";
import { toast } from "sonner";

interface AuditLogItem {
  _id: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  details?: any;
  ipAddress?: string;
  userAgent?: string;
  status: "SUCCESS" | "FAILED";
  createdAt: string;
}

interface AuditLogDetailsModalProps {
  log: AuditLogItem | null;
  onClose: () => void;
}

export const AuditLogDetailsModal: React.FC<AuditLogDetailsModalProps> = ({ log, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!log) return null;

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setCopied(true);
    toast.success("Log payload copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={!!log} onOpenChange={onClose}>
      <DialogContent className="max-w-xl bg-card border border-border/80 shadow-2xl p-6 rounded-2xl font-sans">
        <DialogHeader className="border-b border-border/60 pb-3">
          <DialogTitle className="text-base font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <span>Audit Log Record Inspector</span>
            </div>
            <span
              className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                log.status === "SUCCESS"
                  ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {log.status}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2 text-xs">
          {/* Action & Actor */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <Shield className="w-3.5 h-3.5 text-primary" /> Action Type
              </span>
              <span className="font-bold text-foreground block font-mono text-xs">{log.action}</span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <User className="w-3.5 h-3.5 text-primary" /> Actor
              </span>
              <span className="font-bold text-foreground block truncate">
                {log.userName} ({log.userRole})
              </span>
              <span className="text-[10px] text-muted-foreground block truncate">{log.userEmail}</span>
            </div>
          </div>

          {/* Client & Time Metadata */}
          <div className="grid grid-cols-2 gap-3 p-3 bg-muted/30 rounded-xl border border-border/50">
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <Globe className="w-3.5 h-3.5 text-primary" /> IP Address
              </span>
              <span className="font-mono text-foreground font-semibold">
                {log.ipAddress || "127.0.0.1"}
              </span>
            </div>
            <div className="space-y-1">
              <span className="text-muted-foreground flex items-center gap-1 font-medium text-[11px]">
                <Calendar className="w-3.5 h-3.5 text-primary" /> Timestamp
              </span>
              <span className="text-foreground font-semibold">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          </div>

          {/* User Agent */}
          {log.userAgent && (
            <div className="space-y-1">
              <span className="text-muted-foreground font-medium text-[11px]">User Agent</span>
              <p className="p-2 bg-muted/20 border border-border/40 rounded-lg text-[10px] text-muted-foreground break-all font-mono">
                {log.userAgent}
              </p>
            </div>
          )}

          {/* Details Payload */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground font-semibold text-[11px]">Action Payload</span>
              <button
                onClick={handleCopyJson}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? "Copied" : "Copy JSON"}</span>
              </button>
            </div>
            <pre className="p-3 bg-background border border-border/80 rounded-xl text-[11px] font-mono text-foreground/90 overflow-x-auto max-h-48 leading-relaxed">
              {JSON.stringify(log.details || {}, null, 2)}
            </pre>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
