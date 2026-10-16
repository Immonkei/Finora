"use client";

import * as React from "react";
import {
  TrendingDown,
  TrendingUp,
  Sparkles,
  Bot,
  CheckCircle2,
  Lightbulb,
  X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatMoney, fromMinorUnits } from "@/lib/money";
import { generateWeeklyAiReport, type WeeklyAiReport } from "@/features/reports/ai-weekly-report";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getWeekBounds } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import {
  WeeklyBarChart,
  CategoryDonutChart,
  transformCategoryChartData,
  type WeeklyBarPoint,
} from "@/components/charts";

interface RpcCategorySpending {
  category_id: string;
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  total: number | string;
}

interface CatItem {
  name: string;
  totalMinor: bigint;
  percent: number;
  color: string;
}

export default function WeekPage() {
  const isMounted = useMounted();
  const todayDayOfWeek = isMounted ? new Date().getDay() : null;

  const [report, setReport] = React.useState<WeeklyAiReport | null>(null);
  const [isGenerating, setIsGenerating] = React.useState(false);

  const [liveWeekSpent, setLiveWeekSpent] = React.useState<bigint | null>(null);
  const [liveCategories, setLiveCategories] = React.useState<CatItem[] | null>(null);

  React.useEffect(() => {
    async function loadWeekData() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { start, end } = getWeekBounds(new Date(), 1);
        const { data: catData } = await supabase.rpc("spending_by_category", {
          p_from: start.toISOString(),
          p_to: end.toISOString(),
        });

        if (catData) {
          let weekTotal = BigInt(0);
          const mappedCats = ((catData as unknown as RpcCategorySpending[]) || []).map((c) => {
            const spent = BigInt(c.total);
            weekTotal += spent;
            return {
              name: c.category_name,
              totalMinor: spent,
              percent: 0,
              color: c.category_color || "#3B82F6",
            };
          });

          const withPercents: CatItem[] = mappedCats.slice(0, 4).map((c) => ({
            ...c,
            percent:
              weekTotal > 0n
                ? Math.round(Number((c.totalMinor * 100n) / weekTotal))
                : 0,
          }));

          setLiveCategories(withPercents);
          setLiveWeekSpent(weekTotal);
        }
      } catch {
        // Fallback
      }
    }
    loadWeekData();
  }, []);

  const totalWeekSpentMinor = liveWeekSpent ?? BigInt(11250); // $112.50
  const lastWeekSpentMinor = BigInt(12800); // $128.00
  const differenceMinor = lastWeekSpentMinor - totalWeekSpentMinor;
  const isSpendingLower = differenceMinor > 0n;

  const DEFAULT_TOP_CATEGORIES: CatItem[] = [
    { name: "Food & Drinks", totalMinor: BigInt(5400), percent: 48, color: "#4fa3b3" },
    { name: "Transport", totalMinor: BigInt(2850), percent: 25, color: "#1b4d72" },
    { name: "Entertainment", totalMinor: BigInt(1800), percent: 16, color: "#8b5cf6" },
    { name: "Groceries", totalMinor: BigInt(1200), percent: 11, color: "#10b981" },
  ];

  const topCategories = liveCategories ?? DEFAULT_TOP_CATEGORIES;
  const dailyAverageMinor = totalWeekSpentMinor / 7n;

  // Day-by-day Recharts Bar Chart Data
  const weeklyChartPoints: WeeklyBarPoint[] = React.useMemo(() => {
    const dayIndexMap: Record<string, number> = {
      Mon: 1,
      Tue: 2,
      Wed: 3,
      Thu: 4,
      Fri: 5,
      Sat: 6,
      Sun: 0,
    };

    const rawDays = [
      { day: "Mon", fullDate: "Monday", amountMinor: BigInt(1850) },
      { day: "Tue", fullDate: "Tuesday", amountMinor: BigInt(2200) },
      { day: "Wed", fullDate: "Wednesday", amountMinor: BigInt(1400) },
      { day: "Thu", fullDate: "Thursday", amountMinor: BigInt(1450) },
      { day: "Fri", fullDate: "Friday", amountMinor: BigInt(2650) },
      { day: "Sat", fullDate: "Saturday", amountMinor: BigInt(1700) },
      { day: "Sun", fullDate: "Sunday", amountMinor: BigInt(0) },
    ];

    let maxAmount = 0n;
    rawDays.forEach((d) => {
      if (d.amountMinor > maxAmount) maxAmount = d.amountMinor;
    });

    return rawDays.map((d) => ({
      day: d.day,
      fullDate: d.fullDate,
      amountMinor: d.amountMinor,
      amount: fromMinorUnits(d.amountMinor, "USD"),
      isToday: todayDayOfWeek !== null && dayIndexMap[d.day] === todayDayOfWeek,
      isHighest: d.amountMinor === maxAmount && maxAmount > 0n,
    }));
  }, [todayDayOfWeek]);

  const highestDay = React.useMemo(() => {
    return weeklyChartPoints.find((p) => p.isHighest);
  }, [weeklyChartPoints]);

  const donutData = React.useMemo(() => {
    return transformCategoryChartData(
      topCategories.map((c) => ({
        name: c.name,
        spentMinor: c.totalMinor,
        color: c.color,
      })),
      "USD"
    );
  }, [topCategories]);

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
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            Weekly Summary
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            This Week
          </h1>
        </div>
        <Button
          onClick={handleGenerateReport}
          disabled={isGenerating}
          className="gap-2 bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20"
        >
          <Sparkles className="h-4 w-4 text-accent-300" />
          {isGenerating ? "Analyzing..." : "AI Weekly Report"}
        </Button>
      </div>

      {/* Week Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Total Spent (Mon - Sun)</CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(totalWeekSpentMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-xs">
              <Badge
                variant={isSpendingLower ? "default" : "destructive"}
                className={`flex items-center gap-1 font-semibold ${isSpendingLower ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
              >
                {isSpendingLower ? (
                  <TrendingDown className="h-3 w-3" />
                ) : (
                  <TrendingUp className="h-3 w-3" />
                )}
                12.1%
              </Badge>
              <span className="text-zinc-500 dark:text-zinc-400 tabular-nums">
                vs last week ({formatMoney(lastWeekSpentMinor, "USD")})
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Daily Average</CardDescription>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(dailyAverageMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Highest spending day:{" "}
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                {highestDay
                  ? `${highestDay.fullDate || highestDay.day} (${formatMoney(highestDay.amountMinor, "USD")})`
                  : "None"}
              </span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Interactive Day-by-Day Recharts Bar Chart */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Spending by Day</CardTitle>
          <CardDescription>
            Interactive daily distribution of expenses with peer average benchmark
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WeeklyBarChart
            data={weeklyChartPoints}
            dailyAverageMinor={dailyAverageMinor}
            currency="USD"
          />
        </CardContent>
      </Card>

      {/* Categories Breakdown: Donut Chart + List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <Card className="lg:col-span-6 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Weekly Category Share</CardTitle>
            <CardDescription>Interactive proportional distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <CategoryDonutChart
              data={donutData}
              totalSpentMinor={totalWeekSpentMinor}
              currency="USD"
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-6 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Top Categories This Week</CardTitle>
            <CardDescription>Ranked ranking of highest spending buckets</CardDescription>
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
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
                      {formatMoney(cat.totalMinor, "USD")}
                    </span>
                    <span className="text-xs text-zinc-400 tabular-nums">({cat.percent}%)</span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
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
            <div className="p-4 rounded-xl bg-accent-50/80 dark:bg-accent-950/40 border border-accent-200/60 dark:border-accent-900/50 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-accent-800 dark:text-accent-300">
                  Budget Discipline Score
                </p>
                <p className="font-bold text-sm text-brand-950 dark:text-zinc-50 mt-0.5">
                  {report.headline}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-brand-600 text-white font-extrabold flex items-center justify-center text-lg shadow-sm">
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
                    <CheckCircle2 className="h-3.5 w-3.5 text-accent-500 shrink-0" />
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
