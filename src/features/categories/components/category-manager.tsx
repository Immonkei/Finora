"use client";

import * as React from "react";
import {
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Utensils,
  ShoppingCart,
  Car,
  Home,
  Tv,
  ShoppingBag,
  Coffee,
  Fuel,
  Dumbbell,
  Smartphone,
  Plane,
  HeartPulse,
  Banknote,
  Check,
  RotateCcw,
  ShieldCheck,
  X,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatMoney, formatKhrApproximation } from "@/lib/money";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  createCategory,
  updateCategory,
  deleteCategory,
  seedDefaultCategoriesIfEmpty,
} from "../actions";
import {
  calculateOverallRolloverSummary,
  type CategoryBudgetInput,
} from "../rollover";

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  utensils: Utensils,
  "shopping-cart": ShoppingCart,
  car: Car,
  home: Home,
  tv: Tv,
  "shopping-bag": ShoppingBag,
  coffee: Coffee,
  fuel: Fuel,
  dumbbell: Dumbbell,
  smartphone: Smartphone,
  plane: Plane,
  "heart-pulse": HeartPulse,
  banknote: Banknote,
  sparkles: Sparkles,
};

const COLOR_PALETTE = [
  "#EF4444", // Red
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#3B82F6", // Blue
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#14B8A6", // Teal
  "#6366F1", // Indigo
  "#64748B", // Slate
];

interface CategoryRecord {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
  monthly_budget: number | null;
  rollover: boolean;
}

