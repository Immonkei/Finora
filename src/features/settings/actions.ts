"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { updateSettingsSchema, type UpdateSettingsInput } from "./schema";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Updates user preferences with Zod validation via Server Actions.
 */
export async function updateUserSettings(
  input: UpdateSettingsInput
): Promise<ActionResult> {
  const parseResult = updateSettingsSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid settings input",
    };
  }

  const data = parseResult.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        main_currency: data.main_currency,
        timezone: data.timezone,
        week_starts_on: data.week_starts_on,
        reminder_time: data.reminder_time || null,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/settings");
    revalidatePath("/today");
    revalidatePath("/week");
    revalidatePath("/month");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to save settings",
    };
  }
}

/**
 * Permanently deletes user account and all personal financial records (FR-X3).
 */
export async function deleteUserAccount(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const userId = user.id;

    // Delete user data across all tables
    await supabase.from("transactions").delete().eq("user_id", userId);
    await supabase.from("recurring_rules").delete().eq("user_id", userId);
    await supabase.from("savings_goals").delete().eq("user_id", userId);
    await supabase.from("budgets").delete().eq("user_id", userId);
    await supabase.from("categories").delete().eq("user_id", userId);
    await supabase.from("accounts").delete().eq("user_id", userId);
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    // If Supabase Service Role Key is present, delete user from auth
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (serviceRoleKey && supabaseUrl) {
      try {
        const adminClient = createSupabaseAdminClient(supabaseUrl, serviceRoleKey);
        await adminClient.auth.admin.deleteUser(userId);
      } catch {
        // Continue if admin client is unavailable
      }
    }

    // Sign out current session
    await supabase.auth.signOut();

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete account",
    };
  }
}
