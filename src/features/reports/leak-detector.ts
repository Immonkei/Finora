/**
 * Spending Leaks Detection (Spec 3.3 #16 & 9.3)
 * Identifies repeated small expenses (under $5 or 20,000 KHR)
 * and calculates annual/monthly accumulation.
 */

export interface SpendingLeak {
  title: string;
  count: number;
  thresholdMinor: bigint;
  totalMinor: bigint;
  projectedAnnualMinor: bigint;
  category: string;
  categoryColor: string;
}

export interface LeakTransaction {
  note: string | null;
  baseAmountMinor: bigint;
  categoryName: string;
  categoryColor: string;
}

export const DEFAULT_LEAK_THRESHOLD_USD_CENTS = BigInt(500); // $5.00

/**
 * Groups small expenses and calculates top spending leaks
 */
export function detectSpendingLeaks(
  transactions: LeakTransaction[],
  thresholdMinor: bigint = DEFAULT_LEAK_THRESHOLD_USD_CENTS
): SpendingLeak[] {
  const smallTxs = transactions.filter(
    (t) => t.baseAmountMinor > 0n && t.baseAmountMinor <= thresholdMinor
  );

  const groupMap = new Map<
    string,
    {
      title: string;
      count: number;
      totalMinor: bigint;
      category: string;
      categoryColor: string;
    }
  >();

  for (const tx of smallTxs) {
    const rawTitle = (tx.note || tx.categoryName).trim().toLowerCase();
    // Capitalize for display
    const displayTitle = rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1);

    const existing = groupMap.get(displayTitle);
    if (existing) {
      existing.count += 1;
      existing.totalMinor += tx.baseAmountMinor;
    } else {
      groupMap.set(displayTitle, {
        title: displayTitle,
        count: 1,
        totalMinor: tx.baseAmountMinor,
        category: tx.categoryName,
        categoryColor: tx.categoryColor,
      });
    }
  }

  // Only consider items repeated more than once
  return Array.from(groupMap.values())
    .filter((item) => item.count > 1)
    .map((item) => ({
      ...item,
      thresholdMinor,
      // Projected annual = monthly total * 12
      projectedAnnualMinor: item.totalMinor * 12n,
    }))
    .sort((a, b) => (b.totalMinor > a.totalMinor ? 1 : -1));
}