export function CategoryManager() {
  const [categories, setCategories] = React.useState<CategoryRecord[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [editingCategory, setEditingCategory] = React.useState<CategoryRecord | null>(null);

  // Form states
  const [formName, setFormName] = React.useState("");
  const [formColor, setFormColor] = React.useState(COLOR_PALETTE[3]); // default blue
  const [formIcon, setFormIcon] = React.useState("sparkles");
  const [formBudgetStr, setFormBudgetStr] = React.useState("");
  const [formRollover, setFormRollover] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const loadCategories = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setIsLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("categories")
        .select("id, name, color, icon, monthly_budget, rollover")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        toast.error("Failed to load categories", { description: error.message });
      } else if (data) {
        setCategories(data);
      }
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadCategories();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCategories]);

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormName("");
    setFormColor(COLOR_PALETTE[3]);
    setFormIcon("sparkles");
    setFormBudgetStr("");
    setFormRollover(true);
    setIsModalOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (cat: CategoryRecord) => {
    setEditingCategory(cat);
    setFormName(cat.name);
    setFormColor(cat.color || COLOR_PALETTE[3]);
    setFormIcon(cat.icon || "sparkles");
    setFormBudgetStr(
      cat.monthly_budget !== null && cat.monthly_budget !== undefined
        ? (cat.monthly_budget / 100).toString()
        : ""
    );
    setFormRollover(cat.rollover ?? false);
    setIsModalOpen(true);
  };

  // Submit Category
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error("Please enter a category name");
      return;
    }

    setIsSubmitting(true);
    try {
      const budgetDollars = parseFloat(formBudgetStr);
      const budgetMinor =
        !isNaN(budgetDollars) && budgetDollars > 0
          ? BigInt(Math.round(budgetDollars * 100))
          : null;

      if (editingCategory) {
        const res = await updateCategory(editingCategory.id, {
          name: formName.trim(),
          color: formColor,
          icon: formIcon,
          monthlyBudgetMinor: budgetMinor,
          rollover: formRollover,
        });

        if (res.success) {
          toast.success("Category updated");
          setIsModalOpen(false);
          await loadCategories();
        } else {
          toast.error("Failed to update category", { description: res.error });
        }
      } else {
        const res = await createCategory({
          name: formName.trim(),
          color: formColor,
          icon: formIcon,
          monthlyBudgetMinor: budgetMinor,
          rollover: formRollover,
        });

        if (res.success) {
          toast.success("Category created");
          setIsModalOpen(false);
          await loadCategories();
        } else {
          toast.error("Failed to create category", { description: res.error });
        }
      }
    } catch (err) {
      toast.error("Error saving category", {
        description: err instanceof Error ? err.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"? Existing transactions will keep their records.`)) {
      return;
    }

    try {
      const res = await deleteCategory(id);
      if (res.success) {
        toast.success(`Deleted category "${name}"`);
        await loadCategories();
      } else {
        toast.error("Failed to delete category", { description: res.error });
      }
    } catch {
      toast.error("Error deleting category");
    }
  };

  // Seed Defaults
  const handleSeedDefaults = async () => {
    setIsSubmitting(true);
    try {
      const res = await seedDefaultCategoriesIfEmpty();
      if (res.success) {
        toast.success("Loaded default personal finance categories");
        await loadCategories();
      } else {
        toast.error("Failed to seed categories", { description: res.error });
      }
    } catch {
      toast.error("Error seeding categories");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Rollover summary calculation
  const rolloverInputs: CategoryBudgetInput[] = React.useMemo(() => {
    return categories.map((c) => ({
      id: c.id,
      name: c.name,
      monthlyBudgetMinor: c.monthly_budget ? BigInt(c.monthly_budget) : 0n,
      rollover: c.rollover ?? false,
      currentMonthSpentMinor: 0n, // baseline for configuration
    }));
  }, [categories]);

  const summary = React.useMemo(() => {
    return calculateOverallRolloverSummary(rolloverInputs);
  }, [rolloverInputs]);

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-600 dark:text-accent-400" />
            Categories & Rollover Allowances
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Personalize spending categories, monthly limits, and enable unspent allowance rollovers
          </p>
        </div>

        <div className="flex items-center gap-2">
          {categories.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={isSubmitting}
              className="text-xs gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Load Defaults
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add Category
          </Button>
        </div>
      </div>

      {/* Rollover Status Dashboard */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Budgeted */}
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Total Category Budgets
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {formatMoney(summary.totalBaseBudgetMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {formatKhrApproximation(summary.totalBaseBudgetMinor)} / month
            </p>
          </CardContent>
        </Card>

        {/* Active Rollover Categories */}
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Rollover Disciplines
              </CardDescription>
              <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 dark:border-emerald-800">
                Disciplined
              </Badge>
            </div>
            <CardTitle className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-1">
              {summary.activeRolloverCount}{" "}
              <span className="text-sm font-medium text-zinc-400">of {categories.length}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Categories that roll unspent allowance to reward frugality
            </p>
          </CardContent>
        </Card>

        {/* Rollover Rule Info */}
        <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs bg-brand-50/40 dark:bg-brand-950/20">
          <CardHeader className="pb-2">
            <CardDescription className="text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              Surplus Protection
            </CardDescription>
            <CardTitle className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-1">
              Frugality Carry-Forward
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed">
              Unspent budget carries over into next month, expanding your spending room or savings margin automatically.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category List */}
      <Card className="border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-3 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                Configured Categories ({categories.length})
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                Used for instant voice logging, KHQR slip tagging, and monthly statements
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-7 h-7 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Wallet className="w-10 h-10 text-zinc-300 dark:text-zinc-600 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                No custom categories configured yet.
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                Add your own tailored categories or load the recommended Cambodian / SEA expense defaults.
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedDefaults}
                className="mt-2 text-xs"
              >
                Load Recommended Defaults
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categories.map((cat) => {
                const IconComponent = (cat.icon && CATEGORY_ICONS[cat.icon]) || Sparkles;
                const budgetMinor = cat.monthly_budget ? BigInt(cat.monthly_budget) : 0n;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color || "#3B82F6" }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {cat.name}
                          </h4>
                          {cat.rollover ? (
                            <Badge className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-bold px-1.5 py-0">
                              Rollover
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-zinc-400 border-zinc-200 dark:border-zinc-700 font-normal px-1.5 py-0">
                              Fixed
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                          {budgetMinor > 0n ? (
                            <>
                              <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">
                                {formatMoney(budgetMinor, "USD")}
                              </strong>{" "}
                              / mo ({formatKhrApproximation(budgetMinor)})
                            </>
                          ) : (
                            "No budget limit set"
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors"
                        title="Edit category"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Category Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-6 space-y-4 animate-in zoom-in-95 duration-200"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {editingCategory ? "Edit Category" : "New Category"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Category Name
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g., Coffee & Cafes, Motorcycle Fuel..."
                  required
                  autoFocus
                  className="text-sm font-medium"
                />
              </div>

              {/* Monthly Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Monthly Budget Limit (USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 font-bold text-sm">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formBudgetStr}
                    onChange={(e) => setFormBudgetStr(e.target.value)}
                    placeholder="0.00 (optional)"
                    className="pl-7 text-sm font-medium"
                  />
                </div>
                {parseFloat(formBudgetStr) > 0 && (
                  <p className="text-[11px] text-zinc-500 tabular-nums">
                    ≈ ៛{(Math.round(parseFloat(formBudgetStr) * 4100)).toLocaleString()} KHR per month
                  </p>
                )}
              </div>

              {/* Color Swatch Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Color Theme
                </label>
                <div className="flex flex-wrap gap-2 pt-1">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormColor(color)}
                      className={cn(
                        "w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-110",
                        formColor === color ? "ring-2 ring-offset-2 ring-brand-500 scale-105" : ""
                      )}
                      style={{ backgroundColor: color }}
                    >
                      {formColor === color && <Check className="w-3.5 h-3.5 text-white stroke-3" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Icon Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  Icon
                </label>
                <div className="grid grid-cols-7 gap-1.5 max-h-36 overflow-y-auto p-1 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-zinc-50 dark:bg-zinc-950">
                  {Object.entries(CATEGORY_ICONS).map(([key, Icon]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormIcon(key)}
                      className={cn(
                        "p-2 rounded-lg flex items-center justify-center transition-colors",
                        formIcon === key
                          ? "bg-brand-600 text-white shadow-xs"
                          : "text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 hover:text-zinc-900"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                    </button>
                  ))}
                </div>
              </div>

              {/* Rollover Toggle */}
              <div className="flex items-start gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/60">
                <input
                  type="checkbox"
                  id="rolloverToggle"
                  checked={formRollover}
                  onChange={(e) => setFormRollover(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-zinc-300 text-brand-600 focus:ring-brand-500 cursor-pointer"
                />
                <label htmlFor="rolloverToggle" className="cursor-pointer text-xs">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 block">
                    Enable Rollover Allowance
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 block mt-0.5">
                    Unspent budget rolls over into next month, accumulating as a surplus reward.
                  </span>
                </label>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs gap-1.5"
                >
                  {isSubmitting ? "Saving..." : editingCategory ? "Save Changes" : "Create Category"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
