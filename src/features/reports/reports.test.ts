import { describe, it, expect } from "vitest";
import { detectSpendingLeaks, type LeakTransaction } from "./leak-detector";
import { calculateStreaks, type DayRecord } from "./streaks";

describe("Phase 3 Insights & Reports Logic", () => {
  describe("Spending Leaks Detector", () => {
    it("groups repeated minor transactions below threshold and projects annual cost", () => {
      const txs: LeakTransaction[] = [
        { note: "Coffee", baseAmountMinor: BigInt(250), categoryName: "Food", categoryColor: "#red" },
        { note: "Coffee", baseAmountMinor: BigInt(250), categoryName: "Food", categoryColor: "#red" },
        { note: "Single Expensive Meal", baseAmountMinor: BigInt(2000), categoryName: "Food", categoryColor: "#red" },
        { note: "One-off snack", baseAmountMinor: BigInt(150), categoryName: "Food", categoryColor: "#red" },
      ];

      // Threshold: $5.00 (500 cents)
      const leaks = detectSpendingLeaks(txs, BigInt(500));

      expect(leaks).toHaveLength(1);
      expect(leaks[0].title).toBe("Coffee");
      expect(leaks[0].count).toBe(2);
      expect(leaks[0].totalMinor).toBe(BigInt(500));
      // Projected annual = $5 * 12 = $60 (6000 cents)
      expect(leaks[0].projectedAnnualMinor).toBe(BigInt(6000));
    });

    it("returns empty when no items repeat", () => {
      const txs: LeakTransaction[] = [
        { note: "Ride", baseAmountMinor: BigInt(150), categoryName: "Transport", categoryColor: "#blue" },
        { note: "Snack", baseAmountMinor: BigInt(200), categoryName: "Food", categoryColor: "#red" },
      ];
      expect(detectSpendingLeaks(txs, BigInt(500))).toHaveLength(0);
    });
  });

  describe("Streaks & Habit Tracking", () => {
    it("calculates current under-budget streak and no-spend days", () => {
      const days: DayRecord[] = [
        { date: "2026-10-01", spentMinor: BigInt(1000), allowanceMinor: BigInt(1500) }, // under
        { date: "2026-10-02", spentMinor: BigInt(0), allowanceMinor: BigInt(1500) },    // no-spend & under
        { date: "2026-10-03", spentMinor: BigInt(2000), allowanceMinor: BigInt(1500) }, // over (streak resets)
        { date: "2026-10-04", spentMinor: BigInt(800), allowanceMinor: BigInt(1500) },  // under
        { date: "2026-10-05", spentMinor: BigInt(1200), allowanceMinor: BigInt(1500) }, // under
      ];

      const stats = calculateStreaks(days);
      expect(stats.currentUnderBudgetStreak).toBe(2);
      expect(stats.longestStreak).toBe(2);
      expect(stats.noSpendDaysCount).toBe(1);
      expect(stats.totalDaysEvaluated).toBe(5);
    });
  });
});
