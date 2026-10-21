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

/**
 * Stable codes for the title and insights so the UI can translate them.
 * They match keys in the `reports` i18n namespace; the English `title` and
 * `insights` strings are kept for non-UI callers and tests.
 */
export type HealthTitleCode =
  | "titleElite"
  | "titleExcellent"
  | "titleGood"
  | "titleFair"
  | "titleAttention";

export type HealthInsightCode =
  | "insightPacingUnder"
  | "insightPacingOnTrack"
  | "insightPacingSlightlyOver"
  | "insightPacingOver20"
  | "insightPacingOverBudget"
  | "insightNoBudget"
  | "insightNoLeaks"
  | "insightOneLeak"
  | "insightFewLeaks"
  | "insightManyLeaks"
  | "insightGoalsCompleted"
  | "insightMultipleGoals"
  | "insightOneGoal"
  | "insightNoGoals"
  | "insightStrongStreak"
  | "insightActiveStreak";

export interface HealthInsight {
  code: HealthInsightCode;
  values?: Record<string, number>;
}

export interface HealthScoreResult {
  score: number; // 0 - 100
  grade: "A+" | "A" | "B" | "C" | "D";
  title: string;
  titleCode: HealthTitleCode;
  pacingStatus: "under_budget" | "on_track" | "over_budget";
  breakdown: {
    budgetPacing: number; // / 40
    leakControl: number; // / 25
    savingsMomentum: number; // / 20
    consistency: number; // / 15
  };
  insights: string[];
  insightCodes: HealthInsight[];
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
  const insightCodes: HealthInsight[] = [];
  const addInsight = (
    text: string,
    code: HealthInsightCode,
    values?: Record<string, number>
  ) => {
    insights.push(text);
    insightCodes.push(values ? { code, values } : { code });
  };

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
        addInsight("Spending is well under your monthly budget pace", "insightPacingUnder");
      } else if (pacingRatio <= 1.0) {
        budgetScore = 36;
        pacingStatus = "on_track";
        addInsight("Spending is strictly on track with monthly allowance", "insightPacingOnTrack");
      } else if (pacingRatio <= 1.2) {
        budgetScore = 22;
        pacingStatus = "over_budget";
        addInsight("Trending slightly ahead of daily budget pace", "insightPacingSlightlyOver");
      } else if (pacingRatio <= 1.5) {
        budgetScore = 14;
        pacingStatus = "over_budget";
        addInsight("Pacing 20%+ over monthly allowance", "insightPacingOver20");
      } else {
        budgetScore = 6;
        pacingStatus = "over_budget";
        addInsight("Over-budget: adjust discretionary spending to recover", "insightPacingOverBudget");
      }
    }
  } else {
    addInsight("Set a monthly budget to unlock 40-point pacing accuracy", "insightNoBudget");
  }

  // Pillar 2: Leak Control (25 pts)
  let leakScore = 25;
  if (leaksCount === 0) {
    leakScore = 25;
    addInsight("Zero repetitive micro-spending leaks detected", "insightNoLeaks");
  } else if (leaksCount === 1) {
    leakScore = 20;
    addInsight("Only 1 repetitive leak detected", "insightOneLeak");
  } else if (leaksCount <= 3) {
    leakScore = 14;
    addInsight(`${leaksCount} frequent spending leaks found`, "insightFewLeaks", {
      count: leaksCount,
    });
  } else {
    leakScore = 8;
    addInsight(`${leaksCount} spending leaks draining monthly cash flow`, "insightManyLeaks", {
      count: leaksCount,
    });
  }

  // Pillar 3: Savings Momentum (20 pts)
  let savingsScore = 10;
  if (completedGoalsCount > 0) {
    savingsScore = 20;
    addInsight(`${completedGoalsCount} savings goals conquered`, "insightGoalsCompleted", {
      count: completedGoalsCount,
    });
  } else if (activeGoalsCount >= 2) {
    savingsScore = 18;
    addInsight("Actively funding multiple savings targets", "insightMultipleGoals");
  } else if (activeGoalsCount === 1) {
    savingsScore = 14;
    addInsight("Active savings goal in progress", "insightOneGoal");
  } else {
    savingsScore = 8;
    addInsight("Create a savings goal to boost your financial score", "insightNoGoals");
  }

  // Pillar 4: Tracking Consistency & Streaks (15 pts)
  let consistencyScore = 6;
  if (currentStreakDays >= 7 || noSpendDaysCount >= 3) {
    consistencyScore = 15;
    addInsight(`Strong ${currentStreakDays}-day budget discipline streak`, "insightStrongStreak", {
      days: currentStreakDays,
    });
  } else if (currentStreakDays >= 3 || noSpendDaysCount >= 1) {
    consistencyScore = 12;
    addInsight(`${currentStreakDays}-day active tracking streak`, "insightActiveStreak", {
      days: currentStreakDays,
    });
  } else if (currentStreakDays >= 1) {
    consistencyScore = 9;
  }

  const rawScore = budgetScore + leakScore + savingsScore + consistencyScore;
  const score = Math.min(100, Math.max(0, rawScore));

  let grade: "A+" | "A" | "B" | "C" | "D" = "B";
  let title = "Good Discipline";
  let titleCode: HealthTitleCode = "titleGood";

  if (score >= 90) {
    grade = "A+";
    title = "Elite Financial Health";
    titleCode = "titleElite";
  } else if (score >= 80) {
    grade = "A";
    title = "Excellent Financial Health";
    titleCode = "titleExcellent";
  } else if (score >= 70) {
    grade = "B";
    title = "Good Financial Discipline";
    titleCode = "titleGood";
  } else if (score >= 60) {
    grade = "C";
    title = "Fair — Room for Improvement";
    titleCode = "titleFair";
  } else {
    grade = "D";
    title = "Needs Immediate Attention";
    titleCode = "titleAttention";
  }

  return {
    score,
    grade,
    title,
    titleCode,
    pacingStatus,
    breakdown: {
      budgetPacing: budgetScore,
      leakControl: leakScore,
      savingsMomentum: savingsScore,
      consistency: consistencyScore,
    },
    insights: insights.slice(0, 4),
    insightCodes: insightCodes.slice(0, 4),
  };
}
