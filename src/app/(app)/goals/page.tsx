"use client";

import * as React from "react";
import { Target, Plus, Calendar, Trash2, TrendingUp, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { createSavingsGoal, contributeSavingsGoal, deleteSavingsGoal } from "@/features/goals/actions";
import { MilestoneRing, getMilestoneTier } from "@/features/goals/components/milestone-ring";
import { fireConfetti } from "@/components/ui/confetti";
import { useLocale, useT } from "@/lib/i18n";

interface GoalItem {
  id: string;
  name: string;
  targetAmountMinor: bigint;
  savedAmountMinor: bigint;
  /** Raw "YYYY-MM-DD" deadline, or null for an open-ended goal; formatted at render */
  deadline: string | null;
  weeklyNeededMinor: bigint;
}

type OptimisticGoalAction =
  | { type: "create"; goal: GoalItem }
  | { type: "contribute"; id: string; amountMinor: bigint }
  | { type: "delete"; id: string };

function GoalsSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-44" />
        </div>
        <Skeleton className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-6 rounded-2xl border border-zinc-200 dark:border-zinc-800 space-y-4 bg-white dark:bg-zinc-900">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="h-14 w-14 rounded-full" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
            <div className="flex justify-between pt-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-24 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GoalsPage() {
  const t = useT("goals");
  const tc = useT("common");
  const { dateLocale } = useLocale();
  const [goals, setGoals] = React.useState<GoalItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // React 19 native useOptimistic
  const [optimisticGoals, dispatchOptimisticGoals] = React.useOptimistic<
    GoalItem[],
    OptimisticGoalAction
  >(goals, (current, action) => {
    if (action.type === "create") {
      return [action.goal, ...current];
    }
    if (action.type === "contribute") {
      return current.map((g) => {
        if (g.id !== action.id) return g;
        const newSaved = g.savedAmountMinor + action.amountMinor;
        return {
          ...g,
          savedAmountMinor: newSaved,
          weeklyNeededMinor: computeWeeklyNeeded(
            Number(g.targetAmountMinor),
            Number(newSaved),
            g.deadline
          ),
        };
      });
    }
    if (action.type === "delete") {
      return current.filter((g) => g.id !== action.id);
    }
    return current;
  });

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [contributeGoal, setContributeGoal] = React.useState<GoalItem | null>(null);

  // Form states
  const [goalName, setGoalName] = React.useState("");
  const [targetAmountStr, setTargetAmountStr] = React.useState("");
  const [deadlineStr, setDeadlineStr] = React.useState("");
  const [contributionStr, setContributionStr] = React.useState("");

  function computeWeeklyNeeded(
    target: number,
    saved: number,
    deadlineStr?: string | null
  ): bigint {
    const remaining = Math.max(0, target - saved);
    if (remaining === 0) return 0n;
    if (!deadlineStr) {
      return BigInt(Math.max(1, Math.round(remaining / 12)));
    }
    const targetDate = new Date(deadlineStr);
    const now = new Date();
    const diffMs = targetDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.max(1, Math.ceil(diffDays / 7));
    return BigInt(Math.max(1, Math.round(remaining / diffWeeks)));
  }

  const loadGoals = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbGoals } = await supabase
        .from("savings_goals")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dbGoals) {
        setGoals(
          dbGoals.map((g) => ({
            id: g.id,
            name: g.name,
            targetAmountMinor: BigInt(g.target_amount),
            savedAmountMinor: BigInt(g.saved_amount),
            deadline: g.deadline ?? null,
            weeklyNeededMinor: computeWeeklyNeeded(
              g.target_amount,
              g.saved_amount,
              g.deadline
            ),
          }))
        );
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadGoals();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadGoals]);

  // Supabase Realtime: sync savings goals across tabs & devices
  useRealtimeTable({
    table: "savings_goals",
    onUpdate: () => {
      loadGoals();
    },
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmountStr);
    if (!goalName.trim() || isNaN(target) || target <= 0) {
      toast.error(t("invalidGoal"));
      return;
    }

    const targetMinor = BigInt(Math.round(target * 100));

    try {
      const res = await createSavingsGoal({
        name: goalName.trim(),
        target_amount: Number(targetMinor),
        saved_amount: 0,
        deadline: deadlineStr || null,
      });

      if (!res.success) {
        toast.error(t("createFailed"), {
          description: res.error,
        });
        return;
      }

      loadGoals();
    } catch (err) {
      toast.error(t("createFailed"), {
        description: err instanceof Error ? err.message : t("unexpectedError"),
      });
      return;
    }

    const newGoal: GoalItem = {
      id: crypto.randomUUID(),
      name: goalName.trim(),
      targetAmountMinor: targetMinor,
      savedAmountMinor: BigInt(0),
      deadline: deadlineStr || null,
      weeklyNeededMinor: computeWeeklyNeeded(Number(targetMinor), 0, deadlineStr),
    };

    React.startTransition(() => {
      dispatchOptimisticGoals({ type: "create", goal: newGoal });
    });
    setGoals([...goals, newGoal]);
    setIsCreateOpen(false);
    setGoalName("");
    setTargetAmountStr("");
    setDeadlineStr("");

    toast.success(t("createdToast"), {
      description: t("createdDescription", {
        amount: formatMoney(targetMinor, "USD"),
        name: newGoal.name,
      }),
    });
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const amount = parseFloat(contributionStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }

    const contributionMinor = BigInt(Math.round(amount * 100));
    const updatedSaved = contributeGoal.savedAmountMinor + contributionMinor;

    try {
      const res = await contributeSavingsGoal({
        goal_id: contributeGoal.id,
        amount: Number(contributionMinor),
      });

      if (!res.success) {
        toast.error(t("contributeFailed"), {
          description: res.error,
        });
        return;
      }

      loadGoals();
    } catch (err) {
      toast.error(t("contributeFailed"), {
        description: err instanceof Error ? err.message : t("unexpectedError"),
      });
      return;
    }

    React.startTransition(() => {
      dispatchOptimisticGoals({
        type: "contribute",
        id: contributeGoal.id,
        amountMinor: contributionMinor,
      });
    });
    setGoals((prev) =>
      prev.map((g) =>
        g.id === contributeGoal.id
          ? {
              ...g,
              savedAmountMinor: updatedSaved,
            }
          : g
      )
    );

    const isCompleted = updatedSaved >= contributeGoal.targetAmountMinor;

    setContributeGoal(null);
    setContributionStr("");

    if (isCompleted) {
      fireConfetti({ particleCount: 160 });
      toast.success(t("goalReachedToast"), {
        description: t("goalReachedDescription", { name: contributeGoal.name }),
      });
    } else {
      toast.success(t("contributedToast"), {
        description: t("contributedDescription", {
          amount: formatMoney(contributionMinor, "USD"),
          name: contributeGoal.name,
        }),
      });
    }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!window.confirm(t("confirmDelete", { name }))) {
      return;
    }

    try {
      const res = await deleteSavingsGoal({ goal_id: id });
      if (res.success) {
        React.startTransition(() => {
          dispatchOptimisticGoals({ type: "delete", id });
        });
        setGoals((prev) => prev.filter((g) => g.id !== id));
        toast.success(t("deletedToast", { name }));
      } else {
        toast.error(t("deleteFailed"), { description: res.error });
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  if (isLoading && goals.length === 0) {
    return <GoalsSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
        </div>
        <Button
          size="lg"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto shadow-md shadow-brand-500/20"
        >
          <Plus className="h-5 w-5 mr-1" />
          {t("createGoal")}
        </Button>
      </div>

      {optimisticGoals.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center justify-center space-y-3">
            <span className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-accent-400">
              <Target className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("emptyTitle")}</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                {t("emptyHint")}
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-1" /> {t("createGoal")}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {optimisticGoals.map((g) => {
          const percent = Math.min(
            100,
            Math.round(Number((g.savedAmountMinor * 100n) / g.targetAmountMinor))
          );
          const isDone = g.savedAmountMinor >= g.targetAmountMinor;
          const tier = getMilestoneTier(percent);
          const khrSaved = Number(g.savedAmountMinor) * 41;
          const khrTarget = Number(g.targetAmountMinor) * 41;

          return (
            <Card
              key={g.id}
              className="relative overflow-hidden flex flex-col justify-between border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-brand-500/40 hover:shadow-md transition-all bg-white dark:bg-zinc-900 rounded-2xl"
            >
              <div>
                <CardHeader className="pb-3 pt-5 px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-accent-400 border border-brand-100 dark:border-brand-900/50 shrink-0">
                        <Target className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-snug truncate">
                            {g.name}
                          </CardTitle>
                          <span
                            className={cn(
                              "text-[10px] font-semibold px-2 py-0.5 rounded-full border shadow-2xs inline-flex items-center gap-1 shrink-0",
                              tier.badgeColor
                            )}
                          >
                            {React.createElement(tier.icon, { className: "h-2.5 w-2.5 shrink-0" })}
                            <span className="whitespace-nowrap">{t(tier.labelKey)}</span>
                          </span>
                        </div>
                        <CardDescription className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <Calendar className="h-3.5 w-3.5 text-zinc-400 shrink-0" />{" "}
                          {t("targetDate", {
                            date: g.deadline
                              ? formatDisplayDate(g.deadline, undefined, dateLocale)
                              : t("openTarget"),
                          })}
                        </CardDescription>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id, g.name)}
                      className="text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                      title={t("deleteGoal")}
                      aria-label={t("deleteGoal")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3.5 pt-0 px-5">
                  {/* Visual Milestone Ring & Key Numbers */}
                  <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/70 dark:border-zinc-800">
                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                        {t("accumulated")}
                      </p>
                      <div className="text-xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                        {formatMoney(g.savedAmountMinor, "USD")}
                      </div>
                      <div className="text-xs text-zinc-600 dark:text-zinc-300 font-medium tabular-nums">
                        {t("target")} <span className="font-bold text-zinc-900 dark:text-zinc-100">{formatMoney(g.targetAmountMinor, "USD")}</span>
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums">
                        ≈ ៛{khrSaved.toLocaleString()} / ៛{khrTarget.toLocaleString()}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center justify-center">
                      <MilestoneRing percent={percent} size={80} strokeWidth={7} showMilestoneBadge={false} />
                    </div>
                  </div>

                  {/* Pacing / Status badge */}
                  {!isDone ? (
                    <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 text-xs">
                      <div className="flex items-center gap-2 text-brand-900 dark:text-brand-200 font-medium">
                        <TrendingUp className="h-3.5 w-3.5 text-brand-600 dark:text-accent-400 shrink-0" />
                        <span>{t("weeklyPace")}</span>
                      </div>
                      <span className="font-bold text-brand-700 dark:text-accent-300 tabular-nums whitespace-nowrap">
                        {t("perWeek", { amount: formatMoney(g.weeklyNeededMinor, "USD") })}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between p-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-800/40 text-xs">
                      <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-200 font-medium">
                        <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                        <span>{t("milestoneConquered")}</span>
                      </div>
                      <span className="font-bold text-emerald-700 dark:text-emerald-300 whitespace-nowrap">
                        {t("achieved")}
                      </span>
                    </div>
                  )}
                </CardContent>
              </div>

              {/* Action Button */}
              <div className="p-5 pt-0">
                {isDone ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      fireConfetti({ particleCount: 150 });
                      toast.success(t("celebratedToast"), {
                        description: t("celebratedDescription", { name: g.name }),
                      });
                    }}
                    className="w-full h-10 border-amber-300 dark:border-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold cursor-pointer rounded-xl"
                  >
                    <Trophy className="h-4 w-4 mr-1.5 text-amber-500" />
                    {t("celebrateMilestone")}
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setContributeGoal(g)}
                    className="w-full h-10 font-semibold shadow-xs cursor-pointer rounded-xl"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("contributeFunds")}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
        </div>
      )}

      {/* Create Goal Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="mobile-sheet w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t("createTitle")}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("goalName")}
                </label>
                <Input
                  placeholder={t("goalNamePlaceholder")}
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("targetAmount")}
                </label>
                <Input
                  type="number"
                  step="1"
                  placeholder="1000"
                  value={targetAmountStr}
                  onChange={(e) => setTargetAmountStr(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("deadlineOptional")}
                </label>
                <Input
                  type="date"
                  value={deadlineStr}
                  onChange={(e) => setDeadlineStr(e.target.value)}
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="flex-1"
                >
                  {tc("cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {t("saveGoal")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="mobile-sheet w-full max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {t("contributeTitle")}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {t("addingFundsToward", { name: contributeGoal.name })}
              </p>
            </div>
            <form onSubmit={handleContribute} className="space-y-4">
              {/* Quick Contribution Preset Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  {t("quickPresets")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[10, 25, 50, 100].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setContributionStr(preset.toString())}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors cursor-pointer"
                    >
                      +${preset}
                    </button>
                  ))}
                  {contributeGoal && (
                    <button
                      type="button"
                      onClick={() => {
                        const remaining = Math.max(
                          0,
                          Number(contributeGoal.targetAmountMinor - contributeGoal.savedAmountMinor) / 100
                        );
                        setContributionStr(remaining.toFixed(2));
                      }}
                      className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-brand-50 hover:bg-brand-100 dark:bg-brand-950/60 text-brand-700 dark:text-accent-300 transition-colors cursor-pointer"
                    >
                      {t("fullRemaining")}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("contributionAmount")}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="50.00"
                  value={contributionStr}
                  onChange={(e) => setContributionStr(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setContributeGoal(null)}
                  className="flex-1"
                >
                  {tc("cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {t("addFunds")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
