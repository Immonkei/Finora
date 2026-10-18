/**
 * Recurring Cash Flow Projector
 * Projects upcoming subscription charges and bill payments over the next 30 days.
 */

export interface RecurringRuleProjectorInput {
  id: string;
  name: string;
  amountMinor: bigint;
  currency: string;
  frequency: "daily" | "weekly" | "monthly";
  category: string;
  nextRunDate: string; // "YYYY-MM-DD" or ISO string
  active: boolean;
}

export interface UpcomingCharge {
  ruleId: string;
  name: string;
  amountMinor: bigint;
  currency: string;
  category: string;
  dueDate: string; // "YYYY-MM-DD"
  daysRemaining: number; // 0 = today, 1 = tomorrow, etc.
}

export function projectUpcomingCharges(
  rules: RecurringRuleProjectorInput[],
  referenceDate: Date = new Date(),
  projectionDays: number = 30
): UpcomingCharge[] {
  const charges: UpcomingCharge[] = [];

  // Normalize reference start date to midnight UTC
  const startUtc = new Date(
    Date.UTC(
      referenceDate.getUTCFullYear(),
      referenceDate.getUTCMonth(),
      referenceDate.getUTCDate()
    )
  );

  const endUtc = new Date(startUtc);
  endUtc.setUTCDate(startUtc.getUTCDate() + projectionDays);

  const activeRules = rules.filter((r) => r.active);

  for (const rule of activeRules) {
    if (!rule.nextRunDate) continue;

    // Parse next run date
    const dateParts = rule.nextRunDate.slice(0, 10).split("-");
    if (dateParts.length < 3) continue;

    const cursor = new Date(
      Date.UTC(
        parseInt(dateParts[0], 10),
        parseInt(dateParts[1], 10) - 1,
        parseInt(dateParts[2], 10)
      )
    );

    // Limit iterations to prevent infinite loops
    let safetyCounter = 0;
    while (cursor <= endUtc && safetyCounter < 100) {
      safetyCounter++;

      if (cursor >= startUtc) {
        const diffMs = cursor.getTime() - startUtc.getTime();
        const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
        const dueDateStr = cursor.toISOString().slice(0, 10);

        charges.push({
          ruleId: rule.id,
          name: rule.name,
          amountMinor: rule.amountMinor,
          currency: rule.currency,
          category: rule.category,
          dueDate: dueDateStr,
          daysRemaining,
        });
      }

      // Step forward based on frequency
      if (rule.frequency === "daily") {
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      } else if (rule.frequency === "weekly") {
        cursor.setUTCDate(cursor.getUTCDate() + 7);
      } else if (rule.frequency === "monthly") {
        cursor.setUTCMonth(cursor.getUTCMonth() + 1);
      } else {
        break;
      }
    }
  }

  // Sort chronologically
  charges.sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return charges;
}
