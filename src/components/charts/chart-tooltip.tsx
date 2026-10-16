"use client";

import * as React from "react";
import { formatMoney, type CurrencyCode } from "@/lib/money";

export interface ChartTooltipPayloadItem {
  name: string;
  value: number;
  color?: string;
  fill?: string;
  stroke?: string;
  dataKey?: string;
  payload?: Record<string, unknown>;
}

export interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadItem[];
  label?: string;
  currency?: CurrencyCode;
  title?: string;
  valuePrefix?: string;
  hideLabel?: boolean;
  renderExtra?: (payload: ChartTooltipPayloadItem[]) => React.ReactNode;
}

export function ChartTooltip({
  active,
  payload,
  label,
  currency = "USD",
  title,
  valuePrefix = "",
  hideLabel = false,
  renderExtra,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const heading = title || label;

  return (
    <div className="rounded-xl border border-zinc-200/90 bg-white/95 px-3 py-2.5 text-xs shadow-xl backdrop-blur-md transition-all dark:border-zinc-800/90 dark:bg-zinc-900/95 dark:shadow-zinc-950/50">
      {heading && !hideLabel && (
        <div className="mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800/80 pb-1">
          {heading}
        </div>
      )}

      <div className="space-y-1">
        {payload.map((item, idx) => {
          const itemColor = item.color || item.fill || item.stroke || "#1b4d72";
          const formattedValue =
            typeof item.value === "number"
              ? formatMoney(Math.round(item.value * 100), currency)
              : String(item.value ?? "");

          return (
            <div
              key={`${item.dataKey || item.name || idx}`}
              className="flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: itemColor }}
                />
                <span className="text-zinc-600 dark:text-zinc-400 capitalize">
                  {item.name}
                </span>
              </div>
              <span className="font-bold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                {valuePrefix}
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>

      {renderExtra && renderExtra(payload)}
    </div>
  );
}
