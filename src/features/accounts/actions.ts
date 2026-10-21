"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toMinorUnits } from "@/lib/money";
import {
  accountIdSchema,
  accountInputSchema,
  updateAccountSchema,
  type AccountInput,
  type UpdateAccountInput,
} from "./schema";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function createAccount(input: AccountInput): Promise<ActionResult<{ id: string }>> {
  const parsed = accountInputSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid account input" };
  }
  const { name, kind, currency, opening_balance, color } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { data, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name,
        kind,
        currency,
        opening_balance: Number(toMinorUnits(opening_balance, currency)),
        color: color ?? null,
      })
      .select("id")
      .single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/accounts");
    return { success: true, data: { id: data.id } };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to create account" };
  }
}

export async function updateAccount(input: UpdateAccountInput): Promise<ActionResult> {
  const parsed = updateAccountSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || "Invalid account input" };
  }
  const { id, name, kind, currency, opening_balance, color } = parsed.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { error } = await supabase
      .from("accounts")
      .update({
        name,
        kind,
        currency,
        opening_balance: Number(toMinorUnits(opening_balance, currency)),
        color: color ?? null,
      })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/accounts");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to update account" };
  }
}

/**
 * Archives an account: it disappears from pickers and totals, but its
 * transactions (and their history) are kept. Deleting would cascade them away.
 */
export async function archiveAccount(input: { id: string }): Promise<ActionResult> {
  const parsed = accountIdSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Invalid account ID" };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Authentication required" };

    const { count } = await supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .is("archived_at", null);
    if ((count ?? 0) <= 1) {
      return { success: false, error: "LAST_ACCOUNT" };
    }

    const { error } = await supabase
      .from("accounts")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", parsed.data.id)
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };
    revalidatePath("/accounts");
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Failed to archive account" };
  }
}
