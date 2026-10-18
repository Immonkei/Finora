/**
 * Money utilities for Finora.
 * 
 * Rules:
 * - All monetary values in the database are stored as integers (bigint) in minor units
 *   (e.g., USD cents: $1.00 = 100, KHR riel: 4,000 KHR = 4000).
 * - Floats are never stored or used in core calculations to avoid rounding bugs.
 */

export type CurrencyCode = "USD" | "KHR";

export const CURRENCY_CONFIG: Record<
  CurrencyCode,
  {
    code: CurrencyCode;
    symbol: string;
    factor: number; // minor unit divisor (USD: 100, KHR: 1)
    decimals: number;
    name: string;
  }
> = {
  USD: {
    code: "USD",
    symbol: "$",
    factor: 100,
    decimals: 2,
    name: "US Dollar",
  },
  KHR: {
    code: "KHR",
    symbol: "៛",
    factor: 1,
    decimals: 0,
    name: "Cambodian Riel",
  },
};

export const DEFAULT_USD_TO_KHR_RATE = 4100;

/**
 * Converts USD minor units (cents) to KHR minor units (riel) using integer math.
 * 1 USD ($1.00 = 100 cents) = 4,100 KHR.
 */
export function convertUsdToKhrMinor(
  usdMinor: bigint | number,
  rate: number = DEFAULT_USD_TO_KHR_RATE
): bigint {
  const minor = typeof usdMinor === "bigint" ? usdMinor : BigInt(Math.round(usdMinor));
  return (minor * BigInt(Math.round(rate))) / 100n;
}

/**
 * Formats a clean KHR approximation string from USD minor units.
 * Example: formatKhrApproximation(1000n) -> "≈ ៛41,000"
 */
export function formatKhrApproximation(
  usdMinor: bigint | number,
  rate: number = DEFAULT_USD_TO_KHR_RATE
): string {
  const khr = convertUsdToKhrMinor(usdMinor, rate);
  return `≈ ៛${khr.toLocaleString()}`;
}

/**
 * Converts user input decimal amount to integer minor units (bigint).
 * Example: toMinorUnits(12.50, 'USD') -> 1250n
 * Example: toMinorUnits(4000, 'KHR') -> 4000n
 */
export function toMinorUnits(amount: number, currency: CurrencyCode = "USD"): bigint {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  // Use Math.round to avoid standard JavaScript floating point representation issues like 19.99 * 100 = 1998.9999999999998
  return BigInt(Math.round(amount * config.factor));
}

/**
 * Converts integer minor units back to decimal float for UI calculation/charts.
 * Example: fromMinorUnits(1250n, 'USD') -> 12.5
 * Example: fromMinorUnits(4000n, 'KHR') -> 4000
 */
export function fromMinorUnits(
  minorUnits: bigint | number,
  currency: CurrencyCode = "USD"
): number {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const num = typeof minorUnits === "bigint" ? Number(minorUnits) : minorUnits;
  return num / config.factor;
}

/**
 * Formats minor units into localized currency string.
 * Example: formatMoney(1250n, 'USD') -> "$12.50"
 * Example: formatMoney(400000n, 'KHR') -> "400,000 ៛"
 */
export function formatMoney(
  minorUnits: bigint | number,
  currency: CurrencyCode = "USD",
  options?: {
    locale?: string;
    showSign?: boolean;
    compact?: boolean;
  }
): string {
  const config = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const value = fromMinorUnits(minorUnits, currency);
  const locale = options?.locale || (currency === "KHR" ? "km-KH" : "en-US");

  const formatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: config.code,
    minimumFractionDigits: config.decimals,
    maximumFractionDigits: config.decimals,
    notation: options?.compact ? "compact" : "standard",
    signDisplay: options?.showSign ? "always" : "auto",
  });

  return formatter.format(value);
}

/**
 * Calculate Daily Allowance based on monthly limit and spending.
 * Formula from Project Spec 9.1:
 * remaining_budget = total_limit - spent_this_month
 * days_left        = days in month - today + 1
 * daily_allowance  = max(0, remaining_budget / days_left)
 */
export function calculateDailyAllowance(
  remainingBudgetMinor: bigint,
  daysLeftInMonth: number
): bigint {
  if (daysLeftInMonth <= 0 || remainingBudgetMinor <= BigInt(0)) {
    return BigInt(0);
  }
  return remainingBudgetMinor / BigInt(daysLeftInMonth);
}

/**
 * Calculate end-of-month spending forecast.
 * Formula from Project Spec 9.2:
 * average_per_day = spent_so_far / days_passed
 * forecast_month  = spent_so_far + average_per_day * days_left
 * overspend_risk  = forecast_month > total_limit
 */
export function calculateForecast(
  spentSoFarMinor: bigint,
  daysPassed: number,
  daysLeft: number
): {
  forecastMinor: bigint;
  averagePerDayMinor: bigint;
} {
  if (daysPassed <= 0) {
    return {
      forecastMinor: spentSoFarMinor,
      averagePerDayMinor: BigInt(0),
    };
  }

  const averagePerDayMinor = spentSoFarMinor / BigInt(daysPassed);
  const forecastMinor = spentSoFarMinor + averagePerDayMinor * BigInt(daysLeft);

  return {
    forecastMinor,
    averagePerDayMinor,
  };
}
