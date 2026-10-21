"use client";

import * as React from "react";
import { Bell, AlertTriangle, AlertCircle, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format } from "date-fns";
import { useLocale, useT } from "@/lib/i18n";

import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import {
  createNotification,
  markAllNotificationsRead,
  deleteNotification as deleteNotificationAction,
  checkDailyReminder,
} from "@/features/notifications/actions";

interface NotificationItem {
  id: string;
  kind: "warning_80" | "limit_100" | "reminder";
  message: string;
  createdAt: string;
  read: boolean;
}

const KIND_TITLE_KEYS = {
  limit_100: "titleLimit",
  warning_80: "titleWarning",
  reminder: "titleReminder",
} as const;

export function NotificationBell() {
  const t = useT("notifications");
  const { dateLocale } = useLocale();
  const [isOpen, setIsOpen] = React.useState(false);
  const [notifications, setNotifications] = React.useState<NotificationItem[]>([]);

  const loadNotifications = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // FR-N2: Check and generate daily evening reminder if due via Server Action
      await checkDailyReminder();

      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        const mapped: NotificationItem[] = data.map((n) => ({
          id: n.id,
          kind: n.kind as "warning_80" | "limit_100" | "reminder",
          message: n.message,
          createdAt: n.created_at,
          read: n.read,
        }));
        setNotifications(mapped);
      }
    } catch {
      // Fallback
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadNotifications();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadNotifications]);

  // Live Supabase Realtime subscription for alerts and reminders
  useRealtimeTable({
    table: "notifications",
    onUpdate: () => {
      loadNotifications();
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllNotificationsRead();
    } catch {
      // Fallback
    }
  };

  const deleteNotification = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    try {
      await deleteNotificationAction(id);
    } catch {
      // Fallback
    }
  };

  const sendTestNotification = async () => {
    try {
      const res = await createNotification({
        kind: "warning_80",
        message: t("testMessage", {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }),
      });

      if (res.success) {
        toast.success(t("testSent"));
      } else {
        toast.error(t("testFailed"), { description: res.error });
      }
    } catch {
      toast.error(t("testFailed"));
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        aria-label={unreadCount > 0 ? t("bellLabelUnread", { count: unreadCount }) : t("bellLabel")}
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
            <div className="flex items-center gap-2 min-w-0">
              <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                {t("title")}
              </h3>
              {unreadCount > 0 && (
                <Badge variant="destructive" className="text-[10px] px-1.5 py-0 whitespace-nowrap">
                  {t("newCount", { count: unreadCount })}
                </Badge>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-xs text-brand-600 hover:text-brand-700 dark:text-accent-400 font-medium whitespace-nowrap"
              >
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 max-h-80 overflow-y-auto space-y-2">
            {notifications.length === 0 ? (
              <div className="py-6 text-center text-xs text-zinc-500 space-y-2">
                <p>{t("empty")}</p>
                <button
                  type="button"
                  onClick={sendTestNotification}
                  className="text-brand-600 dark:text-accent-400 font-semibold text-xs hover:underline"
                >
                  {t("sendTestToSupabase")}
                </button>
              </div>
            ) : (
              notifications.map((n) => (
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                          {t(KIND_TITLE_KEYS[n.kind] ?? "titleReminder")}
                        </p>
                        <button
                          type="button"
                          onClick={() => deleteNotification(n.id)}
                          className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded"
                          title={t("dismiss")}
                          aria-label={t("dismiss")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-zinc-400 mt-1 block">
                        {format(new Date(n.createdAt), "p", { locale: dateLocale })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
            <span>{t("realtimeLive")}</span>
            <button
              type="button"
              onClick={sendTestNotification}
              className="text-brand-600 dark:text-accent-400 hover:underline font-medium"
            >
              {t("triggerTest")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
