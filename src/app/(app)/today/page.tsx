"use client";

import * as React from "react";
import { ArrowDownLeft, Sparkles, TrendingUp, Wallet, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, calculateDailyAllowance } from "@/lib/money";
import { formatDisplayDate, getDaysLeftInMonth } from "@/lib/dates";
import { useMounted } from "@/lib/hooks";
import { useLocale, useT } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { toast } from "sonner";
import { deleteTransaction, restoreTransaction } from "@/features/transactions/actions";
import {
  EditTransactionDialog,
  type EditableTransaction,
} from "@/features/transactions/components/edit-transaction-dialog";

interface DisplayTx {
  id: string;
  note: string;
  category: string;
  categoryColor: string;
  amountMinor: bigint;
  type: "expense" | "income" | "transfer";
  time: string;
}

export default function TodayPage() {
  const t = useT("today");
  const tc = useT("common");
  const { dateLocale } = useLocale();
  const [editingTx, setEditingTx] = React.useState<EditableTransaction | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);
  const isMounted = useMounted();
  const currentDate = isMounted ? new Date() : null;
  const daysLeft = currentDate ? getDaysLeftInMonth(currentDate) : 23;

  const [liveData, setLiveData] = React.useState<{
    transactions: DisplayTx[];
    spentTodayMinor: bigint;
    monthlyBudgetMinor: bigint;
    monthlySpentMinor: bigint;
  } | null>(null);

  const loadTodayData = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
      const endOfDay = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
      ).toISOString();

      const { data: txs } = await supabase
        .from("transactions")
        .select("*, categories(name, color)")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .gte("occurred_at", startOfDay)
        .lte("occurred_at", endOfDay)
        .order("occurred_at", { ascending: false });

      const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      const { data: budget } = await supabase
        .from("budgets")
        .select("total_limit")
        .eq("user_id", user.id)
        .eq("month", currentMonthStr)
        .maybeSingle();

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: monthTxs } = await supabase
        .from("transactions")
        .select("base_amount")
        .eq("user_id", user.id)
        .eq("type", "expense")
        .is("deleted_at", null)
        .gte("occurred_at", startOfMonth);

      let spentToday = BigInt(0);
      const formattedTxs: DisplayTx[] = (txs || []).map((t) => {
        if (t.type === "expense") spentToday += BigInt(t.base_amount);
        const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
        return {
          id: t.id,
          note: t.note || "Expense",
          category: cat?.name || "Uncategorized",
          categoryColor: cat?.color || "#10B981",
          amountMinor: BigInt(t.amount),
          type: t.type as "expense" | "income" | "transfer",
          time: new Date(t.occurred_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
        };
      });

      let spentMonth = BigInt(0);
      (monthTxs || []).forEach((t) => {
        spentMonth += BigInt(t.base_amount);
      });

      const budgetMinor = budget ? BigInt(budget.total_limit) : 0n;

      setLiveData({
        transactions: formattedTxs,
        spentTodayMinor: spentToday,
        monthlyBudgetMinor: budgetMinor,
        monthlySpentMinor: spentMonth,
      });
    } catch {
      // Fallback
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadTodayData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTodayData]);

  // Supabase Realtime: sync live transactions across tabs & devices instantly
  useRealtimeTable({
    table: "transactions",
    onUpdate: () => {
      loadTodayData();
    },
  });

  const handleDelete = async (tx: DisplayTx) => {
    if (liveData) {
      setLiveData({
        ...liveData,
        transactions: liveData.transactions.filter((item) => item.id !== tx.id),
        spentTodayMinor:
          tx.type === "expense"
            ? liveData.spentTodayMinor - tx.amountMinor
            : liveData.spentTodayMinor,
      });
    }
    await deleteTransaction(tx.id);

    toast(t("deletedToast"), {
      description: t("deletedDescription", { note: tx.note, amount: formatMoney(tx.amountMinor, "USD") }),
      duration: 10000,
      action: {
        label: tc("undo"),
        onClick: async () => {
          await restoreTransaction(tx.id);
          loadTodayData();
          toast.success(t("restoredToast"));
        },
      },
    });
  };

  const handleEditClick = (tx: DisplayTx) => {
    setEditingTx({
      id: tx.id,
      note: tx.note,
      amount: Number(tx.amountMinor) / 100,
      currency: "USD",
      category: tx.category,
      type: tx.type,
      date: new Date().toISOString(),
    });
    setIsEditOpen(true);
  };

  const monthlyBudgetMinor = liveData ? liveData.monthlyBudgetMinor : 0n;
  const monthlySpentMinor = liveData ? liveData.monthlySpentMinor : 0n;
  const remainingBudgetMinor =
    monthlyBudgetMinor > monthlySpentMinor ? monthlyBudgetMinor - monthlySpentMinor : 0n;
  const dailyAllowanceMinor =
    monthlyBudgetMinor > 0n ? calculateDailyAllowance(remainingBudgetMinor, daysLeft) : 0n;
  const spentTodayMinor = liveData ? liveData.spentTodayMinor : 0n;
  const todayTransactions = liveData ? liveData.transactions : [];

  const allowanceUsedPercent =
    dailyAllowanceMinor > 0n
      ? Math.min(100, Math.round(Number((spentTodayMinor * 100n) / dailyAllowanceMinor)))
      : 0;

  const monthStatusText =
    monthlyBudgetMinor > 0n
      ? t("percentUsed", { percent: Math.round(Number((monthlySpentMinor * 100n) / monthlyBudgetMinor)) })
      : t("noLimitSet");

  const displayDateStr = currentDate
    ? formatDisplayDate(currentDate, "EEEE, MMMM d", dateLocale)
    : tc("today");

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header (logging lives in the thumb-reachable + button in the bottom bar / sidebar) */}
      <div>
        <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
          {displayDateStr}
        </p>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
      </div>

      {/* Hero Stats */}
      <div className="mobile-carousel grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Daily Allowance Card */}
        <Card className="bg-gradient-to-br from-brand-600 via-[#164366] to-[#0a1e2f] text-white border border-brand-500/30 shadow-xl shadow-brand-950/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <Sparkles className="h-32 w-32" />
          </div>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-brand-100/90 text-[11px] font-bold uppercase tracking-wider">
                {t("dailyAllowance")}
              </span>
              <Badge variant="outline" className="border-accent-300/40 bg-accent-500/15 text-accent-100 text-xs font-semibold backdrop-blur-xs whitespace-nowrap">
                {t("daysLeft", { count: daysLeft })}
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-4xl font-extrabold text-white mt-1.5 tabular-nums tracking-tight">
              {formatMoney(dailyAllowanceMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-brand-100/80 mb-3 tabular-nums">
              {t("remainingThisMonth")} <span className="font-semibold text-white">{formatMoney(remainingBudgetMinor, "USD")}</span>
            </p>
            <div className="w-full bg-brand-950/70 rounded-full h-2 overflow-hidden ring-1 ring-white/10">
              <div
                className="bg-accent-400 h-full rounded-full transition-all duration-500 shadow-xs shadow-accent-300/50"
                style={{ width: `${Math.min(100, allowanceUsedPercent)}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-brand-100/80 mt-2 font-medium">
              <span className="tabular-nums">{t("spentToday", { amount: formatMoney(spentTodayMinor, "USD") })}</span>
              <span className="tabular-nums">{t("percentOfDailyBudget", { percent: allowanceUsedPercent })}</span>
            </div>
          </CardContent>
        </Card>

        {/* Spent Today Overview */}
        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-sm bg-white/90 dark:bg-zinc-900/70 backdrop-blur-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-zinc-500 dark:text-zinc-400 text-[11px] font-bold uppercase tracking-wider">
                {t("totalSpentToday")}
              </span>
              <Badge variant="secondary" className="text-xs font-semibold whitespace-nowrap">
                {t("items", { count: todayTransactions.length })}
              </Badge>
            </div>
            <CardTitle className="text-2xl sm:text-4xl font-extrabold text-zinc-900 dark:text-zinc-50 mt-1.5 tabular-nums tracking-tight">
              {formatMoney(spentTodayMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-zinc-400" /> {t("primaryAccount")}
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{t("cashUsd")}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
              <span className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-zinc-400" /> {t("monthStatus")}
              </span>
              <span className="font-semibold text-brand-600 dark:text-accent-400">
                {monthStatusText}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Transactions List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 py-4">
          <div className="min-w-0">
            <CardTitle className="text-base font-semibold">{t("activityTitle")}</CardTitle>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {t("activitySubtitle")}
            </p>
          </div>
          <Badge variant="outline" className="text-xs whitespace-nowrap shrink-0">
            {t("logged", { count: todayTransactions.length })}
          </Badge>
        </CardHeader>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800 p-0">
          {todayTransactions.length === 0 ? (
            <div className="p-10 text-center text-sm text-zinc-500 space-y-2">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {t("emptyTitle")}
              </p>
              <p className="text-xs text-zinc-400">
                {t("emptyHint")}
              </p>
            </div>
          ) : (
            todayTransactions.map((tx) => (
            <div
              key={tx.id}
              className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
            >
              <div className="flex items-center gap-3.5">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                  style={{ backgroundColor: tx.categoryColor }}
                >
                  <ArrowDownLeft className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100">
                    {tx.note}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {tx.category}
                    </span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="text-xs text-zinc-400">{tx.time}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 tabular-nums tracking-tight">
                    -{formatMoney(tx.amountMinor, "USD")}
                  </p>
                </div>
                <div className="flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEditClick(tx)}
                    className="h-8 w-8 text-zinc-400 hover:text-brand-600 hover:bg-brand-50/60 dark:text-zinc-500 dark:hover:text-accent-400 dark:hover:bg-zinc-800/60"
                    title={t("editTransaction")}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tx)}
                    className="h-8 w-8 text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/20"
                    title={t("deleteTransaction")}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
        </CardContent>
      </Card>

      <EditTransactionDialog
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        transaction={editingTx}
        onSuccess={loadTodayData}
        onDelete={(tx) => {
          const match = todayTransactions.find((t) => t.id === tx.id);
          if (match) handleDelete(match);
        }}
      />
    </div>
  );
}
