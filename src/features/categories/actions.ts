"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface CategoryPayload {
  name: string;
  color?: string | null;
  icon?: string | null;
  monthlyBudgetMinor?: bigint | number | null;
  rollover?: boolean;
}

export interface CategoryItem {
  id: string;
  name: string;
  color: string;
  icon: string;
  monthlyBudgetMinor: bigint;
  rollover: boolean;
  createdAt: string;
}

const DEFAULT_SEEDS = [
  { name: "Food & Drinks", color: "#EF4444", icon: "utensils", monthlyBudget: 25000n, rollover: true },
  { name: "Groceries", color: "#F59E0B", icon: "shopping-cart", monthlyBudget: 20000n, rollover: true },
  { name: "Transport & Fuel", color: "#3B82F6", icon: "car", monthlyBudget: 8000n, rollover: false },
  { name: "Housing & Utilities", color: "#8B5CF6", icon: "home", monthlyBudget: 50000n, rollover: false },
  { name: "Entertainment & Subscriptions", color: "#EC4899", icon: "tv", monthlyBudget: 5000n, rollover: true },
  { name: "Personal Care & Shopping", color: "#10B981", icon: "shopping-bag", monthlyBudget: 10000n, rollover: true },
];

/**
 * Creates a new custom category for the user.
 */
export async function createCategory(payload: CategoryPayload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const trimmedName = payload.name.trim();
    if (!trimmedName) {
      return { success: false, error: "Category name is required" };
    }

    const { data, error } = await supabase
      .from("categories")
      .insert({
        user_id: user.id,
        name: trimmedName,
        color: payload.color || "#3B82F6",
        icon: payload.icon || "sparkles",
        monthly_budget:
          payload.monthlyBudgetMinor !== undefined && payload.monthlyBudgetMinor !== null
            ? Number(payload.monthlyBudgetMinor)
            : null,
        rollover: payload.rollover ?? false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/month");
    revalidatePath("/insights");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create category",
    };
  }
}

/**
 * Updates an existing category.
 */
export async function updateCategory(id: string, payload: CategoryPayload) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const updateObj: {
      name?: string;
      color?: string | null;
      icon?: string | null;
      monthly_budget?: number | null;
      rollover?: boolean;
    } = {};
    if (payload.name !== undefined) updateObj.name = payload.name.trim();
    if (payload.color !== undefined) updateObj.color = payload.color;
    if (payload.icon !== undefined) updateObj.icon = payload.icon;
    if (payload.monthlyBudgetMinor !== undefined) {
      updateObj.monthly_budget =
        payload.monthlyBudgetMinor !== null ? Number(payload.monthlyBudgetMinor) : null;
    }
    if (payload.rollover !== undefined) updateObj.rollover = payload.rollover;

    const { error } = await supabase
      .from("categories")
      .update(updateObj)
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/month");
    revalidatePath("/insights");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to update category",
    };
  }
}

/**
 * Deletes a custom category.
 */
export async function deleteCategory(id: string) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Unauthorized" };
    }

    const { error } = await supabase
      .from("categories")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/month");
    revalidatePath("/insights");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete category",
    };
  }
}

/**
 * Seeds default categories for the current user if they don't have any in the database yet.
 */
export async function seedDefaultCategoriesIfEmpty() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: "Unauthorized" };

    const { count, error } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if (error) return { success: false, error: error.message };

    if (!count || count === 0) {
      const inserts = DEFAULT_SEEDS.map((s) => ({
        user_id: user.id,
        name: s.name,
        color: s.color,
        icon: s.icon,
        monthly_budget: Number(s.monthlyBudget),
        rollover: s.rollover,
      }));

      await supabase.from("categories").insert(inserts);
      revalidatePath("/settings");
      revalidatePath("/month");
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to seed categories",
    };
  }
}
