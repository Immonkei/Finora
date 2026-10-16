"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateForecast } from "@/lib/money";
import { getDaysPassedInMonth, getDaysLeftInMonth } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";
import {
  BudgetPaceAreaChart,
  CategoryDonutChart,
  generateBudgetPaceData,
  transformCategoryChartData,
} from "@/components/charts";

interface RpcCategorySpending {
  category_id: string;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  total: number | string;
}

interface CatBudgetItem {
  name: string;
  spentMinor: bigint;
  limitMinor: bigint;
  percent: number;
  color?: string | null;
}

const DEFAULT_CATEGORY_BUDGETS: CatBudgetItem[] = [
  {
    name: "Food & Drinks",
    spentMinor: BigInt(12500),
    limitMinor: BigInt(20000),
    percent: 62.5,
    color: "#4fa3b3",
  },
  {
    name: "Transport",
    spentMinor: BigInt(4800),
    limitMinor: BigInt(6000),
    percent: 80.0,
    color: "#1b4d72",
  },
  {
    name: "Housing & Bills",
    spentMinor: BigInt(5000),
    limitMinor: BigInt(5000),
    percent: 100.0,
    color: "#f59e0b",
  },
  {
    name: "Entertainment",
    spentMinor: BigInt(1700),
    limitMinor: BigInt(4000),
    percent: 42.5,
    color: "#8b5cf6",
  },
];

