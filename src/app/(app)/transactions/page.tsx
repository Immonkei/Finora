"use client";

import * as React from "react";
import { Search, Trash2, Pencil, ArrowDownLeft, ArrowUpRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, fromMinorUnits, type CurrencyCode } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
import { useLocale, useT } from "@/lib/i18n";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import { deleteTransaction, restoreTransaction } from "@/features/transactions/actions";
import {
  EditTransactionDialog,
  type EditableTransaction,
} from "@/features/transactions/components/edit-transaction-dialog";

interface TxItem {
  id: string;
  note: string;
  category: string;
  categoryColor: string;
  account: string;
  amountMinor: bigint;
  currency: CurrencyCode;
  type: "expense" | "income" | "transfer";
  rawDate: string;
  receiptUrl?: string | null;
}

const TYPE_FILTERS = ["all", "expense", "income", "transfer"] as const;

export default function TransactionsPage() {
  const t = useT("transactions");
  const tc = useT("common");
  const { dateLocale } = useLocale();
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");
  const [categoryFilter, setCategoryFilter] = React.useState<string>("all");
  const [accountFilter, setAccountFilter] = React.useState<string>("all");
  const [startDate, setStartDate] = React.useState<string>("");
  const [endDate, setEndDate] = React.useState<string>("");
  const [editingTx, setEditingTx] = React.useState<EditableTransaction | null>(null);
  const [isEditOpen, setIsEditOpen] = React.useState(false);

  const [transactions, setTransactions] = React.useState<TxItem[]>([]);

  const loadTransactions = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: txs } = await supabase
        .from("transactions")
        .select("*, categories(name, color), accounts!account_id(name)")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });

      if (txs) {
        const formatted: TxItem[] = txs.map((row) => {
          const cat = Array.isArray(row.categories) ? row.categories[0] : row.categories;
          const acc = Array.isArray(row.accounts) ? row.accounts[0] : row.accounts;
          // Empty note / category / account are filled with translated fallbacks at render time
          const rawNote = row.note || "";
          const match = rawNote.match(/\[receipt:(https?:\/\/[^\]]+)\]/);
          const cleanNote = rawNote.replace(/\[receipt:[^\]]+\]/, "").trim();
          const receiptUrl =
            (row as { receipt_url?: string }).receipt_url || (match ? match[1] : null);

          return {
            id: row.id,
            note: cleanNote,
            category: cat?.name || "",
            categoryColor: cat?.color || (row.type === "transfer" ? "#64748B" : "#10B981"),
            account: acc?.name || "",
            amountMinor: BigInt(row.amount),
            currency: (row.currency as CurrencyCode) || "USD",
            type: row.type as "expense" | "income" | "transfer",
            rawDate: row.occurred_at,
            receiptUrl,
          };
        });
        setTransactions(formatted);
      }
    } catch {
      // Fallback
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadTransactions();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadTransactions]);

  // Supabase Realtime: sync live transactions across tabs & devices
  useRealtimeTable({
    table: "transactions",
    onUpdate: () => {
      loadTransactions();
    },
  });

  const handleDelete = async (tx: TxItem) => {
    setTransactions((prev) => prev.filter((item) => item.id !== tx.id));
    await deleteTransaction(tx.id);

    toast(t("deletedToast"), {
      description: t("deletedDescription", {
        note: noteLabel(tx),
        amount: formatMoney(tx.amountMinor, tx.currency),
      }),
      duration: 10000,
      action: {
        label: tc("undo"),
        onClick: async () => {
          await restoreTransaction(tx.id);
          setTransactions((prev) => [tx, ...prev]);
          toast.success(t("restoredToast"));
        },
      },
    });
  };

  const noteLabel = (tx: TxItem) => tx.note || t("untitled");
  const categoryLabel = (tx: TxItem) =>
    tx.category || (tx.type === "transfer" ? tc("transfer") : t("uncategorized"));
  const accountLabel = (account: string) => account || t("cash");

  const handleEditClick = (tx: TxItem) => {
    setEditingTx({
      id: tx.id,
      note: tx.note,
      amount: fromMinorUnits(tx.amountMinor, tx.currency),
      currency: tx.currency,
      category: tx.category,
      type: tx.type,
      date: tx.rawDate,
      receiptUrl: tx.receiptUrl,
    });
    setIsEditOpen(true);
  };

  const uniqueCategories = React.useMemo(() => {
    return Array.from(new Set(transactions.map((tx) => tx.category)));
  }, [transactions]);

  const uniqueAccounts = React.useMemo(() => {
    return Array.from(new Set(transactions.map((tx) => tx.account)));
  }, [transactions]);

  const filtered = transactions.filter((tx) => {
    const query = search.toLowerCase();
    const matchesSearch =
      noteLabel(tx).toLowerCase().includes(query) ||
      categoryLabel(tx).toLowerCase().includes(query);
    const matchesType = filterType === "all" || tx.type === filterType;
    const matchesCategory =
      categoryFilter === "all" || tx.category === categoryFilter;
    const matchesAccount =
      accountFilter === "all" || tx.account === accountFilter;

    let matchesDate = true;
    if (startDate && tx.rawDate) {
      matchesDate = matchesDate && tx.rawDate.slice(0, 10) >= startDate;
    }
    if (endDate && tx.rawDate) {
      matchesDate = matchesDate && tx.rawDate.slice(0, 10) <= endDate;
    }

    return (
      matchesSearch &&
      matchesType &&
      matchesCategory &&
      matchesAccount &&
      matchesDate
    );
  });

  const hasActiveFilters =
    search !== "" ||
    filterType !== "all" ||
    categoryFilter !== "all" ||
    accountFilter !== "all" ||
    startDate !== "" ||
    endDate !== "";

  const handleResetFilters = () => {
    setSearch("");
    setFilterType("all");
    setCategoryFilter("all");
    setAccountFilter("all");
    setStartDate("");
    setEndDate("");
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
          {t("eyebrow")}
        </p>
        <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          {t("title")}
        </h1>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
            {TYPE_FILTERS.map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className="capitalize whitespace-nowrap shrink-0"
              >
                {type === "all" ? t("filterAll") : tc(type)}
              </Button>
            ))}
          </div>
        </div>

        {/* Spec FR-T8: Date Range, Category, and Account Filters */}
        <div className="mobile-scroll-x flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium whitespace-nowrap">{t("categoryLabel")}</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">{t("allCategories")}</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c || t("uncategorized")}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium whitespace-nowrap">{t("accountLabel")}</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">{t("allAccounts")}</option>
              {uniqueAccounts.map((a) => (
                <option key={a} value={a}>
                  {accountLabel(a)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium whitespace-nowrap">{t("fromLabel")}</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium whitespace-nowrap">{t("toLabel")}</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs text-brand-600 dark:text-accent-400 hover:bg-brand-50 dark:hover:bg-brand-950/30"
            >
              {t("resetFilters")}
            </Button>
          )}
        </div>
      </div>

      {/* Transactions List */}
      <Card>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800 p-0">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-zinc-500 space-y-2">
              <p className="font-medium text-zinc-700 dark:text-zinc-300">
                {hasActiveFilters ? t("noMatchTitle") : t("emptyTitle")}
              </p>
              <p className="text-xs text-zinc-400">
                {hasActiveFilters
                  ? t("noMatchHint")
                  : t("emptyHint")}
              </p>
            </div>
          ) : (
            filtered.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: tx.categoryColor }}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownLeft className="h-5 w-5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm text-zinc-900 dark:text-zinc-100 truncate">
                      {noteLabel(tx)}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-2 mt-0.5">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400">
                        {categoryLabel(tx)}
                      </span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="text-xs text-zinc-400">{accountLabel(tx.account)}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="text-xs text-zinc-400">
                        {formatDisplayDate(tx.rawDate, undefined, dateLocale)}
                      </span>
                      {tx.receiptUrl && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <a
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-accent-400 hover:underline"
                            title={t("viewReceipt")}
                          >
                            <ImageIcon className="h-3 w-3" /> {t("receipt")}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm tabular-nums tracking-tight ${
                        tx.type === "income"
                          ? "text-accent-600 dark:text-accent-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatMoney(tx.amountMinor, tx.currency)}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold whitespace-nowrap">
                      {tc(tx.type)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(tx)}
                      className="text-zinc-400 hover:text-brand-600 hover:bg-brand-50/60 dark:text-zinc-500 dark:hover:text-accent-400 dark:hover:bg-zinc-800/60"
                      title={t("editTransaction")}
                      aria-label={t("editTransaction")}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tx)}
                      className="text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/20"
                      title={t("deleteTransaction")}
                      aria-label={t("deleteTransaction")}
                    >
                      <Trash2 className="h-4 w-4" />
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
        onSuccess={loadTransactions}
        onDelete={(tx) => {
          const match = transactions.find((t) => t.id === tx.id);
          if (match) handleDelete(match);
        }}
      />
    </div>
  );
}
