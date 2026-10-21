"use client";

import * as React from "react";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useMounted } from "@/lib/hooks";
import { useLocale, useT } from "@/lib/i18n";

export interface DaySpendingData {
  date: string; // "YYYY-MM-DD"
  spentMinor: bigint;
  count: number;
}

interface SpendingHeatmapProps {
  data: Record<string, DaySpendingData>; // keyed by "YYYY-MM-DD"
  currencyMode?: "USD" | "KHR";
  className?: string;
}

interface HeatmapDay {
  date: string;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  spentMinor: bigint;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

const DAY_LABEL_KEYS = ["dayMon", "dayWed", "dayFri", "daySun"] as const;

export function SpendingHeatmap({
  data,
  currencyMode = "USD",
  className,
}: SpendingHeatmapProps) {
  const isMounted = useMounted();
  const t = useT("charts");
  const { dateLocale } = useLocale();
  const [hoveredDay, setHoveredDay] = React.useState<HeatmapDay | null>(null);

  // Generate 52 weeks (364 days) ending on today
  const { weeks, monthLabels, totalSpentMinor, noSpendDays, activeDays } = React.useMemo(() => {
    if (!isMounted) {
      return {
        weeks: [],
        monthLabels: [],
        totalSpentMinor: 0n,
        noSpendDays: 0,
        activeDays: 0,
      };
    }
    const today = new Date();
    // Normalize to midnight UTC
    const endDate = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));

    // Align start to the Monday of 52 weeks ago
    const dayOfWeek = (endDate.getUTCDay() + 6) % 7; // 0 for Mon, 6 for Sun
    const totalDays = 52 * 7 + dayOfWeek + 1;

    const startDate = new Date(endDate);
    startDate.setUTCDate(endDate.getUTCDate() - (totalDays - 1));

    const weeksList: HeatmapDay[][] = [];
    let currentWeek: HeatmapDay[] = [];
    const months: { month: number; colIndex: number }[] = [];

    let lastMonth = -1;
    let runningTotalMinor = 0n;
    let zeroSpendCount = 0;
    let activeDaysCount = 0;

    const cursor = new Date(startDate);
    let colIdx = 0;

    while (cursor <= endDate) {
      const dateKey = cursor.toISOString().slice(0, 10);
      const dayData = data[dateKey];
      const spent = dayData ? dayData.spentMinor : 0n;
      const count = dayData ? dayData.count : 0;

      runningTotalMinor += spent;
      if (spent === 0n) {
        zeroSpendCount++;
      } else {
        activeDaysCount++;
      }

      // Determine intensity level (USD reference: $10, $30, $75)
      let level: 0 | 1 | 2 | 3 | 4 = 0;
      if (spent > 0n) {
        if (spent <= 1000n) level = 1; // <= $10
        else if (spent <= 3000n) level = 2; // $10 - $30
        else if (spent <= 7500n) level = 3; // $30 - $75
        else level = 4; // > $75
      }

      // Monday = 0, Tuesday = 1, ..., Sunday = 6
      const normalizedDay = (cursor.getUTCDay() + 6) % 7;

      currentWeek.push({
        date: dateKey,
        dayOfWeek: normalizedDay,
        spentMinor: spent,
        count,
        level,
      });

      // Track Month headers
      const currentMonth = cursor.getUTCMonth();
      if (currentMonth !== lastMonth && currentWeek.length === 1) {
        months.push({ month: currentMonth, colIndex: colIdx });
        lastMonth = currentMonth;
      }

      if (currentWeek.length === 7) {
        weeksList.push(currentWeek);
        currentWeek = [];
        colIdx++;
      }

      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }

    if (currentWeek.length > 0) {
      weeksList.push(currentWeek);
    }

    return {
      weeks: weeksList,
      monthLabels: months,
      totalSpentMinor: runningTotalMinor,
      noSpendDays: zeroSpendCount,
      activeDays: activeDaysCount,
    };
  }, [data, isMounted]);

  const formatDaySpend = (minorUnits: bigint) => {
    if (currencyMode === "KHR") {
      return formatMoney(minorUnits * 40n, "KHR");
    }
    return formatMoney(minorUnits, "USD");
  };

  if (!isMounted) {
    return (
      <div className={cn("space-y-3", className)}>
        <div className="h-32 w-full rounded-2xl bg-zinc-100/60 dark:bg-zinc-800/40 animate-pulse" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Metric highlights */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="text-zinc-600 dark:text-zinc-300">
            {t("totalLogged")}{" "}
            <strong className="text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatDaySpend(totalSpentMinor)}
            </strong>
          </span>
          <span className="text-zinc-600 dark:text-zinc-300">
            {t("activeDays")}{" "}
            <strong className="text-brand-600 dark:text-accent-400 tabular-nums">
              {activeDays}
            </strong>
          </span>
          <span className="text-zinc-600 dark:text-zinc-300">
            {t("zeroSpendDays")}{" "}
            <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">
              {noSpendDays}
            </strong>
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-1.5 text-[11px] text-zinc-400">
          <span>{t("less")}</span>
          <span className="w-2.5 h-2.5 rounded-[2px] bg-zinc-100 dark:bg-zinc-800" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-200 dark:bg-emerald-950" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-300 dark:bg-emerald-800" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500 dark:bg-emerald-600" />
          <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-600 dark:bg-emerald-400" />
          <span>{t("more")}</span>
        </div>
      </div>

      {/* Heatmap Grid (Horizontal Scrollable for Small Devices) */}
      <div className="relative overflow-x-auto pb-2 scrollbar-thin">
        <div className="min-w-[720px] select-none">
          {/* Month Labels */}
          <div className="flex text-[10px] text-zinc-400 font-medium mb-1.5 pl-7">
            {weeks.map((_, colIndex) => {
              const month = monthLabels.find((m) => m.colIndex === colIndex);
              return (
                <div key={colIndex} className="w-[13px] text-left shrink-0">
                  {month ? format(new Date(2000, month.month, 1), "MMM", { locale: dateLocale }) : ""}
                </div>
              );
            })}
          </div>

          {/* Grid Rows: 7 rows for days of week */}
          <div className="flex">
            {/* Day of Week Labels */}
            <div className="flex flex-col justify-between text-[9px] text-zinc-400 font-medium pr-2 w-7 shrink-0 h-[88px]">
              {DAY_LABEL_KEYS.map((key) => (
                <span key={key}>{t(key)}</span>
              ))}
            </div>

            {/* Weeks Columns */}
            <div className="flex gap-[3px]">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex flex-col gap-[3px]">
                  {week.map((day) => {
                    const isSelected = hoveredDay?.date === day.date;

                    return (
                      <div
                        key={day.date}
                        onMouseEnter={() => setHoveredDay(day)}
                        onClick={() => setHoveredDay(day)}
                        className={cn(
                          "w-[10px] h-[10px] rounded-[2px] transition-all cursor-pointer relative",
                          day.level === 0 && "bg-zinc-100 dark:bg-zinc-800/70 hover:ring-1 hover:ring-zinc-400",
                          day.level === 1 && "bg-emerald-200 dark:bg-emerald-950 hover:ring-1 hover:ring-emerald-400",
                          day.level === 2 && "bg-emerald-300 dark:bg-emerald-800 hover:ring-1 hover:ring-emerald-400",
                          day.level === 3 && "bg-emerald-500 dark:bg-emerald-600 hover:ring-1 hover:ring-emerald-300",
                          day.level === 4 && "bg-emerald-600 dark:bg-emerald-400 hover:ring-1 hover:ring-emerald-200",
                          isSelected && "ring-2 ring-brand-500 dark:ring-accent-400 scale-125 z-10"
                        )}
                        title={t("cellTitle", {
                          date: day.date,
                          amount: formatDaySpend(day.spentMinor),
                          count: day.count,
                        })}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Hovered Day Inspector Details */}
      {hoveredDay && (
        <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-xs animate-in fade-in">
          <div>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
              {hoveredDay.date}
            </span>{" "}
            <span className="text-zinc-500">
              • {hoveredDay.count > 0
                ? t("transactionsCount", { count: hoveredDay.count })
                : t("noExpensesLogged")}
            </span>
          </div>
          <div>
            <span className="text-zinc-500 mr-1.5">{t("spent")}</span>
            <strong className="text-zinc-900 dark:text-zinc-100 tabular-nums">
              {formatDaySpend(hoveredDay.spentMinor)}
            </strong>
          </div>
        </div>
      )}
    </div>
  );
}
