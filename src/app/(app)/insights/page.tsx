"use client";

import * as React from "react";
import {
  Flame,
  Coffee,
  TrendingDown,
  TrendingUp,
  Globe,
  Award,
  Calendar,
  FileText,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  formatMoney,
  toMinorUnits,
  convertUsdToKhrMinor,
  DEFAULT_USD_TO_KHR_RATE,
} from "@/lib/money";
import { detectSpendingLeaks, type LeakTransaction } from "@/features/reports/leak-detector";
import { calculateStreaks } from "@/features/reports/streaks";
import { createClient } from "@/lib/supabase/client";
import { CategoryDonutChart, transformCategoryChartData } from "@/components/charts";
import { SpendingHeatmap, type DaySpendingData } from "@/features/reports/components/spending-heatmap";
import { FinancialHealthCard } from "@/features/reports/components/financial-health-card";
import { calculateFinancialHealthScore } from "@/features/reports/health-score";
import { MonthlyStatementModal } from "@/features/reports/components/monthly-statement-modal";

export default function InsightsPage() {
  const [currencyMode, setCurrencyMode] = React.useState<"USD" | "KHR">("USD");
  const [leakThreshold, setLeakThreshold] = React.useState<number>(5.0);
  const [liveTransactions, setLiveTransactions] = React.useState<LeakTransaction[] | null>(null);
  const [liveStreakDays, setLiveStreakDays] = React.useState<{ date: string; spentMinor: bigint; allowanceMinor: bigint }[]>([]);
  const [liveThisMonthSpent, setLiveThisMonthSpent] = React.useState<bigint>(0n);
  const [liveLastMonthSpent, setLiveLastMonthSpent] = React.useState<bigint>(0n);
  const [liveMonthlyBudget, setLiveMonthlyBudget] = React.useState<bigint>(0n);
  const [heatmapData, setHeatmapData] = React.useState<Record<string, DaySpendingData>>({});
  const [activeGoalsCount, setActiveGoalsCount] = React.useState<number>(0);
  const [completedGoalsCount, setCompletedGoalsCount] = React.useState<number>(0);
  const [monthDayInfo, setMonthDayInfo] = React.useState({ daysInMonth: 30, currentDay: 15 });
  const [isStatementOpen, setIsStatementOpen] = React.useState(false);

  React.useEffect(() => {
    async function loadInsightsData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        setMonthDayInfo({
          daysInMonth: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
          currentDay: now.getDate(),
        });
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

        // 1. Current Budget
        const { data: budget } = await supabase
          .from("budgets")
          .select("total_limit")
          .eq("user_id", user.id)
          .eq("month", currentMonthStr)
          .maybeSingle();

        const budgetLimit = budget ? BigInt(budget.total_limit) : 0n;
        setLiveMonthlyBudget(budgetLimit);

        // 2. Transactions for Leaks & Streaks
        const { data } = await supabase
          .from("transactions")
          .select("note, base_amount, occurred_at, categories(name, color)")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .is("deleted_at", null)
          .order("occurred_at", { ascending: false })
          .limit(100);

        if (data) {
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

          // Calculate last 7 days streaks
          const daysMap: Record<string, bigint> = {};
          const dailyTargetMinor = budgetLimit > 0n ? budgetLimit / 30n : 1500n;

          for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const key = d.toISOString().slice(0, 10);
            daysMap[key] = 0n;
          }

          data.forEach((t) => {
            const dateKey = t.occurred_at.slice(0, 10);
            if (daysMap[dateKey] !== undefined) {
              daysMap[dateKey] += BigInt(t.base_amount);
            }
          });

          const builtDays = Object.entries(daysMap).map(([date, spentMinor]) => ({
            date,
            spentMinor,
            allowanceMinor: dailyTargetMinor,
          }));

          setLiveStreakDays(builtDays);
        } else {
          setLiveTransactions([]);
          setLiveStreakDays([]);
        }

        // 3. Monthly comparisons
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).toISOString();

        const { data: thisMonthTxs } = await supabase
          .from("transactions")
          .select("base_amount")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .is("deleted_at", null)
          .gte("occurred_at", startOfThisMonth);

        let thisTotal = 0n;
        if (thisMonthTxs) {
          thisMonthTxs.forEach((t) => {
            thisTotal += BigInt(t.base_amount);
          });
        }
        setLiveThisMonthSpent(thisTotal);

        const { data: lastMonthTxs } = await supabase
          .from("transactions")
          .select("base_amount")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .is("deleted_at", null)
          .gte("occurred_at", startOfLastMonth)
          .lte("occurred_at", endOfLastMonth);

        let lastTotal = 0n;
        if (lastMonthTxs) {
          lastMonthTxs.forEach((t) => {
            lastTotal += BigInt(t.base_amount);
          });
        }
        setLiveLastMonthSpent(lastTotal);

        // 4. Past 365 Days Transactions for Heatmap
        const oneYearAgo = new Date();
        oneYearAgo.setDate(oneYearAgo.getDate() - 365);

        const { data: yearTxs } = await supabase
          .from("transactions")
          .select("base_amount, occurred_at")
          .eq("user_id", user.id)
          .eq("type", "expense")
          .is("deleted_at", null)
          .gte("occurred_at", oneYearAgo.toISOString());

        const hMap: Record<string, DaySpendingData> = {};
        if (yearTxs) {
          yearTxs.forEach((t) => {
            const dStr = t.occurred_at.slice(0, 10);
            if (!hMap[dStr]) {
              hMap[dStr] = { date: dStr, spentMinor: 0n, count: 0 };
            }
            hMap[dStr].spentMinor += BigInt(t.base_amount);
            hMap[dStr].count += 1;
          });
        }
        setHeatmapData(hMap);

        // 5. Savings Goals for Health Score
        const { data: goalsData } = await supabase
          .from("savings_goals")
          .select("saved_amount, target_amount")
          .eq("user_id", user.id);

        let activeG = 0;
        let completedG = 0;
        if (goalsData) {
          goalsData.forEach((g) => {
            if (BigInt(g.saved_amount) >= BigInt(g.target_amount)) {
              completedG++;
            } else {
              activeG++;
            }
          });
        }
        setActiveGoalsCount(activeG);
        setCompletedGoalsCount(completedG);
      } catch {
        setLiveTransactions([]);
        setLiveStreakDays([]);
        setLiveThisMonthSpent(0n);
        setLiveLastMonthSpent(0n);
        setLiveMonthlyBudget(0n);
        setHeatmapData({});
      }
    }
    loadInsightsData();
  }, []);

  const activeTransactions = liveTransactions ?? [];
  const leaks = detectSpendingLeaks(
    activeTransactions,
    toMinorUnits(leakThreshold, "USD")
  );

  const streakStats = calculateStreaks(liveStreakDays);

  const healthScore = React.useMemo(() => {
    return calculateFinancialHealthScore({
      monthlyBudgetMinor: liveMonthlyBudget,
      monthlySpentMinor: liveThisMonthSpent,
      daysInMonth: monthDayInfo.daysInMonth,
      currentDay: monthDayInfo.currentDay,
      leaksCount: leaks.length,
      currentStreakDays: streakStats.currentUnderBudgetStreak,
      noSpendDaysCount: streakStats.noSpendDaysCount,
      activeGoalsCount,
      completedGoalsCount,
    });
  }, [
    liveMonthlyBudget,
    liveThisMonthSpent,
    monthDayInfo.daysInMonth,
    monthDayInfo.currentDay,
    leaks.length,
    streakStats.currentUnderBudgetStreak,
    streakStats.noSpendDaysCount,
    activeGoalsCount,
    completedGoalsCount,
  ]);

  const thisMonthSpent = liveThisMonthSpent;
  const lastMonthSpent = liveLastMonthSpent;
  const monthlySavingsMinor = lastMonthSpent - thisMonthSpent;
  const isMonthSaved = monthlySavingsMinor >= 0n;
  const percentChange =
    lastMonthSpent > 0n
      ? Math.abs(Math.round(Number((monthlySavingsMinor * 100n) / lastMonthSpent)))
      : 0;

  // Currency multiplier (1 USD = 4,000 KHR)
  const formatInsightMoney = (minorUnits: bigint) => {
    if (currencyMode === "KHR") {
      // Convert USD cents to KHR riel (x40)
      const khrRiel = minorUnits * 40n;
      return formatMoney(khrRiel, "KHR");
    }
    return formatMoney(minorUnits, "USD");
  };

  const totalLeakMinor = React.useMemo(() => {
    return leaks.reduce((acc, l) => {
      const converted =
        currencyMode === "KHR" ? convertUsdToKhrMinor(l.totalMinor) : l.totalMinor;
      return acc + converted;
    }, 0n);
  }, [leaks, currencyMode]);

  const leakChartData = React.useMemo(() => {
    return transformCategoryChartData(
      leaks.map((l) => ({
        name: l.title,
        spentMinor:
          currencyMode === "KHR" ? convertUsdToKhrMinor(l.totalMinor) : l.totalMinor,
        color: l.categoryColor,
      })),
      currencyMode
    );
  }, [leaks, currencyMode]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            Trends &amp; Analytics
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Spending Insights
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {/* Multi-Currency Toggle (Spec 3.3 #19) */}
          <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
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

          <Button
            onClick={() => setIsStatementOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 font-semibold text-xs border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/50 shadow-xs h-9"
          >
            <FileText className="w-4 h-4 text-brand-600 dark:text-accent-400" />
            <span className="hidden sm:inline">Export Statement</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {/* Streaks Banner (Spec 3.3 #20) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-amber-500 via-amber-600 to-orange-600 text-white border-0 shadow-lg relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-100 uppercase tracking-wider">
                Under-Budget Streak
              </span>
              <Flame className="h-5 w-5 text-amber-200" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-white mt-1.5 tabular-nums tracking-tight">
              {streakStats.currentUnderBudgetStreak} Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-amber-100/90 font-medium">
              Personal best: {streakStats.longestStreak} consecutive days
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">No-Spend Days</CardDescription>
              <Award className="h-5 w-5 text-accent-500" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1.5 tabular-nums tracking-tight">
              {streakStats.noSpendDaysCount} Days
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Zero expense days logged this week
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Period Delta</CardDescription>
              {lastMonthSpent === 0n ? (
                <Badge variant="secondary" className="text-[10px] font-semibold">
                  New Baseline
                </Badge>
              ) : isMonthSaved ? (
                <Badge variant="default" className="text-[10px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-700">
                  <TrendingDown className="h-3 w-3" /> -{percentChange}%
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-[10px] font-semibold gap-1">
                  <TrendingUp className="h-3 w-3" /> +{percentChange}%
                </Badge>
              )}
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1.5 tabular-nums tracking-tight">
              {formatInsightMoney(monthlySavingsMinor >= 0n ? monthlySavingsMinor : -monthlySavingsMinor)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {lastMonthSpent === 0n
                ? "First active month tracking"
                : isMonthSaved
                ? "Saved compared to last month"
                : "Increase vs last month"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Score (Spec 3.3 Enhanced) */}
      <FinancialHealthCard health={healthScore} />

      {/* 365-Day Spending Heatmap Calendar */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-500" />
            365-Day Spending Heatmap
          </CardTitle>
          <CardDescription>
            Daily financial tracking activity and habit discipline across the past 52 weeks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SpendingHeatmap data={heatmapData} currencyMode={currencyMode} />
        </CardContent>
      </Card>

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
        <CardContent>
          {leaks.length === 0 ? (
            <p className="text-sm text-zinc-500 p-4 text-center">
              No repeated spending leaks detected below this threshold!
            </p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-2xl border border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-900/40">
                <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-2 self-start">
                  Leak Distribution Share
                </p>
                <CategoryDonutChart
                  data={leakChartData}
                  totalSpentMinor={totalLeakMinor}
                  currency={currencyMode}
                  className="w-full"
                />
              </div>

              <div className="lg:col-span-7 space-y-3">
                {leaks.map((leak) => (
                  <div
                    key={leak.title}
                    className="p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3.5">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0"
                        style={{ backgroundColor: leak.categoryColor }}
                      >
                        <Coffee className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 truncate">
                            {leak.title}
                          </p>
                          <Badge variant="secondary" className="text-[10px] shrink-0">
                            {leak.count}x repeated
                          </Badge>
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                          Category: {leak.category}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-6 border-t sm:border-t-0 pt-2 sm:pt-0 shrink-0">
                      <div className="text-left sm:text-right">
                        <p className="text-xs text-zinc-400">Monthly Total</p>
                        <p className="font-bold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums">
                          {formatInsightMoney(leak.totalMinor)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-zinc-400">Annual Projection</p>
                        <p className="font-extrabold text-sm text-rose-600 dark:text-rose-400 tabular-nums">
                          {formatInsightMoney(leak.projectedAnnualMinor)} / yr
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Multi-Currency Exchange Rate Info (Spec 3.3 #19 & 9.4) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4 text-brand-600 dark:text-accent-400" /> Multi-Currency Valuation
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
                1 USD = {DEFAULT_USD_TO_KHR_RATE.toLocaleString()} KHR
              </p>
              <p className="text-xs text-zinc-500">
                Transactions in Riel are computed into base USD minor units without altering previous historical conversions.
              </p>
            </div>

            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 space-y-2">
              <div className="flex justify-between items-center text-xs text-zinc-500">
                <span>Monthly Budget in Dual-Currency</span>
                <Badge variant="secondary" className="text-[10px]">
                  {liveMonthlyBudget > 0n
                    ? `${formatMoney(liveMonthlyBudget, "USD")} Limit`
                    : "No Budget Set"}
                </Badge>
              </div>
              <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {formatMoney(convertUsdToKhrMinor(liveMonthlyBudget), "KHR")}
              </p>
              <p className="text-xs text-zinc-500">
                {liveMonthlyBudget > 0n
                  ? `Daily allowance target in KHR: ~${formatMoney(convertUsdToKhrMinor(liveMonthlyBudget) / 30n, "KHR")} / day.`
                  : "Set a monthly budget to see your daily allowance calculated in Cambodian Riel."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <MonthlyStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
      />
    </div>
  );
}
