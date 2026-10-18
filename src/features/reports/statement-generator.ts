/**
 * Finora Monthly Statement Generator Engine
 * Generates an executive, branded financial summary and ledger for any specified month.
 * Pure mathematical & business logic; zero UI dependencies.
 */

export interface StatementTransactionInput {
  id: string;
  occurredAt: string;
  type: "income" | "expense";
  baseAmountMinor: bigint; // in USD cents
  amountMinor: bigint;
  currency: string;
  categoryName: string;
  note: string;
  accountName: string;
}

export interface StatementGoalInput {
  id: string;
  name: string;
  targetAmountMinor: bigint;
  currentAmountMinor: bigint;
  currency: string;
}

export interface StatementGeneratorOptions {
  month: string; // "YYYY-MM" (e.g. "2026-10")
  transactions: StatementTransactionInput[];
  budgetLimitMinor?: bigint;
  goals?: StatementGoalInput[];
  exchangeRateKHR?: number; // e.g. 4100
  userId?: string;
  generatedAt?: Date;
}

export interface StatementCategorySummary {
  name: string;
  spentMinor: bigint;
  percentOfTotal: number;
  transactionCount: number;
}

export interface StatementGoalSummary {
  name: string;
  targetMinor: bigint;
  currentMinor: bigint;
  progressPercent: number;
  currency: string;
}

