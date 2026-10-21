import { describe, expect, it } from "vitest";
import {
  computeAccountBalances,
  convertMinor,
  totalInCurrency,
  type BalanceAccount,
  type BalanceTransaction,
} from "./balances";

const RATE = 4100;
const cash: BalanceAccount = { id: "cash", currency: "USD", openingBalance: 5000n }; // $50.00
const wing: BalanceAccount = { id: "wing", currency: "KHR", openingBalance: 41000n }; // ៛41,000

const tx = (t: Partial<BalanceTransaction>): BalanceTransaction => ({
  type: "expense",
  amount: 0n,
  currency: "USD",
  accountId: "cash",
  toAccountId: null,
  ...t,
});

describe("convertMinor", () => {
  it("converts cents to riel and back with integer math", () => {
    expect(convertMinor(100n, "USD", "KHR", RATE)).toBe(4100n);
    expect(convertMinor(4100n, "KHR", "USD", RATE)).toBe(100n);
    expect(convertMinor(2050n, "KHR", "USD", RATE)).toBe(50n);
    expect(convertMinor(123n, "USD", "USD", RATE)).toBe(123n);
  });
});

describe("computeAccountBalances", () => {
  it("starts from the opening balance", () => {
    const b = computeAccountBalances([cash, wing], [], RATE);
    expect(b.get("cash")).toBe(5000n);
    expect(b.get("wing")).toBe(41000n);
  });

  it("adds income and subtracts expenses", () => {
    const b = computeAccountBalances(
      [cash],
      [tx({ type: "income", amount: 2000n }), tx({ type: "expense", amount: 750n })],
      RATE
    );
    expect(b.get("cash")).toBe(5000n + 2000n - 750n);
  });

  it("converts a riel expense into a dollar account", () => {
    const b = computeAccountBalances([cash], [tx({ amount: 8200n, currency: "KHR" })], RATE);
    expect(b.get("cash")).toBe(5000n - 200n);
  });

  it("moves transfers between accounts across currencies", () => {
    const b = computeAccountBalances(
      [cash, wing],
      [tx({ type: "transfer", amount: 1000n, accountId: "cash", toAccountId: "wing" })],
      RATE
    );
    expect(b.get("cash")).toBe(4000n);
    expect(b.get("wing")).toBe(41000n + 41000n);
  });

  it("ignores transactions on unknown accounts", () => {
    const b = computeAccountBalances([cash], [tx({ accountId: "gone", amount: 999n })], RATE);
    expect(b.get("cash")).toBe(5000n);
  });
});

describe("totalInCurrency", () => {
  it("sums mixed-currency balances into one net worth", () => {
    const b = computeAccountBalances([cash, wing], [], RATE);
    expect(totalInCurrency([cash, wing], b, "USD", RATE)).toBe(5000n + 1000n);
  });
});
