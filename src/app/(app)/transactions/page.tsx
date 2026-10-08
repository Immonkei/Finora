"use client";

import * as React from "react";
import { Search, Filter, Trash2, Edit3, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { toast } from "sonner";

interface TxItem {
  id: string;
  note: string;
  category: string;
  categoryColor: string;
  account: string;
  amountMinor: bigint;
  type: "expense" | "income" | "transfer";
  date: string;
}

export default function TransactionsPage() {
  const [search, setSearch] = React.useState("");
  const [filterType, setFilterType] = React.useState<string>("all");

  const initialTransactions: TxItem[] = [
    {
      id: "1",
      note: "Iced Latte & Croissant",
      category: "Food & Drinks",
      categoryColor: "#EF4444",
      account: "Cash",
      amountMinor: BigInt(450),
      type: "expense",
      date: "Oct 8, 2026",
    },
    {
      id: "2",
      note: "Grab Taxi to Office",
      category: "Transport",
      categoryColor: "#3B82F6",
      account: "Cash",
      amountMinor: BigInt(300),
      type: "expense",
      date: "Oct 8, 2026",
    },
    {
      id: "3",
      note: "Freelance Project Milestone",
      category: "Freelance / Income",
      categoryColor: "#22C55E",
      account: "Bank",
      amountMinor: BigInt(45000),
      type: "income",
      date: "Oct 7, 2026",
    },
    {
      id: "4",
      note: "Monthly High-Speed Internet",
      category: "Housing & Bills",
      categoryColor: "#8B5CF6",
      account: "Bank",
      amountMinor: BigInt(3500),
      type: "expense",
      date: "Oct 5, 2026",
    },
    {
      id: "5",
      note: "Transfer to Savings",
      category: "Transfer",
      categoryColor: "#64748B",
      account: "Cash → Savings",
      amountMinor: BigInt(10000),
      type: "transfer",
      date: "Oct 4, 2026",
    },
  ];

  const [transactions, setTransactions] = React.useState<TxItem[]>(initialTransactions);

  const handleDelete = (tx: TxItem) => {
    setTransactions((prev) => prev.filter((item) => item.id !== tx.id));

    toast("Transaction deleted", {
      description: `${tx.note} • ${formatMoney(tx.amountMinor, "USD")}`,
      duration: 10000,
      action: {
        label: "Undo",
        onClick: () => {
          setTransactions((prev) => [tx, ...prev]);
          toast.success("Transaction restored");
        },
      },
    });
  };

  const filtered = transactions.filter((tx) => {
    const matchesSearch =
      tx.note.toLowerCase().includes(search.toLowerCase()) ||
      tx.category.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "all" || tx.type === filterType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">

      <div>
        <p className="text-xs font-semibold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
          Ledger
        </p>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
          All Transactions
        </h1>
      </div>

      {/* Filter and Search Bar */}
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

      {/* Transactions List */}
      <Card>
        <CardContent className="divide-y divide-zinc-100 dark:divide-zinc-800 p-0">
          {filtered.length === 0 ? (
            <div className="p-8 text-center text-sm text-zinc-500">
              No transactions match your search.
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
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p
                      className={`font-semibold text-sm ${
                        tx.type === "income"
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-zinc-900 dark:text-zinc-100"
                      }`}
                    >
                      {tx.type === "income" ? "+" : "-"}
                      {formatMoney(tx.amountMinor, "USD")}
                    </p>
                    <Badge variant="secondary" className="text-[10px] uppercase">
                      {tx.type}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(tx)}
                    className="text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
