"use client";

import * as React from "react";
import {
  Flame,
  Coffee,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Globe,
  Award,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, toMinorUnits } from "@/lib/money";
import { detectSpendingLeaks, type LeakTransaction } from "@/features/reports/leak-detector";
import { calculateStreaks } from "@/features/reports/streaks";
import { createClient } from "@/lib/supabase/client";

const DEFAULT_TRANSACTIONS: LeakTransaction[] = [
  { note: "Iced Latte", baseAmountMinor: BigInt(250), categoryName: "Food & Drinks", categoryColor: "#EF4444" },
  { note: "Iced Latte", baseAmountMinor: BigInt(250), categoryName: "Food & Drinks", categoryColor: "#EF4444" },
  { note: "Iced Latte", baseAmountMinor: BigInt(300), categoryName: "Food & Drinks", categoryColor: "#EF4444" },
  { note: "Iced Latte", baseAmountMinor: BigInt(250), categoryName: "Food & Drinks", categoryColor: "#EF4444" },
  { note: "Iced Latte", baseAmountMinor: BigInt(250), categoryName: "Food & Drinks", categoryColor: "#EF4444" },
  { note: "Grab Bike Short Ride", baseAmountMinor: BigInt(150), categoryName: "Transport", categoryColor: "#3B82F6" },
  { note: "Grab Bike Short Ride", baseAmountMinor: BigInt(150), categoryName: "Transport", categoryColor: "#3B82F6" },
  { note: "Grab Bike Short Ride", baseAmountMinor: BigInt(180), categoryName: "Transport", categoryColor: "#3B82F6" },
  { note: "Vending Machine Drink", baseAmountMinor: BigInt(120), categoryName: "Food & Drinks", categoryColor: "#F59E0B" },
  { note: "Vending Machine Drink", baseAmountMinor: BigInt(120), categoryName: "Food & Drinks", categoryColor: "#F59E0B" },
];

