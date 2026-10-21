"use client";

import * as React from "react";
import {
  X,
  Printer,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  Wallet,
  Sparkles,
  ChevronDown,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatMoney, type CurrencyCode } from "@/lib/money";
import {
  generateMonthlyStatement,
  type MonthlyStatementData,
  type StatementTransactionInput,
  type StatementGoalInput,
} from "../statement-generator";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { useMounted } from "@/lib/hooks";
import { format, parseISO } from "date-fns";
import { useLocale, useT } from "@/lib/i18n";

type DisciplineRating = MonthlyStatementData["insights"]["disciplineRating"];

const RATING_KEYS = {
  Exceptional: { rating: "ratingExceptional", takeaway: "takeawayExceptional" },
  Solid: { rating: "ratingSolid", takeaway: "takeawaySolid" },
  "Needs Attention": { rating: "ratingNeedsAttention", takeaway: "takeawayNeedsAttention" },
  Critical: { rating: "ratingCritical", takeaway: "takeawayCritical" },
} as const satisfies Record<DisciplineRating, { rating: string; takeaway: string }>;

const EXCHANGE_RATE_KHR = 4100;

interface MonthlyStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonth?: string; // "YYYY-MM"
}

export function MonthlyStatementModal({
  isOpen,
  onClose,
  defaultMonth,
}: MonthlyStatementModalProps) {
  const isMounted = useMounted();
  const t = useT("reports");
  const { dateLocale } = useLocale();

  // Generate options for last 12 months (guarded by isMounted to avoid prerender time evaluation)
  const monthOptions = React.useMemo(() => {
    if (!isMounted) return [];
    const list: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = format(d, "MMMM yyyy", { locale: dateLocale });
      list.push({ value: val, label });
    }
    return list;
  }, [isMounted, dateLocale]);

  const [userSelectedMonth, setUserSelectedMonth] = React.useState<string | null>(null);
  const selectedMonth = userSelectedMonth ?? defaultMonth ?? "2026-10";
  const [currencyMode, setCurrencyMode] = React.useState<"USD" | "KHR" | "DUAL">("DUAL");
  const [isLoading, setIsLoading] = React.useState(true);
  const [statementData, setStatementData] = React.useState<MonthlyStatementData | null>(null);
  const [isCopied, setIsCopied] = React.useState(false);

  // Fetch transactions, budget, and goals for selected month
  React.useEffect(() => {
    if (!isOpen) return;

    let isSubscribed = true;

    async function loadData() {
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

        const [yearStr, monthNumStr] = selectedMonth.split("-");
        const year = parseInt(yearStr, 10);
        const monthIdx = parseInt(monthNumStr, 10) - 1;
        const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
        const startIso = `${selectedMonth}-01T00:00:00.000Z`;
        const endIso = `${selectedMonth}-${String(daysInMonth).padStart(2, "0")}T23:59:59.999Z`;

        // 1. Transactions
        const { data: dbTxs } = await supabase
          .from("transactions")
          .select("id, occurred_at, type, base_amount, amount, currency, note, categories(name), accounts!account_id(name)")
          .eq("user_id", user.id)
          .is("deleted_at", null)
          .gte("occurred_at", startIso)
          .lte("occurred_at", endIso)
          .order("occurred_at", { ascending: false });

        // 2. Budget
        const { data: budget } = await supabase
          .from("budgets")
          .select("total_limit")
          .eq("user_id", user.id)
          .eq("month", `${selectedMonth}-01`)
          .maybeSingle();

        // 3. Goals
        const { data: goals } = await supabase
          .from("savings_goals")
          .select("id, name, target_amount, saved_amount")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

        if (!isSubscribed) return;

        const transactionsInput: StatementTransactionInput[] = (dbTxs || []).map((tx) => {
          const cat = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;
          const acc = Array.isArray(tx.accounts) ? tx.accounts[0] : tx.accounts;
          return {
            id: tx.id,
            occurredAt: tx.occurred_at,
            type: tx.type as "income" | "expense",
            baseAmountMinor: BigInt(tx.base_amount || 0),
            amountMinor: BigInt(tx.amount || 0),
            currency: tx.currency || "USD",
            categoryName: cat?.name || t("stmtUncategorized"),
            note: tx.note || t("stmtNoDescription"),
            accountName: acc?.name || t("stmtCash"),
          };
        });

        const goalsInput: StatementGoalInput[] = (goals || []).map((g) => ({
          id: g.id,
          name: g.name,
          targetAmountMinor: BigInt(g.target_amount || 0),
          currentAmountMinor: BigInt(g.saved_amount || 0),
          currency: "USD",
        }));

        const statement = generateMonthlyStatement({
          month: selectedMonth,
          transactions: transactionsInput,
          budgetLimitMinor: budget ? BigInt(budget.total_limit) : 0n,
          goals: goalsInput,
          exchangeRateKHR: EXCHANGE_RATE_KHR,
          userId: user.id,
        });

        setStatementData(statement);
      } catch (err) {
        console.error("Failed to load statement data", err);
        toast.error(t("stmtLoadError"));
      } finally {
        if (isSubscribed) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isSubscribed = false;
    };
  }, [isOpen, selectedMonth, t]);

  // Handle ESC key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const handlePrint = () => {
    window.print();
  };

  const ratingKeys = statementData ? RATING_KEYS[statementData.insights.disciplineRating] : null;
  const ratingLabel = ratingKeys ? t(ratingKeys.rating) : "";
  const takeawayText =
    statementData && ratingKeys
      ? t(ratingKeys.takeaway, { rate: statementData.summary.savingsRatePercent })
      : "";
  const periodLabel = statementData
    ? format(parseISO(`${statementData.period.monthStr}-01`), "MMMM yyyy", { locale: dateLocale })
    : "";
  const formatDocDate = (isoDate: string) =>
    format(parseISO(isoDate), "d MMM yyyy", { locale: dateLocale });
  const generatedLabel = statementData
    ? format(new Date(statementData.generatedAtIso), "d MMM yyyy, HH:mm", { locale: dateLocale })
    : "";

  const handleCopySummary = () => {
    if (!statementData) return;
    const summaryText = [
      t("copyHeader"),
      t("copyPeriod", { period: periodLabel }),
      t("copyStatementId", { id: statementData.statementId }),
      "",
      t("copyInflow", {
        amount: formatMoney(statementData.summary.totalIncomeMinor, "USD"),
        khr: `៛${statementData.dualCurrency.incomeKHRMinor.toLocaleString()}`,
      }),
      t("copyOutflow", {
        amount: formatMoney(statementData.summary.totalExpenseMinor, "USD"),
        khr: `៛${statementData.dualCurrency.expenseKHRMinor.toLocaleString()}`,
      }),
      t("copyNet", {
        amount: formatMoney(statementData.summary.netSavingsMinor, "USD"),
        rate: statementData.summary.savingsRatePercent,
      }),
      t("copyHealth", { score: statementData.insights.healthScore, rating: ratingLabel }),
      "",
      t("copyTakeaway", { text: takeawayText }),
      t("copyFooter"),
    ].join("\n");

    navigator.clipboard.writeText(summaryText);
    setIsCopied(true);
    toast.success(t("stmtCopiedToast"));
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!isOpen || !isMounted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      {/* Modal Container */}
      <div
        className="w-full max-w-5xl h-[92vh] flex flex-col rounded-2xl bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-label={t("stmtDialogLabel")}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div className="no-print shrink-0 flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0 flex items-center justify-center w-9 h-9 rounded-xl bg-brand-600 text-white font-bold text-base shadow-sm">
              F
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 flex flex-wrap items-center gap-1.5">
                {t("stmtExporterTitle")}
                <Badge variant="outline" className="text-[10px] font-semibold text-brand-600 border-brand-200 dark:border-brand-800 whitespace-nowrap">
                  {t("stmtPrintReady")}
                </Badge>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {t("stmtExporterSubtitle")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Month Selector */}
            <div className="relative">
              <select
                value={selectedMonth}
                onChange={(e) => setUserSelectedMonth(e.target.value)}
                aria-label={t("stmtSelectMonth")}
                className="appearance-none pl-3 pr-8 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {monthOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-zinc-400 pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" />
            </div>

            {/* Currency Mode Selector */}
            <div className="hidden sm:flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-300 dark:border-zinc-700 text-xs">
              <button
                type="button"
                onClick={() => setCurrencyMode("USD")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-colors",
                  currencyMode === "USD"
                    ? "bg-white dark:bg-zinc-900 text-brand-600 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                USD ($)
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode("KHR")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-colors",
                  currencyMode === "KHR"
                    ? "bg-white dark:bg-zinc-900 text-brand-600 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                KHR (៛)
              </button>
              <button
                type="button"
                onClick={() => setCurrencyMode("DUAL")}
                className={cn(
                  "px-2.5 py-1 rounded-md font-semibold transition-colors",
                  currencyMode === "DUAL"
                    ? "bg-white dark:bg-zinc-900 text-brand-600 shadow-xs"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                )}
              >
                {t("stmtDual")}
              </button>
            </div>

            {/* Copy Summary */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopySummary}
              className="text-xs h-8 gap-1.5"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden md:inline">{isCopied ? t("stmtCopied") : t("stmtCopy")}</span>
            </Button>

            {/* Print / Save PDF */}
            <Button
              size="sm"
              onClick={handlePrint}
              className="bg-brand-600 hover:bg-brand-700 text-white text-xs h-8 gap-1.5 shadow-sm whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{t("stmtPrint")}</span>
            </Button>

            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ml-1"
              aria-label={t("stmtCloseModal")}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Document Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 md:p-8 flex justify-center bg-zinc-200/70 dark:bg-zinc-900/90">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-96 space-y-3">
              <div className="w-9 h-9 border-3 border-brand-600 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                {t("stmtGenerating")}
              </p>
            </div>
          ) : !statementData ? (
            <div className="flex flex-col items-center justify-center h-96 text-center">
              <FileText className="w-12 h-12 text-zinc-400 mb-2 stroke-1" />
              <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">
                {t("stmtNoData")}
              </p>
            </div>
          ) : (
            /* Printable Statement Paper Document */
            <div className="statement-document w-full max-w-[850px] bg-white text-zinc-900 rounded-xl shadow-xl border border-zinc-200/80 p-8 sm:p-10 md:p-12 space-y-8 font-sans">
              
              {/* Document Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-6 border-b-2 border-zinc-900 pb-6">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-zinc-950 text-white font-extrabold text-xl tracking-tight">
                      F
                    </div>
                    <div>
                      <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">
                        FINORA
                      </h1>
                      <p className="text-[10px] tracking-widest font-semibold uppercase text-zinc-500">
                        {t("stmtTagline")}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-wider text-zinc-400 font-bold">
                      {t("stmtDocumentType")}
                    </p>
                    <h2 className="text-xl font-extrabold text-zinc-900 tracking-tight">
                      {t("stmtDocumentTitle")}
                    </h2>
                  </div>
                </div>

                {/* Metadata Stamp */}
                <div className="sm:text-right space-y-1 text-xs">
                  <div className="inline-block bg-zinc-100 rounded-md px-2.5 py-1 border border-zinc-200">
                    <span className="text-[10px] uppercase font-bold text-zinc-500">{t("stmtStatementId")} </span>
                    <span className="font-mono font-bold text-zinc-800">{statementData.statementId}</span>
                  </div>
                  <p className="text-zinc-600 font-medium pt-1">
                    <strong className="text-zinc-900">{t("stmtPeriod")}</strong> {periodLabel}
                  </p>
                  <p className="text-zinc-500 text-[11px]">
                    {t("stmtDateRange", {
                      start: formatDocDate(statementData.period.startDate),
                      end: formatDocDate(statementData.period.endDate),
                      days: statementData.period.daysInMonth,
                    })}
                  </p>
                  <p className="text-zinc-400 text-[10px]">
                    {t("stmtGenerated", { date: generatedLabel })}
                  </p>
                  <p className="text-emerald-700 font-semibold text-[10px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 inline-block">
                    {t("stmtExchangeReference", { rate: EXCHANGE_RATE_KHR.toLocaleString("en-US") })}
                  </p>
                </div>
              </div>

              {/* KPI Executive Scorecards (4 Cards) */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* Total Inflow */}
                <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
                    <span className="min-w-0">{t("stmtTotalInflow")}</span>
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
                  </div>
                  <div className="text-lg font-extrabold text-zinc-950 tabular-nums">
                    {currencyMode === "KHR"
                      ? `៛${statementData.dualCurrency.incomeKHRMinor.toLocaleString()}`
                      : formatMoney(statementData.summary.totalIncomeMinor, "USD")}
                  </div>
                  {currencyMode === "DUAL" && (
                    <div className="text-[11px] text-zinc-500 tabular-nums">
                      ≈ ៛{statementData.dualCurrency.incomeKHRMinor.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Total Outflow */}
                <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
                    <span className="min-w-0">{t("stmtTotalOutflow")}</span>
                    <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
                  </div>
                  <div className="text-lg font-extrabold text-zinc-950 tabular-nums">
                    {currencyMode === "KHR"
                      ? `៛${statementData.dualCurrency.expenseKHRMinor.toLocaleString()}`
                      : formatMoney(statementData.summary.totalExpenseMinor, "USD")}
                  </div>
                  {currencyMode === "DUAL" && (
                    <div className="text-[11px] text-zinc-500 tabular-nums">
                      ≈ ៛{statementData.dualCurrency.expenseKHRMinor.toLocaleString()}
                    </div>
                  )}
                </div>

                {/* Net Savings */}
                <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
                    <span className="min-w-0">{t("stmtNetSurplus")}</span>
                    <Wallet className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                  <div
                    className={cn(
                      "text-lg font-extrabold tabular-nums",
                      statementData.summary.netSavingsMinor >= 0n ? "text-emerald-700" : "text-rose-700"
                    )}
                  >
                    {currencyMode === "KHR"
                      ? `៛${statementData.dualCurrency.netKHRMinor.toLocaleString()}`
                      : formatMoney(statementData.summary.netSavingsMinor, "USD")}
                  </div>
                  <div className="text-[11px] font-semibold text-zinc-500">
                    {t("stmtRate")}{" "}
                    <span className="text-emerald-700 font-bold">
                      {statementData.summary.savingsRatePercent}%
                    </span>
                  </div>
                </div>

                {/* Financial Health Index */}
                <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
                  <div className="flex items-center justify-between text-zinc-500 text-xs font-semibold">
                    <span className="min-w-0">{t("stmtHealthIndex")}</span>
                    <ShieldCheck className="w-3.5 h-3.5 text-brand-600" />
                  </div>
                  <div className="text-lg font-extrabold text-zinc-950 tabular-nums flex items-baseline gap-1">
                    <span>{statementData.insights.healthScore}</span>
                    <span className="text-xs text-zinc-400 font-normal">/ 100</span>
                  </div>
                  <div className="text-[11px] font-bold text-brand-700">
                    {ratingLabel}
                  </div>
                </div>
              </div>

              {/* Dual-Currency Balance Sheet Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  {t("stmtCashFlowTitle")}
                </h3>
                <div className="overflow-x-auto rounded-lg border border-zinc-200">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-zinc-100 text-zinc-700 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                      <tr>
                        <th className="py-2.5 px-4">{t("stmtColFlow")}</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">{t("stmtColUsd")}</th>
                        <th className="py-2.5 px-4 text-right whitespace-nowrap">{t("stmtColKhr")}</th>
                        <th className="py-2.5 px-4 text-right">{t("stmtColStatus")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 font-medium">
                      <tr>
                        <td className="py-2.5 px-4 text-zinc-800">{t("stmtGrossInflow")}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-zinc-900 tabular-nums">
                          {formatMoney(statementData.summary.totalIncomeMinor, "USD")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-zinc-700 tabular-nums">
                          ៛{statementData.dualCurrency.incomeKHRMinor.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-emerald-700 font-semibold">
                          {t("stmtCredited")}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2.5 px-4 text-zinc-800">{t("stmtOutflowRow")}</td>
                        <td className="py-2.5 px-4 text-right font-bold text-zinc-900 tabular-nums">
                          {formatMoney(statementData.summary.totalExpenseMinor, "USD")}
                        </td>
                        <td className="py-2.5 px-4 text-right font-bold text-zinc-700 tabular-nums">
                          ៛{statementData.dualCurrency.expenseKHRMinor.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right text-zinc-600">
                          {t("stmtTransactionsCount", { count: statementData.summary.transactionCount })}
                        </td>
                      </tr>
                      <tr className="bg-zinc-50/70 font-semibold">
                        <td className="py-2.5 px-4 text-zinc-950 font-bold">{t("stmtNetRow")}</td>
                        <td
                          className={cn(
                            "py-2.5 px-4 text-right font-extrabold tabular-nums",
                            statementData.summary.netSavingsMinor >= 0n ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          {formatMoney(statementData.summary.netSavingsMinor, "USD")}
                        </td>
                        <td
                          className={cn(
                            "py-2.5 px-4 text-right font-extrabold tabular-nums",
                            statementData.summary.netSavingsMinor >= 0n ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          ៛{statementData.dualCurrency.netKHRMinor.toLocaleString()}
                        </td>
                        <td className="py-2.5 px-4 text-right">
                          <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap">
                            {t("stmtSaved", { percent: statementData.summary.savingsRatePercent })}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 text-zinc-600 text-[11px]">{t("stmtDailyBurn")}</td>
                        <td className="py-2 px-4 text-right text-zinc-700 tabular-nums text-[11px]">
                          {t("stmtPerDay", { amount: formatMoney(statementData.summary.averageDailyBurnMinor, "USD") })}
                        </td>
                        <td className="py-2 px-4 text-right text-zinc-600 tabular-nums text-[11px]">
                          ≈{" "}
                          {t("stmtPerDay", {
                            amount: `៛${((Number(statementData.summary.averageDailyBurnMinor) * 41) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                          })}
                        </td>
                        <td className="py-2 px-4 text-right text-zinc-400 text-[11px]">
                          {t("stmtDaysInMonth", { days: statementData.period.daysInMonth })}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Categorical Spending Breakdown Table */}
              <div className="space-y-2 page-break-avoid">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                  {t("stmtCategoryTitle")}
                </h3>
                {statementData.categories.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-2">{t("stmtNoCategories")}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-100 text-zinc-700 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-4">{t("stmtColCategory")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColAmountUsd")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColAmountKhr")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColShare")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColTransactions")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-medium">
                        {statementData.categories.map((cat) => (
                          <tr key={cat.name} className="hover:bg-zinc-50/50">
                            <td className="py-2.5 px-4 text-zinc-900 font-semibold flex items-center gap-2">
                              <span>{cat.name}</span>
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-zinc-900 tabular-nums">
                              {formatMoney(cat.spentMinor, "USD")}
                            </td>
                            <td className="py-2.5 px-4 text-right text-zinc-600 tabular-nums">
                              ៛{((Number(cat.spentMinor) * 41) / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums">
                              <span className="font-bold text-zinc-900">{cat.percentOfTotal}%</span>
                            </td>
                            <td className="py-2.5 px-4 text-right text-zinc-500 tabular-nums">
                              {cat.transactionCount}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Savings Goals Status */}
              {statementData.goals.length > 0 && (
                <div className="space-y-2 page-break-avoid">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                    {t("stmtGoalsTitle")}
                  </h3>
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-100 text-zinc-700 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                        <tr>
                          <th className="py-2.5 px-4">{t("stmtColGoal")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColTarget")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColSaved")}</th>
                          <th className="py-2.5 px-4 text-right">{t("stmtColProgress")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-medium">
                        {statementData.goals.map((g) => (
                          <tr key={g.name}>
                            <td className="py-2.5 px-4 font-semibold text-zinc-900">{g.name}</td>
                            <td className="py-2.5 px-4 text-right tabular-nums text-zinc-600">
                              {formatMoney(g.targetMinor, (g.currency as CurrencyCode) || "USD")}
                            </td>
                            <td className="py-2.5 px-4 text-right tabular-nums font-bold text-zinc-900">
                              {formatMoney(g.currentMinor, (g.currency as CurrencyCode) || "USD")}
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded font-bold text-[10px] border border-brand-200 whitespace-nowrap">
                                {t("stmtAchieved", { percent: g.progressPercent })}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Financial Disciplinary Takeaways */}
              <div className="p-4 rounded-xl bg-zinc-50 border border-zinc-200 space-y-2 page-break-avoid">
                <div className="flex items-center gap-2 text-zinc-900 font-bold text-xs uppercase tracking-wide">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>{t("stmtAnalysisTitle")}</span>
                </div>
                <p className="text-xs text-zinc-700 leading-relaxed">
                  {takeawayText}
                </p>
                {statementData.summary.topExpense && (
                  <p className="text-[11px] text-zinc-500 pt-1 border-t border-zinc-200">
                    <strong>{t("stmtHighestExpense")}</strong>{" "}
                    {t("stmtHighestExpenseDetail", {
                      note: statementData.summary.topExpense.note,
                      category: statementData.summary.topExpense.category,
                    })}{" "}
                    <span className="font-bold text-zinc-900">
                      {formatMoney(statementData.summary.topExpense.amountMinor, "USD")}
                    </span>{" "}
                    {t("stmtOnDate", { date: formatDocDate(statementData.summary.topExpense.date) })}
                  </p>
                )}
              </div>

              {/* Itemized Transactions Ledger (Summary or full list up to 40) */}
              <div className="space-y-2 page-break-avoid">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600">
                    {t("stmtLedgerTitle", { count: statementData.transactions.length })}
                  </h3>
                  <span className="text-[10px] text-zinc-400 shrink-0">{t("stmtChronological")}</span>
                </div>
                {statementData.transactions.length === 0 ? (
                  <p className="text-xs text-zinc-400 italic py-2">{t("stmtNoTransactions")}</p>
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-zinc-200">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-zinc-100 text-zinc-700 font-semibold uppercase text-[10px] tracking-wider border-b border-zinc-200">
                        <tr>
                          <th className="py-2 px-3">{t("stmtColDate")}</th>
                          <th className="py-2 px-3">{t("stmtColDescription")}</th>
                          <th className="py-2 px-3">{t("stmtColCategory")}</th>
                          <th className="py-2 px-3">{t("stmtColAccount")}</th>
                          <th className="py-2 px-3 text-right">{t("stmtColAmount")}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 font-normal">
                        {statementData.transactions.slice(0, 35).map((tx) => (
                          <tr key={tx.id} className="hover:bg-zinc-50/50">
                            <td className="py-2 px-3 font-mono text-[11px] text-zinc-500 whitespace-nowrap">
                              {tx.date}
                            </td>
                            <td className="py-2 px-3 font-semibold text-zinc-900">
                              {tx.note}
                            </td>
                            <td className="py-2 px-3 text-zinc-600 text-[11px]">
                              {tx.category}
                            </td>
                            <td className="py-2 px-3 text-zinc-500 text-[11px]">
                              {tx.account}
                            </td>
                            <td
                              className={cn(
                                "py-2 px-3 text-right font-bold tabular-nums whitespace-nowrap",
                                tx.type === "income" ? "text-emerald-700" : "text-zinc-900"
                              )}
                            >
                              {tx.type === "income" ? "+" : "-"}
                              {formatMoney(tx.amountMinor, (tx.currency as CurrencyCode) || "USD")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {statementData.transactions.length > 35 && (
                      <div className="py-2 px-3 bg-zinc-50 text-[10px] text-zinc-500 text-center border-t border-zinc-200">
                        {t("stmtShowingFirst", { count: 35 })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Official Statement Footer & Compliance */}
              <div className="pt-6 border-t border-zinc-200 text-[10px] text-zinc-500 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="space-y-0.5 text-center sm:text-left">
                  <p className="font-bold text-zinc-700">
                    {t("stmtFooterEngine")}
                  </p>
                  <p>
                    {t("stmtFooterNote")}
                  </p>
                </div>
                <div className="text-right font-mono text-zinc-400">
                  {t("stmtFooterPage")}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
