"use client";

import * as React from "react";
import { type UpcomingCharge } from "../projection";
import { formatMoney, formatKhrApproximation, type CurrencyCode } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDisplayDate } from "@/lib/dates";
import { useLocale, useT } from "@/lib/i18n";

/** Parses "YYYY-MM-DD" as a local calendar date (no UTC shift) */
function parseLocalDate(ymd: string): Date | null {
  const [y, m, d] = ymd.split("-").map((part) => parseInt(part, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

interface CashFlowTimelineProps {
  charges: UpcomingCharge[];
  className?: string;
}

export function CashFlowTimeline({ charges, className }: CashFlowTimelineProps) {
  const t = useT("recurring");
  const { dateLocale } = useLocale();
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
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="font-semibold uppercase tracking-wider min-w-0">{t("next7Days")}</span>
            {urgentChargesCount > 0 ? (
              <Badge variant="destructive" className="text-[10px] gap-1 font-bold shrink-0 whitespace-nowrap">
                <AlertCircle className="h-3 w-3" /> {t("dueSoon", { count: urgentChargesCount })}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] shrink-0 whitespace-nowrap">{t("upcoming")}</Badge>
            )}
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
            {formatMoney(total7DaysMinor, "USD")}
          </div>
          <p className="text-[11px] text-zinc-400 tabular-nums">
            {t("committedThisWeek", {
              amount: `៛${(Number(total7DaysMinor) * 41).toLocaleString()}`,
            })}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 space-y-1">
          <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
            <span className="font-semibold uppercase tracking-wider min-w-0">{t("total30Days")}</span>
            <Badge variant="secondary" className="text-[10px] font-semibold shrink-0 whitespace-nowrap">
              {t("scheduled", { count: charges.length })}
            </Badge>
          </div>
          <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
            {formatMoney(total30DaysMinor, "USD")}
          </div>
          <p className="text-[11px] text-zinc-400 tabular-nums">
            {t("projectedNextMonth", {
              amount: `៛${(Number(total30DaysMinor) * 41).toLocaleString()}`,
            })}
          </p>
        </div>
      </div>

      {/* Chronological Timeline List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5 pt-1">
          <CalendarClock className="h-3.5 w-3.5 text-brand-600 dark:text-accent-400" />
          {t("timelineTitle")}
        </h4>

        {charges.length === 0 ? (
          <div className="p-6 text-center text-xs text-zinc-400 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/50 border border-dashed border-zinc-200 dark:border-zinc-800">
            {t("timelineEmpty")}
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80 border border-zinc-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden bg-white dark:bg-zinc-900">
            {charges.map((charge, idx) => {
              const isUrgent = charge.daysRemaining <= 1;
              const isThisWeek = charge.daysRemaining <= 7;
              const due = parseLocalDate(charge.dueDate);

              return (
                <div
                  key={`${charge.ruleId}-${charge.dueDate}-${idx}`}
                  className="flex items-center justify-between p-3.5 hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Date Pill */}
                    <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center bg-zinc-100 dark:bg-zinc-800 shrink-0 text-center overflow-hidden">
                      <span className="text-[9px] font-bold text-zinc-400 uppercase leading-none whitespace-nowrap">
                        {due ? formatDisplayDate(due, "MMM", dateLocale) : ""}
                      </span>
                      <span className="text-base font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums leading-tight">
                        {due ? due.getDate() : ""}
                      </span>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                          {charge.name}
                        </span>
                        <Badge
                          variant={isUrgent ? "destructive" : isThisWeek ? "default" : "secondary"}
                          className="text-[10px] font-semibold shrink-0 px-2 py-0 whitespace-nowrap"
                        >
                          {charge.daysRemaining === 0
                            ? t("dueToday")
                            : charge.daysRemaining === 1
                              ? t("dueTomorrow")
                              : t("inDays", { count: charge.daysRemaining })}
                        </Badge>
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                        {charge.category} •{" "}
                        {due ? formatDisplayDate(due, undefined, dateLocale) : charge.dueDate}
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
