"use client";

import * as React from "react";
import {
  TrendingDown,
  TrendingUp,
  Calendar,
  Sparkles,
  Bot,
  CheckCircle2,
  Lightbulb,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { generateWeeklyAiReport, type WeeklyAiReport } from "@/features/reports/ai-weekly-report";
import { toast } from "sonner";

export default function WeekPage() {
  const [report, setReport] = React.useState<WeeklyAiReport | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

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

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const generated = generateWeeklyAiReport({
        spentThisWeekMinor: totalWeekSpentMinor,
        allowanceAverageMinor: BigInt(1565),
        topLeakTitle: "Iced Latte",
      });
      setReport(generated);
      setIsGenerating(false);
      toast.success("AI Weekly Report generated!");
    }, 400);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Weekly Summary
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            This Week
          </h1>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-md shadow-emerald-600/20"
        >
          <Sparkles className="h-4 w-4" />
          {isGenerating ? "Analyzing..." : "AI Weekly Report"}
        </Button>
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

      {/* AI Weekly Report Modal (Spec 3.4 #23) */}
      {report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Finora AI Weekly Digest</h3>
                  <p className="text-xs text-zinc-500">Automated financial intelligence</p>
                </div>
              </div>
              <button
                onClick={() => setReport(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Score Banner */}
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                  Budget Discipline Score
                </p>
                <p className="font-bold text-sm text-emerald-950 dark:text-emerald-100 mt-0.5">
                  {report.headline}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
                {report.score}
              </div>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              {report.summary}
            </p>

            {/* Highlights */}
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Key Highlights
              </p>
              <ul className="space-y-1">
                {report.highlights.map((h, i) => (
                  <li key={i} className="text-xs text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="space-y-1.5 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                AI Recommendations
              </p>
              <div className="space-y-2">
                {report.recommendations.map((r, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 text-xs text-zinc-700 dark:text-zinc-300 flex items-start gap-2"
                  >
                    <Lightbulb className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <Button onClick={() => setReport(null)} className="w-full">
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
