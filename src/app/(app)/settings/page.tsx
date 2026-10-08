"use client";

import * as React from "react";
import { Download, Globe, Bell, Calendar, ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const [currency, setCurrency] = React.useState("USD");
  const [timezone, setTimezone] = React.useState("Asia/Phnom_Penh");
  const [weekStartsOn, setWeekStartsOn] = React.useState("1");

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

      {/* Localization & Currency (Spec FR-X1) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" /> Regional & Currency
          </CardTitle>
          <CardDescription>
            Choose your primary display currency and calculation timezone
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 py-2">
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
            <a href="/api/export-csv" download>
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
            <Button variant="outline" size="sm" className="gap-2 self-start sm:self-auto">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-rose-100 dark:border-rose-900/30">
            <div>
              <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Delete Account</p>
              <p className="text-xs text-zinc-500">Permanently delete your profile, transactions, and categories</p>
            </div>
            <Button variant="destructive" size="sm" className="self-start sm:self-auto">
              Delete All Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