export interface MonthlyStatementData {
  statementId: string;
  period: {
    monthStr: string; // "YYYY-MM"
    label: string; // "October 2026"
    startDate: string; // "2026-10-01"
    endDate: string; // "2026-10-31"
    daysInMonth: number;
  };
  generatedAtIso: string;
  generatedAtFormatted: string;
  summary: {
    totalIncomeMinor: bigint;
    totalExpenseMinor: bigint;
    netSavingsMinor: bigint;
    savingsRatePercent: number;
    budgetLimitMinor: bigint;
    budgetRemainingMinor: bigint;
    budgetAdherencePercent: number;
    averageDailyBurnMinor: bigint;
    transactionCount: number;
    topExpense: {
      note: string;
      category: string;
      amountMinor: bigint;
      date: string;
    } | null;
  };
  dualCurrency: {
    incomeUSDMinor: bigint;
    incomeKHRMinor: bigint;
    expenseUSDMinor: bigint;
    expenseKHRMinor: bigint;
    netUSDMinor: bigint;
    netKHRMinor: bigint;
    exchangeRate: number;
  };
  categories: StatementCategorySummary[];
  goals: StatementGoalSummary[];
  transactions: {
    id: string;
    date: string;
    note: string;
    category: string;
    account: string;
    type: "income" | "expense";
    amountMinor: bigint;
    currency: string;
    baseAmountMinor: bigint;
  }[];
  insights: {
    healthScore: number;
    disciplineRating: "Exceptional" | "Solid" | "Needs Attention" | "Critical";
    keyTakeaway: string;
  };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export function generateMonthlyStatement({
  month,
  transactions,
  budgetLimitMinor = 0n,
  goals = [],
  exchangeRateKHR = 4100,
  userId = "finora-user",
  generatedAt = new Date(),
}: StatementGeneratorOptions): MonthlyStatementData {
  // 1. Parse Year & Month
  const [yearStr, monthNumStr] = month.split("-");
  const year = parseInt(yearStr, 10);
  const monthIdx = parseInt(monthNumStr, 10) - 1; // 0-based

  const daysInMonth = new Date(year, monthIdx + 1, 0).getDate();
  const monthLabel = `${MONTH_NAMES[monthIdx]} ${year}`;
  const startDate = `${month}-01`;
  const endDate = `${month}-${String(daysInMonth).padStart(2, "0")}`;

  // Deterministic statement ID
  const hashSeed = Math.abs(
    (userId + month).split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
  );
  const statementId = `FIN-STMT-${yearStr}${monthNumStr}-${String(hashSeed % 9000 + 1000)}`;

  // 2. Filter transactions strictly within the target month
  const monthTransactions = transactions.filter((t) => {
    const d = t.occurredAt.slice(0, 10);
    return d >= startDate && d <= endDate;
  });

  // Sort chronologically (latest first)
  monthTransactions.sort((a, b) => (a.occurredAt > b.occurredAt ? -1 : 1));

  // 3. Totals and Metrics
  let totalIncomeMinor = 0n;
  let totalExpenseMinor = 0n;
  let topExpense: MonthlyStatementData["summary"]["topExpense"] = null;

  const categoryMap = new Map<string, { spentMinor: bigint; count: number }>();

  monthTransactions.forEach((t) => {
    if (t.type === "income") {
      totalIncomeMinor += t.baseAmountMinor;
    } else {
      totalExpenseMinor += t.baseAmountMinor;

      // Check top expense
      if (!topExpense || t.baseAmountMinor > topExpense.amountMinor) {
        topExpense = {
          note: t.note || "Expense",
          category: t.categoryName || "General",
          amountMinor: t.baseAmountMinor,
          date: t.occurredAt.slice(0, 10),
        };
      }

      // Aggregate category spending
      const catKey = t.categoryName || "General";
      const existing = categoryMap.get(catKey) || { spentMinor: 0n, count: 0 };
      categoryMap.set(catKey, {
        spentMinor: existing.spentMinor + t.baseAmountMinor,
        count: existing.count + 1,
      });
    }
  });

  const netSavingsMinor = totalIncomeMinor - totalExpenseMinor;

  // Savings rate = (Net Savings / Total Income) * 100
  let savingsRatePercent = 0;
  if (totalIncomeMinor > 0n) {
    if (netSavingsMinor > 0n) {
      savingsRatePercent =
        Math.round((Number(netSavingsMinor) / Number(totalIncomeMinor)) * 1000) / 10;
    } else {
      savingsRatePercent = 0;
    }
  }

  // Budget calculations
  const budgetRemainingMinor =
    budgetLimitMinor > totalExpenseMinor ? budgetLimitMinor - totalExpenseMinor : 0n;
  const budgetAdherencePercent =
    budgetLimitMinor > 0n
      ? Math.round((Number(totalExpenseMinor) / Number(budgetLimitMinor)) * 1000) / 10
      : 0;

  const averageDailyBurnMinor =
    daysInMonth > 0 ? totalExpenseMinor / BigInt(daysInMonth) : 0n;

  // 4. Dual-Currency conversions
  const rateBig = BigInt(Math.round(exchangeRateKHR));
  const incomeUSDMinor = totalIncomeMinor;
  const incomeKHRMinor = (totalIncomeMinor * rateBig) / 100n;

  const expenseUSDMinor = totalExpenseMinor;
  const expenseKHRMinor = (totalExpenseMinor * rateBig) / 100n;

  const netUSDMinor = netSavingsMinor;
  const netKHRMinor = (netSavingsMinor * rateBig) / 100n;

  // 5. Categorical Breakdown sorted descending by spent amount
  const categories: StatementCategorySummary[] = Array.from(categoryMap.entries())
    .map(([name, data]) => {
      const pct =
        totalExpenseMinor > 0n
          ? Math.round((Number(data.spentMinor) / Number(totalExpenseMinor)) * 1000) / 10
          : 0;
      return {
        name,
        spentMinor: data.spentMinor,
        percentOfTotal: pct,
        transactionCount: data.count,
      };
    })
    .sort((a, b) => (a.spentMinor > b.spentMinor ? -1 : 1));

  // 6. Savings Goals
  const goalsSummary: StatementGoalSummary[] = goals.map((g) => {
    const pct =
      g.targetAmountMinor > 0n
        ? Math.min(100, Math.round(Number((g.currentAmountMinor * 100n) / g.targetAmountMinor)))
        : 0;
    return {
      name: g.name,
      targetMinor: g.targetAmountMinor,
      currentMinor: g.currentAmountMinor,
      progressPercent: pct,
      currency: g.currency,
    };
  });

  // 7. Executive Discipline Rating & Health Score
  let healthScore = 70; // baseline
  if (budgetLimitMinor > 0n) {
    if (totalExpenseMinor <= budgetLimitMinor) {
      healthScore += 15;
    } else {
      healthScore -= 20;
    }
  }
  if (savingsRatePercent >= 20) {
    healthScore += 15;
  } else if (savingsRatePercent >= 10) {
    healthScore += 5;
  } else if (netSavingsMinor < 0n) {
    healthScore -= 15;
  }

  // Clamp health score 0 to 100
  healthScore = Math.max(0, Math.min(100, healthScore));

  let disciplineRating: MonthlyStatementData["insights"]["disciplineRating"] = "Solid";
  let keyTakeaway = "";

  if (healthScore >= 85) {
    disciplineRating = "Exceptional";
    keyTakeaway = `Outstanding financial velocity! You saved ${savingsRatePercent}% of income and strictly kept expenses within boundaries.`;
  } else if (healthScore >= 65) {
    disciplineRating = "Solid";
    keyTakeaway = "Steady financial performance. Essential outflows are covered, and positive cash flow is maintained.";
  } else if (healthScore >= 45) {
    disciplineRating = "Needs Attention";
    keyTakeaway = "Expenses are outpacing comfortable budget thresholds. Recommend reviewing recurring subscriptions and non-essential leaks.";
  } else {
    disciplineRating = "Critical";
    keyTakeaway = "Monthly deficit detected. Outflow exceeded inflow. Focus on curbing discretionary spending to protect your reserves.";
  }

  // 8. Transaction list formatted
  const mappedTransactions = monthTransactions.map((t) => ({
    id: t.id,
    date: t.occurredAt.slice(0, 10),
    note: t.note || "Transaction",
    category: t.categoryName || "General",
    account: t.accountName || "Primary Account",
    type: t.type,
    amountMinor: t.amountMinor,
    currency: t.currency || "USD",
    baseAmountMinor: t.baseAmountMinor,
  }));

  return {
    statementId,
    period: {
      monthStr: month,
      label: monthLabel,
      startDate,
      endDate,
      daysInMonth,
    },
    generatedAtIso: generatedAt.toISOString(),
    generatedAtFormatted: generatedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
    summary: {
      totalIncomeMinor,
      totalExpenseMinor,
      netSavingsMinor,
      savingsRatePercent,
      budgetLimitMinor,
      budgetRemainingMinor,
      budgetAdherencePercent,
      averageDailyBurnMinor,
      transactionCount: monthTransactions.length,
      topExpense,
    },
    dualCurrency: {
      incomeUSDMinor,
      incomeKHRMinor,
      expenseUSDMinor,
      expenseKHRMinor,
      netUSDMinor,
      netKHRMinor,
      exchangeRate: exchangeRateKHR,
    },
    categories,
    goals: goalsSummary,
    transactions: mappedTransactions,
    insights: {
      healthScore,
      disciplineRating,
      keyTakeaway,
    },
  };
}
