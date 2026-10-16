import { fromMinorUnits, type CurrencyCode } from "@/lib/money";

export interface BudgetPacePoint {
  day: number;
  dateLabel: string;
  actualSpent: number | null;
  budgetPace: number;
  projectedSpent: number | null;
  actualSpentMinor: bigint | null;
  budgetPaceMinor: bigint;
  projectedSpentMinor: bigint | null;
  isToday?: boolean;
}

export interface CategoryChartItem {
  id?: string;
  name: string;
  spentMinor: bigint;
  amount: number;
  percent: number;
  color: string;
  icon?: string | null;
}

export interface WeeklyBarPoint {
  day: string;
  fullDate?: string;
  amountMinor: bigint;
  amount: number;
  isToday?: boolean;
  isHighest?: boolean;
}

/**
 * Curated accessible Finora chart color palette.
 * Tested for contrast, visual rhythm, and dark/light mode balance.
 */
export const CHART_PALETTE = [
  "#1b4d72", // Finora Navy
  "#4fa3b3", // Cyan / Teal
  "#10b981", // Emerald
  "#f59e0b", // Amber
  "#8b5cf6", // Violet
  "#ec4899", // Rose
  "#06b6d4", // Sky
  "#f97316", // Coral Orange
  "#6366f1", // Indigo
  "#64748b", // Slate
];

export function getChartColor(index: number, overrideColor?: string | null): string {
  if (overrideColor && overrideColor.trim().startsWith("#")) {
    return overrideColor.trim();
  }
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/**
 * Generate cumulative spending vs linear budget pace for each day of the month.
 */
export function generateBudgetPaceData({
  daysInMonth,
  currentDay,
  spentSoFarMinor,
  totalBudgetMinor,
  currency = "USD",
  monthName = "Oct",
  dailySpendingMap,
}: {
  daysInMonth: number;
  currentDay: number;
  spentSoFarMinor: bigint;
  totalBudgetMinor: bigint;
  currency?: CurrencyCode;
  monthName?: string;
  dailySpendingMap?: Record<number, bigint>;
}): BudgetPacePoint[] {
  const points: BudgetPacePoint[] = [];
  const safeCurrentDay = Math.min(Math.max(1, currentDay), daysInMonth);

  // If daily spending map is not provided, estimate cumulative progression up to current day
  let runningActualMinor = 0n;

  for (let day = 1; day <= daysInMonth; day++) {
    // Ideal linear pace: pace on day = (totalBudget / daysInMonth) * day
    const paceMinor = (totalBudgetMinor * BigInt(day)) / BigInt(daysInMonth);

    let actualSpentMinor: bigint | null = null;
    let projectedSpentMinor: bigint | null = null;

    if (day <= safeCurrentDay) {
      if (dailySpendingMap && dailySpendingMap[day] !== undefined) {
        runningActualMinor += dailySpendingMap[day];
        actualSpentMinor = runningActualMinor;
      } else {
        // Smooth cumulative curve that ends at spentSoFarMinor on safeCurrentDay
        if (day === safeCurrentDay) {
          actualSpentMinor = spentSoFarMinor;
        } else {
          // Linear interpolation baseline
          actualSpentMinor = (spentSoFarMinor * BigInt(day)) / BigInt(safeCurrentDay);
        }
      }
    }

    // Projected trajectory from safeCurrentDay to end of month
    if (day >= safeCurrentDay) {
      const dailyAvgMinor =
        safeCurrentDay > 0 ? spentSoFarMinor / BigInt(safeCurrentDay) : 0n;
      const daysAhead = BigInt(day - safeCurrentDay);
      projectedSpentMinor = spentSoFarMinor + dailyAvgMinor * daysAhead;
    }

    points.push({
      day,
      dateLabel: `${monthName} ${day}`,
      actualSpent: actualSpentMinor !== null ? fromMinorUnits(actualSpentMinor, currency) : null,
      actualSpentMinor,
      budgetPace: fromMinorUnits(paceMinor, currency),
      budgetPaceMinor: paceMinor,
      projectedSpent:
        projectedSpentMinor !== null
          ? fromMinorUnits(projectedSpentMinor, currency)
          : null,
      projectedSpentMinor,
      isToday: day === safeCurrentDay,
    });
  }

  return points;
}

/**
 * Transforms category budgets or spending rows into chart-ready donut data.
 */
export function transformCategoryChartData(
  items: Array<{
    name: string;
    spentMinor: bigint;
    color?: string | null;
    icon?: string | null;
    id?: string;
  }>,
  currency: CurrencyCode = "USD"
): CategoryChartItem[] {
  const totalSpentMinor = items.reduce((acc, item) => acc + item.spentMinor, 0n);

  return items
    .filter((item) => item.spentMinor > 0n)
    .sort((a, b) => (b.spentMinor > a.spentMinor ? 1 : -1))
    .map((item, index) => {
      const percent =
        totalSpentMinor > 0n
          ? Math.round(Number((item.spentMinor * 1000n) / totalSpentMinor)) / 10
          : 0;

      return {
        id: item.id || `cat-${index}`,
        name: item.name,
        spentMinor: item.spentMinor,
        amount: fromMinorUnits(item.spentMinor, currency),
        percent,
        color: getChartColor(index, item.color),
        icon: item.icon,
      };
    });
}
