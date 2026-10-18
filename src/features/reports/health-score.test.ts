import { describe, it, expect } from "vitest";
import { calculateFinancialHealthScore } from "./health-score";

describe("Financial Health Score Engine", () => {
  it("calculates elite health score for under-budget, low leaks, and strong streaks", () => {
    const res = calculateFinancialHealthScore({
      monthlyBudgetMinor: 100000n, // $1000
      monthlySpentMinor: 25000n, // $250 on day 15 (expected $500)
      daysInMonth: 30,
      currentDay: 15,
      leaksCount: 0,
      currentStreakDays: 8,
      noSpendDaysCount: 3,
      activeGoalsCount: 2,
      completedGoalsCount: 1,
    });

    expect(res.score).toBeGreaterThanOrEqual(90);
    expect(res.grade).toBe("A+");
    expect(res.pacingStatus).toBe("under_budget");
    expect(res.breakdown.budgetPacing).toBe(40);
    expect(res.breakdown.leakControl).toBe(25);
  });

  it("penalizes over-spending and excessive leaks", () => {
    const res = calculateFinancialHealthScore({
      monthlyBudgetMinor: 50000n, // $500
      monthlySpentMinor: 80000n, // $800 on day 15
      daysInMonth: 30,
      currentDay: 15,
      leaksCount: 5,
      currentStreakDays: 0,
      noSpendDaysCount: 0,
      activeGoalsCount: 0,
      completedGoalsCount: 0,
    });

    expect(res.score).toBeLessThan(50);
    expect(res.grade).toBe("D");
    expect(res.pacingStatus).toBe("over_budget");
  });

  it("handles missing budget gracefully with baseline scoring", () => {
    const res = calculateFinancialHealthScore({
      monthlyBudgetMinor: 0n,
      monthlySpentMinor: 10000n,
      daysInMonth: 30,
      currentDay: 10,
      leaksCount: 1,
      currentStreakDays: 4,
      noSpendDaysCount: 1,
      activeGoalsCount: 1,
      completedGoalsCount: 0,
    });

    expect(res.score).toBeGreaterThanOrEqual(60);
    expect(res.breakdown.budgetPacing).toBe(30);
    expect(res.insights.length).toBeGreaterThan(0);
  });
});
