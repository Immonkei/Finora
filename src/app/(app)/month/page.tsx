"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateForecast } from "@/lib/money";
import { getDaysPassedInMonth, getDaysLeftInMonth } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";

export default function MonthPage() {
  const isMounted = useMounted();
  const currentDate = isMounted ? new Date() : null;


  const daysPassed = currentDate ? getDaysPassedInMonth(currentDate) : 8;
  const daysLeft = currentDate ? getDaysLeftInMonth(currentDate) : 23;

  const totalMonthlyLimitMinor = BigInt(60000); // $600.00
  const spentThisMonthMinor = BigInt(24000);    // $240.00

  const { forecastMinor, averagePerDayMinor } = calculateForecast(
    spentThisMonthMinor,
    daysPassed,
    daysLeft
  );

  const isOverspendRisk = forecastMinor > totalMonthlyLimitMinor;
  const percentUsed = Number((spentThisMonthMinor * 100n) / totalMonthlyLimitMinor);

  // Helper for Spec FR-B2: green below 80%, yellow from 80% to 100%, red above 100%
  const getBudgetColor = (percent: number) => {
    if (percent < 80) return "bg-emerald-500";
    if (percent <= 100) return "bg-amber-500";
    return "bg-rose-500";
  };

  const categoryBudgets = [
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

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
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
