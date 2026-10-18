import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, calculateDailyAllowance, DEFAULT_USD_TO_KHR_RATE, type CurrencyCode } from "@/lib/money";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages: ChatMessage[];
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please log in to chat with Finora AI." }, { status: 401 });
    }

    const body = (await req.json()) as ChatRequestBody;
    const messages = body.messages || [];

    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API key is not configured. Please add GEMINI_API_KEY to your .env.local file.",
        },
        { status: 500 }
      );
    }

    // 1. Fetch User Profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("main_currency, timezone")
      .eq("id", user.id)
      .maybeSingle();

    const mainCurrency: CurrencyCode = (profile?.main_currency as CurrencyCode) || "USD";

    // 2. Date Boundaries
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed
    const startOfMonth = new Date(currentYear, currentMonth, 1).toISOString();
    const startOfDay = new Date(currentYear, currentMonth, now.getDate()).toISOString();
    const totalDaysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysLeft = Math.max(1, totalDaysInMonth - now.getDate() + 1);
    const monthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-01`;

    // 3. Fetch Monthly Budget
    const { data: budgetRow } = await supabase
      .from("budgets")
      .select("total_limit")
      .eq("user_id", user.id)
      .eq("month", monthKey)
      .maybeSingle();

    const budgetLimitMinor = BigInt(Math.round(budgetRow?.total_limit || 0));

    // 4. Fetch This Month's Transactions
    const { data: monthlyTxs } = await supabase
      .from("transactions")
      .select("amount, base_amount, currency, type, occurred_at, note, categories(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .gte("occurred_at", startOfMonth)
      .order("occurred_at", { ascending: false });

    let totalSpentMonthMinor = 0n;
    let spentTodayMinor = 0n;
    const categoryTotals: Record<string, bigint> = {};

    if (monthlyTxs) {
      for (const tx of monthlyTxs) {
        if (tx.type === "expense") {
          const amtMinor = BigInt(Math.round(tx.base_amount || tx.amount));
          totalSpentMonthMinor += amtMinor;

          if (tx.occurred_at >= startOfDay) {
            spentTodayMinor += amtMinor;
          }

          const catName =
            (tx.categories as unknown as { name?: string })?.name || "Uncategorized";
          categoryTotals[catName] = (categoryTotals[catName] || 0n) + amtMinor;
        }
      }
    }

    const remainingBudgetMinor =
      budgetLimitMinor > totalSpentMonthMinor ? budgetLimitMinor - totalSpentMonthMinor : 0n;
    const dailyAllowanceMinor = calculateDailyAllowance(remainingBudgetMinor, daysLeft);

    // Format top categories
    const topCategoriesList = Object.entries(categoryTotals)
      .sort((a, b) => (b[1] > a[1] ? 1 : -1))
      .slice(0, 4)
      .map(([name, minor]) => `${name}: ${formatMoney(minor, mainCurrency)}`)
      .join(", ") || "No expenses logged this month yet";

    // 5. Fetch Active Savings Goals
    const { data: goals } = await supabase
      .from("savings_goals")
      .select("name, target_amount, saved_amount, deadline")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    const goalsSummary =
      goals && goals.length > 0
        ? goals
            .map((g) => {
              const target = BigInt(Math.round(g.target_amount));
              const saved = BigInt(Math.round(g.saved_amount));
              const pct = target > 0n ? Number((saved * 100n) / target) : 0;
              return `${g.name}: ${formatMoney(saved, mainCurrency)} of ${formatMoney(
                target,
                mainCurrency
              )} (${pct}%)`;
            })
            .join("; ")
        : "None created yet";

    // 6. Fetch Active Recurring Rules
    const { data: recurringRules } = await supabase
      .from("recurring_rules")
      .select("note, amount, currency, frequency, next_run")
      .eq("user_id", user.id)
      .eq("active", true)
      .limit(5);

    const recurringSummary =
      recurringRules && recurringRules.length > 0
        ? recurringRules
            .map(
              (r) =>
                `${r.note || "Bill"}: ${formatMoney(BigInt(Math.round(r.amount)), (r.currency as CurrencyCode) || "USD")} (${r.frequency}, next on ${r.next_run})`
            )
            .join("; ")
        : "None scheduled";

    // 7. Recent Transactions (last 8)
    const recentSummary =
      monthlyTxs && monthlyTxs.length > 0
        ? monthlyTxs
            .slice(0, 8)
            .map((t) => {
              const catName =
                (t.categories as unknown as { name?: string })?.name || "General";
              const dateStr = t.occurred_at.slice(0, 10);
              return `${dateStr}: ${t.type.toUpperCase()} ${formatMoney(
                BigInt(Math.round(t.amount)),
                (t.currency as CurrencyCode) || mainCurrency
              )} for ${t.note || catName}`;
            })
            .join("\n- ")
        : "No recent transactions found.";

    // 8. Build System Prompt with Live Financial Context
    const systemPrompt = `You are Finora AI, a friendly, encouraging, and practical personal finance assistant inside Finora — a personal money tracking app.
