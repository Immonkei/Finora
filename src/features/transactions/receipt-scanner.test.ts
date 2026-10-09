import { describe, it, expect } from "vitest";
import {
  matchReceiptCategory,
  parseReceiptText,
} from "./receipt-scanner";

describe("Receipt Scanner (Spec 3.4 #22)", () => {
  const mockCategories = [
    { id: "c-food", name: "Food & Drinks" },
    { id: "c-groceries", name: "Groceries" },
    { id: "c-transport", name: "Transport" },
    { id: "c-bills", name: "Housing & Bills" },
    { id: "c-ent", name: "Entertainment" },
    { id: "c-shop", name: "Shopping" },
    { id: "c-health", name: "Health & Medical" },
  ];

  describe("matchReceiptCategory", () => {
    it("matches food and coffee stores correctly", () => {
      const res1 = matchReceiptCategory("Starbucks Reserve BKK", mockCategories);
      expect(res1.categoryName).toBe("Food & Drinks");
      expect(res1.categoryId).toBe("c-food");

      const res2 = matchReceiptCategory("Brown Coffee & Bakery", mockCategories);
      expect(res2.categoryName).toBe("Food & Drinks");
      expect(res2.categoryId).toBe("c-food");
    });

    it("matches transport and ride hailing", () => {
      const res = matchReceiptCategory("Grab Taxi Trip #8912", mockCategories);
      expect(res.categoryName).toBe("Transport");
      expect(res.categoryId).toBe("c-transport");
    });

    it("matches groceries and supermarkets", () => {
      const res = matchReceiptCategory("Lucky Supermarket Sihanouk", mockCategories);
      expect(res.categoryName).toBe("Groceries");
      expect(res.categoryId).toBe("c-groceries");
    });

    it("matches utilities and bills", () => {
      const res = matchReceiptCategory("EDC Electricity Bill Invoice", mockCategories);
      expect(res.categoryName).toBe("Housing & Bills");
      expect(res.categoryId).toBe("c-bills");
    });
  });

  describe("parseReceiptText", () => {
    it("parses standard USD restaurant and coffee receipts", () => {
      const sampleReceipt = `
        BROWN COFFEE & BAKERY
        Order #4421
        Date: 2026-10-09
        1x Iced Latte $3.50
        1x Croissant $2.00
        Subtotal: $5.50
        VAT (10%): $0.55
        TOTAL: $6.05
        Cash: $10.00
        Change: $3.95
      `;

      const result = parseReceiptText(sampleReceipt, mockCategories);
      expect(result.success).toBe(true);
      expect(result.merchant).toBe("BROWN COFFEE & BAKERY");
      expect(result.amount).toBe(6.05);
      expect(result.amountMinor).toBe(BigInt(605));
      expect(result.currency).toBe("USD");
      expect(result.category).toBe("Food & Drinks");
      expect(result.categoryId).toBe("c-food");
      expect(result.date).toBe("2026-10-09");
    });

    it("parses Cambodian KHR supermarket receipts with commas", () => {
      const sampleKhrReceipt = `
        LUCKY SUPERMARKET
        Store 04 - Phnom Penh
        Date: 2026-10-08
        Apples 1kg
        Fresh Milk 1L
        GRAND TOTAL: 36,000 KHR
        Thank you for shopping!
      `;

      const result = parseReceiptText(sampleKhrReceipt, mockCategories);
      expect(result.success).toBe(true);
      expect(result.merchant).toBe("LUCKY SUPERMARKET");
      expect(result.amount).toBe(36000);
      expect(result.amountMinor).toBe(BigInt(36000));
      expect(result.currency).toBe("KHR");
      expect(result.category).toBe("Groceries");
      expect(result.categoryId).toBe("c-groceries");
    });

    it("handles empty or unreadable receipts gracefully", () => {
      const result = parseReceiptText("", mockCategories);
      expect(result.success).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.error).toBeDefined();
    });
  });
});
