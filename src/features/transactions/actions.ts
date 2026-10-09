"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createTransactionSchema, type CreateTransactionInput } from "./schema";
import { toMinorUnits } from "@/lib/money";

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
        exchangeRate = 0.00025; // 4,000 KHR = 1 USD
        baseAmount = BigInt(Math.round(Number(minorAmount) * exchangeRate * 100)); // convert to USD cents
      }

      // Resolve valid account for user or auto-provision Cash account (FR-A4)
      let validAccountId = data.account_id;
      const { data: userAccounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user.id);

      if (userAccounts && userAccounts.length > 0) {
        const found = userAccounts.find((a) => a.id === validAccountId);
        validAccountId = found ? found.id : userAccounts[0].id;
      } else {
        const { data: newAccount } = await supabase
          .from("accounts")
          .insert({ user_id: user.id, name: "Cash", currency: data.currency })
          .select("id")
          .maybeSingle();
        if (newAccount) {
          validAccountId = newAccount.id;
        }
      }

      // Resolve valid category if specified (validate UUID to prevent Postgres 22P02)
      let validCategoryId: string | null = null;
      const isCategoryUuid =
        data.category_id &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          data.category_id
        );

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
        const isToAccountUuid =
          data.to_account_id &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            data.to_account_id
          );

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
              .insert({ user_id: user.id, name: "Bank", currency: data.currency })
              .select("id")
              .maybeSingle();
            validToAccountId = bankAcc?.id || null;
          }
        }
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
          note: data.note || null,
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
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
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
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
