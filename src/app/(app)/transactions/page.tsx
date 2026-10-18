"use client";

import * as React from "react";
import { Search, Trash2, Pencil, ArrowDownLeft, ArrowUpRight, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { formatDisplayDate } from "@/lib/dates";
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
  type: "expense" | "income" | "transfer";
  date: string;
  rawDate: string;
  receiptUrl?: string | null;
}

export default function TransactionsPage() {
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
        const formatted: TxItem[] = txs.map((t) => {
          const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
          const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
          const rawNote = t.note || "Transaction";
          const match = rawNote.match(/\[receipt:(https?:\/\/[^\]]+)\]/);
          const cleanNote = rawNote.replace(/\[receipt:[^\]]+\]/, "").trim();
          const receiptUrl =
            (t as { receipt_url?: string }).receipt_url || (match ? match[1] : null);

          return {
            id: t.id,
            note: cleanNote || "Transaction",
            category: cat?.name || (t.type === "transfer" ? "Transfer" : "Uncategorized"),
            categoryColor: cat?.color || (t.type === "transfer" ? "#64748B" : "#10B981"),
            account: acc?.name || "Cash",
            amountMinor: BigInt(t.amount),
            type: t.type as "expense" | "income" | "transfer",
            date: formatDisplayDate(t.occurred_at),
            rawDate: t.occurred_at,
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

    toast("Transaction deleted", {
      description: `${tx.note} • ${formatMoney(tx.amountMinor, "USD")} (10s undo window)`,
      duration: 10000,
      action: {
        label: "Undo",
        onClick: async () => {
          await restoreTransaction(tx.id);
          setTransactions((prev) => [tx, ...prev]);
          toast.success("Transaction restored!");
        },
      },
    });
  };

  const handleEditClick = (tx: TxItem) => {
    setEditingTx({
      id: tx.id,
      note: tx.note,
      amount: Number(tx.amountMinor) / 100,
      currency: "USD",
      category: tx.category,
      type: tx.type,
      date: tx.date,
      receiptUrl: tx.receiptUrl,
    });
    setIsEditOpen(true);
  };

  const uniqueCategories = React.useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.category))).filter(Boolean);
  }, [transactions]);

  const uniqueAccounts = React.useMemo(() => {
    return Array.from(new Set(transactions.map((t) => t.account))).filter(Boolean);
  }, [transactions]);

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.note.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());
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
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
          Ledger
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          All Transactions
        </h1>
      </div>

      {/* Filter and Search Bar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
            <Input
              placeholder="Search notes or categories..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0">
            {["all", "expense", "income", "transfer"].map((type) => (
              <Button
                key={type}
                variant={filterType === type ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType(type)}
                className="capitalize whitespace-nowrap"
              >
                {type}
              </Button>
            ))}
          </div>
        </div>

        {/* Spec FR-T8: Date Range, Category, and Account Filters */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">All Categories</option>
              {uniqueCategories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium">Account:</span>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="bg-transparent border-none text-xs font-medium text-zinc-800 dark:text-zinc-200 focus:outline-none"
            >
              <option value="all">All Accounts</option>
              {uniqueAccounts.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium">From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none text-xs text-zinc-800 dark:text-zinc-200 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-zinc-50 dark:bg-zinc-900/50 p-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
            <span className="text-zinc-500 font-medium">To:</span>
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
              Reset Filters
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
                {hasActiveFilters ? "No transactions match your filters." : "No transactions logged yet."}
              </p>
              <p className="text-xs text-zinc-400">
                {hasActiveFilters
                  ? "Try adjusting your search or resetting filters."
                  : "Tap Quick Add from the navigation bar to record your first expense."}
              </p>
            </div>
          ) : (
            filtered.map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold shadow-sm"
                    style={{ backgroundColor: tx.categoryColor }}
                  >
                    {tx.type === "income" ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownLeft className="h-5 w-5" />
                    )}
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
                      <span className="text-xs text-zinc-400">{tx.account}</span>
                      <span className="text-zinc-300 dark:text-zinc-700">•</span>
                      <span className="text-xs text-zinc-400">{tx.date}</span>
                      {tx.receiptUrl && (
                        <>
                          <span className="text-zinc-300 dark:text-zinc-700">•</span>
                          <a
                            href={tx.receiptUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 dark:text-accent-400 hover:underline"
                            title="View receipt image in Supabase Storage"
                          >
                            <ImageIcon className="h-3 w-3" /> Receipt
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm tabular-nums tracking-tight ${
                        tx.type === "income"
                          ? "text-accent-600 dark:text-accent-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatMoney(tx.amountMinor, "USD")}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase font-semibold">
                      {tx.type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(tx)}
                      className="text-zinc-400 hover:text-brand-600 hover:bg-brand-50/60 dark:text-zinc-500 dark:hover:text-accent-400 dark:hover:bg-zinc-800/60"
                      title="Edit transaction"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(tx)}
                      className="text-zinc-400 hover:text-rose-600 hover:bg-rose-500/10 dark:text-zinc-500 dark:hover:text-rose-400 dark:hover:bg-rose-500/20"
                      title="Delete transaction (10s undo window)"
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
