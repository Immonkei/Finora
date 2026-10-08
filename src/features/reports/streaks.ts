/**
 * Spending Streaks & Habit Metrics (Spec 3.3 #20)
 * Evaluates days under daily allowance and calculates no-spend milestones.
 */

export interface DayRecord {
  date: string; // YYYY-MM-DD
  spentMinor: bigint;
  allowanceMinor: bigint;
}

export interface StreakStats {
  currentUnderBudgetStreak: number;
  longestStreak: number;
  noSpendDaysCount: number;
  totalDaysEvaluated: number;
}

/**
 * Calculates under-budget streaks and no-spend days
 */
export function calculateStreaks(days: DayRecord[]): StreakStats {
  if (days.length === 0) {
    return {
      currentUnderBudgetStreak: 0,
      longestStreak: 0,
      noSpendDaysCount: 0,
      totalDaysEvaluated: 0,
    };
  }

  let currentStreak = 0;
  let maxStreak = 0;
  let noSpendCount = 0;

  // Process chronologically
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));

  for (const day of sorted) {
    const isUnderBudget = day.spentMinor <= day.allowanceMinor;
    const isNoSpend = day.spentMinor === 0n;

    if (isNoSpend) {
      noSpendCount++;
    }

    if (isUnderBudget) {
      currentStreak++;
      if (currentStreak > maxStreak) {
        maxStreak = currentStreak;
      }
    } else {
      currentStreak = 0;
    }
  }

  return {
    currentUnderBudgetStreak: currentStreak,
    longestStreak: maxStreak,
    noSpendDaysCount: noSpendCount,
    totalDaysEvaluated: sorted.length,
  };
}