export default function InsightsPage() {
  const [currencyMode, setCurrencyMode] = React.useState<"USD" | "KHR">("USD");
  const [leakThreshold, setLeakThreshold] = React.useState<number>(5.0);
  const [liveTransactions, setLiveTransactions] = React.useState<LeakTransaction[] | null>(null);

  React.useEffect(() => {
    async function loadInsightsData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data } = await supabase
          .from("transactions")
          .select("note, base_amount, categories(name, color)")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .is("deleted_at", null)
          .order("occurred_at", { ascending: false })
          .limit(100);

        if (data && data.length > 0) {
          const mapped: LeakTransaction[] = data.map((t) => {
            const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
            return {
              note: t.note || "Expense",
              baseAmountMinor: BigInt(t.base_amount),
              categoryName: cat?.name || "Uncategorized",
              categoryColor: cat?.color || "#EF4444",
            };
          });
          setLiveTransactions(mapped);
        }
      } catch {
        // Fallback
      }
    }
    loadInsightsData();
  }, []);

  const activeTransactions = liveTransactions ?? DEFAULT_TRANSACTIONS;
  const leaks = detectSpendingLeaks(
    activeTransactions,
    toMinorUnits(leakThreshold, "USD")
  );

  // Streak history
  const streakDays = [
    { date: "2026-10-02", spentMinor: BigInt(1200), allowanceMinor: BigInt(1500) },
    { date: "2026-10-03", spentMinor: BigInt(0), allowanceMinor: BigInt(1500) },
    { date: "2026-10-04", spentMinor: BigInt(850), allowanceMinor: BigInt(1500) },
    { date: "2026-10-05", spentMinor: BigInt(1400), allowanceMinor: BigInt(1500) },
    { date: "2026-10-06", spentMinor: BigInt(0), allowanceMinor: BigInt(1500) },
    { date: "2026-10-07", spentMinor: BigInt(950), allowanceMinor: BigInt(1500) },
    { date: "2026-10-08", spentMinor: BigInt(1450), allowanceMinor: BigInt(1565) },
  ];

  const streakStats = calculateStreaks(streakDays);

  // Period comparisons
  const thisMonthSpent = BigInt(24000); // $240.00
  const lastMonthSpent = BigInt(27500); // $275.00
  const monthlySavingsMinor = lastMonthSpent - thisMonthSpent;
  const isMonthSaved = monthlySavingsMinor > 0n;
  const percentChange = Math.abs(
    Math.round(Number((monthlySavingsMinor * 100n) / lastMonthSpent))
  );

  // Currency multiplier (1 USD = 4,000 KHR)
  const formatInsightMoney = (minorUnits: bigint) => {
    if (currencyMode === "KHR") {
      // Convert USD cents to KHR riel (x40)
      const khrRiel = minorUnits * 40n;
      return formatMoney(khrRiel, "KHR");
    }
    return formatMoney(minorUnits, "USD");
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Phase 3 Intelligence
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Spending Insights
          </h1>
        </div>

        {/* Multi-Currency Toggle (Spec 3.3 #19) */}
        <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl self-start sm:self-auto">
          <button
            onClick={() => setCurrencyMode("USD")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              currencyMode === "USD"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            }`}
          >
            USD ($)
          </button>
          <button
            onClick={() => setCurrencyMode("KHR")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              currencyMode === "KHR"
                ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-50 shadow-sm"
                : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
            }`}
          >
            KHR (៛)
          </button>
        </div>
      </div>

      {/* Streaks Banner (Spec 3.3 #20) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 to-orange-600 text-white border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-100 uppercase tracking-wider">
                Under-Budget Streak
              </span>
              <Flame className="h-5 w-5 text-amber-200" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              {streakStats.currentUnderBudgetStreak} Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-100">
              Personal best: {streakStats.longestStreak} consecutive days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>No-Spend Days</CardDescription>
              <Award className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
              {streakStats.noSpendDaysCount} Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Zero expense days logged this week
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Period Delta</CardDescription>
              {isMonthSaved ? (
                <Badge variant="default" className="text-[10px] gap-1">
                  <TrendingDown className="h-3 w-3" /> -{percentChange}%
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] gap-1">
                  <TrendingUp className="h-3 w-3" /> +{percentChange}%
                </Badge>
              )}
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1">
              {formatInsightMoney(monthlySavingsMinor)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isMonthSaved ? "Saved compared to last month" : "Increase vs last month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Leaks Detector (Spec 3.3 #16 & 9.3) */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Coffee className="h-4 w-4 text-amber-600" /> Spending Leak Detector
              </CardTitle>
              <CardDescription>
                Frequent minor purchases (&lt;${leakThreshold.toFixed(0)}) that quietly add up
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-zinc-500">Threshold:</span>
              {[3, 5, 10].map((val) => (
                <button
                  key={val}
                  onClick={() => setLeakThreshold(val)}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                    leakThreshold === val
                      ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  }`}
                >
                  &lt;${val}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {leaks.length === 0 ? (
            <p className="text-sm text-zinc-500 p-4 text-center">
              No repeated spending leaks detected below this threshold!
            </p>
          ) : (
            leaks.map((leak) => (
              <div
                key={leak.title}
                className="p-4 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: leak.categoryColor }}
                  >
                    <Coffee className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                        {leak.title}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        {leak.count}x repeated
                      </Badge>
                    </div>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                      Category: {leak.category}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0">
                  <div className="text-left sm:text-right">
                    <p className="text-xs text-zinc-400">Monthly Total</p>
                    <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                      {formatInsightMoney(leak.totalMinor)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-400">Annual Projection</p>
                    <p className="font-extrabold text-sm text-rose-600 dark:text-rose-400">
                      {formatInsightMoney(leak.projectedAnnualMinor)} / yr
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Multi-Currency Exchange Rate Info (Spec 3.3 #19 & 9.4) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-emerald-600" /> Multi-Currency Valuation
          </CardTitle>
          <CardDescription>
            Stored exchange rate transparency for dual-currency economies
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>Active Exchange Rate</span>
                <Badge variant="outline" className="text-[10px]">Live</Badge>
              </div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                1 USD = 4,000 KHR
              </p>
              <p className="text-xs text-zinc-500">
                Transactions in Riel are computed into base USD minor units without altering previous historical conversions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>Monthly Budget in Dual-Currency</span>
                <Badge variant="secondary" className="text-[10px]">$600 Limit</Badge>
              </div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                2,400,000 ៛ (KHR)
              </p>
              <p className="text-xs text-zinc-500">
                Remaining daily allowance in KHR: ~62,600 ៛ / day.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
