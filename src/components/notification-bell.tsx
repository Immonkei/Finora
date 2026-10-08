"use client";

import * as React from "react";
import { Bell, AlertTriangle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

import { createClient } from "@/lib/supabase/client";

interface NotificationItem {
  id: string;
  kind: "warning_80" | "limit_100" | "reminder";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const DEFAULT_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    kind: "limit_100",
    title: "Budget Limit Reached (100%)",
    message: "Housing & Bills has reached 100% of its $50.00 monthly budget limit.",
    time: "2h ago",
    read: false,
  },
  {
    id: "2",
    kind: "warning_80",
    title: "Budget Warning (80%)",
    message: "Transport has reached 80% ($48.00 of $60.00 limit). Slow down spending to stay on track.",
    time: "5h ago",
    read: false,
  },
  {
    id: "3",
    kind: "reminder",
    title: "Evening Logging Reminder",
    message: "Did you remember to log all of your coffee and snack expenses today?",
    time: "1d ago",
    read: true,
  },
];

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>(DEFAULT_NOTIFICATIONS);

  React.useEffect(() => {
    async function loadNotifications() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20);

        if (data && data.length > 0) {
          const mapped: NotificationItem[] = data.map((n) => ({
            id: n.id,
            kind: n.kind as "warning_80" | "limit_100" | "reminder",
            title:
              n.kind === "limit_100"
                ? "Budget Limit Reached (100%)"
                : n.kind === "warning_80"
                ? "Budget Warning (80%)"
                : "Logging Reminder",
            message: n.message,
            time: new Date(n.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            read: n.read,
          }));
          setNotifications(mapped);
        }
      } catch {
        // Fallback
      }
    }
    loadNotifications();
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("user_id", user.id)
          .eq("read", false);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white dark:ring-zinc-900">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 sm:w-96 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 pb-2">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                Budget Alerts
              </h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-accent-400 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto space-y-2">
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`pt-2.5 pb-2 text-left space-y-1 ${
                  !n.read ? "opacity-100" : "opacity-70"
                }`}
              >
                <div className="flex items-start gap-2">
                  {n.kind === "limit_100" ? (
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : n.kind === "warning_80" ? (
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                  ) : (
                    <Bell className="h-4 w-4 text-accent-500 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                      {n.title}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                      {n.message}
                    </p>
                    <span className="text-[10px] text-zinc-400 mt-1 block">
                      {n.time}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
