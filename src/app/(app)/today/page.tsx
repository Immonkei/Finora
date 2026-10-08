"use client";

import * as React from "react";
import { Plus, ArrowDownLeft, Sparkles, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateDailyAllowance } from "@/lib/money";
import { formatDisplayDate, getDaysLeftInMonth } from "@/lib/dates";
import { QuickAddDialog } from "@/features/transactions/components/quick-add-dialog";
import { useMounted } from "@/lib/hooks";

export default function TodayPage() {
  const [isAddOpen, setIsAddOpen] = React.useState(false);
  const isMounted = useMounted();
  const currentDate = isMounted ? new Date() : null;


  const daysLeft = currentDate ? getDaysLeftInMonth(currentDate) : 23;

  // Mock data for initial MVP view before live Supabase sync
  const monthlyBudgetMinor = BigInt(60000); // $600.00
  const monthlySpentMinor = BigInt(24000);  // $240.00
  const remainingBudgetMinor = monthlyBudgetMinor - monthlySpentMinor; // $360.00
  const dailyAllowanceMinor = calculateDailyAllowance(remainingBudgetMinor, daysLeft);
  const spentTodayMinor = BigInt(1450); // $14.50

  const todayTransactions = [
    {
      id: "1",
      note: "Iced Latte & Croissant",
      category: "Food & Drinks",
      categoryColor: "#EF4444",
      amountMinor: BigInt(450),
      type: "expense",
      time: "09:15 AM",
    },
    {
      id: "2",
      note: "Grab Taxi to Office",
      category: "Transport",
      categoryColor: "#3B82F6",
      amountMinor: BigInt(300),
      type: "expense",
      time: "10:30 AM",
    },
    {
      id: "3",
      note: "Lunch with Team",
      category: "Food & Drinks",
      categoryColor: "#EF4444",
      amountMinor: BigInt(700),
      type: "expense",
      time: "12:45 PM",
    },
  ];

  const allowanceUsedPercent =
    dailyAllowanceMinor > 0n
      ? Math.min(100, Math.round(Number((spentTodayMinor * 100n) / dailyAllowanceMinor)))
      : 100;

  const displayDateStr = currentDate
    ? formatDisplayDate(currentDate, "EEEE, MMMM d")
    : "Today";

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            {displayDateStr}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Today&apos;s Spending
          </h1>
        </div>
        <Button
          size="lg"
          onClick={() => setIsAddOpen(true)}
          className="w-full sm:w-auto shadow-md shadow-emerald-500/10"
        >
          <Plus className="h-5 w-5 mr-1" />
          Log Expense
        </Button>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Allowance Card */}
        <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-0 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10">
            <Sparkles className="h-32 w-32" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-emerald-100 text-xs font-semibold uppercase tracking-wider">
                Daily Allowance
              </span>
              <Badge variant="outline" className="border-emerald-300/40 text-emerald-100 text-xs">
                {daysLeft} days left
              </Badge>
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              {formatMoney(dailyAllowanceMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-emerald-100 mb-3">
              Remaining this month: {formatMoney(remainingBudgetMinor, "USD")}
            </p>
            <div className="w-full bg-emerald-950/40 rounded-full h-2 overflow-hidden">
              <div
                className="bg-white h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, allowanceUsedPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-emerald-100/90 mt-1.5 font-medium">
              <span>Spent today: {formatMoney(spentTodayMinor, "USD")}</span>
              <span>{allowanceUsedPercent}% of daily budget</span>
            </div>
          </CardContent>
        </Card>

        {/* Spent Today Overview */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold uppercase tracking-wider">
                Total Spent Today
              </span>
              <Badge variant="secondary" className="text-xs">
                {todayTransactions.length} items
              </Badge>
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
              {formatMoney(spentTodayMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-zinc-400" /> Primary Account
              </span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">Cash (USD)</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-zinc-400" /> Month Status
              </span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                On Track (40% used)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Transactions List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div>
            <CardTitle className="text-base font-semibold">Today&apos;s Activity</CardTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              Expenses and transfers logged today
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {todayTransactions.length} logged
          </Badge>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800 p-0">
          {todayTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: tx.categoryColor }}
                >
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {tx.note}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {tx.category}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-xs text-zinc-400">{tx.time}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  -{formatMoney(tx.amountMinor, "USD")}
                </p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <QuickAddDialog
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
      />
    </div>
  );
}
