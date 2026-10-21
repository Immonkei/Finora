"use client";

import * as React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import { useMounted } from "@/lib/hooks";
import { useT } from "@/lib/i18n";
import { ChartTooltip } from "./chart-tooltip";
import type { CategoryChartItem } from "./chart-data";

interface CategoryDonutChartProps {
  data: CategoryChartItem[];
  totalSpentMinor: bigint;
  currency?: CurrencyCode;
  className?: string;
  onSelectCategory?: (category: CategoryChartItem | null) => void;
}

export function CategoryDonutChart({
  data,
  totalSpentMinor,
  currency = "USD",
  className = "",
  onSelectCategory,
}: CategoryDonutChartProps) {
  const isMounted = useMounted();
  const t = useT("charts");
  const [activeIndex, setActiveIndex] = React.useState<number | null>(null);

  const activeItem = activeIndex !== null && data[activeIndex] ? data[activeIndex] : null;

  const handleMouseEnter = (_: unknown, index: number) => {
    setActiveIndex(index);
    if (onSelectCategory && data[index]) {
      onSelectCategory(data[index]);
    }
  };

  const handleMouseLeave = () => {
    setActiveIndex(null);
    if (onSelectCategory) {
      onSelectCategory(null);
    }
  };

  if (!isMounted) {
    return (
      <div
        className={`flex h-64 items-center justify-center rounded-2xl border border-zinc-200/60 bg-zinc-50/50 dark:border-zinc-800/60 dark:bg-zinc-900/30 ${className}`}
      >
        <span className="text-xs text-zinc-400 animate-pulse">{t("loadingChart")}</span>
      </div>
    );
  }

  if (!data || data.length === 0 || totalSpentMinor === 0n) {
    return (
      <div
        className={`flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 dark:border-zinc-800 p-6 text-center ${className}`}
      >
        <div className="h-12 w-12 rounded-full border-2 border-dashed border-zinc-300 dark:border-zinc-700 mb-3" />
        <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
          {t("noExpensesTitle")}
        </p>
        <p className="text-xs text-zinc-400 mt-1 max-w-[220px]">
          {t("noExpensesHint")}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Donut Container with Centered Metrics Overlay */}
      <div className="relative h-60 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip
              content={
                <ChartTooltip
                  currency={currency}
                  hideLabel={false}
                  title={t("categorySpend")}
                />
              }
            />
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={96}
              paddingAngle={3}
              cornerRadius={5}
              dataKey="amount"
              nameKey="name"
              stroke="transparent"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {data.map((entry, index) => {
                const isActive = activeIndex === index;
                const isAnyActive = activeIndex !== null;

                return (
                  <Cell
                    key={`cell-${entry.id || index}`}
                    fill={entry.color}
                    opacity={isAnyActive ? (isActive ? 1 : 0.35) : 1}
                    stroke={isActive ? "currentColor" : "transparent"}
                    strokeWidth={isActive ? 2 : 0}
                    className="transition-all duration-200 cursor-pointer text-zinc-900 dark:text-zinc-100"
                  />
                );
              })}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center Donut Label */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 max-w-[120px] truncate">
            {activeItem ? activeItem.name : t("totalSpent")}
          </span>
          <span className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-0.5">
            {activeItem
              ? formatMoney(activeItem.spentMinor, currency)
              : formatMoney(totalSpentMinor, currency)}
          </span>
          <span className="text-[11px] font-medium text-brand-600 dark:text-accent-400 tabular-nums">
            {activeItem
              ? t("percentOfTotal", { percent: activeItem.percent })
              : t("categoriesCount", { count: data.length })}
          </span>
        </div>
      </div>

      {/* Interactive Legend Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800/80">
        {data.map((item, index) => {
          const isActive = activeIndex === index;

          return (
            <button
              key={item.id || item.name}
              type="button"
              onMouseEnter={() => handleMouseEnter(null, index)}
              onMouseLeave={handleMouseLeave}
              onClick={() => setActiveIndex(isActive ? null : index)}
              className={`flex items-center justify-between rounded-xl p-2 text-left transition-all text-xs ${
                isActive
                  ? "bg-zinc-100 dark:bg-zinc-800/90 ring-1 ring-zinc-300 dark:ring-zinc-700 shadow-xs"
                  : "hover:bg-zinc-50 dark:hover:bg-zinc-850/50"
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 pr-2">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full transition-transform"
                  style={{
                    backgroundColor: item.color,
                    transform: isActive ? "scale(1.3)" : "scale(1)",
                  }}
                />
                <span className="font-medium text-zinc-800 dark:text-zinc-200 truncate">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-bold text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                  {formatMoney(item.spentMinor, currency)}
                </span>
                <span className="rounded-md bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 tabular-nums">
                  {item.percent}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
