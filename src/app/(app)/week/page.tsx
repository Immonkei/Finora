"use client";

import * as React from "react";
import { TrendingDown, TrendingUp, Calendar, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";

export default function WeekPage() {
  const totalWeekSpentMinor = BigInt(11250); // $112.50
  const lastWeekSpentMinor = BigInt(12800);  // $128.00
  const differenceMinor = lastWeekSpentMinor - totalWeekSpentMinor;
  const isSpendingLower = differenceMinor > 0n;

  const dailyData = [
    { day: "Mon", amountMinor: BigInt(1850), display: "$18.50", height: "45%" },
    { day: "Tue", amountMinor: BigInt(2200), display: "$22.00", height: "60%" },
    { day: "Wed", amountMinor: BigInt(1400), display: "$14.00", height: "35%" },
    { day: "Thu", amountMinor: BigInt(1450), display: "$14.50", height: "38%" },
    { day: "Fri", amountMinor: BigInt(2650), display: "$26.50", height: "75%" },
    { day: "Sat", amountMinor: BigInt(1700), display: "$17.00", height: "42%" },
    { day: "Sun", amountMinor: BigInt(0), display: "$0.00", height: "5%" },
  ];

  const topCategories = [
    { name: "Food & Drinks", totalMinor: BigInt(5400), percent: 48, color: "#EF4444" },
    { name: "Transport", totalMinor: BigInt(2850), percent: 25, color: "#3B82F6" },
    { name: "Entertainment", totalMinor: BigInt(1800), percent: 16, color: "#EC4899" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
          Weekly Summary
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          This Week
        </h1>
      </div>

      {/* Week Overview Card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Spent (Mon - Sun)</CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {formatMoney(totalWeekSpentMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <Badge
                variant={isSpendingLower ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {isSpendingLower ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                12.1%
              </Badge>
              <span className="text-zinc-500 dark:text-zinc-400">
                vs last week ({formatMoney(lastWeekSpentMinor, "USD")})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Daily Average</CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {formatMoney(totalWeekSpentMinor / 7n, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Highest spending day: <span className="font-semibold text-zinc-800 dark:text-zinc-200">Friday ($26.50)</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Daily Bar Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Spending by Day</CardTitle>
          <CardDescription>Daily distribution of expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-end justify-between gap-2 h-44 pt-6 pb-2">
            {dailyData.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] text-zinc-500 font-medium hidden sm:block">
                  {d.display}
                </span>
                <div className="w-full max-w-[40px] bg-zinc-100 dark:bg-zinc-800 rounded-t-lg h-full flex items-end overflow-hidden">
                  <div
                    className="w-full bg-emerald-500 hover:bg-emerald-600 transition-all rounded-t-lg"
                    style={{ height: d.height }}
                  />
                </div>
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-400">
                  {d.day}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top 3 Categories */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-semibold">Top Categories This Week</CardTitle>
          <CardDescription>Where most of your money went</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {topCategories.map((cat) => (
            <div key={cat.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">
                    {cat.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {formatMoney(cat.totalMinor, "USD")}
                  </span>
                  <span className="text-xs text-zinc-400">({cat.percent}%)</span>
                </div>
              </div>
              <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${cat.percent}%`,
                    backgroundColor: cat.color,
                  }}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
