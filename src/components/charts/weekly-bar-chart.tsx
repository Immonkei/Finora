"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { formatMoney, fromMinorUnits, type CurrencyCode } from "@/lib/money";
import { useMounted } from "@/lib/hooks";
import type { WeeklyBarPoint } from "./chart-data";

interface WeeklyBarChartProps {
  data: WeeklyBarPoint[];
  dailyAverageMinor?: bigint;
  currency?: CurrencyCode;
  className?: string;
  onSelectDay?: (day: WeeklyBarPoint | null) => void;
}

interface CustomBarTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: WeeklyBarPoint }>;
  dailyAvg?: number;
  currency?: CurrencyCode;
}

function CustomBarTooltip({
  active,
  payload,
  dailyAvg,
  currency = "USD",
}: CustomBarTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) return null;

  const diffFromAvg = dailyAvg !== undefined ? point.amount - dailyAvg : null;
  const isAboveAvg = diffFromAvg !== null && diffFromAvg > 0;

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white/95 px-3.5 py-2.5 text-xs shadow-xl backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 pb-1 dark:border-zinc-800/80">
        <span className="font-bold text-zinc-900 dark:text-zinc-100">
          {point.fullDate || point.day}
        </span>
        {point.isToday && (
          <span className="rounded bg-accent-100 px-1.5 py-0.2 text-[10px] font-bold text-accent-700 dark:bg-accent-950 dark:text-accent-300">
            Today
          </span>
        )}
        {point.isHighest && !point.isToday && (
          <span className="rounded bg-amber-100 px-1.5 py-0.2 text-[10px] font-bold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
            Peak Day
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-zinc-500 dark:text-zinc-400">Total Spent</span>
          <span className="font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight text-sm">
            {formatMoney(point.amountMinor, currency)}
          </span>
        </div>

        {diffFromAvg !== null && Math.abs(diffFromAvg) > 0.1 && (
          <div className="flex items-center justify-between gap-4 text-[11px] pt-1 border-t border-zinc-100 dark:border-zinc-800/60">
            <span className="text-zinc-500 dark:text-zinc-400">vs Daily Avg</span>
            <span
              className={`font-semibold tabular-nums ${
                isAboveAvg
                  ? "text-rose-600 dark:text-rose-400"
                  : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isAboveAvg ? "+" : "-"}
              {formatMoney(Math.round(Math.abs(diffFromAvg) * 100), currency)}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const formatYAxisTick = (val: number) => {
  if (val === 0) return "$0";
  return `$${Math.round(val)}`;
};

export function WeeklyBarChart({
  data,
  dailyAverageMinor,
  currency = "USD",
  className = "",
  onSelectDay,
}: WeeklyBarChartProps) {
  const isMounted = useMounted();
  const [activeDayIndex, setActiveDayIndex] = React.useState<number | null>(null);

  if (!isMounted) {
    return (
      <div
        className={`flex h-48 sm:h-56 items-center justify-center rounded-2xl border border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/30 ${className}`}
      >
        <span className="text-xs text-zinc-400 animate-pulse">Loading weekly chart...</span>
      </div>
    );
  }

  const dailyAvg = dailyAverageMinor !== undefined
    ? fromMinorUnits(dailyAverageMinor, currency)
    : undefined;

  return (
    <div className={`space-y-3 ${className}`}>
      {dailyAverageMinor !== undefined && (
        <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
          <span className="font-medium">Day-by-day distribution</span>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-3 border-t-2 border-dashed border-zinc-400 dark:border-zinc-500" />
            <span className="tabular-nums">
              Avg: {formatMoney(dailyAverageMinor, currency)}/day
            </span>
          </div>
        </div>
      )}

      <div className="h-48 sm:h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 12, right: 8, left: -20, bottom: 0 }}
            onMouseMove={(state) => {
              if (state.activeTooltipIndex !== undefined) {
                const idx = Number(state.activeTooltipIndex);
                setActiveDayIndex(idx);
                if (onSelectDay && data[idx]) onSelectDay(data[idx]);
              }
            }}
            onMouseLeave={() => {
              setActiveDayIndex(null);
              if (onSelectDay) onSelectDay(null);
            }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
              opacity={0.5}
            />

            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-600 dark:text-zinc-400 font-medium"
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-500 dark:text-zinc-400 tabular-nums"
              tickFormatter={formatYAxisTick}
            />

            <Tooltip
              content={<CustomBarTooltip dailyAvg={dailyAvg} currency={currency} />}
              cursor={{ fill: "rgba(79, 163, 179, 0.08)", radius: 6 }}
            />

            {dailyAvg !== undefined && (
              <ReferenceLine
                y={dailyAvg}
                stroke="#94a3b8"
                strokeDasharray="3 3"
                strokeWidth={1.5}
              />
            )}

            <Bar
              dataKey="amount"
              radius={[6, 6, 0, 0]}
              maxBarSize={44}
            >
              {data.map((entry, index) => {
                const isActive = activeDayIndex === index;
                const isPeak = entry.isHighest;

                let fill = "#1b4d72"; // Finora Navy
                if (isPeak) {
                  fill = "#f59e0b"; // Highlight peak day in warm amber
                } else if (entry.isToday) {
                  fill = "#4fa3b3"; // Today in Finora cyan
                }

                return (
                  <Cell
                    key={`bar-${entry.day}`}
                    fill={fill}
                    opacity={activeDayIndex === null || isActive ? 1 : 0.65}
                    className="transition-all duration-150 cursor-pointer"
                  />
                );
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
