"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateForecast, formatKhrApproximation } from "@/lib/money";
import { getDaysPassedInMonth, getDaysLeftInMonth } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import { useLocale, useT } from "@/lib/i18n";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Sparkles } from "lucide-react";
import { MonthlyStatementModal } from "@/features/reports/components/monthly-statement-modal";
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

function MonthSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>

      <Skeleton className="h-64 w-full rounded-2xl" />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Skeleton className="h-72 w-full rounded-2xl" />
        <Skeleton className="h-72 w-full rounded-2xl" />
      </div>
    </div>
  );
}

export default function MonthPage() {
  const t = useT("month");
  const { dateLocale } = useLocale();
  const isMounted = useMounted();
  const currentDate = isMounted ? new Date() : null;

  const [liveData, setLiveData] = React.useState<{
    spentThisMonthMinor: bigint;
    totalMonthlyLimitMinor: bigint;
    categoryBudgets: CatBudgetItem[];
  } | null>(null);
  const [isStatementOpen, setIsStatementOpen] = React.useState(false);

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

        const { data: dbCategories } = await supabase
          .from("categories")
          .select("id, name, color, icon, monthly_budget")
          .eq("user_id", user.id);

        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        const { data: budget } = await supabase
          .from("budgets")
          .select("total_limit")
          .eq("user_id", user.id)
          .eq("month", currentMonthStr)
          .maybeSingle();

        const limit = budget ? BigInt(budget.total_limit) : 0n;

        const catSpentMap = new Map<string, bigint>();
        let totalSpent = BigInt(0);
        ((catData as unknown as RpcCategorySpending[]) || []).forEach((c) => {
          const spent = BigInt(c.total);
          totalSpent += spent;
          catSpentMap.set(c.category_name, spent);
        });

        // Include categories that have an active monthly budget or had spending this month
        const activeCategories = (dbCategories || []).filter(
          (c) => (c.monthly_budget !== null && c.monthly_budget > 0) || catSpentMap.has(c.name)
        );

        const mapped: CatBudgetItem[] = activeCategories.map((c) => {
          const spent = catSpentMap.get(c.name) || 0n;
          const catLimit = BigInt(c.monthly_budget || 0);
          const pct = catLimit > 0n ? Number((spent * 100n) / catLimit) : 0;
          return {
            name: c.name,
            spentMinor: spent,
            limitMinor: catLimit,
            percent: Math.round(pct * 10) / 10,
            color: c.color,
          };
        });

        setLiveData({
          spentThisMonthMinor: totalSpent,
          totalMonthlyLimitMinor: limit,
          categoryBudgets: mapped,
        });
      } catch {
        setLiveData({
          spentThisMonthMinor: 0n,
          totalMonthlyLimitMinor: 0n,
          categoryBudgets: [],
        });
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
    ? format(currentDate, "MMM", { locale: dateLocale })
    : "Oct";

  const totalMonthlyLimitMinor = liveData ? liveData.totalMonthlyLimitMinor : 0n;
  const spentThisMonthMinor = liveData ? liveData.spentThisMonthMinor : 0n;
  const categoryBudgets = liveData ? liveData.categoryBudgets : [];

  const { forecastMinor, averagePerDayMinor } = calculateForecast(
    spentThisMonthMinor,
    daysPassed,
    daysLeft
  );

  const isOverspendRisk = totalMonthlyLimitMinor > 0n && forecastMinor > totalMonthlyLimitMinor;
  const percentUsed =
    totalMonthlyLimitMinor > 0n
      ? Math.round(Number((spentThisMonthMinor * 100n) / totalMonthlyLimitMinor))
      : 0;

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

  if (!liveData) {
    return <MonthSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
        </div>

        <div className="mobile-scroll-x flex items-center gap-2 flex-wrap">
          <Link href="/settings#categories">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-brand-600 dark:text-accent-400" />
              <span className="whitespace-nowrap">{t("categoriesRollover")}</span>
            </Button>
          </Link>

          <Button
            onClick={() => setIsStatementOpen(true)}
            variant="outline"
            size="sm"
            className="gap-2 font-semibold text-xs border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-950/50 shadow-xs"
          >
            <FileText className="w-4 h-4 text-brand-600 dark:text-accent-400" />
            <span className="whitespace-nowrap">{t("exportStatement")}</span>
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mobile-carousel grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t("spentSoFar")}</CardDescription>
            <CardTitle className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(spentThisMonthMinor, "USD")}
            </CardTitle>
            <p className="text-[11px] text-zinc-400 tabular-nums">
              {formatKhrApproximation(spentThisMonthMinor)}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {t("budgetLine", {
                amount: formatMoney(totalMonthlyLimitMinor, "USD"),
                percent: percentUsed,
              })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t("dailyAverage")}</CardDescription>
            <CardTitle className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(averagePerDayMinor, "USD")}
            </CardTitle>
            <p className="text-[11px] text-zinc-400 tabular-nums">
              {t("perDay", { amount: formatKhrApproximation(averagePerDayMinor) })}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("acrossPastDays", { count: daysPassed })}
            </p>
          </CardContent>
        </Card>

        <Card className={`border-zinc-200/80 dark:border-zinc-800/80 shadow-xs ${isOverspendRisk ? "border-rose-300 dark:border-rose-900/80 ring-1 ring-rose-500/20" : ""}`}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 min-w-0">{t("monthForecast")}</CardDescription>
              {isOverspendRisk ? (
                <Badge variant="destructive" className="text-[10px] font-semibold whitespace-nowrap shrink-0">{t("atRisk")}</Badge>
              ) : (
                <Badge variant="default" className="text-[10px] font-semibold whitespace-nowrap shrink-0 bg-emerald-600 hover:bg-emerald-700">{t("onTrack")}</Badge>
              )}
            </div>
            <CardTitle className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(forecastMinor, "USD")}
            </CardTitle>
            <p className="text-[11px] text-zinc-400 tabular-nums">
              {formatKhrApproximation(forecastMinor)}
            </p>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isOverspendRisk
                ? t("pacedToExceed")
                : t("expectedUnder")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Spending Pace Trajectory Area Chart */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <CardTitle className="text-base font-semibold">{t("paceTitle")}</CardTitle>
              <CardDescription>
                {t("paceDesc")}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <Badge
                variant={isOverspendRisk ? "destructive" : "secondary"}
                className={`text-[11px] font-bold whitespace-nowrap ${!isOverspendRisk ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/80" : ""}`}
              >
                {isOverspendRisk ? t("aheadOfPace") : t("onIdealPace")}
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
            <CardTitle className="text-base font-semibold">{t("totalMonthlyBudget")}</CardTitle>
            <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {percentUsed}%
            </span>
          </div>
          <CardDescription className="tabular-nums">
            {t("spentOf", {
              spent: formatMoney(spentThisMonthMinor, "USD"),
              limit: formatMoney(totalMonthlyLimitMinor, "USD"),
            })}
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
            <span className="tabular-nums">
              {t("remaining", {
                amount: formatMoney(totalMonthlyLimitMinor - spentThisMonthMinor, "USD"),
              })}
            </span>
            <span className="tabular-nums">{t("daysRemaining", { count: daysLeft })}</span>
          </div>
        </CardContent>
      </Card>

      {/* Category Breakdown & Budgets Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Recharts Category Donut Chart */}
        <Card className="lg:col-span-6 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("categoryBreakdown")}</CardTitle>
            <CardDescription>
              {t("categoryBreakdownDesc")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {categoryBudgets.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  {t("noCategorySpending")}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {t("noCategorySpendingHint")}
                </p>
              </div>
            ) : (
              <CategoryDonutChart
                data={donutData}
                totalSpentMinor={spentThisMonthMinor}
                currency="USD"
              />
            )}
          </CardContent>
        </Card>

        {/* Category Budget Limits with Alerts */}
        <Card className="lg:col-span-6 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">{t("categoryBudgets")}</CardTitle>
            <CardDescription>
              {t("categoryBudgetsLegend")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {categoryBudgets.length === 0 ? (
              <div className="py-12 text-center text-sm text-zinc-500">
                <p className="font-medium text-zinc-700 dark:text-zinc-300">
                  {t("noCategoryBudgets")}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  {t("noCategoryBudgetsHint")}
                </p>
              </div>
            ) : (
              categoryBudgets.map((cat) => (
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
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <MonthlyStatementModal
        isOpen={isStatementOpen}
        onClose={() => setIsStatementOpen(false)}
      />
    </div>
  );
}
