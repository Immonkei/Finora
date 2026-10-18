import { NextResponse } from "next/server";
import { generateWeeklyAiReport, type WeeklyAiReport } from "@/features/reports/ai-weekly-report";
import { formatMoney, type CurrencyCode } from "@/lib/money";

interface WeeklyReportPayload {
  spentThisWeekMinor?: string | number;
  allowanceAverageMinor?: string | number;
  currency?: string;
  topCategories?: { name: string; amountMinor: string | number; percent: number }[];
  highestDay?: { day: string; amountMinor: string | number } | null;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WeeklyReportPayload;
    const spentThisWeekMinor = BigInt(body.spentThisWeekMinor || 0);
    const allowanceAverageMinor = BigInt(body.allowanceAverageMinor || 0);
    const currency: CurrencyCode = body.currency === "KHR" ? "KHR" : "USD";
    const topCategories = body.topCategories || [];
    const highestDay = body.highestDay;

    const apiKey =
      process.env.GEMINI_API_KEY ||
      process.env.GOOGLE_API_KEY;

    if (apiKey) {
      try {
        const topCatsStr =
          topCategories.length > 0
            ? topCategories
                .map(
                  (c) =>
                    `${c.name}: ${formatMoney(BigInt(c.amountMinor || 0), currency)} (${c.percent}%)`
                )
                .join(", ")
            : "No category spending logged yet";

        const highestDayStr = highestDay
          ? `${highestDay.day} (${formatMoney(BigInt(highestDay.amountMinor || 0), currency)})`
          : "None";

        const prompt = `You are a high-level personal finance advisor for Finora, a modern money tracker.
Analyze the user's spending data for this week:
- Total Week Spent: ${formatMoney(spentThisWeekMinor, currency)}
- Daily Average / Allowance Target: ${formatMoney(allowanceAverageMinor, currency)}
- Top Categories: ${topCatsStr}
- Highest Spending Day: ${highestDayStr}

Generate a concise, constructive, and intelligent weekly financial report.
1. score: Integer between 0 and 100 representing their budget discipline (higher if spending is low/moderate, lower if overspending). If total spending is 0, give a neutral/on-track score of 85.
2. headline: A punchy 5-10 word evaluation.
3. summary: 2-3 sentences summarizing their weekly spending pattern and pacing.
4. highlights: An array of 3 concise bullet strings noting key observations.
5. recommendations: An array of 2-3 actionable, high-impact tips to improve savings.

Respond ONLY with valid, raw JSON with this exact schema:
{
  "score": 85,
  "headline": "Great Pacing! You are on track this week",
  "summary": "...",
  "highlights": ["...", "...", "..."],
  "recommendations": ["...", "..."]
}`;

        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              response_mime_type: "application/json",
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const cleaned = candidateText.replace(/^```json/i, "").replace(/```$/i, "").trim();
            const parsed = JSON.parse(cleaned);

            const report: WeeklyAiReport = {
              score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 80,
              headline: String(parsed.headline || "Weekly Financial Review"),
              summary: String(parsed.summary || "Here is your weekly spending analysis."),
              highlights: Array.isArray(parsed.highlights) ? parsed.highlights.map(String) : [],
              recommendations: Array.isArray(parsed.recommendations)
                ? parsed.recommendations.map(String)
                : [],
              generatedAt: new Date().toISOString(),
            };

            return NextResponse.json({ report, source: "gemini" });
          }
        }
      } catch (geminiError) {
        console.warn("Gemini generation failed, falling back to heuristic engine:", geminiError);
      }
    }

    // Heuristic fallback engine
    const fallbackReport = generateWeeklyAiReport({
      spentThisWeekMinor,
      allowanceAverageMinor: allowanceAverageMinor > 0n ? allowanceAverageMinor : 1500n,
      topLeakTitle: topCategories[0]?.name || "Uncategorized",
      currency,
    });

    return NextResponse.json({ report: fallbackReport, source: "heuristic" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
