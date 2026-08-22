import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  Bell,
  Check,
  CheckCheck,
  Trash2,
  UserCheck,
  UserX,
  AlertCircle,
  Clock,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  type: string;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

export const NotificationCenter: React.FC = () => {
  const { authFetch, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const res = await authFetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        const newUnread = data.unreadCount || 0;
        setNotifications(data.notifications || []);
        if (newUnread !== unreadCount) {
          setUnreadCount(newUnread);
          window.dispatchEvent(new CustomEvent("cmd:refresh-data"));
        }
      }
    } catch {
      // silently fail on network poll
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000); // 10s real-time poll
    return () => clearInterval(interval);
  }, [user, unreadCount]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const markAsRead = async (id: string) => {
    try {
      const res = await authFetch(`/api/notifications/${id}/read`, { method: "PATCH" });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, read: true } : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch {
      // ignore
    }
  };

  const markAllAsRead = async () => {
    try {
      const res = await authFetch("/api/notifications/read-all", { method: "POST" });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
        setUnreadCount(0);
        toast.success("All marked as read");
      }
    } catch {
      toast.error("Failed to mark all read");
    }
  };

  const dismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await authFetch(`/api/notifications/${id}`, { method: "DELETE" });
      if (res.ok) {
        const target = notifications.find((n) => n._id === id);
        if (target && !target.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch {
      // ignore
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    if (!item.read) {
      markAsRead(item._id);
    }
    setIsOpen(false);
    window.dispatchEvent(new CustomEvent("cmd:refresh-data"));

    if (item.type === "user_registered") {
      navigate("/admin?tab=users");
    } else if (item.type === "deletion_requested") {
      navigate("/admin?tab=deletions");
    } else if (item.link) {
      navigate(item.link);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "user_registered":
        return <UserCheck className="w-4 h-4 text-amber-500" />;
      case "user_approved":
        return <Check className="w-4 h-4 text-emerald-500" />;
      case "user_rejected":
        return <UserX className="w-4 h-4 text-destructive" />;
      case "deletion_requested":
        return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case "deletion_approved":
        return <Trash2 className="w-4 h-4 text-emerald-500" />;
      case "deletion_rejected":
        return <AlertCircle className="w-4 h-4 text-rose-500" />;
      default:
        return <Bell className="w-4 h-4 text-primary" />;
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => {
          setIsOpen((prev) => !prev);
          if (!isOpen) fetchNotifications();
        }}
        className="relative p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors cursor-pointer"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground animate-pulse shadow-xs">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-card border border-border/80 shadow-xl z-50 overflow-hidden text-foreground animate-in fade-in zoom-in-95 duration-150">
          {/* Header */}
          <div className="p-3.5 border-b border-border/70 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-border/40">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Loading alerts...</span>
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <p className="text-xs font-semibold text-foreground">All caught up!</p>
                <p className="text-[11px] text-muted-foreground">No recent notifications to display.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleNotificationClick(item)}
                  className={`p-3 transition-colors cursor-pointer flex gap-3 items-start group ${
                    item.read
                      ? "hover:bg-muted/40 opacity-70"
                      : "bg-primary/5 hover:bg-primary/10 font-medium"
                  }`}
                >
                  <div className="mt-0.5 shrink-0 p-1.5 rounded-lg bg-background border border-border/60">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-0.5">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-foreground truncate">{item.title}</h4>
                      <span className="text-[10px] text-muted-foreground shrink-0 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5" />
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    {item.link && (
                      <div className="pt-1 flex items-center gap-1 text-[10px] text-primary font-semibold">
                        <span>View Details</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </div>
                    )}
                  </div>

                  <button
                    onClick={(e) => dismissNotification(item._id, e)}
                    title="Dismiss"
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-all shrink-0 cursor-pointer"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
