"use server";

import { createClient } from "@/lib/supabase/server";

export interface KeepAlivePingResult {
  success: boolean;
  latencyMs: number;
  timestamp: string;
  message: string;
  error?: string;
}

/**
 * Triggers a live keep-alive ping directly to Supabase to verify connectivity
 * and refresh the project inactivity timer.
 */
export async function triggerKeepAlivePing(): Promise<KeepAlivePingResult> {
  const start = Date.now();
  try {
    const supabase = await createClient();

    // 1. Database query
    const { error } = await supabase
      .from("categories")
      .select("id", { count: "exact", head: true });

    const latencyMs = Date.now() - start;

    if (error) {
      return {
        success: false,
        latencyMs,
        timestamp: new Date().toISOString(),
        message: "Supabase responded with an error",
        error: error.message,
      };
    }

    return {
      success: true,
      latencyMs,
      timestamp: new Date().toISOString(),
      message: `Supabase ping successful (${latencyMs}ms). Inactivity timer refreshed.`,
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      success: false,
      latencyMs,
      timestamp: new Date().toISOString(),
      message: "Failed to connect to Supabase",
      error: err instanceof Error ? err.message : "Network error",
    };
  }
}
