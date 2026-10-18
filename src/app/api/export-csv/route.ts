import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fromMinorUnits, type CurrencyCode } from "@/lib/money";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Spec FR-A3: Authentication required for user data export
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const fromDate = searchParams.get("from");
    const toDate = searchParams.get("to");

    let query = supabase
      .from("transactions")
      .select("*, categories(name), accounts!account_id(name)")
      .eq("user_id", user.id)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false });

    // Spec FR-X2: Optional date range filtering
    if (fromDate) {
      query = query.gte("occurred_at", fromDate);
    }
    if (toDate) {
      query = query.lte("occurred_at", toDate);
    }

    const { data: dbTxs, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = (dbTxs || []).map((t) => {
      const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
      const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
      const currency = (t.currency || "USD") as CurrencyCode;
      const decimalAmount = fromMinorUnits(t.amount, currency);
      const baseAmountDecimal = t.base_amount / 100;

      return {
        id: t.id,
        occurred_at: t.occurred_at,
        type: t.type,
        amount:
          currency === "KHR"
            ? decimalAmount.toFixed(0)
            : decimalAmount.toFixed(2),
        currency,
        base_amount: baseAmountDecimal.toFixed(2),
        category: cat?.name || "Uncategorized",
        account: acc?.name || "Cash",
        note: t.note || "",
      };
    });

    // Format CSV
    const headers = [
      "ID",
      "Date",
      "Type",
      "Amount",
      "Currency",
      "Base Amount (USD)",
      "Category",
      "Account",
      "Note",
    ];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      const cleanNote = `"${(r.note || "").replace(/"/g, '""')}"`;
      csvLines.push(
        [
          r.id,
          r.occurred_at,
          r.type,
          r.amount,
          r.currency,
          r.base_amount,
          `"${r.category}"`,
          `"${r.account}"`,
          cleanNote,
        ].join(",")
      );
    }

    const csvContent = csvLines.join("\n");
    const filenameDate = new Date().toISOString().slice(0, 10);

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finora-transactions-${filenameDate}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export CSV" },
      { status: 500 }
    );
  }
}
