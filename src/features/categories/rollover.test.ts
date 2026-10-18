import { describe, it, expect } from "vitest";
import {
  calculateCategoryRollover,
  calculateOverallRolloverSummary,
  type CategoryBudgetInput,
} from "./rollover";

describe("calculateCategoryRollover", () => {
  it("rolls over previous surplus into effective budget when rollover is enabled", () => {
    const input: CategoryBudgetInput = {
      id: "cat-1",
      name: "Dining & Coffee",
      monthlyBudgetMinor: 20000n, // $200.00
      rollover: true,
      currentMonthSpentMinor: 12000n, // $120.00
      previousMonthSurplusMinor: 5000n, // $50.00 rolled from last month
    };

    const res = calculateCategoryRollover(input);
    expect(res.baseBudgetMinor).toBe(20000n);
    expect(res.rolledSurplusMinor).toBe(5000n);
    // Effective budget = $200 + $50 = $250 (25000)
    expect(res.effectiveBudgetMinor).toBe(25000n);
    // Remaining = $250 - $120 = $130 (13000)
    expect(res.remainingAllowanceMinor).toBe(13000n);
    // Rolls over $130 into next month
    expect(res.nextMonthRolloverMinor).toBe(13000n);
    expect(res.isOverspent).toBe(false);
    expect(res.percentUsed).toBe(48); // 120 / 250 = 48.0%
  });

  it("ignores previous surplus when rollover is disabled", () => {
    const input: CategoryBudgetInput = {
      id: "cat-2",
      name: "Shopping",
      monthlyBudgetMinor: 10000n, // $100.00
      rollover: false,
      currentMonthSpentMinor: 6000n, // $60.00
      previousMonthSurplusMinor: 4000n, // would be $40, but ignored
    };

    const res = calculateCategoryRollover(input);
    expect(res.baseBudgetMinor).toBe(10000n);
    expect(res.rolledSurplusMinor).toBe(0n);
    expect(res.effectiveBudgetMinor).toBe(10000n);
    expect(res.remainingAllowanceMinor).toBe(4000n);
    // When rollover disabled, nextMonthRollover is 0
    expect(res.nextMonthRolloverMinor).toBe(0n);
    expect(res.percentUsed).toBe(60);
  });

  it("flags overspent category accurately and prevents negative rollover", () => {
    const input: CategoryBudgetInput = {
      id: "cat-3",
      name: "Entertainment",
      monthlyBudgetMinor: 5000n, // $50.00
      rollover: true,
      currentMonthSpentMinor: 8000n, // $80.00
      previousMonthSurplusMinor: 0n,
    };

    const res = calculateCategoryRollover(input);
    expect(res.isOverspent).toBe(true);
    expect(res.overspentAmountMinor).toBe(3000n);
    expect(res.remainingAllowanceMinor).toBe(0n);
    expect(res.nextMonthRolloverMinor).toBe(0n);
    expect(res.percentUsed).toBe(160);
  });
});

describe("calculateOverallRolloverSummary", () => {
  it("aggregates rollover buffer and budgets across multiple categories", () => {
    const categories: CategoryBudgetInput[] = [
      {
        id: "cat-1",
        name: "Dining",
        monthlyBudgetMinor: 20000n,
        rollover: true,
        currentMonthSpentMinor: 15000n,
        previousMonthSurplusMinor: 5000n,
      },
      {
        id: "cat-2",
        name: "Groceries",
        monthlyBudgetMinor: 30000n,
        rollover: true,
        currentMonthSpentMinor: 20000n,
        previousMonthSurplusMinor: 0n,
      },
      {
        id: "cat-3",
        name: "Gadgets",
        monthlyBudgetMinor: 10000n,
        rollover: false,
        currentMonthSpentMinor: 12000n, // overspent by 2000
      },
    ];

    const summary = calculateOverallRolloverSummary(categories);
    // Base: 20000 + 30000 + 10000 = 60000
    expect(summary.totalBaseBudgetMinor).toBe(60000n);
    // Rolled surplus: 5000
    expect(summary.totalRolledSurplusMinor).toBe(5000n);
    // Effective: 25000 + 30000 + 10000 = 65000
    expect(summary.totalEffectiveBudgetMinor).toBe(65000n);
    // Spent: 15000 + 20000 + 12000 = 47000
    expect(summary.totalSpentMinor).toBe(47000n);
    // Next month rollover:
    // Dining: 25000 - 15000 = 10000
    // Groceries: 30000 - 20000 = 10000
    // Gadgets: rollover false = 0
    // Total next month rollover: 20000
    expect(summary.totalNextMonthRolloverMinor).toBe(20000n);
    expect(summary.activeRolloverCount).toBe(2);
    expect(summary.overspentCategoriesCount).toBe(1);
  });
});
