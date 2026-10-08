"use client";

import * as React from "react";
import { Target, Plus, Calendar, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

interface GoalItem {
  id: string;
  name: string;
  targetAmountMinor: bigint;
  savedAmountMinor: bigint;
  deadline: string;
  weeklyNeededMinor: bigint;
}

export default function GoalsPage() {
  const [goals, setGoals] = React.useState<GoalItem[]>([
    {
      id: "1",
      name: "Emergency Fund",
      targetAmountMinor: BigInt(200000), // $2,000.00
      savedAmountMinor: BigInt(125000),  // $1,250.00
      deadline: "Dec 31, 2026",
      weeklyNeededMinor: BigInt(6250),   // $62.50 / week
    },
    {
      id: "2",
      name: "New Laptop",
      targetAmountMinor: BigInt(120000), // $1,200.00
      savedAmountMinor: BigInt(48000),   // $480.00
      deadline: "Nov 30, 2026",
      weeklyNeededMinor: BigInt(9000),   // $90.00 / week
    },
    {
      id: "3",
      name: "Vacation Trip (Siem Reap)",
      targetAmountMinor: BigInt(50000),  // $500.00
      savedAmountMinor: BigInt(35000),   // $350.00
      deadline: "Jan 15, 2027",
      weeklyNeededMinor: BigInt(1150),   // $11.50 / week
    },
  ]);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [contributeGoal, setContributeGoal] = React.useState<GoalItem | null>(null);

  // Form states
  const [goalName, setGoalName] = React.useState("");
  const [targetAmountStr, setTargetAmountStr] = React.useState("");
  const [deadlineStr, setDeadlineStr] = React.useState("");
  const [contributionStr, setContributionStr] = React.useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(targetAmountStr);
    if (!goalName.trim() || isNaN(target) || target <= 0) {
      toast.error("Please enter a goal name and valid target amount");
      return;
    }

    const targetMinor = BigInt(Math.round(target * 100));
    const newGoal: GoalItem = {
      id: crypto.randomUUID(),
      name: goalName.trim(),
      targetAmountMinor: targetMinor,
      savedAmountMinor: BigInt(0),
      deadline: deadlineStr || "Open",
      weeklyNeededMinor: targetMinor / 12n,
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

  const handleContribute = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contributeGoal) return;
    const amount = parseFloat(contributionStr);
    if (isNaN(amount) || amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const contributionMinor = BigInt(Math.round(amount * 100));

    setGoals((prev) =>
      prev.map((g) =>
        g.id === contributeGoal.id
          ? {
              ...g,
              savedAmountMinor: g.savedAmountMinor + contributionMinor,
            }
          : g
      )
    );

    const updatedSaved = contributeGoal.savedAmountMinor + contributionMinor;
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
          <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Financial Targets
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Savings Goals
          </h1>
        </div>
        <Button
          size="lg"
          onClick={() => setIsCreateOpen(true)}
          className="w-full sm:w-auto shadow-md shadow-emerald-500/10"
        >
          <Plus className="h-5 w-5 mr-1" />
          Create Goal
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {goals.map((g) => {
          const percent = Math.min(
            100,
            Math.round(Number((g.savedAmountMinor * 100n) / g.targetAmountMinor))
          );
          const isDone = g.savedAmountMinor >= g.targetAmountMinor;

          return (
            <Card key={g.id} className="relative overflow-hidden flex flex-col justify-between">
              <div>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={`p-2 rounded-xl ${
                        isDone
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                          : "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="h-5 w-5" />
                      ) : (
                        <Target className="h-5 w-5" />
                      )}
                    </span>
                    <Badge
                      variant={isDone ? "default" : "outline"}
                      className="text-xs font-semibold"
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
                      <span className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50">
                        {formatMoney(g.savedAmountMinor, "USD")}
                      </span>
                      <span className="text-xs text-zinc-400">
                        of {formatMoney(g.targetAmountMinor, "USD")}
                      </span>
                    </div>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          isDone ? "bg-emerald-500" : "bg-emerald-600"
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
