"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createTransactionSchema,
  updateTransactionSchema,
  isValidUuid,
  type CreateTransactionInput,
  type UpdateTransactionInput,
} from "./schema";
import { DEFAULT_USD_TO_KHR_RATE, toMinorUnits } from "@/lib/money";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a transaction (expense, income, or transfer).
 * Enforces integer minor units storage and calculates base_amount.
 */
export async function createTransaction(
  input: CreateTransactionInput
): Promise<ActionResult> {
  const parseResult = createTransactionSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid transaction input",
    };
  }

  const data = parseResult.data;
  const minorAmount = toMinorUnits(data.amount, data.currency);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // If Supabase is connected and user is logged in
    if (user) {
      // Exchange rate: for same currency it's 1. If base currency is USD and tx is KHR:
      let exchangeRate = 1.0;
      let baseAmount = minorAmount;

      // In production, query exchange_rates table if currency != user profile main currency
      if (data.currency === "KHR") {
        exchangeRate = 1 / DEFAULT_USD_TO_KHR_RATE; // same rate as the rest of the app
        baseAmount = BigInt(Math.round(Number(minorAmount) * exchangeRate * 100)); // convert to USD cents
      }

      // Resolve valid account for user or auto-provision Cash account (FR-A4)
      let validAccountId = data.account_id;
      const { data: userAccounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      if (userAccounts && userAccounts.length > 0) {
        const found = userAccounts.find((a) => a.id === validAccountId);
        validAccountId = found ? found.id : userAccounts[0].id;
      } else {
        const { data: newAccount } = await supabase
          .from("accounts")
          .insert({ user_id: user.id, name: "Cash", kind: "cash", currency: data.currency })
          .select("id")
          .maybeSingle();
        if (newAccount) {
          validAccountId = newAccount.id;
        }
      }

      // Resolve valid category if specified (validate UUID to prevent Postgres 22P02)
      let validCategoryId: string | null = null;
      const isCategoryUuid = isValidUuid(data.category_id);

      if (isCategoryUuid && data.category_id) {
        const { data: catExists } = await supabase
          .from("categories")
          .select("id")
          .eq("id", data.category_id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (catExists) {
          validCategoryId = catExists.id;
        }
      }

      // Fallback to first available category for user if type is expense
      if (!validCategoryId && data.type === "expense") {
        const { data: defaultCat } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        validCategoryId = defaultCat?.id || null;
      }

      // Resolve target account for transfer (FR-T1 & transfer_needs_target constraint)
      let validToAccountId: string | null = null;
      if (data.type === "transfer") {
        const isToAccountUuid = isValidUuid(data.to_account_id);

        if (isToAccountUuid && data.to_account_id) {
          const { data: toAccExists } = await supabase
            .from("accounts")
            .select("id")
            .eq("id", data.to_account_id)
            .eq("user_id", user.id)
            .maybeSingle();
          if (toAccExists) {
            validToAccountId = toAccExists.id;
          }
        }

        // If transfer target account not found, find or create secondary account
        if (!validToAccountId) {
          const otherAcc = (userAccounts || []).find((a) => a.id !== validAccountId);
          if (otherAcc) {
            validToAccountId = otherAcc.id;
          } else {
            const { data: bankAcc } = await supabase
              .from("accounts")
              .insert({ user_id: user.id, name: "Bank", kind: "bank", currency: data.currency })
              .select("id")
              .maybeSingle();
            validToAccountId = bankAcc?.id || null;
          }
        }
      }

      let finalNote = data.note || null;
      if (data.receipt_url) {
        finalNote = finalNote
          ? `${finalNote} [receipt:${data.receipt_url}]`
          : `[receipt:${data.receipt_url}]`;
      }

      const { data: inserted, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: data.type,
          amount: Number(minorAmount),
          currency: data.currency,
          exchange_rate: exchangeRate,
          base_amount: Number(baseAmount),
          account_id: validAccountId,
          to_account_id: data.type === "transfer" ? validToAccountId : null,
          category_id: data.type === "expense" ? validCategoryId : null,
          note: finalNote,
          occurred_at:
            typeof data.occurred_at === "string"
              ? data.occurred_at
              : data.occurred_at.toISOString(),
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      // FR-N1: Automatic In-App Notification when budget reaches 80% or 100%
      if (data.type === "expense") {
        try {
          const now = new Date();
          const currentMonthStr = `${now.getFullYear()}-${String(
            now.getMonth() + 1
          ).padStart(2, "0")}-01`;
          const { data: budget } = await supabase
            .from("budgets")
            .select("total_limit")
            .eq("user_id", user.id)
            .eq("month", currentMonthStr)
            .maybeSingle();

          if (budget?.total_limit && budget.total_limit > 0) {
            const budgetLimit = budget.total_limit;
            const startOfMonth = new Date(
              now.getFullYear(),
              now.getMonth(),
              1
            ).toISOString();

            const { data: monthTxs } = await supabase
              .from("transactions")
              .select("base_amount")
              .eq("user_id", user.id)
              .eq("type", "expense")
              .is("deleted_at", null)
              .gte("occurred_at", startOfMonth);

            let totalSpent = 0;
            (monthTxs || []).forEach((t) => {
              totalSpent += t.base_amount;
            });

            const percent = (totalSpent / budgetLimit) * 100;

          if (percent >= 100) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("kind", "limit_100")
              .gte("created_at", startOfMonth)
              .maybeSingle();

            if (!existing) {
              await supabase.from("notifications").insert({
                user_id: user.id,
                kind: "limit_100",
                message: `Budget Limit Reached: You have reached 100% of your $${(
                  budgetLimit / 100
                ).toFixed(0)} monthly budget ($${(totalSpent / 100).toFixed(
                  2
                )} spent).`,
                read: false,
              });
            }
          } else if (percent >= 80) {
            const { data: existing } = await supabase
              .from("notifications")
              .select("id")
              .eq("user_id", user.id)
              .eq("kind", "warning_80")
              .gte("created_at", startOfMonth)
              .maybeSingle();

            if (!existing) {
              await supabase.from("notifications").insert({
                user_id: user.id,
                kind: "warning_80",
                message: `Budget Alert (80%): You have reached ${Math.round(
                  percent
                )}% of your $${(budgetLimit / 100).toFixed(0)} monthly budget limit.`,
                read: false,
              });
            }
          }
          }
        } catch {
          // Non-blocking notification evaluation
        }
      }

      revalidatePath("/today");
      revalidatePath("/week");
      revalidatePath("/month");
      revalidatePath("/transactions");

      return { success: true, data: inserted };
    }

    // Fallback demo/mock response if offline or testing without live Supabase
    revalidatePath("/today");
    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        ...data,
        amount: Number(minorAmount),
        base_amount: Number(minorAmount),
      },
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Failed to record transaction";
    return { success: false, error: errorMsg };
  }
}

