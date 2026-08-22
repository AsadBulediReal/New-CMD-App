import React from "react";
import { MoreVertical, Check, X, Shield, ShieldAlert, UserCheck, RotateCcw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "../ui/dropdown-menu";

export interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: "admin" | "user";
  status: "pending" | "active" | "rejected" | "suspended";
  rejectionReason?: string;
  createdAt: string;
}

interface UserActionsDropdownProps {
  user: UserItem;
  currentUserId?: string;
  actionLoading: boolean;
  onApprove: (u: UserItem) => void;
  onReject: (u: UserItem) => void;
  onUpdateUser: (userId: string, update: { role?: string; status?: string }) => void;
}

export const UserActionsDropdown: React.FC<UserActionsDropdownProps> = ({
  user: u,
  currentUserId,
  actionLoading,
  onApprove,
  onReject,
  onUpdateUser,
}) => {
  return (
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
              onClick={() => onApprove(u)}
              className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-500/10 font-medium text-xs flex items-center gap-2"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Approve Account</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onReject(u)}
              className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 font-medium text-xs flex items-center gap-2"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reject Request...</span>
            </DropdownMenuItem>
          </>
        )}

        {u.status === "active" && (
          <>
            {currentUserId !== u._id ? (
              <>
                <DropdownMenuItem
                  onClick={() => onUpdateUser(u._id, { role: u.role === "admin" ? "user" : "admin" })}
                  className="cursor-pointer font-medium text-xs flex items-center gap-2"
                >
                  <Shield className="w-3.5 h-3.5 text-primary" />
                  <span>{u.role === "admin" ? "Demote to User" : "Promote to Admin"}</span>
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onUpdateUser(u._id, { status: "suspended" })}
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
            onClick={() => onUpdateUser(u._id, { status: "active" })}
            className="cursor-pointer text-emerald-600 dark:text-emerald-400 focus:text-emerald-600 focus:bg-emerald-500/10 font-medium text-xs flex items-center gap-2"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reactivate Account</span>
          </DropdownMenuItem>
        )}

        {u.status === "rejected" && (
          <>
            <DropdownMenuItem
              onClick={() => onApprove(u)}
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
  );
};
