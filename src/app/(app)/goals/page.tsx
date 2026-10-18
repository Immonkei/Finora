"use client";

import * as React from "react";
import { Target, Plus, Calendar, Trash2, Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { createSavingsGoal, contributeSavingsGoal, deleteSavingsGoal } from "@/features/goals/actions";
import { MilestoneRing } from "@/features/goals/components/milestone-ring";
import { fireConfetti } from "@/components/ui/confetti";

interface GoalItem {
  id: string;
  name: string;
  targetAmountMinor: bigint;
  savedAmountMinor: bigint;
  deadline: string;
  weeklyNeededMinor: bigint;
}

export default function GoalsPage() {
  const [goals, setGoals] = React.useState<GoalItem[]>([]);

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
            deadline: g.deadline ? formatDisplayDate(g.deadline) : "Open",
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
      toast.error("Please enter a goal name and valid target amount");
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
        toast.error("Failed to create goal", {
          description: res.error,
        });
        return;
      }

      loadGoals();
    } catch (err) {
      toast.error("Failed to create goal", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
      return;
    }

    const newGoal: GoalItem = {
      id: crypto.randomUUID(),
      name: goalName.trim(),
      targetAmountMinor: targetMinor,
      savedAmountMinor: BigInt(0),
      deadline: deadlineStr || "Open",
      weeklyNeededMinor: computeWeeklyNeeded(Number(targetMinor), 0, deadlineStr),
    };

    setGoals([...goals, newGoal]);
    setIsCreateOpen(false);
    setGoalName("");
    setTargetAmountStr("");
    setDeadlineStr("");

    toast.success("Savings Goal created!", {
      description: `Target ${formatMoney(targetMinor, "USD")} set for "${newGoal.name}"`,
    });
  };

  const handleContribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const amount = parseFloat(contributionStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
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
        toast.error("Failed to record contribution", {
          description: res.error,
        });
        return;
      }

      loadGoals();
    } catch (err) {
      toast.error("Failed to record contribution", {
        description: err instanceof Error ? err.message : "Unexpected error",
      });
      return;
    }

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
      toast.success("Goal Reached! 🏆🎉", {
        description: `Congratulations! You conquered your goal for "${contributeGoal.name}"!`,
      });
    } else {
      toast.success("Contribution recorded!", {
        description: `Added ${formatMoney(contributionMinor, "USD")} to "${contributeGoal.name}"`,
      });
    }
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the savings goal "${name}"?`)) {
      return;
    }

    try {
      const res = await deleteSavingsGoal({ goal_id: id });
      if (res.success) {
        setGoals((prev) => prev.filter((g) => g.id !== id));
        toast.success(`Savings goal "${name}" deleted`);
      } else {
        toast.error("Failed to delete goal", { description: res.error });
      }
    } catch {
      toast.error("Could not delete savings goal");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            Financial Targets
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Savings Goals
          </h1>
        </div>
        <Button
          size="lg"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto shadow-md shadow-brand-500/20"
        >
          <Plus className="h-5 w-5 mr-1" />
          Create Goal
        </Button>
      </div>

      {goals.length === 0 ? (
        <Card className="p-12 text-center border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center justify-center space-y-3">
            <span className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-accent-400">
              <Target className="h-6 w-6" />
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">No savings goals yet</h3>
              <p className="text-sm text-zinc-500 max-w-sm">
                Set a financial milestone like an emergency fund or travel budget, and track your progress weekly.
              </p>
            </div>
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="mt-2">
              <Plus className="h-4 w-4 mr-1" /> Create Goal
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const percent = Math.min(
            100,
            Math.round(Number((g.savedAmountMinor * 100n) / g.targetAmountMinor))
          );
          const isDone = g.savedAmountMinor >= g.targetAmountMinor;

          return (
            <Card
              key={g.id}
              className="relative overflow-hidden flex flex-col justify-between border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-brand-500/40 transition-all bg-white dark:bg-zinc-900"
            >
              <div>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50 leading-snug">
                        {g.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs text-zinc-500">
                        <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Target: {g.deadline}
                      </CardDescription>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteGoal(g.id, g.name)}
                      className="text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      title="Delete Goal"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4 pt-1">
                  {/* Visual Milestone Ring & Key Numbers */}
                  <div className="flex items-center gap-4 p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/60 dark:border-zinc-800/60">
                    <MilestoneRing percent={percent} size={92} strokeWidth={8} />

                    <div className="space-y-1 min-w-0 flex-1">
                      <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                        Accumulated
                      </p>
                      <div className="text-2xl font-black text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                        {formatMoney(g.savedAmountMinor, "USD")}
                      </div>
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums truncate">
                        Target: <strong>{formatMoney(g.targetAmountMinor, "USD")}</strong>
                      </div>
                      <div className="text-[11px] text-zinc-400 dark:text-zinc-500 tabular-nums truncate">
                        ≈ ៛{(Number(g.savedAmountMinor) * 41).toLocaleString()} / ៛{(Number(g.targetAmountMinor) * 41).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Pacing / Status badge */}
                  {!isDone ? (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-brand-50/70 dark:bg-brand-950/40 text-xs text-brand-900 dark:text-brand-200 border border-brand-200/50 dark:border-brand-800/40">
                      <TrendingUp className="h-4 w-4 text-brand-600 dark:text-accent-400 shrink-0" />
                      <span>
                        Pace: <strong>{formatMoney(g.weeklyNeededMinor, "USD")}/week</strong> needed
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-xs text-emerald-900 dark:text-emerald-200 border border-emerald-200/50 dark:border-emerald-800/40">
                      <Sparkles className="h-4 w-4 text-amber-500 shrink-0 animate-spin" />
                      <span>
                        <strong>Target Conquered!</strong> Milestone achieved.
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
                      toast.success("Milestone Celebrated! 🎉", {
                        description: `Great job conquering "${g.name}"!`,
                      });
                    }}
                    className="w-full border-amber-300 dark:border-amber-700 bg-amber-50/50 hover:bg-amber-100 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 font-semibold cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 mr-1.5 text-amber-500" />
                    Celebrate Milestone 🎉
                  </Button>
                ) : (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setContributeGoal(g)}
                    className="w-full font-semibold shadow-xs cursor-pointer"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Contribute Funds
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Create Savings Goal
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Goal Name
                </label>
                <Input
                  placeholder="e.g. Vacation, House Deposit, Bike"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Target Amount ($ USD)
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
                  Deadline (Optional)
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
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Goal
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contribute Modal */}
      {contributeGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                Contribute to Goal
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Adding funds toward &ldquo;{contributeGoal.name}&rdquo;
              </p>
            </div>
            <form onSubmit={handleContribute} className="space-y-4">
              {/* Quick Contribution Preset Chips */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">
                  Quick Presets
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
                      Full Remaining
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Contribution Amount ($ USD)
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
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Add Funds
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
