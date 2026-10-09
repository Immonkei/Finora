"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateForecast } from "@/lib/money";
import { getDaysPassedInMonth, getDaysLeftInMonth } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import { createClient } from "@/lib/supabase/client";

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
}

const DEFAULT_CATEGORY_BUDGETS: CatBudgetItem[] = [
  {
    name: "Food & Drinks",
    spentMinor: BigInt(12500),
    limitMinor: BigInt(20000),
    percent: 62.5,
  },
  {
    name: "Transport",
    spentMinor: BigInt(4800),
    limitMinor: BigInt(6000),
    percent: 80.0,
  },
  {
    name: "Housing & Bills",
    spentMinor: BigInt(5000),
    limitMinor: BigInt(5000),
    percent: 100.0,
  },
  {
    name: "Entertainment",
    spentMinor: BigInt(1700),
    limitMinor: BigInt(4000),
    percent: 42.5,
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
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spent So Far</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {formatMoney(spentThisMonthMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Budget: {formatMoney(totalMonthlyLimitMinor, "USD")} ({percentUsed}%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Average</CardDescription>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {formatMoney(averagePerDayMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Across past {daysPassed} days
            </p>
          </CardContent>
        </Card>

        <Card className={isOverspendRisk ? "border-rose-200 dark:border-rose-900" : ""}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>Month Forecast</CardDescription>
              {isOverspendRisk ? (
                <Badge variant="destructive" className="text-[10px]">At Risk</Badge>
              ) : (
                <Badge variant="default" className="text-[10px]">On Track</Badge>
              )}
            </div>
            <CardTitle className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
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

      {/* Overall Budget Progress */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Total Monthly Budget</CardTitle>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              {percentUsed}%
            </span>
          </div>
          <CardDescription>
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
            <span>Remaining: {formatMoney(totalMonthlyLimitMinor - spentThisMonthMinor, "USD")}</span>
            <span>{daysLeft} days remaining</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Budgets */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Category Budgets</CardTitle>
          <CardDescription>
            Green (&lt;80%), Yellow (80-100%), Red (&gt;100%)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {categoryBudgets.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">
                  {cat.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
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
                    className="text-[10px]"
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
  );
}
