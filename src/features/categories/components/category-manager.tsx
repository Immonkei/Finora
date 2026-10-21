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
import { useT } from "@/lib/i18n";
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
  const t = useT("categories");
  const tCommon = useT("common");
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
        toast.error(t("loadFailed"), { description: error.message });
      } else if (data) {
        setCategories(data);
      }
    } catch {
      toast.error(t("loadFailed"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

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
      toast.error(t("nameRequired"));
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
          toast.success(t("updated"));
          setIsModalOpen(false);
          await loadCategories();
        } else {
          toast.error(t("updateFailed"), { description: res.error });
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
          toast.success(t("created"));
          setIsModalOpen(false);
          await loadCategories();
        } else {
          toast.error(t("createFailed"), { description: res.error });
        }
      }
    } catch (err) {
      toast.error(t("saveError"), {
        description: err instanceof Error ? err.message : t("tryAgain"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Category
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(t("deleteConfirm", { name }))) {
      return;
    }

    try {
      const res = await deleteCategory(id);
      if (res.success) {
        toast.success(t("deleted", { name }));
        await loadCategories();
      } else {
        toast.error(t("deleteFailed"), { description: res.error });
      }
    } catch {
      toast.error(t("deleteError"));
    }
  };

  // Seed Defaults
  const handleSeedDefaults = async () => {
    setIsSubmitting(true);
    try {
      const res = await seedDefaultCategoriesIfEmpty();
      if (res.success) {
        toast.success(t("seeded"));
        await loadCategories();
      } else {
        toast.error(t("seedFailed"), { description: res.error });
      }
    } catch {
      toast.error(t("seedError"));
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
    <div className="space-y-3.5 sm:space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-brand-600 dark:text-accent-400" />
            {t("title")}
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {categories.length === 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSeedDefaults}
              disabled={isSubmitting}
              className="text-xs gap-1.5 h-8"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              {t("loadDefaults")}
            </Button>
          )}

          <Button
            size="sm"
            onClick={handleOpenCreate}
            className="bg-brand-600 hover:bg-brand-700 text-white text-xs gap-1.5 shadow-xs h-8 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            {t("addCategory")}
          </Button>
        </div>
      </div>

      {/* Rollover Status Dashboard */}
      <div className="mobile-carousel grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4">
        {/* Total Budgeted */}
        <Card className="p-3 sm:p-4 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-1 sm:pb-1.5">
            <CardDescription className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              {t("totalBudgets")}
            </CardDescription>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-0.5">
              {formatMoney(summary.totalBaseBudgetMinor, "USD")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {t("perMonth", { amount: formatKhrApproximation(summary.totalBaseBudgetMinor) })}
            </p>
          </CardContent>
        </Card>

        {/* Active Rollover Categories */}
        <Card className="p-3 sm:p-4 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
          <CardHeader className="pb-1 sm:pb-1.5">
            <div className="flex items-center justify-between gap-2">
              <CardDescription className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {t("rolloverDisciplines")}
              </CardDescription>
              <Badge variant="outline" className="text-[10px] whitespace-nowrap shrink-0 text-emerald-600 border-emerald-300 dark:border-emerald-800 px-1.5 py-0">
                {t("disciplined")}
              </Badge>
            </div>
            <CardTitle className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-50 tabular-nums tracking-tight mt-0.5">
              {summary.activeRolloverCount}{" "}
              <span className="text-xs sm:text-sm font-medium text-zinc-400">{t("ofTotal", { count: categories.length })}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {t("rolloverHint")}
            </p>
          </CardContent>
        </Card>

        {/* Rollover Rule Info */}
        <Card className="p-3 sm:p-4 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs bg-brand-50/40 dark:bg-brand-950/20">
          <CardHeader className="pb-1 sm:pb-1.5">
            <CardDescription className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t("surplusProtection")}
            </CardDescription>
            <CardTitle className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
              {t("carryForward")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-[11px] sm:text-xs text-zinc-600 dark:text-zinc-300 leading-snug">
              {t("carryForwardHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Category List */}
      <Card className="p-3.5 sm:p-5 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs">
        <CardHeader className="pb-2.5 border-b border-zinc-100 dark:border-zinc-800/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm sm:text-base font-bold text-zinc-900 dark:text-zinc-50">
                {t("configured", { count: categories.length })}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("configuredHint")}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-3 sm:pt-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-10 space-y-2.5">
              <Wallet className="w-9 h-9 text-zinc-300 dark:text-zinc-600 mx-auto stroke-1" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {t("emptyTitle")}
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {t("emptyHint")}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSeedDefaults}
                className="mt-2 text-xs h-8"
              >
                {t("loadRecommended")}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
              {categories.map((cat) => {
                const IconComponent = (cat.icon && CATEGORY_ICONS[cat.icon]) || Sparkles;
                const budgetMinor = cat.monthly_budget ? BigInt(cat.monthly_budget) : 0n;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 sm:p-3 rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/50 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                      <div
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                        style={{ backgroundColor: cat.color || "#3B82F6" }}
                      >
                        <IconComponent className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
                            {cat.name}
                          </h4>
                          {cat.rollover ? (
                            <Badge className="text-[9px] sm:text-[10px] shrink-0 whitespace-nowrap bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/80 font-bold px-1.5 py-0">
                              {t("badgeRollover")}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] shrink-0 whitespace-nowrap text-zinc-400 border-zinc-200 dark:border-zinc-700 font-normal px-1.5 py-0">
                              {t("badgeFixed")}
                            </Badge>
                          )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-zinc-500 dark:text-zinc-400 tabular-nums mt-0.5">
                          {budgetMinor > 0n ? (
                            <>
                              <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">
                                {formatMoney(budgetMinor, "USD")}
                              </strong>{" "}
                              {t("perMonthShort", { khr: formatKhrApproximation(budgetMinor) })}
                            </>
                          ) : (
                            t("noBudget")
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        title={t("editCategory")}
                        aria-label={t("editCategory")}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(cat.id, cat.name)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                        title={t("deleteCategory")}
                        aria-label={t("deleteCategory")}
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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="mobile-sheet w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 space-y-4 animate-in zoom-in-95 duration-200"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                {editingCategory ? t("dialogEdit") : t("dialogNew")}
              </h3>
              <button
                type="button"
                aria-label={tCommon("close")}
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
                  {t("fieldName")}
                </label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder={t("namePlaceholder")}
                  required
                  autoFocus
                  className="text-sm font-medium"
                />
              </div>

              {/* Monthly Budget */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {t("fieldBudget")}
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
                    placeholder={t("budgetPlaceholder")}
                    className="pl-7 text-sm font-medium"
                  />
                </div>
                {parseFloat(formBudgetStr) > 0 && (
                  <p className="text-[11px] text-zinc-500 tabular-nums">
                    {t("khrPerMonth", { amount: Math.round(parseFloat(formBudgetStr) * 4100).toLocaleString("en-US") })}
                  </p>
                )}
              </div>

              {/* Color Swatch Picker */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider">
                  {t("fieldColor")}
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
                  {t("fieldIcon")}
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
                    {t("enableRollover")}
                  </span>
                  <span className="text-zinc-500 dark:text-zinc-400 block mt-0.5">
                    {t("enableRolloverHint")}
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
                  {tCommon("cancel")}
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-brand-600 hover:bg-brand-700 text-white text-xs gap-1.5"
                >
                  {isSubmitting ? tCommon("saving") : editingCategory ? t("saveChanges") : t("createCategory")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