export default function MonthPage() {
  const isMounted = useMounted();
  const currentDate = isMounted ? new Date() : null;

  const [liveData, setLiveData] = React.useState<{
    spentThisMonthMinor: bigint;
    totalMonthlyLimitMinor: bigint;
    categoryBudgets: CatBudgetItem[];
  } | null>(null);

  React.useEffect(() => {
    async function loadMonthData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const endOfMonth = new Date(
          now.getFullYear(),
          now.getMonth() + 1,
          0,
          23,
          59,
          59,
          999
        ).toISOString();

        // Spec 7.2: Math in SQL via RPC spending_by_category
        const { data: catData } = await supabase.rpc("spending_by_category", {
          p_from: startOfMonth,
          p_to: endOfMonth,
        });

        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const { data: budget } = await supabase
          .from("budgets")
          .select("total_limit")
          .eq("user_id", user.id)
          .eq("month", currentMonthStr)
          .maybeSingle();

        const limit = budget ? BigInt(budget.total_limit) : BigInt(60000);

        let totalSpent = BigInt(0);
        const mapped: CatBudgetItem[] = ((catData as unknown as RpcCategorySpending[]) || []).map((c) => {
          const spent = BigInt(c.total);
          totalSpent += spent;
          const catLimit = BigInt(15000);
          const pct = Number((spent * 100n) / catLimit);
          return {
            name: c.category_name,
            spentMinor: spent,
            limitMinor: catLimit,
            percent: Math.round(pct * 10) / 10,
            color: c.category_color,
          };
        });

        setLiveData({
          spentThisMonthMinor: totalSpent,
          totalMonthlyLimitMinor: limit,
          categoryBudgets: mapped.length > 0 ? mapped : DEFAULT_CATEGORY_BUDGETS,
        });
      } catch {
        // Fallback
      }
    }
    loadMonthData();
  }, []);

  const daysPassed = currentDate ? getDaysPassedInMonth(currentDate) : 8;
  const daysLeft = currentDate ? getDaysLeftInMonth(currentDate) : 23;
  const daysInMonth = currentDate
    ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    : 31;
  const monthName = currentDate
    ? currentDate.toLocaleDateString("en-US", { month: "short" })
    : "Oct";

  const totalMonthlyLimitMinor = liveData ? liveData.totalMonthlyLimitMinor : BigInt(60000);
  const spentThisMonthMinor = liveData ? liveData.spentThisMonthMinor : BigInt(24000);
  const categoryBudgets = liveData ? liveData.categoryBudgets : DEFAULT_CATEGORY_BUDGETS;

  const { forecastMinor, averagePerDayMinor } = calculateForecast(
    spentThisMonthMinor,
    daysPassed,
    daysLeft
  );

  const isOverspendRisk = forecastMinor > totalMonthlyLimitMinor;
  const percentUsed = Number((spentThisMonthMinor * 100n) / totalMonthlyLimitMinor);

  // Helper for Spec FR-B2: accent below 80%, yellow from 80% to 100%, red above 100%
  const getBudgetColor = (percent: number) => {
    if (percent < 80) return "bg-accent-500";
    if (percent <= 100) return "bg-amber-500";
    return "bg-rose-500";
  };

  const paceData = generateBudgetPaceData({
    daysInMonth,
    currentDay: daysPassed,
    spentSoFarMinor: spentThisMonthMinor,
    totalBudgetMinor: totalMonthlyLimitMinor,
    currency: "USD",
    monthName,
  });

  const donutData = transformCategoryChartData(
    categoryBudgets.map((c) => ({
      name: c.name,
      spentMinor: c.spentMinor,
      color: c.color,
    })),
    "USD"
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
          Monthly Analytics & Budgets
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          This Month
        </h1>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Spent So Far</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(spentThisMonthMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              Budget: {formatMoney(totalMonthlyLimitMinor, "USD")} ({percentUsed}%)
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Daily Average</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(averagePerDayMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Across past {daysPassed} days
            </p>
          </CardContent>
        </Card>

        <Card className={`border-zinc-200/80 dark:border-zinc-800/80 shadow-xs ${isOverspendRisk ? "border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-500/20" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Month Forecast</CardDescription>
              {isOverspendRisk ? (
                <Badge variant="destructive" className="text-[10px] font-semibold">At Risk</Badge>
              ) : (
                <Badge variant="default" className="text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-700">On Track</Badge>
              )}
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(forecastMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isOverspendRisk
                ? "Paced to exceed monthly budget"
                : "Expected to finish safely under budget"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Pace Trajectory Area Chart */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <CardTitle className="text-base font-semibold">Spending Pace Trajectory</CardTitle>
              <CardDescription>
                Cumulative spending vs ideal linear pace and end-of-month projection
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <Badge
                variant={isOverspendRisk ? "destructive" : "secondary"}
                className={`text-[11px] font-bold ${!isOverspendRisk ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80" : ""}`}
              >
                {isOverspendRisk ? "Ahead of Pace (Risk)" : "On Ideal Pace"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <BudgetPaceAreaChart data={paceData} currency="USD" />
        </CardContent>
      </Card>

      {/* Overall Budget Progress */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Total Monthly Budget</CardTitle>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {percentUsed}%
            </span>
          </div>
          <CardDescription className="tabular-nums">
            {formatMoney(spentThisMonthMinor, "USD")} of {formatMoney(totalMonthlyLimitMinor, "USD")} spent
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-3 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${getBudgetColor(percentUsed)}`}
              style={{ width: `${Math.min(100, percentUsed)}%` }}
            />
          </div>
          <div className="flex justify-between items-center text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-medium">
            <span className="tabular-nums">Remaining: {formatMoney(totalMonthlyLimitMinor - spentThisMonthMinor, "USD")}</span>
            <span className="tabular-nums">{daysLeft} days remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown & Budgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Recharts Category Donut Chart */}
        <Card className="lg:col-span-6 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Breakdown</CardTitle>
            <CardDescription>
              Hover slices to inspect detailed category share
            </CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart
              data={donutData}
              totalSpentMinor={spentThisMonthMinor}
              currency="USD"
            />
          </CardContent>
        </Card>

        {/* Category Budget Limits with Alerts */}
        <Card className="lg:col-span-6 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Category Budgets</CardTitle>
            <CardDescription>
              Green (&lt;80%), Yellow (80-100%), Red (&gt;100%)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBudgets.map((cat) => (
              <div key={cat.name} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {cat.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                      {formatMoney(cat.spentMinor, "USD")} / {formatMoney(cat.limitMinor, "USD")}
                    </span>
                    <Badge
                      variant={
                        cat.percent >= 100
                          ? "destructive"
                          : cat.percent >= 80
                          ? "warning"
                          : "secondary"
                      }
                      className="text-[10px] tabular-nums"
                    >
                      {cat.percent}%
                    </Badge>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${getBudgetColor(cat.percent)}`}
                    style={{ width: `${Math.min(100, cat.percent)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