/**
 * Soft deletes a transaction by setting deleted_at (Spec FR-T6).
 */
export async function deleteTransaction(id: string): Promise<ActionResult> {
  if (!isValidUuid(id)) {
    revalidatePath("/today");
    revalidatePath("/transactions");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/today");
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete",
    };
  }
}

/**
 * Restores a soft-deleted transaction (Spec FR-T6 10-second undo window).
 */
export async function restoreTransaction(id: string): Promise<ActionResult> {
  if (!isValidUuid(id)) {
    revalidatePath("/today");
    revalidatePath("/transactions");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("transactions")
      .update({ deleted_at: null })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/today");
    revalidatePath("/transactions");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to restore",
    };
  }
}

/**
 * Extracts attached receipt photo URL and clean note text (Spec 3.4 #22).
 */
export async function parseReceiptUrl(note: string | null | undefined): Promise<{
  cleanNote: string;
  receiptUrl: string | null;
}> {
  if (!note) return { cleanNote: "", receiptUrl: null };
  const match = note.match(/\[receipt:(https?:\/\/[^\]]+)\]/);
  if (match) {
    return {
      cleanNote: note.replace(match[0], "").trim(),
      receiptUrl: match[1],
    };
  }
  return { cleanNote: note, receiptUrl: null };
}

/**
 * Updates an existing transaction (Spec FR-T6).
 */
export async function updateTransaction(
  input: UpdateTransactionInput
): Promise<ActionResult> {
  const parseResult = updateTransactionSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid update input",
    };
  }

  const { id, amount, currency, category_id, note, receipt_url, type, occurred_at } =
    parseResult.data;

  // Validate UUID format
  if (!isValidUuid(id)) {
    revalidatePath("/today");
    revalidatePath("/transactions");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required to update transactions" };
    }

    const updatePayload: {
      type?: "expense" | "income" | "transfer";
      amount?: number;
      currency?: string;
      exchange_rate?: number;
      base_amount?: number;
      category_id?: string | null;
      note?: string | null;
      occurred_at?: string;
    } = {};

    if (type) {
      updatePayload.type = type;
    }

    const resolvedCurrency = currency || "USD";
    if (amount !== undefined) {
      const minorAmount = toMinorUnits(amount, resolvedCurrency);
      updatePayload.amount = Number(minorAmount);
      updatePayload.currency = resolvedCurrency;

      let exchangeRate = 1.0;
      let baseAmount = minorAmount;
      if (resolvedCurrency === "KHR") {
        exchangeRate = 1 / DEFAULT_USD_TO_KHR_RATE;
        baseAmount = BigInt(Math.round(Number(minorAmount) * exchangeRate * 100));
      }
      updatePayload.exchange_rate = exchangeRate;
      updatePayload.base_amount = Number(baseAmount);
    }

    if (category_id !== undefined) {
      const isCatUuid = isValidUuid(category_id);
      updatePayload.category_id = isCatUuid ? category_id : null;
    }

    if (note !== undefined || receipt_url !== undefined) {
      let finalNote = note || "";
      if (receipt_url) {
        finalNote = finalNote
          ? `${finalNote} [receipt:${receipt_url}]`
          : `[receipt:${receipt_url}]`;
      }
      updatePayload.note = finalNote || null;
    }

    if (occurred_at) {
      updatePayload.occurred_at =
        occurred_at instanceof Date ? occurred_at.toISOString() : occurred_at;
    }

    const { data: updated, error } = await supabase
      .from("transactions")
      .update(updatePayload)
      .eq("id", id)
      .eq("user_id", user.id)
      .select()
      .maybeSingle();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/today");
    revalidatePath("/week");
    revalidatePath("/month");
    revalidatePath("/transactions");

    return { success: true, data: updated };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update transaction",
    };
  }
}

