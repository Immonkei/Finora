"use client";

import * as React from "react";
import {
  X,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Check,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  Tv,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createTransaction } from "../actions";
import { cn } from "@/lib/utils";

interface QuickAddDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const CATEGORIES = [
  { id: "cat-1", name: "Food & Drinks", color: "#EF4444", icon: Utensils },
  { id: "cat-2", name: "Groceries", color: "#F59E0B", icon: ShoppingCart },
  { id: "cat-3", name: "Transport", color: "#3B82F6", icon: Car },
  { id: "cat-4", name: "Housing & Bills", color: "#8B5CF6", icon: Home },
  { id: "cat-5", name: "Entertainment", color: "#EC4899", icon: Tv },
  { id: "cat-6", name: "Shopping", color: "#10B981", icon: ShoppingBag },
];

export function QuickAddDialog({
  isOpen,
  onClose,
  onSuccess,
}: QuickAddDialogProps) {
  const [type, setType] = React.useState<"expense" | "income" | "transfer">("expense");
  const [amountStr, setAmountStr] = React.useState("");
  const [currency, setCurrency] = React.useState<"USD" | "KHR">("USD");
  const [selectedCategory, setSelectedCategory] = React.useState<string>("cat-1");
  const [note, setNote] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Auto-focus on amount input when dialog opens (Spec FR-T4)
  React.useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amountStr);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMessage("Please enter a valid amount greater than 0");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    // Call createTransaction action
    const res = await createTransaction({
      type,
      amount: numAmount,
      currency,
      account_id: "00000000-0000-0000-0000-000000000001", // Default Cash account ID
      category_id: type === "expense" ? "00000000-0000-0000-0000-000000000002" : undefined,
      note: note.trim() || undefined,
      occurred_at: new Date().toISOString(),
    });

    setIsSubmitting(false);

    if (res.success) {
      // Reset form
      setAmountStr("");
      setNote("");
      onSuccess?.();
      onClose();
    } else {
      setErrorMessage(res.error || "Failed to save transaction");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-5 animate-in slide-in-from-bottom duration-200"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-1 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Sparkles className="h-4 w-4" />
            </span>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Quick Log
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Type Segmented Buttons */}
        <div className="flex rounded-xl bg-zinc-100 dark:bg-zinc-800 p-1">
          {(["expense", "income", "transfer"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={cn(
                "flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-all",
                type === t
                  ? "bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-800 dark:text-zinc-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Main Amount Input (Large keypad feel) */}
          <div className="relative flex items-center justify-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
            <div className="flex items-baseline gap-2">
              <button
                type="button"
                onClick={() => setCurrency(currency === "USD" ? "KHR" : "USD")}
                className="text-2xl font-bold text-zinc-400 hover:text-emerald-600 transition-colors select-none"
                title="Tap to switch currency"
              >
                {currency === "USD" ? "$" : "៛"}
              </button>
              <input
                ref={inputRef}
                type="number"
                step={currency === "USD" ? "0.01" : "100"}
                min="0"
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-48 bg-transparent text-center text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 focus:outline-none placeholder:text-zinc-300 dark:placeholder:text-zinc-700"
                required
              />
            </div>
            <button
              type="button"
              onClick={() => setCurrency(currency === "USD" ? "KHR" : "USD")}
              className="absolute right-4 text-xs font-semibold px-2 py-1 rounded-md bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
            >
              {currency}
            </button>
          </div>

          {/* Categories Grid (Large tap targets for 5s logging) */}
          {type === "expense" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CATEGORIES.map((cat) => {
                  const Icon = cat.icon;
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={cn(
                        "flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all",
                        isSelected
                          ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 ring-1 ring-emerald-500"
                          : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      )}
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: cat.color }}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="truncate">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Note Input */}
          <div className="space-y-1">
            <Input
              placeholder="Add note (e.g., Morning Coffee, Grocery run)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="text-sm"
              maxLength={100}
            />
          </div>

          {errorMessage && (
            <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
              {errorMessage}
            </p>
          )}

          {/* Submit Action */}
          <Button
            type="submit"
            size="lg"
            disabled={isSubmitting}
            className="w-full text-base font-semibold shadow-md shadow-emerald-600/20"
          >
            {isSubmitting ? "Saving..." : "Save Expense"}
          </Button>
        </form>
      </div>
    </div>
  );
}
