"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createSavingsGoalSchema,
  contributeGoalSchema,
  deleteGoalSchema,
  type CreateSavingsGoalInput,
  type ContributeGoalInput,
  type DeleteGoalInput,
} from "./schema";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a new savings goal validated with Zod.
 */
export async function createSavingsGoal(
  input: CreateSavingsGoalInput
): Promise<ActionResult> {
  const parseResult = createSavingsGoalSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid goal input",
    };
  }

  const { name, target_amount, saved_amount, deadline } = parseResult.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data, error } = await supabase
      .from("savings_goals")
      .insert({
        user_id: user.id,
        name: name.trim(),
        target_amount: Math.round(target_amount),
        saved_amount: Math.round(saved_amount || 0),
        deadline: deadline || null,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/goals");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create savings goal",
    };
  }
}

/**
 * Contributes an amount to an existing savings goal.
 */
export async function contributeSavingsGoal(
  input: ContributeGoalInput
): Promise<ActionResult> {
  const parseResult = contributeGoalSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid contribution input",
    };
  }

  const { goal_id, amount } = parseResult.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    // Fetch existing goal
    const { data: goal, error: fetchError } = await supabase
      .from("savings_goals")
      .select("saved_amount, target_amount")
      .eq("id", goal_id)
      .eq("user_id", user.id)
      .single();

    if (fetchError || !goal) {
      return { success: false, error: fetchError?.message || "Goal not found" };
    }

    const newSaved = goal.saved_amount + Math.round(amount);

    const { data, error: updateError } = await supabase
      .from("savings_goals")
      .update({ saved_amount: newSaved })
      .eq("id", goal_id)
      .eq("user_id", user.id)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    revalidatePath("/goals");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to contribute to goal",
    };
  }
}

/**
 * Deletes a savings goal.
 */
export async function deleteSavingsGoal(
  input: DeleteGoalInput
): Promise<ActionResult> {
  const parseResult = deleteGoalSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid goal ID",
    };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { error } = await supabase
      .from("savings_goals")
      .delete()
      .eq("id", parseResult.data.goal_id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/goals");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete goal",
    };
  }
}
