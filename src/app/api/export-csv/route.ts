import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Mock data fallback if user is not authenticated or running locally without Supabase
    let rows = [
      {
        id: "1",
        occurred_at: "2026-10-08T09:15:00Z",
        type: "expense",
        amount: 4.5,
        currency: "USD",
        base_amount: 4.5,
        category: "Food & Drinks",
        account: "Cash",
        note: "Iced Latte & Croissant",
      },
      {
        id: "2",
        occurred_at: "2026-10-08T10:30:00Z",
        type: "expense",
        amount: 3.0,
        currency: "USD",
        base_amount: 3.0,
        category: "Transport",
        account: "Cash",
        note: "Grab Taxi to Office",
      },
      {
        id: "3",
        occurred_at: "2026-10-07T14:00:00Z",
        type: "income",
        amount: 450.0,
        currency: "USD",
        base_amount: 450.0,
        category: "Freelance",
        account: "Bank",
        note: "Freelance Project Milestone",
      },
    ];

    if (user) {
      const { data: dbTxs } = await supabase
        .from("transactions")
        .select("*, categories(name), accounts(name)")
        .eq("user_id", user.id)
        .is("deleted_at", null)
        .order("occurred_at", { ascending: false });

      if (dbTxs && dbTxs.length > 0) {
        rows = dbTxs.map((t) => {
          const cat = Array.isArray(t.categories) ? t.categories[0] : t.categories;
          const acc = Array.isArray(t.accounts) ? t.accounts[0] : t.accounts;
          return {
            id: t.id,
            occurred_at: t.occurred_at,
            type: t.type,
            amount: t.amount / (t.currency === "USD" ? 100 : 1),
            currency: t.currency,
            base_amount: t.base_amount / 100,
            category: cat?.name || "Uncategorized",
            account: acc?.name || "Cash",
            note: t.note || "",
          };
        });
      }
    }

    // Format CSV
    const headers = ["ID", "Date", "Type", "Amount", "Currency", "Base Amount (USD)", "Category", "Account", "Note"];
    const csvLines = [headers.join(",")];

    for (const r of rows) {
      const cleanNote = `"${(r.note || "").replace(/"/g, '""')}"`;
      csvLines.push(
        [
          r.id,
          r.occurred_at,
          r.type,
          r.amount.toFixed(2),
          r.currency,
          r.base_amount.toFixed(2),
          `"${r.category}"`,
          `"${r.account}"`,
          cleanNote,
        ].join(",")
      );
    }

    const csvContent = csvLines.join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="finora-transactions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to export CSV" },
      { status: 500 }
    );
  }
}
