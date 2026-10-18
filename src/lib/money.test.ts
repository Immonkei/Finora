import { describe, it, expect } from "vitest";
import {
  toMinorUnits,
  fromMinorUnits,
  formatMoney,
  calculateDailyAllowance,
  calculateForecast,
  convertUsdToKhrMinor,
  formatKhrApproximation,
} from "./money";

describe("Money Utilities", () => {
  it("converts USD decimal amounts to integer cents (minor units)", () => {
    expect(toMinorUnits(12.5, "USD")).toBe(BigInt(1250));
    expect(toMinorUnits(0.99, "USD")).toBe(BigInt(99));
    expect(toMinorUnits(19.99, "USD")).toBe(BigInt(1999));
    expect(toMinorUnits(0, "USD")).toBe(BigInt(0));
  });

  it("converts KHR decimal amounts to integer riel (minor units)", () => {
    expect(toMinorUnits(4000, "KHR")).toBe(BigInt(4000));
    expect(toMinorUnits(50000, "KHR")).toBe(BigInt(50000));
  });

  it("converts minor units back to decimal float", () => {
    expect(fromMinorUnits(BigInt(1250), "USD")).toBe(12.5);
    expect(fromMinorUnits(BigInt(99), "USD")).toBe(0.99);
    expect(fromMinorUnits(BigInt(4000), "KHR")).toBe(4000);
  });

  it("formats USD currency correctly", () => {
    const formatted = formatMoney(BigInt(1250), "USD");
    expect(formatted).toContain("12.50");
    expect(formatted).toContain("$");
  });

  it("calculates daily allowance properly", () => {
    // $300 remaining over 10 days => $30 / day (3000 cents)
    const allowance = calculateDailyAllowance(BigInt(30000), 10);
    expect(allowance).toBe(BigInt(3000));

    // Negative or 0 remaining => 0
    expect(calculateDailyAllowance(BigInt(-500), 10)).toBe(BigInt(0));
    expect(calculateDailyAllowance(BigInt(5000), 0)).toBe(BigInt(0));
  });

  it("calculates forecast and average spending per day", () => {
    // Spent $100 over 10 days ($10/day), 20 days left => forecast $300
    const result = calculateForecast(BigInt(10000), 10, 20);
    expect(result.averagePerDayMinor).toBe(BigInt(1000));
    expect(result.forecastMinor).toBe(BigInt(30000));
  });

  it("converts USD cents to KHR riel accurately using integer math", () => {
    // $1.00 (100 cents) at 4100 rate = 4100 riel
    expect(convertUsdToKhrMinor(100n)).toBe(4100n);
    // $10.00 (1000 cents) = 41,000 riel
    expect(convertUsdToKhrMinor(1000n)).toBe(41000n);
    // $0.50 (50 cents) = 2050 riel
    expect(convertUsdToKhrMinor(50n)).toBe(2050n);
    expect(formatKhrApproximation(1000n)).toContain("41,000");
  });
});
