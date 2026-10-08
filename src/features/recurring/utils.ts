/**
 * Recurring rules calculation utilities
 */

export function calculateNextRun(
  currentRunDate: string,
  frequency: "daily" | "weekly" | "monthly"
): string {
  const d = new Date(currentRunDate);
  if (frequency === "daily") {
    d.setDate(d.getDate() + 1);
  } else if (frequency === "weekly") {
    d.setDate(d.getDate() + 7);
  } else if (frequency === "monthly") {
    d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString().slice(0, 10);
}
