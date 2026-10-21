"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Download,
  Globe,
  Bell,
  ShieldAlert,
  LogOut,
  Users,
  Smartphone,
  Database,
  Activity,
  RefreshCw,
  Sparkles,
  User,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PWAInstallCard, OfflineQueueCard } from "@/components/pwa-provider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { LOCALES, LOCALE_LABELS, useLocale, useT } from "@/lib/i18n";

import { createClient } from "@/lib/supabase/client";
import { updateUserSettings, deleteUserAccount } from "@/features/settings/actions";
import { createNotification } from "@/features/notifications/actions";
import { CategoryManager } from "@/features/categories/components/category-manager";
import { triggerKeepAlivePing } from "@/features/settings/keep-alive-action";

type SettingsTab = "categories" | "preferences" | "system" | "account";

export default function SettingsPage() {
  const router = useRouter();
  const t = useT("settings");
  const tCommon = useT("common");
  const { locale, setLocale } = useLocale();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("categories");
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("Asia/Phnom_Penh");
  const [weekStartsOn, setWeekStartsOn] = React.useState("1");
  const [remindersEnabled, setRemindersEnabled] = React.useState(true);
  const [reminderTime, setReminderTime] = React.useState("20:00");
  const [sharedBudget, setSharedBudget] = React.useState(false);

  // Sync tab with URL hash if present
  React.useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace("#", "") as SettingsTab;
      if (["categories", "preferences", "system", "account"].includes(hash)) {
        setActiveTab(hash);
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    const timer = setTimeout(handleHashChange, 0);
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      clearTimeout(timer);
    };
  }, []);

  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${tab}`);
    }
  };

  React.useEffect(() => {
    async function loadProfile() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          setUserEmail(user.email ?? null);
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .maybeSingle();
          if (profile) {
            if (profile.main_currency) setCurrency(profile.main_currency);
            if (profile.timezone) setTimezone(profile.timezone);
            if (profile.week_starts_on !== undefined && profile.week_starts_on !== null) {
              setWeekStartsOn(String(profile.week_starts_on));
            }
            if (profile.reminder_time) {
              setReminderTime(profile.reminder_time.slice(0, 5));
              setRemindersEnabled(true);
            }
          }
        }
      } catch {
        // Fallback to local default states
      }
    }
    loadProfile();
  }, []);

  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isPingingSupabase, setIsPingingSupabase] = React.useState(false);
  const [lastPingResult, setLastPingResult] = React.useState<{ latencyMs: number; timestamp: string } | null>(null);

  const handleTestKeepAlive = async () => {
    setIsPingingSupabase(true);
    try {
      const res = await triggerKeepAlivePing();
      if (res.success) {
        setLastPingResult({
          latencyMs: res.latencyMs,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        });
        toast.success(t("pingSuccess"), {
          description: t("pingSuccessDescription", { ms: res.latencyMs }),
        });
      } else {
        toast.error(t("pingFailed"), {
          description: res.error || res.message,
        });
      }
    } catch {
      toast.error(t("pingError"));
    } finally {
      setIsPingingSupabase(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      const res = await updateUserSettings({
        main_currency: currency as "USD" | "KHR",
        timezone,
        week_starts_on: parseInt(weekStartsOn, 10) as 0 | 1,
        reminder_time: remindersEnabled ? `${reminderTime}:00` : null,
      });

      if (!res.success) {
        toast.error(t("saveFailed"), { description: res.error });
        return;
      }

      toast.success(t("saveSuccess"), {
        description: t("saveSuccessDescription"),
      });
    } catch (err) {
      toast.error(t("saveFailed"), {
        description: err instanceof Error ? err.message : t("tryAgain"),
      });
    }
  };

  const handleSendTestAlert = async () => {
    try {
      const res = await createNotification({
        kind: "warning_80",
        message: t("testAlertMessage", {
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        }),
      });

      if (res.success) {
        toast.success(t("testAlertSent"));
      } else {
        toast.error(t("testAlertFailed"), { description: res.error });
      }
    } catch {
      toast.error(t("testAlertError"));
    }
  };

  const handleDeleteAccount = async () => {
    const confirmed = confirm(t("deleteConfirm"));
    if (!confirmed) return;

    setIsDeleting(true);
    try {
      const res = await deleteUserAccount();
      if (!res.success) {
        toast.error(t("deleteFailed"), { description: res.error });
        setIsDeleting(false);
        return;
      }

      toast.success(t("deleteSuccess"), {
        description: t("deleteSuccessDescription"),
      });
      router.push("/login");
      router.refresh();
    } catch (err) {
      toast.error(t("deleteFailed"), {
        description: err instanceof Error ? err.message : t("tryAgain"),
      });
      setIsDeleting(false);
    }
  };

  const handleSignOut = async () => {
    toast.info(t("signingOut"));
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
      </div>

      {/* Segmented Settings Navigation Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-zinc-200/70 dark:bg-zinc-900 rounded-xl overflow-x-auto no-scrollbar text-xs font-semibold">
        <button
          type="button"
          onClick={() => handleTabChange("categories")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer",
            activeTab === "categories"
              ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t("tabCategories")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("preferences")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer",
            activeTab === "preferences"
              ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>{t("tabPreferences")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("system")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer",
            activeTab === "system"
              ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <Database className="w-3.5 h-3.5" />
          <span>{t("tabSystem")}</span>
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("account")}
          className={cn(
            "flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 whitespace-nowrap cursor-pointer",
            activeTab === "account"
              ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs font-bold"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
          )}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>{t("tabAccount")}</span>
        </button>
      </div>

      {/* Tab 1: Categories & Rollover Allowance Manager */}
      {activeTab === "categories" && (
        <div id="categories" className="animate-in fade-in duration-150">
          <CategoryManager />
        </div>
      )}

      {/* Tab 2: Regional Preferences & Alerts */}
      {activeTab === "preferences" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Language (per device, applies instantly) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Languages className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("languageTitle")}
              </CardTitle>
              <CardDescription>{t("languageDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div
                role="radiogroup"
                aria-label={t("languageAria")}
                className="grid grid-cols-2 gap-1 p-1 bg-zinc-200/70 dark:bg-zinc-900 rounded-xl text-sm font-semibold"
              >
                {LOCALES.map((option) => {
                  const selected = locale === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      lang={option}
                      onClick={() => setLocale(option)}
                      className={cn(
                        "h-10 rounded-lg transition-all cursor-pointer",
                        selected
                          ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      {LOCALE_LABELS[option].native}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Localization & Currency */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("regionalTitle")}
              </CardTitle>
              <CardDescription>{t("regionalDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{t("mainCurrency")}</p>
                  <p className="text-xs text-zinc-500">{t("mainCurrencyHint")}</p>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
                >
                  <option value="USD">{t("currencyUsd")}</option>
                  <option value="KHR">{t("currencyKhr")}</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium">{t("timezone")}</p>
                  <p className="text-xs text-zinc-500">{t("timezoneHint")}</p>
                </div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
                >
                  <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (UTC+7)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                  <option value="UTC">{t("timezoneUtc")}</option>
                </select>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium">{t("weekStartsOn")}</p>
                  <p className="text-xs text-zinc-500">{t("weekStartsOnHint")}</p>
                </div>
                <select
                  value={weekStartsOn}
                  onChange={(e) => setWeekStartsOn(e.target.value)}
                  className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
                >
                  <option value="1">{t("monday")}</option>
                  <option value="0">{t("sunday")}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Reminders & Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("remindersTitle")}
              </CardTitle>
              <CardDescription>{t("remindersDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
                <div>
                  <p className="text-sm font-medium">{t("eveningReminder")}</p>
                  <p className="text-xs text-zinc-500">{t("eveningReminderHint")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    disabled={!remindersEnabled}
                    className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2 text-sm disabled:opacity-50"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={remindersEnabled}
                    aria-label={t("toggleReminder")}
                    onClick={() => setRemindersEnabled(!remindersEnabled)}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      remindersEnabled ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        remindersEnabled ? "translate-x-6" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-zinc-800">
                <div>
                  <p className="text-sm font-medium">{t("testNotification")}</p>
                  <p className="text-xs text-zinc-500">{t("testNotificationHint")}</p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSendTestAlert}
                  className="gap-1.5 self-start sm:self-auto"
                >
                  <Bell className="h-3.5 w-3.5 text-accent-500" /> {t("sendTestAlert")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Shared & Household Budgets */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("sharedTitle")}
              </CardTitle>
              <CardDescription>{t("sharedDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-sm font-medium">{t("householdMode")}</p>
                  <p className="text-xs text-zinc-500">{t("householdModeHint")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sharedBudget}
                  aria-label={t("toggleHousehold")}
                  onClick={() => setSharedBudget(!sharedBudget)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors self-start sm:self-auto ${
                    sharedBudget ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                      sharedBudget ? "translate-x-6" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Save Preferences Button */}
          <div className="pt-2">
            <Button
              onClick={handleSaveSettings}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold h-11"
            >
              {t("savePreferences")}
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Cloud & System Guard */}
      {activeTab === "system" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Supabase Keep-Alive & Suspension Guard */}
          <Card className="border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 text-zinc-900 dark:text-zinc-100 min-w-0">
                  <Database className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" /> {t("keepAliveTitle")}
                </CardTitle>
                <Badge variant="outline" className="text-xs px-2.5 shrink-0 whitespace-nowrap text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-900/30 font-semibold">
                  <Activity className="w-3 h-3 mr-1 inline animate-pulse text-emerald-600" />
                  {t("activeGuard")}
                </Badge>
              </div>
              <CardDescription>{t("keepAliveDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">{t("githubCron")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{t("githubCronValue")}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">{t("vercelCron")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{t("vercelCronValue")}</p>
                </div>
                <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[11px]">{t("keepAliveEndpoint")}</span>
                  <p className="font-mono text-[11px] text-brand-600 dark:text-accent-400 mt-0.5 truncate">/api/cron/keep-alive</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <div>
                  <p className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    {lastPingResult ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                        {t("lastPing", { ms: lastPingResult.latencyMs, time: lastPingResult.timestamp })}
                      </span>
                    ) : (
                      t("testConnection")
                    )}
                  </p>
                  <p className="text-[11px] text-zinc-500">{t("testConnectionHint")}</p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestKeepAlive}
                  disabled={isPingingSupabase}
                  className="gap-2 text-xs font-semibold shrink-0 self-start sm:self-auto border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isPingingSupabase ? "animate-spin" : "")} />
                  <span>{isPingingSupabase ? t("pinging") : t("sendPing")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* App & System Version */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2 min-w-0">
                  <Smartphone className="h-4 w-4 shrink-0 text-brand-600 dark:text-accent-400" /> {t("versionTitle")}
                </CardTitle>
                <Badge variant="brand" className="text-xs px-2.5 shrink-0 whitespace-nowrap">
                  {t("versionLive")}
                </Badge>
              </div>
              <CardDescription>{t("versionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <OfflineQueueCard />
              <PWAInstallCard />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div>
                  <span className="text-zinc-400">{t("release")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{t("releaseValue")}</p>
                </div>
                <div>
                  <span className="text-zinc-400">{t("realtimeSync")}</span>
                  <p className="font-semibold text-accent-600 dark:text-accent-400">{t("realtimeSyncValue")}</p>
                </div>
                <div>
                  <span className="text-zinc-400">{t("offlineQueue")}</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400">{t("offlineQueueValue")}</p>
                </div>
                <div>
                  <span className="text-zinc-400">{t("serviceWorker")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200">{t("serviceWorkerValue")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export (CSV) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("exportTitle")}
              </CardTitle>
              <CardDescription>{t("exportDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                <p className="text-xs text-zinc-500">{t("exportHint")}</p>
                <a
                  href="/api/export-csv"
                  download
                  onClick={() => {
                    toast.success(t("exportToast"), {
                      description: t("exportToastDescription"),
                    });
                  }}
                >
                  <Button variant="outline" className="gap-2 shrink-0">
                    <Download className="h-4 w-4" /> {t("exportCsv")}
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Account & Security */}
      {activeTab === "account" && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Active Profile Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("profileTitle")}
              </CardTitle>
              <CardDescription>{t("profileDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60">
                <div className="min-w-0">
                  <span className="text-[11px] text-zinc-400 block">{t("signedInEmail")}</span>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100 font-mono text-sm mt-0.5 truncate">
                    {userEmail || tCommon("loading")}
                  </p>
                </div>
                <Badge variant="brand" className="text-xs px-2.5 self-start sm:self-auto whitespace-nowrap">
                  {t("active")}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10">
            <CardHeader>
              <CardTitle className="text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> {t("dangerTitle")}
              </CardTitle>
              <CardDescription>{t("dangerDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("signOut")}</p>
                  <p className="text-xs text-zinc-500">{t("signOutHint")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 text-zinc-700 dark:text-zinc-300 self-start sm:self-auto"
                >
                  <LogOut className="h-4 w-4" /> {t("signOut")}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-rose-200/50 dark:border-rose-900/30">
                <div>
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{t("deleteAccount")}</p>
                  <p className="text-xs text-zinc-500">{t("deleteAccountHint")}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="self-start sm:self-auto"
                >
                  {isDeleting ? t("deleting") : t("deleteAllData")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
