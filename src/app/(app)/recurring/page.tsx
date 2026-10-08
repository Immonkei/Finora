"use client";

import * as React from "react";
import {
  Repeat,
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  Power,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import { processDueRecurringRules } from "@/features/recurring/actions";

interface RecurringRuleItem {
  id: string;
  name: string;
  amountMinor: bigint;
  currency: string;
  frequency: "daily" | "weekly" | "monthly";
  category: string;
  nextRun: string;
  active: boolean;
}

export default function RecurringPage() {
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [amountStr, setAmountStr] = React.useState("");
  const [frequency, setFrequency] = React.useState<"daily" | "weekly" | "monthly">("monthly");
  const [category, setCategory] = React.useState("Housing & Bills");

  const [rules, setRules] = React.useState<RecurringRuleItem[]>([
    {
      id: "rec-1",
      name: "Apartment Rent",
      amountMinor: BigInt(25000), // $250.00
      currency: "USD",
      frequency: "monthly",
      category: "Housing & Bills",
      nextRun: "Nov 1, 2026",
      active: true,
    },
    {
      id: "rec-2",
      name: "High-Speed Fiber Internet",
      amountMinor: BigInt(3000), // $30.00
      currency: "USD",
      frequency: "monthly",
      category: "Housing & Bills",
      nextRun: "Nov 5, 2026",
      active: true,
    },
    {
      id: "rec-3",
      name: "Spotify Premium & Cloud",
      amountMinor: BigInt(1099), // $10.99
      currency: "USD",
      frequency: "monthly",
      category: "Entertainment",
      nextRun: "Oct 15, 2026",
      active: true,
    },
    {
      id: "rec-4",
      name: "Gym & Fitness Membership",
      amountMinor: BigInt(2000), // $20.00
      currency: "USD",
      frequency: "monthly",
      category: "Health & Medical",
      nextRun: "Oct 20, 2026",
      active: false,
    },
  ]);

  const activeRules = rules.filter((r) => r.active);
  const totalMonthlyObligation = activeRules.reduce(
    (acc, r) => acc + r.amountMinor,
    BigInt(0)
  );

  const handleToggle = (id: string, currentState: boolean) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !currentState } : r))
    );
    toast.success(
      currentState ? "Rule paused" : "Rule activated",
      {
        description: currentState
          ? "Transactions will not be auto-created"
          : "Transactions will be auto-generated on due dates",
      }
    );
  };

  const handleProcessDue = async () => {
    setIsProcessing(true);
    const res = await processDueRecurringRules();
    setIsProcessing(false);

    if (res.success) {
      toast.success("Recurring rules checked!", {
        description: `Processed ${res.data?.processedCount || 0} due transaction(s).`,
      });
    } else {
      toast.error("Process failed", { description: res.error });
    }
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const newRule: RecurringRuleItem = {
      id: crypto.randomUUID(),
      name: name || "Subscription",
      amountMinor: BigInt(Math.round(num * 100)),
      currency: "USD",
      frequency,
      category,
      nextRun: "Nov 1, 2026",
      active: true,
    };

    setRules([newRule, ...rules]);
    setIsDialogOpen(false);
    setName("");
    setAmountStr("");

    toast.success("Recurring rule created!", {
      description: `${newRule.name} scheduled for ${newRule.frequency} execution.`,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
            Subscriptions & Bills
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            Recurring Expenses
          </h1>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="gap-2"
          >
            <Play className="h-4 w-4 text-emerald-600" />
            {isProcessing ? "Processing..." : "Process Due"}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" /> Add Rule
          </Button>
        </div>
      </div>

      {/* Top Banner Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-950 text-white border-0 shadow-md">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400 uppercase tracking-wider font-semibold">
                Monthly Obligation
              </span>
              <Repeat className="h-4 w-4 text-emerald-400" />
            </div>
            <CardTitle className="text-3xl sm:text-4xl font-extrabold text-white mt-1">
              {formatMoney(totalMonthlyObligation, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-400">
              Total committed across {activeRules.length} active repeating rules
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Automation Status</CardDescription>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" /> Auto-Logging Enabled
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Transactions are scheduled via pg_cron and idempotent checks prevent duplicate entries.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rules List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">Recurring Rules</CardTitle>
          <CardDescription>
            Active subscriptions and repeating bills automatically logged
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800 p-0">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                    rule.active
                      ? "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <Repeat className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p
                      className={`font-medium text-sm ${
                        rule.active
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 line-through"
                      }`}
                    >
                      {rule.name}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {rule.frequency}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span>{rule.category}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" /> Next: {rule.nextRun}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  {formatMoney(rule.amountMinor, "USD")}
                </p>
                <Button
                  variant={rule.active ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => handleToggle(rule.id, rule.active)}
                  className="text-xs h-8"
                >
                  <Power className="h-3.5 w-3.5 mr-1" />
                  {rule.active ? "Pause" : "Resume"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              New Recurring Rule
            </h2>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Subscription or Bill Name
                </label>
                <Input
                  placeholder="e.g. Netflix, Gym, Rent"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Amount ($ USD)
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="15.00"
                  value={amountStr}
                  onChange={(e) => setAmountStr(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Frequency
                </label>
                <select
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as "daily" | "weekly" | "monthly")
                  }
                  className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm"
                >
                  <option value="monthly">Monthly (e.g. 1st of month)</option>
                  <option value="weekly">Weekly (every 7 days)</option>
                  <option value="daily">Daily</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm"
                >
                  <option value="Housing & Bills">Housing & Bills</option>
                  <option value="Food & Drinks">Food & Drinks</option>
                  <option value="Transport">Transport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Health & Medical">Health & Medical</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" className="flex-1">
                  Save Rule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
