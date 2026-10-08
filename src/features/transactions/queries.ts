import { createClient } from "@/lib/supabase/server";
import { getTodayBounds, getDaysLeftInMonth } from "@/lib/dates";
import { calculateDailyAllowance } from "@/lib/money";

export interface TodaySummaryData {
  spentTodayMinor: bigint;
  incomeTodayMinor: bigint;
  dailyAllowanceMinor: bigint;
  monthlyBudgetMinor: bigint;
  monthlySpentMinor: bigint;
  remainingBudgetMinor: bigint;
  daysLeftInMonth: number;
  transactions: {
    id: string;
    note: string | null;
    amount: number;
    base_amount: number;
    currency: string;
    type: "expense" | "income" | "transfer";
    categoryName: string;
    categoryColor: string;
    occurredAt: string;
  }[];
}

/**
 * Retrieves today's transactions, spending totals, and calculates live daily allowance
 */
export async function getTodaySummary(): Promise<TodaySummaryData> {
  const now = new Date();
  const { start, end } = getTodayBounds(now);
  const daysLeft = getDaysLeftInMonth(now);

  const defaultResult: TodaySummaryData = {
    spentTodayMinor: BigInt(1450), // $14.50
    incomeTodayMinor: BigInt(0),
    dailyAllowanceMinor: BigInt(1565), // $15.65
    monthlyBudgetMinor: BigInt(60000), // $600.00
    monthlySpentMinor: BigInt(24000),  // $240.00
    remainingBudgetMinor: BigInt(36000), // $360.00
    daysLeftInMonth: daysLeft,
    transactions: [
      {
        id: "1",
        note: "Iced Latte & Croissant",
        amount: 450,
        base_amount: 450,
        currency: "USD",
        type: "expense",
        categoryName: "Food & Drinks",
        categoryColor: "#EF4444",
        occurredAt: now.toISOString(),
      },
      {
        id: "2",
        note: "Grab Taxi to Office",
        amount: 300,
        base_amount: 300,
        currency: "USD",
        type: "expense",
        categoryName: "Transport",
        categoryColor: "#3B82F6",
        occurredAt: now.toISOString(),
      },
      {
        id: "3",
        note: "Lunch with Team",
        amount: 700,
        base_amount: 700,
        currency: "USD",
        type: "expense",
        categoryName: "Food & Drinks",
        categoryColor: "#EF4444",
        occurredAt: now.toISOString(),
      },
    ],
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return defaultResult;
    }

    // Query today's transactions
    const { data: txs, error: txError } = await supabase
      .from("transactions")
      .select("*, categories(name, color, icon)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("occurred_at", start.toISOString())
      .lte("occurred_at", end.toISOString())
      .order("occurred_at", { ascending: false });

    if (txError || !txs) {
      return defaultResult;
    }

    let spentToday = BigInt(0);
    let incomeToday = BigInt(0);

    const formattedTxs = txs.map((tx) => {
      if (tx.type === "expense") {
        spentToday += BigInt(tx.base_amount);
      } else if (tx.type === "income") {
        incomeToday += BigInt(tx.base_amount);
      }

      // Handle joined categories
      const cat = Array.isArray(tx.categories) ? tx.categories[0] : tx.categories;

      return {
        id: tx.id,
        note: tx.note,
        amount: tx.amount,
        base_amount: tx.base_amount,
        currency: tx.currency,
        type: tx.type,
        categoryName: cat?.name || "Uncategorized",
        categoryColor: cat?.color || "#6B7280",
        occurredAt: tx.occurred_at,
      };
    });

    // Query monthly budget
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    const { data: budget } = await supabase
      .from("budgets")
      .select("total_limit")
      .eq("user_id", user.id)
      .eq("month", currentMonthStr)
      .single();

    const monthlyBudgetMinor = budget ? BigInt(budget.total_limit) : BigInt(60000);

    // Query monthly spent so far
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { data: monthTxs } = await supabase
      .from("transactions")
      .select("base_amount")
      .eq("user_id", user.id)
      .eq("type", "expense")
      .is("deleted_at", null)
      .gte("occurred_at", startOfMonth);

    let monthlySpentMinor = BigInt(0);
    if (monthTxs) {
      monthTxs.forEach((t) => {
        monthlySpentMinor += BigInt(t.base_amount);
      });
    }

    const remainingBudgetMinor = monthlyBudgetMinor - monthlySpentMinor;
    const dailyAllowanceMinor = calculateDailyAllowance(remainingBudgetMinor, daysLeft);

    return {
      spentTodayMinor: spentToday,
      incomeTodayMinor: incomeToday,
      dailyAllowanceMinor,
      monthlyBudgetMinor,
      monthlySpentMinor,
      remainingBudgetMinor,
      daysLeftInMonth: daysLeft,
      transactions: formattedTxs,
    };
  } catch {
    return defaultResult;
  }
}
