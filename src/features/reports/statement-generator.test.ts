import { describe, it, expect } from "vitest";
import {
  generateMonthlyStatement,
  type StatementTransactionInput,
  type StatementGoalInput,
} from "./statement-generator";

describe("generateMonthlyStatement", () => {
  const mockTransactions: StatementTransactionInput[] = [
    {
      id: "tx-1",
      occurredAt: "2026-10-02T10:00:00Z",
      type: "income",
      baseAmountMinor: 300000n, // $3,000.00
      amountMinor: 300000n,
      currency: "USD",
      categoryName: "Salary",
      note: "Monthly Paycheck",
      accountName: "ABA Bank",
    },
    {
      id: "tx-2",
      occurredAt: "2026-10-05T14:30:00Z",
      type: "expense",
      baseAmountMinor: 50000n, // $500.00
      amountMinor: 50000n,
      currency: "USD",
      categoryName: "Housing",
      note: "Condo Rent",
      accountName: "ABA Bank",
    },
    {
      id: "tx-3",
      occurredAt: "2026-10-12T09:15:00Z",
      type: "expense",
      baseAmountMinor: 15000n, // $150.00
      amountMinor: 15000n,
      currency: "USD",
      categoryName: "Groceries",
      note: "Chip Mong Supermarket",
      accountName: "Cash",
    },
    {
      id: "tx-4",
      occurredAt: "2026-10-15T19:00:00Z",
      type: "expense",
      baseAmountMinor: 5000n, // $50.00
      amountMinor: 5000n,
      currency: "USD",
      categoryName: "Dining",
      note: "Dinner with friends",
      accountName: "ABA Bank",
    },
    {
      id: "tx-outside",
      occurredAt: "2026-09-30T23:59:00Z", // September, should be excluded
      type: "expense",
      baseAmountMinor: 99900n,
      amountMinor: 99900n,
      currency: "USD",
      categoryName: "Shopping",
      note: "September shopping",
      accountName: "Credit Card",
    },
  ];

  const mockGoals: StatementGoalInput[] = [
    {
      id: "goal-1",
      name: "Emergency Fund",
      targetAmountMinor: 500000n, // $5,000.00
      currentAmountMinor: 250000n, // $2,500.00 (50%)
      currency: "USD",
    },
  ];

  it("calculates monthly income, expenses, and net savings accurately", () => {
    const statement = generateMonthlyStatement({
      month: "2026-10",
      transactions: mockTransactions,
      budgetLimitMinor: 100000n, // $1,000.00
      goals: mockGoals,
      exchangeRateKHR: 4100,
    });

    // Income: $3,000 (tx-1)
    expect(statement.summary.totalIncomeMinor).toBe(300000n);
    // Expenses: $500 (Housing) + $150 (Groceries) + $50 (Dining) = $700.00 (70000 minor)
    expect(statement.summary.totalExpenseMinor).toBe(70000n);
    // Net: $3,000 - $700 = $2,300.00
    expect(statement.summary.netSavingsMinor).toBe(230000n);
    // Savings rate: 2300 / 3000 = 76.7%
    expect(statement.summary.savingsRatePercent).toBe(76.7);
    // Budget remaining: 1000 - 700 = 300
    expect(statement.summary.budgetRemainingMinor).toBe(30000n);
    expect(statement.summary.transactionCount).toBe(4); // excluded tx-outside
  });

  it("identifies top expense correctly", () => {
    const statement = generateMonthlyStatement({
      month: "2026-10",
      transactions: mockTransactions,
      budgetLimitMinor: 100000n,
    });

    expect(statement.summary.topExpense).not.toBeNull();
    expect(statement.summary.topExpense?.note).toBe("Condo Rent");
    expect(statement.summary.topExpense?.amountMinor).toBe(50000n);
    expect(statement.summary.topExpense?.category).toBe("Housing");
  });

  it("breaks down categories with correct percentages and ordering", () => {
    const statement = generateMonthlyStatement({
      month: "2026-10",
      transactions: mockTransactions,
    });

    expect(statement.categories.length).toBe(3);
    // Highest category should be Housing ($500 / $700 = 71.4%)
    expect(statement.categories[0].name).toBe("Housing");
    expect(statement.categories[0].spentMinor).toBe(50000n);
    expect(statement.categories[0].percentOfTotal).toBe(71.4);

    expect(statement.categories[1].name).toBe("Groceries");
    expect(statement.categories[1].spentMinor).toBe(15000n);

    expect(statement.categories[2].name).toBe("Dining");
    expect(statement.categories[2].spentMinor).toBe(5000n);
  });

  it("converts to KHR at the provided exchange rate", () => {
    const statement = generateMonthlyStatement({
      month: "2026-10",
      transactions: mockTransactions,
      exchangeRateKHR: 4100,
    });

    // 70000 cents = $700 * 4100 = 2,870,000 KHR
    expect(statement.dualCurrency.expenseUSDMinor).toBe(70000n);
    expect(statement.dualCurrency.expenseKHRMinor).toBe(2870000n);
  });

  it("handles empty transaction month gracefully", () => {
    const statement = generateMonthlyStatement({
      month: "2026-11",
      transactions: mockTransactions, // None in November
      budgetLimitMinor: 100000n,
    });

    expect(statement.summary.totalIncomeMinor).toBe(0n);
    expect(statement.summary.totalExpenseMinor).toBe(0n);
    expect(statement.summary.netSavingsMinor).toBe(0n);
    expect(statement.summary.savingsRatePercent).toBe(0);
    expect(statement.summary.transactionCount).toBe(0);
    expect(statement.summary.topExpense).toBeNull();
    expect(statement.categories).toEqual([]);
  });
});
