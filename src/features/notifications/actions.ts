"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  createNotificationSchema,
  notificationIdSchema,
  type CreateNotificationInput,
} from "./schema";

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Creates a notification with Zod validation.
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<ActionResult> {
  const parseResult = createNotificationSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || "Invalid notification input",
    };
  }

  const { kind, message } = parseResult.data;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data, error } = await supabase
      .from("notifications")
      .insert({
        user_id: user.id,
        kind,
        message,
        read: false,
      })
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/today");
    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to create notification",
    };
  }
}

/**
 * Marks all notifications as read for the authenticated user.
 */
export async function markAllNotificationsRead(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to mark notifications read",
    };
  }
}

/**
 * Deletes a notification by ID.
 */
export async function deleteNotification(id: string): Promise<ActionResult> {
  const parseResult = notificationIdSchema.safeParse({ id });
  if (!parseResult.success) {
    return { success: false, error: "Invalid notification ID" };
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
      .from("notifications")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to delete notification",
    };
  }
}

/**
 * Checks and creates daily reminder notification if due (FR-N2).
 */
export async function checkDailyReminder(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Authentication required" };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("reminder_time")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.reminder_time) {
      return { success: true };
    }

    const todayDateStr = new Date().toISOString().slice(0, 10);
    const now = new Date();
    const [remH, remM] = profile.reminder_time.slice(0, 5).split(":").map(Number);

    if (now.getHours() > remH || (now.getHours() === remH && now.getMinutes() >= remM)) {
      const { data: todayReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", user.id)
        .eq("kind", "reminder")
        .gte("created_at", `${todayDateStr}T00:00:00Z`)
        .maybeSingle();

      if (!todayReminder) {
        await supabase.from("notifications").insert({
          user_id: user.id,
          kind: "reminder",
          message:
            "Evening check-in: Did you log all your expenses today? Tap Quick Add to record cash and coffee spends.",
          read: false,
        });
      }
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to check daily reminder",
    };
  }
}
