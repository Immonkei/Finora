"use client";

import * as React from "react";
import {
  Repeat,
  Plus,
  Play,
  CheckCircle2,
  Calendar,
  Power,
  CalendarClock,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";
import {
  createRecurringRule,
  toggleRecurringRule,
  processDueRecurringRules,
  deleteRecurringRule,
} from "@/features/recurring/actions";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { formatDisplayDate } from "@/lib/dates";
import { CashFlowTimeline } from "@/features/recurring/components/cash-flow-timeline";
import { projectUpcomingCharges } from "@/features/recurring/projection";
import { useMounted } from "@/lib/hooks";
import { useLocale, useT } from "@/lib/i18n";

type Frequency = "daily" | "weekly" | "monthly";

// Stored frequency codes stay English; only the label is translated
const FREQUENCY_KEYS = {
  daily: "freqDaily",
  weekly: "freqWeekly",
  monthly: "freqMonthly",
} as const;

// Option values are the stored category names; labels are translated
const CATEGORY_OPTIONS = [
  { value: "Housing & Bills", key: "catHousing" },
  { value: "Food & Drinks", key: "catFood" },
  { value: "Transport", key: "catTransport" },
  { value: "Entertainment", key: "catEntertainment" },
  { value: "Health & Medical", key: "catHealth" },
] as const;

interface RecurringRuleItem {
  id: string;
  name: string;
  amountMinor: bigint;
  currency: string;
  frequency: Frequency;
  /** Empty when the rule has no category; a fallback label is shown at render */
  category: string;
  rawNextRun: string;
  active: boolean;
}

type OptimisticRuleAction =
  | { type: "create"; rule: RecurringRuleItem }
  | { type: "toggle"; id: string; active: boolean }
  | { type: "delete"; id: string };

function RecurringSkeleton() {
  return (
    <div className="space-y-4 sm:space-y-6 animate-pulse">
      <div className="flex justify-between items-center">
        <div className="space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-8 w-52" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Skeleton className="h-36 w-full rounded-2xl" />
        <Skeleton className="h-36 w-full rounded-2xl" />
      </div>

      <Skeleton className="h-48 w-full rounded-2xl" />

      <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 p-4 space-y-4 bg-white dark:bg-zinc-900">
        <Skeleton className="h-6 w-36" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
              <Skeleton className="h-5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RecurringPage() {
  const t = useT("recurring");
  const tc = useT("common");
  const { dateLocale } = useLocale();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);
  const [isProcessing, setIsProcessing] = React.useState(false);

  // Form states
  const [name, setName] = React.useState("");
  const [amountStr, setAmountStr] = React.useState("");
  const [frequency, setFrequency] = React.useState<Frequency>("monthly");
  const [category, setCategory] = React.useState("Housing & Bills");

  const [rules, setRules] = React.useState<RecurringRuleItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // React 19 native useOptimistic
  const [optimisticRules, dispatchOptimisticRules] = React.useOptimistic<
    RecurringRuleItem[],
    OptimisticRuleAction
  >(rules, (current, action) => {
    if (action.type === "create") {
      return [action.rule, ...current];
    }
    if (action.type === "toggle") {
      return current.map((r) =>
        r.id === action.id ? { ...r, active: action.active } : r
      );
    }
    if (action.type === "delete") {
      return current.filter((r) => r.id !== action.id);
    }
    return current;
  });

  const loadRules = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: dbRules } = await supabase
        .from("recurring_rules")
        .select("*, categories(name)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (dbRules) {
        const formatted: RecurringRuleItem[] = dbRules.map((r) => {
          const cat = Array.isArray(r.categories) ? r.categories[0] : r.categories;
          return {
            id: r.id,
            name: r.note || "",
            amountMinor: BigInt(r.amount),
            currency: r.currency,
            frequency: r.frequency as Frequency,
            category: cat?.name || "",
            rawNextRun: r.next_run,
            active: r.active,
          };
        });
        setRules(formatted);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadRules();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRules]);

  // Supabase Realtime: sync recurring rules across tabs & devices
  useRealtimeTable({
    table: "recurring_rules",
    onUpdate: () => {
      loadRules();
    },
  });

  const isMounted = useMounted();
  const activeRules = optimisticRules.filter((r) => r.active);
  const totalMonthlyObligation = activeRules.reduce(
    (acc, r) => acc + r.amountMinor,
    BigInt(0)
  );

  const upcomingCharges = React.useMemo(() => {
    if (!isMounted) return [];
    return projectUpcomingCharges(
      optimisticRules.map((r) => ({
        id: r.id,
        name: r.name || t("defaultName"),
        amountMinor: r.amountMinor,
        currency: r.currency,
        frequency: r.frequency,
        category: r.category || t("catHousing"),
        nextRunDate: r.rawNextRun,
        active: r.active,
      }))
    );
  }, [optimisticRules, isMounted, t]);

  const handleToggle = async (id: string, currentState: boolean) => {
    React.startTransition(() => {
      dispatchOptimisticRules({ type: "toggle", id, active: !currentState });
    });
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, active: !currentState } : r))
    );
    await toggleRecurringRule(id, !currentState);
    toast.success(currentState ? t("pausedToast") : t("activatedToast"), {
      description: currentState ? t("pausedDescription") : t("activatedDescription"),
    });
  };

  const handleDeleteRule = async (id: string, ruleName: string) => {
    if (!window.confirm(t("confirmDelete", { name: ruleName }))) {
      return;
    }

    try {
      const res = await deleteRecurringRule(id);
      if (res.success) {
        React.startTransition(() => {
          dispatchOptimisticRules({ type: "delete", id });
        });
        setRules((prev) => prev.filter((r) => r.id !== id));
        toast.success(t("deletedToast", { name: ruleName }));
      } else {
        toast.error(t("deleteFailed"), { description: res.error });
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  const handleProcessDue = async () => {
    setIsProcessing(true);
    const res = await processDueRecurringRules();
    setIsProcessing(false);

    if (res.success) {
      toast.success(t("checkedToast"), {
        description: t("processedDescription", { count: res.data?.processedCount || 0 }),
      });
      loadRules();
    } else {
      toast.error(t("processFailed"), { description: res.error });
    }
  };

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amountStr);
    if (isNaN(num) || num <= 0) {
      toast.error(t("invalidAmount"));
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    const newRule: RecurringRuleItem = {
      id: crypto.randomUUID(),
      name: name || "Subscription",
      amountMinor: BigInt(Math.round(num * 100)),
      currency: "USD",
      frequency,
      category,
      rawNextRun: todayStr,
      active: true,
    };
    React.startTransition(() => {
      dispatchOptimisticRules({ type: "create", rule: newRule });
    });
    setRules((prev) => [newRule, ...prev]);

    const res = await createRecurringRule({
      type: "expense",
      amount: num,
      currency: "USD",
      frequency,
      start_date: todayStr,
      note: name || "Subscription",
      account_id: "00000000-0000-0000-0000-000000000001",
    });

    if (res.success) {
      toast.success(t("createdToast"), {
        description: t("createdDescription", { name: name || t("defaultName") }),
      });
      setIsDialogOpen(false);
      setName("");
      setAmountStr("");
      loadRules();
    } else {
      toast.error(t("createFailed"), { description: res.error });
    }
  };

  if (isLoading && rules.length === 0) {
    return <RecurringSkeleton />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
        </div>
        <div className="mobile-scroll-x flex gap-2">
          <Button
            variant="outline"
            onClick={handleProcessDue}
            disabled={isProcessing}
            className="gap-2 whitespace-nowrap"
          >
            <Play className="h-4 w-4 text-brand-600 dark:text-accent-400" />
            {isProcessing ? t("processing") : t("processDue")}
          </Button>
          <Button onClick={() => setIsDialogOpen(true)} className="gap-2 whitespace-nowrap">
            <Plus className="h-4 w-4" /> {t("addRule")}
          </Button>
        </div>
      </div>

      {/* Top Banner Stats */}
      <div className="mobile-carousel grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="bg-gradient-to-br from-brand-900 via-[#0e2a3e] to-[#081420] text-white border border-brand-800/60 shadow-lg">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-brand-200/90 uppercase tracking-wider font-bold">
                {t("monthlyObligation")}
              </span>
              <Repeat className="h-4 w-4 text-accent-300" />
            </div>
            <CardTitle className="text-2xl sm:text-4xl font-extrabold text-white mt-1.5 tabular-nums tracking-tight">
              {formatMoney(totalMonthlyObligation, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-brand-200/80">
              {t("totalCommitted", { count: activeRules.length })}
            </p>
          </CardContent>
        </Card>

        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">{t("automationStatus")}</CardDescription>
            <CardTitle className="text-lg font-bold flex items-center gap-2 mt-1">
              <CheckCircle2 className="h-5 w-5 text-accent-500 shrink-0" /> {t("autoLoggingEnabled")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("automationHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 30-Day Upcoming Cash Flow & Bills Timeline */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-brand-600 dark:text-accent-400 shrink-0" />
            {t("upcomingTitle")}
          </CardTitle>
          <CardDescription>
            {t("upcomingSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CashFlowTimeline charges={upcomingCharges} />
        </CardContent>
      </Card>

      {/* Rules List */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold">{t("rulesTitle")}</CardTitle>
          <CardDescription>
            {t("rulesSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800 p-0">
          {optimisticRules.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 space-y-2">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {t("emptyTitle")}
              </p>
              <p className="text-xs text-zinc-400">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center justify-between gap-2 p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-xs font-bold ${
                    rule.active
                      ? "bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-accent-400"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                  }`}
                >
                  <Repeat className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p
                      className={`font-medium text-sm truncate ${
                        rule.active
                          ? "text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-400 line-through"
                      }`}
                    >
                      {rule.name || t("defaultName")}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase shrink-0 whitespace-nowrap">
                      {t(FREQUENCY_KEYS[rule.frequency] ?? "freqMonthly")}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="truncate">{rule.category || t("catHousing")}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 whitespace-nowrap">
                      <Calendar className="h-3 w-3" />{" "}
                      {t("nextRun", {
                        date: formatDisplayDate(rule.rawNextRun, undefined, dateLocale),
                      })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mr-1 whitespace-nowrap">
                  {formatMoney(rule.amountMinor, "USD")}
                </p>
                <Button
                  variant={rule.active ? "outline" : "secondary"}
                  size="sm"
                  onClick={() => handleToggle(rule.id, rule.active)}
                  className="text-xs h-8 whitespace-nowrap"
                >
                  <Power className="h-3.5 w-3.5 mr-1" />
                  {rule.active ? t("pause") : t("resume")}
                </Button>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(rule.id, rule.name)}
                  className="text-zinc-400 hover:text-rose-500 dark:hover:text-rose-400 p-1.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title={t("deleteRule")}
                  aria-label={t("deleteRule")}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
        </CardContent>
      </Card>

      {/* Add Rule Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="mobile-sheet w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 space-y-4">
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {t("newRuleTitle")}
            </h2>
            <form onSubmit={handleCreateRule} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("nameLabel")}
                </label>
                <Input
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("amountLabel")}
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
                  {t("frequencyLabel")}
                </label>
                <select
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as Frequency)
                  }
                  className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm"
                >
                  <option value="monthly">{t("optionMonthly")}</option>
                  <option value="weekly">{t("optionWeekly")}</option>
                  <option value="daily">{t("optionDaily")}</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {tc("category")}
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 text-sm"
                >
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {t(opt.key)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  {tc("cancel")}
                </Button>
                <Button type="submit" className="flex-1">
                  {t("saveRule")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
