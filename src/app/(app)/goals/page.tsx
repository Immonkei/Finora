"use client";

import * as React from "react";
import { Target, Plus, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { createSavingsGoal, contributeSavingsGoal } from "@/features/goals/actions";

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
      toast.success("Goal Reached! 🎉", {
        description: `Congratulations! You have reached your goal for "${contributeGoal.name}"!`,
      });
    } else {
      toast.success("Contribution recorded!", {
        description: `Added ${formatMoney(contributionMinor, "USD")} to "${contributeGoal.name}"`,
      });
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
            <Card key={g.id} className="relative overflow-hidden flex flex-col justify-between border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`p-2 rounded-xl ${
                        isDone
                          ? "bg-accent-100 text-accent-800 dark:bg-accent-950/70 dark:text-accent-300"
                          : "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-accent-400"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Target className="h-5 w-5" />
                      )}
                    </span>
                    <Badge
                      variant={isDone ? "accent" : "outline"}
                      className="text-xs font-semibold tabular-nums"
                    >
                      {percent}% Saved
                    </Badge>
                  </div>
                  <CardTitle className="text-lg font-bold mt-2">{g.name}</CardTitle>
                  <CardDescription className="flex items-center gap-1.5 text-xs">
                    <Calendar className="h-3.5 w-3.5 text-zinc-400" /> Target: {g.deadline}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between items-baseline mb-1">
                      <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight">
                        {formatMoney(g.savedAmountMinor, "USD")}
                      </span>
                      <span className="text-xs text-zinc-400 tabular-nums">
                        of {formatMoney(g.targetAmountMinor, "USD")}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? "bg-accent-500" : "bg-brand-600"
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {!isDone && (
                    <div className="p-2.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 text-xs text-zinc-600 dark:text-zinc-400">
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {formatMoney(g.weeklyNeededMinor, "USD")} / week
                      </span>{" "}
                      needed to reach deadline
                    </div>
                  )}
                </CardContent>
              </div>

              <div className="p-5 pt-0">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setContributeGoal(g)}
                  className="w-full"
                  disabled={isDone}
                >
                  {isDone ? "Goal Completed!" : "Contribute"}
                </Button>
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
