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
import { CategoryManager } from "@/features/categories/components/category-manager";
import { ProfileCard } from "@/features/profile/profile-card";
import { triggerKeepAlivePing } from "@/features/settings/keep-alive-action";

type SettingsTab = "categories" | "preferences" | "system" | "account";

export default function SettingsPage() {
  const router = useRouter();
  const t = useT("settings");
  const { locale, setLocale } = useLocale();
  const [activeTab, setActiveTab] = React.useState<SettingsTab>("categories");

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
    <div className="space-y-3 sm:space-y-5 max-w-4xl">
      {/* Header */}
      <div className="space-y-0.5 sm:space-y-1">
        <p className="text-[11px] sm:text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
      </div>

      {/* Compact Segmented Settings Navigation Tabs - 4-Column Grid, Zero Mobile Scroll */}
      <nav
        aria-label={t("title")}
        className="p-1 bg-zinc-200/80 dark:bg-zinc-900/90 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/80 shadow-xs"
      >
        <div className="grid grid-cols-4 gap-1">
          <button
            type="button"
            onClick={() => handleTabChange("categories")}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all cursor-pointer text-center select-none",
              activeTab === "categories"
                ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
            )}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs truncate max-w-full">
              <span className="sm:hidden">{t("tabCategoriesShort")}</span>
              <span className="hidden sm:inline">{t("tabCategories")}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("preferences")}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all cursor-pointer text-center select-none",
              activeTab === "preferences"
                ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
            )}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs truncate max-w-full">
              <span className="sm:hidden">{t("tabPreferencesShort")}</span>
              <span className="hidden sm:inline">{t("tabPreferences")}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("system")}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all cursor-pointer text-center select-none",
              activeTab === "system"
                ? "bg-white dark:bg-zinc-800 text-brand-600 dark:text-accent-400 shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
            )}
          >
            <Database className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs truncate max-w-full">
              <span className="sm:hidden">{t("tabSystemShort")}</span>
              <span className="hidden sm:inline">{t("tabSystem")}</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("account")}
            className={cn(
              "flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2 sm:py-2.5 px-1 sm:px-3 rounded-xl transition-all cursor-pointer text-center select-none",
              activeTab === "account"
                ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs font-bold ring-1 ring-black/5 dark:ring-white/10"
                : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 font-medium"
            )}
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span className="text-[10px] sm:text-xs truncate max-w-full">
              <span className="sm:hidden">{t("tabAccountShort")}</span>
              <span className="hidden sm:inline">{t("tabAccount")}</span>
            </span>
          </button>
        </div>
      </nav>

      {/* Tab 1: Categories & Rollover Allowance Manager */}
      {activeTab === "categories" && (
        <div id="categories" className="animate-in fade-in duration-150">
          <CategoryManager />
        </div>
      )}

      {/* Tab 2: Regional Preferences & Alerts */}
      {activeTab === "preferences" && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
          {/* Regional & Localization */}
          <Card className="p-3.5 sm:p-5">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Globe className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("regionalTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("regionalDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0 divide-y divide-zinc-100 dark:divide-zinc-800/80">
              {/* Language Selection */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 first:pt-0">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5 text-zinc-400" />
                    {t("languageTitle")}
                  </p>
                  <p className="text-xs text-zinc-500">{t("languageDescription")}</p>
                </div>
                <div
                  role="radiogroup"
                  aria-label={t("languageAria")}
                  className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl text-xs font-semibold w-full sm:w-auto shrink-0"
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
                          "h-8 px-3 rounded-lg transition-all cursor-pointer text-center",
                          selected
                            ? "bg-white dark:bg-zinc-700 text-brand-600 dark:text-accent-400 shadow-xs font-bold"
                            : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                        )}
                      >
                        {LOCALE_LABELS[option].native}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Main Base Currency */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("mainCurrency")}</p>
                  <p className="text-xs text-zinc-500">{t("mainCurrencyHint")}</p>
                </div>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="h-9 w-full sm:w-auto min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="USD">{t("currencyUsd")}</option>
                  <option value="KHR">{t("currencyKhr")}</option>
                </select>
              </div>

              {/* Timezone */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("timezone")}</p>
                  <p className="text-xs text-zinc-500">{t("timezoneHint")}</p>
                </div>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="h-9 w-full sm:w-auto min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (UTC+7)</option>
                  <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
                  <option value="UTC">{t("timezoneUtc")}</option>
                </select>
              </div>

              {/* Week Starts On */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-3 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("weekStartsOn")}</p>
                  <p className="text-xs text-zinc-500">{t("weekStartsOnHint")}</p>
                </div>
                <select
                  value={weekStartsOn}
                  onChange={(e) => setWeekStartsOn(e.target.value)}
                  className="h-9 w-full sm:w-auto min-w-[180px] rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-xs font-medium text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="1">{t("monday")}</option>
                  <option value="0">{t("sunday")}</option>
                </select>
              </div>
            </CardContent>
          </Card>

          {/* Daily Reminders & Alerts */}
          <Card className="p-3.5 sm:p-5">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Bell className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("remindersTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("remindersDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("eveningReminder")}</p>
                  <p className="text-xs text-zinc-500">{t("eveningReminderHint")}</p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto">
                  <input
                    type="time"
                    value={reminderTime}
                    onChange={(e) => setReminderTime(e.target.value)}
                    disabled={!remindersEnabled}
                    className="h-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-2.5 text-xs font-medium text-zinc-900 dark:text-zinc-100 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    role="switch"
                    aria-checked={remindersEnabled}
                    aria-label={t("toggleReminder")}
                    onClick={() => setRemindersEnabled(!remindersEnabled)}
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                      remindersEnabled ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                        remindersEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shared & Household Budgets */}
          <Card className="p-3.5 sm:p-5">
            <CardHeader className="pb-2 sm:pb-3">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Users className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("sharedTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("sharedDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between gap-2.5 py-1">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("householdMode")}</p>
                  <p className="text-xs text-zinc-500">{t("householdModeHint")}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={sharedBudget}
                  aria-label={t("toggleHousehold")}
                  onClick={() => setSharedBudget(!sharedBudget)}
                  className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer shrink-0 ${
                    sharedBudget ? "bg-brand-600" : "bg-zinc-300 dark:bg-zinc-700"
                  }`}
                >
                  <div
                    className={`bg-white w-5 h-5 rounded-full shadow-xs transform transition-transform ${
                      sharedBudget ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Save Preferences Button */}
          <div className="pt-1">
            <Button
              onClick={handleSaveSettings}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold h-10 text-xs sm:text-sm shadow-xs cursor-pointer"
            >
              {t("savePreferences")}
            </Button>
          </div>
        </div>
      )}

      {/* Tab 3: Cloud & System Guard */}
      {activeTab === "system" && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
          {/* Supabase Keep-Alive & Suspension Guard */}
          <Card className="p-3.5 sm:p-5 border-emerald-200/80 dark:border-emerald-900/60 bg-emerald-50/20 dark:bg-emerald-950/10">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 text-zinc-900 dark:text-zinc-100 min-w-0">
                  <Database className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <span className="truncate">{t("keepAliveTitle")}</span>
                </CardTitle>
                <Badge variant="outline" className="text-[11px] px-2 py-0.5 shrink-0 whitespace-nowrap text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800 bg-emerald-100/50 dark:bg-emerald-900/30 font-semibold">
                  <Activity className="w-3 h-3 mr-1 inline animate-pulse text-emerald-600" />
                  {t("activeGuard")}
                </Badge>
              </div>
              <CardDescription className="text-xs">{t("keepAliveDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[10px] sm:text-[11px]">{t("githubCron")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 text-xs">{t("githubCronValue")}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[10px] sm:text-[11px]">{t("vercelCron")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 text-xs">{t("vercelCronValue")}</p>
                </div>
                <div className="p-2 sm:p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800">
                  <span className="text-zinc-400 block text-[10px] sm:text-[11px]">{t("keepAliveEndpoint")}</span>
                  <p className="font-mono text-[10px] sm:text-[11px] text-brand-600 dark:text-accent-400 mt-0.5 truncate">/api/cron/keep-alive</p>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
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
                  className="gap-2 text-xs font-semibold shrink-0 self-start sm:self-auto border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 h-8"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5", isPingingSupabase ? "animate-spin" : "")} />
                  <span>{isPingingSupabase ? t("pinging") : t("sendPing")}</span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* App & System Version */}
          <Card className="p-3.5 sm:p-5">
            <CardHeader className="pb-2.5">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2 min-w-0">
                  <Smartphone className="h-4 w-4 shrink-0 text-brand-600 dark:text-accent-400" />
                  <span className="truncate">{t("versionTitle")}</span>
                </CardTitle>
                <Badge variant="brand" className="text-[11px] px-2 py-0.5 shrink-0 whitespace-nowrap">
                  {t("versionLive")}
                </Badge>
              </div>
              <CardDescription className="text-xs">{t("versionDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <OfflineQueueCard />
              <PWAInstallCard />

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800 text-xs">
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="text-zinc-400 block text-[10px]">{t("release")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{t("releaseValue")}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="text-zinc-400 block text-[10px]">{t("realtimeSync")}</span>
                  <p className="font-semibold text-accent-600 dark:text-accent-400 mt-0.5">{t("realtimeSyncValue")}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="text-zinc-400 block text-[10px]">{t("offlineQueue")}</span>
                  <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{t("offlineQueueValue")}</p>
                </div>
                <div className="p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/40">
                  <span className="text-zinc-400 block text-[10px]">{t("serviceWorker")}</span>
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">{t("serviceWorkerValue")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Export (CSV) */}
          <Card className="p-3.5 sm:p-5">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Download className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("exportTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("exportDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <p className="text-xs text-zinc-500">{t("exportHint")}</p>
                <a
                  href="/api/export-csv"
                  download
                  onClick={() => {
                    toast.success(t("exportToast"), {
                      description: t("exportToastDescription"),
                    });
                  }}
                  className="self-start sm:self-auto shrink-0"
                >
                  <Button variant="outline" size="sm" className="gap-2 text-xs font-semibold h-8">
                    <Download className="h-3.5 w-3.5" /> {t("exportCsv")}
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 4: Account & Security */}
      {activeTab === "account" && (
        <div className="space-y-3 sm:space-y-4 animate-in fade-in duration-150">
          <ProfileCard />

          {/* Danger Zone */}
          <Card className="p-3.5 sm:p-5 border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-sm sm:text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4" /> {t("dangerTitle")}
              </CardTitle>
              <CardDescription className="text-xs">{t("dangerDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 pt-0">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{t("signOut")}</p>
                  <p className="text-xs text-zinc-500">{t("signOutHint")}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                  className="gap-2 text-xs text-zinc-700 dark:text-zinc-300 self-start sm:self-auto h-8"
                >
                  <LogOut className="h-3.5 w-3.5" /> {t("signOut")}
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-rose-200/50 dark:border-rose-900/30">
                <div>
                  <p className="text-sm font-medium text-rose-600 dark:text-rose-400">{t("deleteAccount")}</p>
                  <p className="text-xs text-zinc-500">{t("deleteAccountHint")}</p>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="self-start sm:self-auto text-xs h-8"
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
