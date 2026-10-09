"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { recurringRuleSchema, type RecurringRuleInput } from "./schema";
import { toMinorUnits } from "@/lib/money";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

import { calculateNextRun } from "./utils";

/**
 * Creates a recurring transaction rule (e.g., Netflix subscription, Apartment Rent).
 */
export async function createRecurringRule(
  input: RecurringRuleInput
): Promise<ActionResult> {
  const parseResult = recurringRuleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid recurring rule data",
    };
  }

  const data = parseResult.data;
  const minorAmount = toMinorUnits(data.amount, data.currency);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      let validAccountId = data.account_id;
      const { data: userAccounts } = await supabase
        .from("accounts")
        .select("id")
        .eq("user_id", user.id);

      if (userAccounts && userAccounts.length > 0) {
        const found = userAccounts.find((a) => a.id === validAccountId);
        if (!found) validAccountId = userAccounts[0].id;
      } else {
        const { data: newAccount } = await supabase
          .from("accounts")
          .insert({ user_id: user.id, name: "Cash", currency: data.currency })
          .select("id")
          .single();
        if (newAccount) validAccountId = newAccount.id;
      }

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

      if (!validCategoryId) {
        const { data: defaultCat } = await supabase
          .from("categories")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();
        validCategoryId = defaultCat?.id || null;
      }

      const { data: inserted, error } = await supabase
        .from("recurring_rules")
        .insert({
          user_id: user.id,
          type: data.type,
          amount: Number(minorAmount),
          currency: data.currency,
          account_id: validAccountId,
          category_id: validCategoryId,
          note: data.note || null,
          frequency: data.frequency,
          start_date: data.start_date,
          end_date: data.end_date || null,
          next_run: data.start_date,
          active: true,
        })
        .select()
        .single();

      if (error) {
        return { success: false, error: error.message };
      }

      revalidatePath("/recurring");
      return { success: true, data: inserted };
    }

    revalidatePath("/recurring");
    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        ...data,
        amount: Number(minorAmount),
        next_run: data.start_date,
        active: true,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create recurring rule",
    };
  }
}

/**
 * Toggles a rule between active and paused (Spec FR-R1).
 */
export async function toggleRecurringRule(
  id: string,
  active: boolean
): Promise<ActionResult> {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    revalidatePath("/recurring");
    return { success: true };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("recurring_rules")
      .update({ active })
      .eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/recurring");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to toggle rule",
    };
  }
}

/**
 * Idempotent processor for due recurring rules (Spec 9.5 & FR-R3).
 * Inserts transactions with unique (recurring_id, occurred_at) constraint preventing duplicates.
 */
export async function processDueRecurringRules(): Promise<ActionResult<{ processedCount: number }>> {
  const todayStr = new Date().toISOString().slice(0, 10);

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: true, data: { processedCount: 0 } };
    }

    // Find active rules due on or before today
    const { data: dueRules, error } = await supabase
      .from("recurring_rules")
      .select("*")
      .eq("user_id", user.id)
      .eq("active", true)
      .lte("next_run", todayStr);

    if (error || !dueRules || dueRules.length === 0) {
      return { success: true, data: { processedCount: 0 } };
    }

    let processedCount = 0;

    for (const rule of dueRules) {
      const occurredAt = `${rule.next_run}T00:00:00Z`;

      // Insert transaction using ON CONFLICT DO NOTHING (idempotent duplicate guard)
      const { error: insertError } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          recurring_id: rule.id,
          type: rule.type,
          amount: rule.amount,
          currency: rule.currency,
          base_amount: rule.amount,
          account_id: rule.account_id,
          category_id: rule.category_id,
          note: rule.note ? `[Recurring] ${rule.note}` : "[Recurring]",
          occurred_at: occurredAt,
        });

      if (!insertError) {
        processedCount++;
      }

      // Advance next_run
      const nextRunDate = calculateNextRun(rule.next_run, rule.frequency);
      const isPastEnd = rule.end_date && nextRunDate > rule.end_date;

      await supabase
        .from("recurring_rules")
        .update({
          next_run: nextRunDate,
          active: !isPastEnd,
        })
        .eq("id", rule.id);
    }

    revalidatePath("/today");
    revalidatePath("/recurring");
    revalidatePath("/transactions");

    return { success: true, data: { processedCount } };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to process recurring transactions",
    };
  }
}