You use simple, everyday words. Avoid complicated financial jargon. Be concise, direct, and supportive.

Here is the user's real-time financial situation:
- Today's Date: ${now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" })}
- Days Left in Month: ${daysLeft} days
- Primary Currency: ${mainCurrency} (1 USD ≈ ${DEFAULT_USD_TO_KHR_RATE.toLocaleString()} KHR)
- Monthly Spending Limit: ${budgetLimitMinor > 0n ? formatMoney(budgetLimitMinor, mainCurrency) : "No total limit set"}
- Total Spent This Month: ${formatMoney(totalSpentMonthMinor, mainCurrency)}
- Remaining Budget for Month: ${budgetLimitMinor > 0n ? formatMoney(remainingBudgetMinor, mainCurrency) : "Open budget"}
- Safe Daily Allowance for Today: ${formatMoney(dailyAllowanceMinor, mainCurrency)}
- Spent Today So Far: ${formatMoney(spentTodayMinor, mainCurrency)}
- Top Spending Categories: ${topCategoriesList}
- Active Savings Goals: ${goalsSummary}
- Upcoming Recurring Bills: ${recurringSummary}
- Recent Transactions (Latest first):
- ${recentSummary}

Rules:
1. Always use the user's real financial numbers above to answer questions.
2. If the user asks whether they can afford to buy something (e.g. "Can I buy a $30 dinner?"):
   - Compare the cost to their daily allowance (${formatMoney(dailyAllowanceMinor, mainCurrency)}) and remaining budget.
   - Give a clear "Yes, but..." or "Better to wait..." recommendation with simple reasons.
3. Keep answers concise (1 to 3 short paragraphs or bullet points). Remember the user is reading on a mobile phone.
4. Support both USD and Cambodian Riel (KHR).
5. If the user asks in Khmer, respond warmly in natural Khmer. If in English, respond in simple English.
6. Never make up fake transaction history. Only refer to the real data provided above.`;

    // 9. Format message history for Gemini
    // Limit to the last 10 messages for conversation continuity
    const history = messages.slice(-10);
    const geminiContents = history.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    // Ensure the first message is a user message (Gemini API requirement)
    if (geminiContents.length > 0 && geminiContents[0].role !== "user") {
      geminiContents.shift();
    }

    const model = process.env.GEMINI_MODEL || "gemini-flash-latest";
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 600,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      return NextResponse.json(
        {
          error: `Gemini API error (${geminiRes.status}): ${errText}`,
        },
        { status: geminiRes.status }
      );
    }

    const geminiData = await geminiRes.json();
    const replyText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text ||
      "I'm here to help with your spending and budgets! Ask me anything about your money.";

    return NextResponse.json({ reply: replyText });
  } catch (error) {
    console.error("AI Chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to generate AI response",
      },
      { status: 500 }
    );
  }
}
