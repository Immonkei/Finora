import { describe, it, expect } from "vitest";
import { parseKhqrBankingSlip } from "./khqr-slip-parser";
import type { AvailableCategory } from "./categories";

const MOCK_CATEGORIES: AvailableCategory[] = [
  { id: "cat-food", name: "Food & Drinks" },
  { id: "cat-groc", name: "Groceries" },
  { id: "cat-trans", name: "Transport" },
  { id: "cat-util", name: "Housing & Bills" },
];

describe("parseKhqrBankingSlip", () => {
  it("parses ABA Mobile USD payment slip accurately", () => {
    const rawAbaSlip = `
      ABA Mobile
      Transfer Successful
      Amount: $4.50
      To: BROWN COFFEE ROASTERS BKK1
      From: Main Account (*5678)
      Txn ID: ABA94829103
      Date: 18-Oct-2026 14:30:25
    `;

    const result = parseKhqrBankingSlip(rawAbaSlip, MOCK_CATEGORIES);

    expect(result.isSlip).toBe(true);
    expect(result.bankName).toBe("ABA Mobile");
    expect(result.currency).toBe("USD");
    expect(result.amount).toBe(4.5);
    expect(result.amountMinor).toBe(450n);
    expect(result.merchant).toContain("BROWN COFFEE");
    expect(result.transactionId).toBe("ABA94829103");
    expect(result.category).toBe("Food & Drinks");
    expect(result.categoryId).toBe("cat-food");
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it("parses Bakong KHQR Cambodian Riel slip accurately", () => {
    const rawBakongSlip = `
      NBC Bakong KHQR
      Payment Completed
      Paid To: Lucky Supermarket Sihanouk
      Total: 25,000 KHR
      Ref No: BKG-20261018-8831
      18/10/2026 11:15
    `;

    const result = parseKhqrBankingSlip(rawBakongSlip, MOCK_CATEGORIES);

    expect(result.isSlip).toBe(true);
    expect(result.bankName).toBe("Bakong");
    expect(result.currency).toBe("KHR");
    expect(result.amount).toBe(25000);
    expect(result.amountMinor).toBe(25000n);
    expect(result.merchant).toBe("Lucky Supermarket Sihanouk");
    expect(result.transactionId).toBe("BKG-20261018-8831");
    expect(result.category).toBe("Groceries");
    expect(result.categoryId).toBe("cat-groc");
  });

  it("parses Wing Bank payment slip", () => {
    const rawWingSlip = `
      Wing Bank
      Transaction Successful
      Beneficiary: Grab Taxi Cambodia
      Debit: $6.20
      Transaction ID: WING7726194
      Date: 2026-10-18 09:20
    `;

    const result = parseKhqrBankingSlip(rawWingSlip, MOCK_CATEGORIES);

    expect(result.isSlip).toBe(true);
    expect(result.bankName).toBe("Wing Bank");
    expect(result.currency).toBe("USD");
    expect(result.amount).toBe(6.2);
    expect(result.amountMinor).toBe(620n);
    expect(result.merchant).toBe("Grab Taxi Cambodia");
    expect(result.category).toBe("Transport");
    expect(result.categoryId).toBe("cat-trans");
  });

  it("handles Khmer language slip tokens gracefully", () => {
    const khmerSlip = `
      ផ្ទេរប្រាក់ ជោគជ័យ
      អ្នកទទួល: KOI The Cambodia
      ចំនួនទឹកប្រាក់: $3.80
      លេខកូដប្រតិបត្តិការ: ABA481920
    `;

    const result = parseKhqrBankingSlip(khmerSlip, MOCK_CATEGORIES);

    expect(result.isSlip).toBe(true);
    expect(result.amount).toBe(3.8);
    expect(result.currency).toBe("USD");
    expect(result.merchant).toBe("KOI The Cambodia");
    expect(result.category).toBe("Food & Drinks");
  });

  it("returns safe defaults on empty or non-slip text", () => {
    const result = parseKhqrBankingSlip("", MOCK_CATEGORIES);
    expect(result.isSlip).toBe(false);
    expect(result.amount).toBe(0);
    expect(result.confidence).toBe(0);
  });
});
