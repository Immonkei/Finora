import { describe, it, expect } from "vitest";
import { createTransactionSchema, transactionFilterSchema } from "./schema";

describe("Transaction Schemas", () => {
  it("validates a proper expense", () => {
    const valid = {
      type: "expense",
      amount: 15.5,
      currency: "USD",
      account_id: "00000000-0000-0000-0000-000000000001",
      category_id: "00000000-0000-0000-0000-000000000002",
      note: "Lunch",
    };
    const result = createTransactionSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("fails when amount is 0 or negative", () => {
    const invalid = {
      type: "expense",
      amount: -5,
      account_id: "00000000-0000-0000-0000-000000000001",
    };
    const result = createTransactionSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it("fails when transfer lacks to_account_id or has identical accounts", () => {
    const missingTarget = {
      type: "transfer",
      amount: 100,
      account_id: "00000000-0000-0000-0000-000000000001",
    };
    expect(createTransactionSchema.safeParse(missingTarget).success).toBe(false);

    const sameAccount = {
      type: "transfer",
      amount: 100,
      account_id: "00000000-0000-0000-0000-000000000001",
      to_account_id: "00000000-0000-0000-0000-000000000001",
    };
    expect(createTransactionSchema.safeParse(sameAccount).success).toBe(false);

    const validTransfer = {
      type: "transfer",
      amount: 100,
      account_id: "00000000-0000-0000-0000-000000000001",
      to_account_id: "00000000-0000-0000-0000-000000000002",
    };
    expect(createTransactionSchema.safeParse(validTransfer).success).toBe(true);
  });

  it("validates transaction filter options", () => {
    const filter = {
      type: "expense" as const,
      currency: "USD" as const,
      limit: 20,
    };
    const result = transactionFilterSchema.safeParse(filter);
    expect(result.success).toBe(true);
  });
});
