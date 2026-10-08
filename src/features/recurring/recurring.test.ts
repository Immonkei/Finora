import { describe, it, expect } from "vitest";
import { calculateNextRun } from "./utils";
import { recurringRuleSchema } from "./schema";

describe("Recurring Rules Logic", () => {
  it("calculates next run date correctly for daily frequency", () => {
    const next = calculateNextRun("2026-10-08", "daily");
    expect(next).toBe("2026-10-09");
  });

  it("calculates next run date correctly for weekly frequency", () => {
    const next = calculateNextRun("2026-10-08", "weekly");
    expect(next).toBe("2026-10-15");
  });

  it("calculates next run date correctly for monthly frequency", () => {
    const next = calculateNextRun("2026-10-08", "monthly");
    expect(next).toBe("2026-11-08");
  });

  it("validates valid recurring rule schema", () => {
    const valid = {
      type: "expense",
      amount: 12.99,
      currency: "USD",
      account_id: "00000000-0000-0000-0000-000000000001",
      frequency: "monthly",
      start_date: "2026-10-08",
      note: "Netflix",
    };
    const res = recurringRuleSchema.safeParse(valid);
    expect(res.success).toBe(true);
  });
});
