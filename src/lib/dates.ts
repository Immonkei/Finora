/**
 * Date and timezone utilities for Finora.
 * 
 * Rules:
 * - Timestamps are stored in UTC in the database.
 * - Grouping and summary boundaries (today, this week, this month) use the user's local timezone.
 * - Default timezone is Asia/Phnom_Penh, default week starts on Monday (1).
 */

import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  type Locale,
} from "date-fns";

export const DEFAULT_TIMEZONE = "Asia/Phnom_Penh";
export const DEFAULT_WEEK_STARTS_ON = 1; // 1 = Monday, 0 = Sunday

/**
 * Returns the current date shifted/viewed for calculation
 */
export function getDaysLeftInMonth(now: Date = new Date()): number {
  const totalDays = getDaysInMonth(now);
  const currentDay = getDate(now);
  // Formula: days in month - today + 1
  return Math.max(1, totalDays - currentDay + 1);
}

export function getDaysPassedInMonth(now: Date = new Date()): number {
  return getDate(now);
}

/**
 * Returns the start and end of today in local date
 */
export function getTodayBounds(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  return {
    start: startOfDay(now),
    end: endOfDay(now),
  };
}

/**
 * Returns week bounds (default starting Monday)
 */
export function getWeekBounds(
  now: Date = new Date(),
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6 = DEFAULT_WEEK_STARTS_ON
): {
  start: Date;
  end: Date;
} {
  return {
    start: startOfWeek(now, { weekStartsOn }),
    end: endOfWeek(now, { weekStartsOn }),
  };
}

/**
 * Returns month bounds
 */
export function getMonthBounds(now: Date = new Date()): {
  start: Date;
  end: Date;
} {
  return {
    start: startOfMonth(now),
    end: endOfMonth(now),
  };
}

/**
 * Standard date formatter
 */
export function formatDisplayDate(
  date: Date | string,
  formatPattern = "MMM d, yyyy",
  locale?: Locale
): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return format(d, formatPattern, locale ? { locale } : undefined);
}
