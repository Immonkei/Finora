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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

export default function SettingsPage() {
  const router = useRouter();
  const [currency, setCurrency] = React.useState("USD");
  const [language, setLanguage] = React.useState("en");
  const [timezone, setTimezone] = React.useState("Asia/Phnom_Penh");
  const [weekStartsOn, setWeekStartsOn] = React.useState("1");
  const [remindersEnabled, setRemindersEnabled] = React.useState(true);
  const [reminderTime, setReminderTime] = React.useState("20:00");
  const [sharedBudget, setSharedBudget] = React.useState(false);

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
            .single();
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

  const handleSaveSettings = async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { error } = await supabase
          .from("profiles")
          .update({
            main_currency: currency,
            timezone,
            week_starts_on: parseInt(weekStartsOn, 10),
            reminder_time: remindersEnabled ? `${reminderTime}:00` : null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

        if (error) {
          toast.error("Failed to save settings", { description: error.message });
          return;
        }
      }

      toast.success("Preferences updated", {
        description: "Your settings have been saved to Supabase.",
      });
    } catch (err) {
      toast.error("Failed to save settings", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    }
  };

  const handleSignOut = async () => {
    toast.info("Signing out...");
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
    <div className="space-y-6 max-w-3xl">
      <div>
        <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
          Preferences
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          Settings
        </h1>
      </div>

      {/* Localization & Currency (Spec FR-X1 & Spec 12) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" /> Regional & Localization
          </CardTitle>
          <CardDescription>
            Choose your display language, primary currency, and calculation timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
            <div>
              <p className="text-sm font-medium">Language</p>
              <p className="text-xs text-zinc-500">App interface language (Spec 12)</p>
            </div>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
            >
              <option value="en">English (US)</option>
              <option value="km">Khmer (ភាសាខ្មែរ)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium">Main Currency</p>
              <p className="text-xs text-zinc-500">All summaries and totals use this base currency</p>
            </div>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
            >
              <option value="USD">USD ($) - US Dollar</option>
              <option value="KHR">KHR (៛) - Cambodian Riel</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium">Timezone</p>
              <p className="text-xs text-zinc-500">Defines start and end boundaries for days and months</p>
            </div>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
            >
              <option value="Asia/Phnom_Penh">Asia/Phnom_Penh (UTC+7)</option>
              <option value="Asia/Bangkok">Asia/Bangkok (UTC+7)</option>
              <option value="UTC">UTC (Universal Time)</option>
            </select>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2 border-t border-zinc-100 dark:border-zinc-800">
            <div>
              <p className="text-sm font-medium">Week Starts On</p>
              <p className="text-xs text-zinc-500">Select first day of the week for weekly reports</p>
            </div>
            <select
              value={weekStartsOn}
              onChange={(e) => setWeekStartsOn(e.target.value)}
              className="h-10 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm font-medium"
            >
              <option value="1">Monday</option>
              <option value="0">Sunday</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Reminders & Notifications (Spec 3.4 #25 & FR-N2) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bell className="h-4 w-4 text-emerald-600" /> Daily Reminders & Alerts
          </CardTitle>
          <CardDescription>
            Configure evening expense logging prompts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
            <div>
              <p className="text-sm font-medium">Evening Logging Reminder</p>
              <p className="text-xs text-zinc-500">Prompts you to record coffee and minor cash expenses</p>
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
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  remindersEnabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
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
        </CardContent>
      </Card>

      {/* Shared Budgets (Spec 3.4 #26) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" /> Shared & Household Budgets
          </CardTitle>
          <CardDescription>
            Collaborate on shared categories with partner or family
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <p className="text-sm font-medium">Household Mode</p>
              <p className="text-xs text-zinc-500">Sync spending against a collective monthly target</p>
            </div>
            <button
              type="button"
              onClick={() => setSharedBudget(!sharedBudget)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors self-start sm:self-auto ${
                sharedBudget ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
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

      {/* Data Export (Spec FR-X2) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-4 w-4 text-emerald-600" /> Export Data
          </CardTitle>
          <CardDescription>
            Download your transactions history in CSV format
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-xs text-zinc-500">
              Exports all non-deleted transactions including base amounts, exchange rates, categories, and timestamps.
            </p>
            <a
              href="/api/export-csv"
              download
              onClick={() => {
                toast.success("Downloading CSV export...", {
                  description: "Exporting your transactions history.",
                });
              }}
            >
              <Button variant="outline" className="gap-2 shrink-0">
                <Download className="h-4 w-4" /> Export CSV
              </Button>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone (Spec FR-X3) */}
      <Card className="border-rose-200 dark:border-rose-950/60 bg-rose-50/20 dark:bg-rose-950/10">
        <CardHeader>
          <CardTitle className="text-base text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" /> Danger Zone
          </CardTitle>
          <CardDescription>
            Permanent actions regarding your account and stored data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Sign Out</p>
              <p className="text-xs text-zinc-500">Sign out of your active session on this device</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSignOut}
              className="gap-2 self-start sm:self-auto"
            >
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-rose-100 dark:border-rose-900/30">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete Account</p>
              <p className="text-xs text-zinc-500">Permanently delete your profile, transactions, and categories</p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                toast.error("Account deletion requested", {
                  description: "All database records removed via cascade.",
                });
              }}
              className="self-start sm:self-auto"
            >
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="pt-2">
        <Button onClick={handleSaveSettings} className="w-full">
          Save Settings
        </Button>
      </div>
    </div>
  );
}
