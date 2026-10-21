"use client";

import * as React from "react";
import {
  X,
  Trash2,
  Calendar,
  Image as ImageIcon,
  Check,
  Sparkles,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  Tv,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { updateTransaction } from "../actions";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface EditableTransaction {
  id: string;
  note: string;
  amount: number;
  currency: "USD" | "KHR";
  category: string;
  categoryId?: string | null;
  type: "expense" | "income" | "transfer";
  date: string;
  receiptUrl?: string | null;
}

interface CategoryOption {
  id: string;
  name: string;
  color: string;
  icon: typeof Utensils | typeof Sparkles;
}

const DEFAULT_CATEGORIES: CategoryOption[] = [
  { id: "cat-1", name: "Food & Drinks", color: "#EF4444", icon: Utensils },
  { id: "cat-2", name: "Groceries", color: "#F59E0B", icon: ShoppingCart },
  { id: "cat-3", name: "Transport", color: "#3B82F6", icon: Car },
  { id: "cat-4", name: "Housing & Bills", color: "#8B5CF6", icon: Home },
  { id: "cat-5", name: "Entertainment", color: "#EC4899", icon: Tv },
  { id: "cat-6", name: "Shopping", color: "#10B981", icon: ShoppingBag },
];

interface EditTransactionFormProps {
  transaction: EditableTransaction;
  categoriesList: CategoryOption[];
  onClose: () => void;
  onSuccess?: () => void;
  onDelete?: (tx: EditableTransaction) => void;
}

function EditTransactionForm({
  transaction,
  categoriesList,
  onClose,
  onSuccess,
  onDelete,
}: EditTransactionFormProps) {
  const [type, setType] = React.useState<"expense" | "income" | "transfer">(transaction.type);
  const [amountStr, setAmountStr] = React.useState(transaction.amount.toString());
  const [currency, setCurrency] = React.useState<"USD" | "KHR">(transaction.currency);

  const initialCatId = React.useMemo(() => {
    const match = categoriesList.find(
      (c) =>
        c.id === transaction.categoryId ||
        c.name.toLowerCase() === transaction.category.toLowerCase()
    );
    return match ? match.id : categoriesList[0]?.id || "";
  }, [categoriesList, transaction]);

  const [selectedCategory, setSelectedCategory] = React.useState<string>(initialCatId);
  const [note, setNote] = React.useState(transaction.note);
  const [receiptUrl, setReceiptUrl] = React.useState<string | null>(transaction.receiptUrl || null);

  const initialDateStr = React.useMemo(() => {
    try {
      const d = new Date(transaction.date);
      return !isNaN(d.getTime())
        ? d.toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10);
    } catch {
      return new Date().toISOString().slice(0, 10);
    }
  }, [transaction.date]);

  const [dateStr, setDateStr] = React.useState(initialDateStr);
  const [isSaving, setIsSaving] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(amountStr);
    if (isNaN(val) || val <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateTransaction({
        id: transaction.id,
        type,
        amount: val,
        currency,
        category_id: type === "expense" ? selectedCategory : null,
        note: note.trim() || undefined,
        receipt_url: receiptUrl,
        occurred_at: dateStr ? new Date(dateStr).toISOString() : undefined,
      });

      if (res.success) {
        toast.success("Transaction updated!");
        onSuccess?.();
        onClose();
      } else {
        toast.error("Failed to update transaction", { description: res.error });
      }
    } catch (err) {
      toast.error("Could not save changes", {
        description: err instanceof Error ? err.message : "Network error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = () => {
    onDelete?.(transaction);
    onClose();
  };

  return (
    <div
      className="mobile-sheet w-full max-w-lg rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in slide-in-from-bottom duration-200"
      role="dialog"
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Edit Transaction
        </h2>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
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
              "flex-1 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all",
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
        {/* Amount Input */}
        <div className="relative flex items-center justify-center p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800">
          <div className="flex items-baseline gap-2">
            <button
              type="button"
              onClick={() => setCurrency(currency === "USD" ? "KHR" : "USD")}
              className="text-2xl font-bold text-zinc-400 hover:text-brand-600 dark:hover:text-accent-400 transition-colors select-none"
              title="Tap to switch currency"
            >
              {currency === "USD" ? "$" : "៛"}
            </button>
            <input
              type="number"
              step={currency === "USD" ? "0.01" : "100"}
              min="0"
              value={amountStr}
              onChange={(e) => setAmountStr(e.target.value)}
              className="w-48 bg-transparent text-center text-4xl sm:text-5xl font-extrabold text-zinc-900 dark:text-zinc-50 focus:outline-none tabular-nums tracking-tight"
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

        {/* Categories Grid */}
        {type === "expense" && (
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
              Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              {categoriesList.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center gap-2 p-2 rounded-xl border text-left text-xs font-medium transition-all",
                      isSelected
                        ? "border-brand-600 bg-brand-50/70 text-brand-900 ring-1 ring-brand-500 dark:border-accent-500 dark:bg-brand-950/40 dark:text-accent-200"
                        : "border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                    )}
                  >
                    <span
                      className="w-5 h-5 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ backgroundColor: cat.color }}
                    >
                      <Icon className="h-3 w-3" />
                    </span>
                    <span className="truncate text-[11px]">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Note Input */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Note
          </label>
          <Input
            placeholder="e.g. Starbucks Latte"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="text-sm"
            maxLength={100}
          />
        </div>

        {/* Date Picker */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> Date
          </label>
          <Input
            type="date"
            value={dateStr}
            onChange={(e) => setDateStr(e.target.value)}
            className="text-sm"
          />
        </div>

        {/* Receipt Preview */}
        {receiptUrl && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs">
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-brand-600 dark:text-accent-400 font-semibold hover:underline truncate"
            >
              <ImageIcon className="h-4 w-4 shrink-0" />
              View Receipt Image
            </a>
            <button
              type="button"
              onClick={() => setReceiptUrl(null)}
              className="text-rose-500 hover:text-rose-700 text-xs font-semibold px-1"
            >
              Remove
            </button>
          </div>
        )}

        {/* Actions Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800 gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={handleDeleteClick}
            className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5 text-xs font-semibold"
          >
            <Trash2 className="h-4 w-4" /> Delete
          </Button>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={onClose} size="sm">
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving} size="sm" className="gap-1.5">
              <Check className="h-4 w-4" />
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export function EditTransactionDialog({
  isOpen,
  onClose,
  transaction,
  onSuccess,
  onDelete,
}: {
  isOpen: boolean;
  onClose: () => void;
  transaction: EditableTransaction | null;
  onSuccess?: () => void;
  onDelete?: (tx: EditableTransaction) => void;
}) {
  const [categoriesList, setCategoriesList] = React.useState<CategoryOption[]>(DEFAULT_CATEGORIES);

  React.useEffect(() => {
    async function loadCats() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          const { data: dbCats } = await supabase
            .from("categories")
            .select("id, name, color")
            .eq("user_id", user.id)
            .order("created_at", { ascending: true });

          if (dbCats && dbCats.length > 0) {
            setCategoriesList(
              dbCats.map((c) => ({
                id: c.id,
                name: c.name,
                color: c.color || "#3B82F6",
                icon: Sparkles,
              }))
            );
          }
        }
      } catch {
        // Fallback
      }
    }
    loadCats();
  }, []);

  if (!isOpen || !transaction) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <EditTransactionForm
        key={transaction.id}
        transaction={transaction}
        categoriesList={categoriesList}
        onClose={onClose}
        onSuccess={onSuccess}
        onDelete={onDelete}
      />
    </div>
  );
}
