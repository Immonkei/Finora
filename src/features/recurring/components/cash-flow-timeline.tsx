"use client";

import * as React from "react";
import { type UpcomingCharge } from "../projection";
import { formatMoney, formatKhrApproximation, type CurrencyCode } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

interface CashFlowTimelineProps {
  charges: UpcomingCharge[];
  className?: string;
}

export function CashFlowTimeline({ charges, className }: CashFlowTimelineProps) {
  // Aggregate next 7 days and 30 days totals
  const { total30DaysMinor, total7DaysMinor, urgentChargesCount } = React.useMemo(() => {
    let sum30 = 0n;
    let sum7 = 0n;
    let urgent = 0;

    charges.forEach((c) => {
      sum30 += c.amountMinor;
      if (c.daysRemaining <= 7) {
        sum7 += c.amountMinor;
      }
      if (c.daysRemaining <= 2) {
        urgent++;
      }
    });

    return {
      total30DaysMinor: sum30,
      total7DaysMinor: sum7,
      urgentChargesCount: urgent,
    };
  }, [charges]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* 30-Day Cash Flow Projection Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold uppercase tracking-wider">Next 7 Days Outflow</span>
            {urgentChargesCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] gap-1 font-bold">
                <AlertCircle className="h-3 w-3" /> {urgentChargesCount} Due Soon
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px]">Upcoming</Badge>
            )}
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
            {formatMoney(total7DaysMinor, "USD")}
          </div>
          <p className="text-[11px] text-zinc-400 tabular-nums">
            ≈ ៛{(Number(total7DaysMinor) * 41).toLocaleString()} committed this week
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <div className="flex items-center justify-between text-xs text-zinc-500">
            <span className="font-semibold uppercase tracking-wider">30-Day Total Outflow</span>
            <Badge variant="secondary" className="text-[10px] font-semibold">
              {charges.length} Scheduled
            </Badge>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
            {formatMoney(total30DaysMinor, "USD")}
          </div>
          <p className="text-[11px] text-zinc-400 tabular-nums">
            ≈ ៛{(Number(total30DaysMinor) * 41).toLocaleString()} projected next month
          </p>
        </div>
      </div>

      {/* Chronological Timeline List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pt-1">
          <CalendarClock className="h-3.5 w-3.5 text-brand-600 dark:text-accent-400" />
          Scheduled Charges Timeline
        </h4>

        {charges.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800">
            No active subscriptions or bills due in the next 30 days.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
            {charges.map((charge, idx) => {
              const isUrgent = charge.daysRemaining <= 1;
              const isThisWeek = charge.daysRemaining <= 7;

              return (
                <div
                  key={`${charge.ruleId}-${charge.dueDate}-${idx}`}
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Date Pill */}
                    {(() => {
                      const parts = charge.dueDate.split("-");
                      const monthIdx = parseInt(parts[1] || "1", 10) - 1;
                      const dayNum = parseInt(parts[2] || "1", 10);
                      const monthStr = SHORT_MONTHS[monthIdx] || "Due";

                      return (
                        <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 shrink-0 text-center">
                          <span className="text-[9px] font-bold text-zinc-400 uppercase leading-none">
                            {monthStr}
                          </span>
                          <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums leading-tight">
                            {dayNum}
                          </span>
                        </div>
                      );
                    })()}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {charge.name}
                        </span>
                        <Badge
                          variant={isUrgent ? "destructive" : isThisWeek ? "default" : "secondary"}
                          className="text-[10px] font-semibold shrink-0 px-2 py-0"
                        >
                          {charge.daysRemaining === 0 ? (
                            "Due Today!"
                          ) : charge.daysRemaining === 1 ? (
                            "Due Tomorrow"
                          ) : (
                            `In ${charge.daysRemaining} days`
                          )}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {charge.category} • {charge.dueDate}
                      </p>
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="text-right shrink-0 pl-3">
                    <span className="text-sm font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                      {formatMoney(charge.amountMinor, (charge.currency as CurrencyCode) || "USD")}
                    </span>
                    <p className="text-[10px] text-zinc-400 tabular-nums">
                      {formatKhrApproximation(charge.amountMinor)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
