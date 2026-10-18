/**
 * Finora Rollover Allowance Engine
 * Calculates unspent budget rollover surpluses, carrying forward unspent allowances
 * into subsequent periods to encourage frugality and reward financial discipline.
 */

export interface CategoryBudgetInput {
  id: string;
  name: string;
  monthlyBudgetMinor: bigint; // 0n if no specific limit set
  rollover: boolean;
  currentMonthSpentMinor: bigint;
  previousMonthSurplusMinor?: bigint; // Unspent surplus rolled from prior month
}

export interface CategoryRolloverResult {
  id: string;
  name: string;
  baseBudgetMinor: bigint;
  rolledSurplusMinor: bigint;
  effectiveBudgetMinor: bigint;
  currentSpentMinor: bigint;
  remainingAllowanceMinor: bigint;
  nextMonthRolloverMinor: bigint;
  isOverspent: boolean;
  overspentAmountMinor: bigint;
  percentUsed: number;
  rolloverEnabled: boolean;
}

export interface RolloverSummary {
  totalBaseBudgetMinor: bigint;
  totalRolledSurplusMinor: bigint;
  totalEffectiveBudgetMinor: bigint;
  totalSpentMinor: bigint;
  totalRemainingMinor: bigint;
  totalNextMonthRolloverMinor: bigint;
  activeRolloverCount: number;
  overspentCategoriesCount: number;
}

/**
 * Calculates rollover metrics for an individual category.
 */
export function calculateCategoryRollover(
  input: CategoryBudgetInput
): CategoryRolloverResult {
  const baseBudgetMinor = input.monthlyBudgetMinor > 0n ? input.monthlyBudgetMinor : 0n;
  const rolledSurplusMinor =
    input.rollover && input.previousMonthSurplusMinor && input.previousMonthSurplusMinor > 0n
      ? input.previousMonthSurplusMinor
      : 0n;

  const effectiveBudgetMinor = baseBudgetMinor + rolledSurplusMinor;
  const currentSpentMinor = input.currentMonthSpentMinor > 0n ? input.currentMonthSpentMinor : 0n;

  const diff = effectiveBudgetMinor - currentSpentMinor;
  const isOverspent = diff < 0n;
  const overspentAmountMinor = isOverspent ? -diff : 0n;
  const remainingAllowanceMinor = isOverspent ? 0n : diff;

  // Next month rollover: unspent allowance if rollover enabled, else 0
  const nextMonthRolloverMinor = input.rollover && !isOverspent ? remainingAllowanceMinor : 0n;

  let percentUsed = 0;
  if (effectiveBudgetMinor > 0n) {
    percentUsed =
      Math.round((Number(currentSpentMinor) / Number(effectiveBudgetMinor)) * 1000) / 10;
  }

  return {
    id: input.id,
    name: input.name,
    baseBudgetMinor,
    rolledSurplusMinor,
    effectiveBudgetMinor,
    currentSpentMinor,
    remainingAllowanceMinor,
    nextMonthRolloverMinor,
    isOverspent,
    overspentAmountMinor,
    percentUsed,
    rolloverEnabled: input.rollover,
  };
}

/**
 * Aggregates all categories into an executive rollover summary.
 */
export function calculateOverallRolloverSummary(
  categories: CategoryBudgetInput[]
): RolloverSummary {
  let totalBaseBudgetMinor = 0n;
  let totalRolledSurplusMinor = 0n;
  let totalEffectiveBudgetMinor = 0n;
  let totalSpentMinor = 0n;
  let totalRemainingMinor = 0n;
  let totalNextMonthRolloverMinor = 0n;
  let activeRolloverCount = 0;
  let overspentCategoriesCount = 0;

  categories.forEach((cat) => {
    const res = calculateCategoryRollover(cat);
    totalBaseBudgetMinor += res.baseBudgetMinor;
    totalRolledSurplusMinor += res.rolledSurplusMinor;
    totalEffectiveBudgetMinor += res.effectiveBudgetMinor;
    totalSpentMinor += res.currentSpentMinor;
    totalRemainingMinor += res.remainingAllowanceMinor;
    totalNextMonthRolloverMinor += res.nextMonthRolloverMinor;

    if (res.rolloverEnabled) {
      activeRolloverCount++;
    }
    if (res.isOverspent) {
      overspentCategoriesCount++;
    }
  });

  return {
    totalBaseBudgetMinor,
    totalRolledSurplusMinor,
    totalEffectiveBudgetMinor,
    totalSpentMinor,
    totalRemainingMinor,
    totalNextMonthRolloverMinor,
    activeRolloverCount,
    overspentCategoriesCount,
  };
}
