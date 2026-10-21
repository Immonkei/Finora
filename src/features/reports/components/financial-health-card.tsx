"use client";

import * as React from "react";
import { type HealthScoreResult } from "../health-score";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

interface FinancialHealthCardProps {
  health: HealthScoreResult;
  className?: string;
}

export function FinancialHealthCard({ health, className }: FinancialHealthCardProps) {
  const t = useT("reports");
  const { score, grade, titleCode, breakdown, insightCodes, pacingStatus } = health;

  // Grade color
  const gradeColor =
    score >= 85
      ? "text-emerald-600 dark:text-emerald-400 border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/40"
      : score >= 70
      ? "text-blue-600 dark:text-blue-400 border-blue-500/40 bg-blue-50 dark:bg-blue-950/40"
      : score >= 60
      ? "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-50 dark:bg-amber-950/40"
      : "text-rose-600 dark:text-rose-400 border-rose-500/40 bg-rose-50 dark:bg-rose-950/40";

  // Score gauge metrics
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <Card className={cn("border-zinc-200/80 dark:border-zinc-800/80 shadow-xs", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand-600 dark:text-accent-400" />
              {t("healthTitle")}
            </CardTitle>
            <CardDescription>
              {t("healthSubtitle")}
            </CardDescription>
          </div>
          <Badge variant="outline" className={cn("text-xs font-bold px-2.5 py-0.5 shrink-0 whitespace-nowrap", gradeColor)}>
            {t("grade", { grade })}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-900/60 border border-zinc-100 dark:border-zinc-800/60">
          {/* Circular Score Gauge */}
          <div className="relative shrink-0 w-24 h-24 flex items-center justify-center">
            <svg width={96} height={96} viewBox="0 0 96 96" className="-rotate-90">
              <circle
                cx={48}
                cy={48}
                r={radius}
                fill="transparent"
                stroke="currentColor"
                strokeWidth={7}
                className="text-zinc-200 dark:text-zinc-800"
              />
              <circle
                cx={48}
                cy={48}
                r={radius}
                fill="transparent"
                stroke={score >= 80 ? "#10B981" : score >= 65 ? "#3B82F6" : "#F59E0B"}
                strokeWidth={7}
                strokeDasharray={circumference}
                strokeDashoffset={offset}
                strokeLinecap="round"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums">
                {score}
              </span>
              <span className="text-[9px] uppercase font-bold text-zinc-400">
                / 100
              </span>
            </div>
          </div>

          {/* Title and 4 Pillar Progress Bars */}
          <div className="flex-1 w-full space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="font-bold text-sm text-zinc-900 dark:text-zinc-100 min-w-0">{t(titleCode)}</h4>
              <span className="text-xs font-semibold capitalize text-zinc-500 shrink-0 whitespace-nowrap">
                {pacingStatus === "under_budget"
                  ? t("pacingUnder")
                  : pacingStatus === "on_track"
                  ? t("pacingOnTrack")
                  : t("pacingOver")}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              {/* Pillar 1 */}
              <div>
                <div className="flex justify-between gap-1 text-[11px] text-zinc-500 mb-1">
                  <span className="truncate">{t("pillarBudget")}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {breakdown.budgetPacing}/40
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600 rounded-full transition-all"
                    style={{ width: `${(breakdown.budgetPacing / 40) * 100}%` }}
                  />
                </div>
              </div>

              {/* Pillar 2 */}
              <div>
                <div className="flex justify-between gap-1 text-[11px] text-zinc-500 mb-1">
                  <span className="truncate">{t("pillarLeaks")}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {breakdown.leakControl}/25
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{ width: `${(breakdown.leakControl / 25) * 100}%` }}
                  />
                </div>
              </div>

              {/* Pillar 3 */}
              <div>
                <div className="flex justify-between gap-1 text-[11px] text-zinc-500 mb-1">
                  <span className="truncate">{t("pillarSavings")}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {breakdown.savingsMomentum}/20
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${(breakdown.savingsMomentum / 20) * 100}%` }}
                  />
                </div>
              </div>

              {/* Pillar 4 */}
              <div>
                <div className="flex justify-between gap-1 text-[11px] text-zinc-500 mb-1">
                  <span className="truncate">{t("pillarConsistency")}</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 tabular-nums">
                    {breakdown.consistency}/15
                  </span>
                </div>
                <div className="h-1.5 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${(breakdown.consistency / 15) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personalized Insight Chips */}
        {insightCodes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              {t("diagnosticInsights")}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {insightCodes.map((insight, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 text-xs text-zinc-700 dark:text-zinc-300"
                >
                  {pacingStatus === "over_budget" && idx === 0 ? (
                    <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  )}
                  <span className="truncate" title={t(insight.code, insight.values)}>
                    {t(insight.code, insight.values)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
