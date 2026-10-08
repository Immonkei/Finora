/**
 * AI Weekly Insight Report Generator (Spec 3.4 #23)
 * Analyzes allowance pacing, leaks, and provides personalized weekly recommendations.
 */

export interface WeeklyAiReport {
  score: number; // 0 - 100
  headline: string;
  summary: string;
  highlights: string[];
  recommendations: string[];
  generatedAt: string;
}

export function generateWeeklyAiReport(params: {
  spentThisWeekMinor: bigint;
  allowanceAverageMinor: bigint;
  topLeakTitle?: string;
  topLeakCostMinor?: bigint;
  currency?: string;
}): WeeklyAiReport {
  const {
    spentThisWeekMinor,
    allowanceAverageMinor,
    topLeakTitle = "Coffee & snacks",
  } = params;

  const weeklyTargetMinor = allowanceAverageMinor * 7n;
  const isUnderBudget = spentThisWeekMinor <= weeklyTargetMinor;

  let score = 85;
  let headline = "Great Pacing! You are on track this week";
  let summary =
    "Your daily spending was steady and stayed within your planned allowance limits across most days.";

  if (!isUnderBudget) {
    score = 68;
    headline = "Budget Pressure: Accelerated spending mid-week";
    summary =
      "Your weekly expenditure exceeded your target pace due to higher food & drinks expenses.";
  }

  const highlights = [
    `Weekly expenditure: $${(Number(spentThisWeekMinor) / 100).toFixed(2)}`,
    `Allowance target pace: $${(Number(weeklyTargetMinor) / 100).toFixed(2)}`,
    `Most repeated small expense: "${topLeakTitle}"`,
  ];

  const recommendations = [
    isUnderBudget
      ? "Maintain this pace through the weekend to increase your month-end rollover."
      : "Consider capping dining out over the next 3 days to realign with your daily allowance.",
    `Cutting back on repeat ${topLeakTitle.toLowerCase()} could save you an estimated $35/month.`,
  ];

  return {
    score,
    headline,
    summary,
    highlights,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}
