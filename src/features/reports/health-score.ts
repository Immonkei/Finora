/**
 * Financial Health Score Engine
 * Computes a composite 0-100 financial health score based on 4 pillars:
 * 1. Budget Adherence (40 pts)
 * 2. Spending Leak Control (25 pts)
 * 3. Savings Momentum (20 pts)
 * 4. Tracking Consistency (15 pts)
 */

export interface HealthScoreInput {
  monthlyBudgetMinor: bigint;
  monthlySpentMinor: bigint;
  daysInMonth: number;
  currentDay: number;
  leaksCount: number;
  currentStreakDays: number;
  noSpendDaysCount: number;
  activeGoalsCount: number;
  completedGoalsCount: number;
}

export interface HealthScoreResult {
  score: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D";
  title: string;
  pacingStatus: "under_budget" | "on_track" | "over_budget";
  breakdown: {
    budgetPacing: number; // / 40
    leakControl: number; // / 25
    savingsMomentum: number; // / 20
    consistency: number; // / 15
  };
  insights: string[];
}

export function calculateFinancialHealthScore(
  input: HealthScoreInput
): HealthScoreResult {
  const {
    monthlyBudgetMinor,
    monthlySpentMinor,
    daysInMonth,
    currentDay,
    leaksCount,
    currentStreakDays,
    noSpendDaysCount,
    activeGoalsCount,
    completedGoalsCount,
  } = input;

  const insights: string[] = [];

  // Pillar 1: Budget Adherence (40 pts)
  let budgetScore = 30; // default baseline if no budget configured
  let pacingStatus: "under_budget" | "on_track" | "over_budget" = "on_track";

  if (monthlyBudgetMinor > 0n && daysInMonth > 0 && currentDay > 0) {
    const expectedSpendMinor =
      (monthlyBudgetMinor * BigInt(currentDay)) / BigInt(daysInMonth);

    if (expectedSpendMinor > 0n) {
      const pacingRatio =
        Number((monthlySpentMinor * 100n) / expectedSpendMinor) / 100;

      if (pacingRatio <= 0.8) {
        budgetScore = 40;
        pacingStatus = "under_budget";
        insights.push("Spending is well under your monthly budget pace");
      } else if (pacingRatio <= 1.0) {
        budgetScore = 36;
        pacingStatus = "on_track";
        insights.push("Spending is strictly on track with monthly allowance");
      } else if (pacingRatio <= 1.2) {
        budgetScore = 22;
        pacingStatus = "over_budget";
        insights.push("Trending slightly ahead of daily budget pace");
      } else if (pacingRatio <= 1.5) {
        budgetScore = 14;
        pacingStatus = "over_budget";
        insights.push("Pacing 20%+ over monthly allowance");
      } else {
        budgetScore = 6;
        pacingStatus = "over_budget";
        insights.push("Over-budget: adjust discretionary spending to recover");
      }
    }
  } else {
    insights.push("Set a monthly budget to unlock 40-point pacing accuracy");
  }

  // Pillar 2: Leak Control (25 pts)
  let leakScore = 25;
  if (leaksCount === 0) {
    leakScore = 25;
    insights.push("Zero repetitive micro-spending leaks detected");
  } else if (leaksCount === 1) {
    leakScore = 20;
    insights.push("Only 1 repetitive leak detected");
  } else if (leaksCount <= 3) {
    leakScore = 14;
    insights.push(`${leaksCount} frequent spending leaks found`);
  } else {
    leakScore = 8;
    insights.push(`${leaksCount} spending leaks draining monthly cash flow`);
  }

  // Pillar 3: Savings Momentum (20 pts)
  let savingsScore = 10;
  if (completedGoalsCount > 0) {
    savingsScore = 20;
    insights.push(`${completedGoalsCount} savings goals conquered`);
  } else if (activeGoalsCount >= 2) {
    savingsScore = 18;
    insights.push("Actively funding multiple savings targets");
  } else if (activeGoalsCount === 1) {
    savingsScore = 14;
    insights.push("Active savings goal in progress");
  } else {
    savingsScore = 8;
    insights.push("Create a savings goal to boost your financial score");
  }

  // Pillar 4: Tracking Consistency & Streaks (15 pts)
  let consistencyScore = 6;
  if (currentStreakDays >= 7 || noSpendDaysCount >= 3) {
    consistencyScore = 15;
    insights.push(`Strong ${currentStreakDays}-day budget discipline streak`);
  } else if (currentStreakDays >= 3 || noSpendDaysCount >= 1) {
    consistencyScore = 12;
    insights.push(`${currentStreakDays}-day active tracking streak`);
  } else if (currentStreakDays >= 1) {
    consistencyScore = 9;
  }

  const rawScore = budgetScore + leakScore + savingsScore + consistencyScore;
  const score = Math.min(100, Math.max(0, rawScore));

  let grade: "A+" | "A" | "B" | "C" | "D" = "B";
  let title = "Good Discipline";

  if (score >= 90) {
    grade = "A+";
    title = "Elite Financial Health";
  } else if (score >= 80) {
    grade = "A";
    title = "Excellent Financial Health";
  } else if (score >= 70) {
    grade = "B";
    title = "Good Financial Discipline";
  } else if (score >= 60) {
    grade = "C";
    title = "Fair — Room for Improvement";
  } else {
    grade = "D";
    title = "Needs Immediate Attention";
  }

  return {
    score,
    grade,
    title,
    pacingStatus,
    breakdown: {
      budgetPacing: budgetScore,
      leakControl: leakScore,
      savingsMomentum: savingsScore,
      consistency: consistencyScore,
    },
    insights: insights.slice(0, 4),
  };
}
