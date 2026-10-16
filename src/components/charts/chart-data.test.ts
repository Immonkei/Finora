import { describe, it, expect } from "vitest";
import {
  generateBudgetPaceData,
  transformCategoryChartData,
  getChartColor,
  CHART_PALETTE,
} from "./chart-data";

describe("chart-data utilities", () => {
  describe("getChartColor", () => {
    it("returns custom hex color when provided", () => {
      expect(getChartColor(0, "#ff0000")).toBe("#ff0000");
    });

    it("falls back to CHART_PALETTE on invalid or missing color", () => {
      expect(getChartColor(0, null)).toBe(CHART_PALETTE[0]);
      expect(getChartColor(1, "")).toBe(CHART_PALETTE[1]);
      expect(getChartColor(12, undefined)).toBe(CHART_PALETTE[12 % CHART_PALETTE.length]);
    });
  });

  describe("generateBudgetPaceData", () => {
    it("generates correct number of points for a 31-day month", () => {
      const data = generateBudgetPaceData({
        daysInMonth: 31,
        currentDay: 10,
        spentSoFarMinor: 30000n, // $300.00
        totalBudgetMinor: 93000n, // $930.00 ($30/day)
        currency: "USD",
        monthName: "Oct",
      });

      expect(data).toHaveLength(31);
      expect(data[0].day).toBe(1);
      expect(data[30].day).toBe(31);

      // Check ideal budget pace on day 10
      // 93000 * 10 / 31 = 30000 cents = $300.00
      expect(data[9].day).toBe(10);
      expect(data[9].budgetPaceMinor).toBe(30000n);
      expect(data[9].budgetPace).toBe(300);

      // Actual spent should be defined up to day 10, and null afterwards
      expect(data[9].actualSpent).toBe(300);
      expect(data[9].isToday).toBe(true);
      expect(data[10].actualSpent).toBeNull();
      expect(data[10].actualSpentMinor).toBeNull();

      // Projected spent should be null before day 10, and populated from day 10 onwards
      expect(data[8].projectedSpent).toBeNull();
      expect(data[9].projectedSpent).toBe(300);
      expect(data[30].projectedSpent).toBeGreaterThan(300);
    });

    it("handles first day of the month without division by zero", () => {
      const data = generateBudgetPaceData({
        daysInMonth: 30,
        currentDay: 1,
        spentSoFarMinor: 1000n,
        totalBudgetMinor: 30000n,
        currency: "USD",
      });

      expect(data).toHaveLength(30);
      expect(data[0].actualSpentMinor).toBe(1000n);
      expect(data[0].isToday).toBe(true);
    });

    it("uses dailySpendingMap when provided", () => {
      const dailyMap: Record<number, bigint> = {
        1: 500n,
        2: 1000n,
        3: 1500n,
      };

      const data = generateBudgetPaceData({
        daysInMonth: 30,
        currentDay: 3,
        spentSoFarMinor: 3000n,
        totalBudgetMinor: 30000n,
        dailySpendingMap: dailyMap,
      });

      expect(data[0].actualSpentMinor).toBe(500n);
      expect(data[1].actualSpentMinor).toBe(1500n);
      expect(data[2].actualSpentMinor).toBe(3000n);
      expect(data[3].actualSpentMinor).toBeNull();
    });
  });

  describe("transformCategoryChartData", () => {
    it("transforms, filters out zero spending, sorts descending, and calculates percent", () => {
      const items = [
        { name: "Zero Item", spentMinor: 0n },
        { name: "Coffee", spentMinor: 2000n, color: "#112233" },
        { name: "Rent", spentMinor: 8000n },
      ];

      const result = transformCategoryChartData(items, "USD");

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Rent");
      expect(result[0].amount).toBe(80);
      expect(result[0].percent).toBe(80);

      expect(result[1].name).toBe("Coffee");
      expect(result[1].amount).toBe(20);
      expect(result[1].percent).toBe(20);
      expect(result[1].color).toBe("#112233");
    });

    it("returns empty array for empty inputs or all zero items", () => {
      const result = transformCategoryChartData([]);
      expect(result).toEqual([]);
    });
  });
});
