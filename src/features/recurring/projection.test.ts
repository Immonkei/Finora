import { describe, it, expect } from "vitest";
import { projectUpcomingCharges } from "./projection";

describe("Recurring Charges Projector", () => {
  const refDate = new Date("2026-10-18T00:00:00Z");

  it("projects monthly subscription due in 5 days", () => {
    const rules = [
      {
        id: "rule-1",
        name: "Netflix",
        amountMinor: 1499n,
        currency: "USD",
        frequency: "monthly" as const,
        category: "Entertainment",
        nextRunDate: "2026-10-23",
        active: true,
      },
    ];

    const projected = projectUpcomingCharges(rules, refDate, 30);
    expect(projected.length).toBe(1);
    expect(projected[0].name).toBe("Netflix");
    expect(projected[0].daysRemaining).toBe(5);
    expect(projected[0].dueDate).toBe("2026-10-23");
  });

  it("projects weekly recurring charge multiple times across 30 days", () => {
    const rules = [
      {
        id: "rule-2",
        name: "Weekly Gym",
        amountMinor: 2000n,
        currency: "USD",
        frequency: "weekly" as const,
        category: "Health",
        nextRunDate: "2026-10-20",
        active: true,
      },
    ];

    const projected = projectUpcomingCharges(rules, refDate, 30);
    // Across 30 days starting Oct 20: Oct 20, Oct 27, Nov 3, Nov 10, Nov 17 (approx 4-5 occurrences)
    expect(projected.length).toBeGreaterThanOrEqual(4);
    expect(projected[0].dueDate).toBe("2026-10-20");
    expect(projected[1].dueDate).toBe("2026-10-27");
  });

  it("ignores inactive paused rules", () => {
    const rules = [
      {
        id: "rule-paused",
        name: "Spotify",
        amountMinor: 999n,
        currency: "USD",
        frequency: "monthly" as const,
        category: "Entertainment",
        nextRunDate: "2026-10-21",
        active: false,
      },
    ];

    const projected = projectUpcomingCharges(rules, refDate, 30);
    expect(projected.length).toBe(0);
  });
});
