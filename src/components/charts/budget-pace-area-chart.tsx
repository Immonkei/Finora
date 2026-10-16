"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { useMounted } from "@/lib/hooks";
import type { BudgetPacePoint } from "./chart-data";

interface BudgetPaceAreaChartProps {
  data: BudgetPacePoint[];
  currency?: CurrencyCode;
  className?: string;
}

interface CustomPaceTooltipProps {
  active?: boolean;
  payload?: Array<{ payload: BudgetPacePoint }>;
  currency?: CurrencyCode;
}

function CustomPaceTooltip({ active, payload, currency = "USD" }: CustomPaceTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const point = payload[0]?.payload;
  if (!point) return null;

  const actual = point.actualSpent;
  const pace = point.budgetPace;
  const variance = actual !== null ? actual - pace : null;
  const isUnder = variance !== null && variance <= 0;

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white/95 px-3.5 py-3 text-xs shadow-xl backdrop-blur-md dark:border-zinc-800/90 dark:bg-zinc-900/95">
      <div className="flex items-center justify-between gap-4 border-b border-zinc-100 pb-1.5 dark:border-zinc-800/80">
        <span className="font-bold text-zinc-900 dark:text-zinc-100">
          {point.dateLabel}
        </span>
        {point.isToday && (
          <span className="rounded bg-brand-50 px-1.5 py-0.5 text-[10px] font-bold text-brand-600 dark:bg-accent-950/60 dark:text-accent-300">
            Today
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1.5">
        {actual !== null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent-500" />
              <span className="text-zinc-600 dark:text-zinc-400">Actual Spend</span>
            </div>
            <span className="font-bold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
              {formatMoney(Math.round(actual * 100), currency)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-400 dark:bg-zinc-500" />
            <span className="text-zinc-600 dark:text-zinc-400">Budget Target</span>
          </div>
          <span className="font-semibold text-zinc-700 dark:text-zinc-300 tabular-nums tracking-tight">
            {formatMoney(Math.round(pace * 100), currency)}
          </span>
        </div>

        {point.projectedSpent !== null && actual === null && (
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-zinc-600 dark:text-zinc-400">Projected</span>
            </div>
            <span className="font-semibold text-amber-600 dark:text-amber-400 tabular-nums tracking-tight">
              {formatMoney(Math.round(point.projectedSpent * 100), currency)}
            </span>
          </div>
        )}

        {variance !== null && (
          <div className="mt-1 pt-1.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Pace Status</span>
            <span
              className={`text-[11px] font-bold tabular-nums ${
                isUnder
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {isUnder
                ? `Under pace by ${formatMoney(Math.round(Math.abs(variance) * 100), currency)}`
                : `Over pace by ${formatMoney(Math.round(variance * 100), currency)}`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const formatYAxisTick = (val: number) => {
  if (val === 0) return "$0";
  if (val >= 1000) {
    return `$${(val / 1000).toFixed(val % 1000 === 0 ? 0 : 1)}k`;
  }
  return `$${Math.round(val)}`;
};

export function BudgetPaceAreaChart({
  data,
  currency = "USD",
  className = "",
}: BudgetPaceAreaChartProps) {
  const isMounted = useMounted();

  if (!isMounted) {
    return (
      <div
        className={`flex h-64 sm:h-72 items-center justify-center rounded-2xl border border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/30 ${className}`}
      >
        <span className="text-xs text-zinc-400 animate-pulse">Loading pace chart...</span>
      </div>
    );
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Legend & Summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2 w-3 rounded-xs bg-accent-500" />
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              Actual Spend
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-t-2 border-dashed border-zinc-400 dark:border-zinc-500" />
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              Ideal Pace
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 border-t-2 border-dotted border-amber-500 dark:border-amber-400" />
            <span className="font-medium text-zinc-500 dark:text-zinc-400">
              Forecast
            </span>
          </div>
        </div>
      </div>

      {/* Area Chart Container */}
      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -18, bottom: 0 }}
          >
            <defs>
              <linearGradient id="actualSpendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4fa3b3" stopOpacity={0.45} />
                <stop offset="75%" stopColor="#4fa3b3" stopOpacity={0.05} />
                <stop offset="100%" stopColor="#4fa3b3" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="projectedGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-zinc-200 dark:text-zinc-800"
              opacity={0.6}
            />

            <XAxis
              dataKey="day"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-500 dark:text-zinc-400"
              interval="preserveStartEnd"
              tickFormatter={(d) => `${d}`}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-zinc-500 dark:text-zinc-400 tabular-nums"
              tickFormatter={formatYAxisTick}
            />

            <Tooltip content={<CustomPaceTooltip currency={currency} />} />

            {/* Ideal Budget Pace Linear Trajectory */}
            <Line
              type="linear"
              dataKey="budgetPace"
              name="Ideal Pace"
              stroke="#94a3b8"
              strokeWidth={1.75}
              strokeDasharray="4 4"
              dot={false}
              activeDot={false}
            />

            {/* Projected Trajectory for remaining days */}
            <Line
              type="monotone"
              dataKey="projectedSpent"
              name="Forecast"
              stroke="#f59e0b"
              strokeWidth={1.75}
              strokeDasharray="3 3"
              dot={false}
              activeDot={{ r: 4, fill: "#f59e0b" }}
            />

            {/* Actual Cumulative Spending Area */}
            <Area
              type="monotone"
              dataKey="actualSpent"
              name="Actual Spend"
              stroke="#1b4d72"
              strokeWidth={2.5}
              fill="url(#actualSpendGradient)"
              dot={false}
              activeDot={{
                r: 5,
                fill: "#1b4d72",
                stroke: "#ffffff",
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
