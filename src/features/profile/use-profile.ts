"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  provider: "google" | "email";
  emailVerified: boolean;
}

/**
 * The signed-in user's display profile. The name prefers profiles.full_name
 * (editable in Settings) and falls back to auth metadata from sign-up/Google.
 */
export function useProfile() {
  const [profile, setProfile] = React.useState<Profile | null>(null);

  const load = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: row } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();

      const meta = user.user_metadata ?? {};
      const metaName = (meta.full_name ?? meta.name ?? null) as string | null;
      setProfile({
        id: user.id,
        email: user.email ?? null,
        fullName: row?.full_name || metaName || null,
        avatarUrl: row?.avatar_url || (meta.avatar_url ?? meta.picture ?? null),
        provider: user.app_metadata?.provider === "google" ? "google" : "email",
        emailVerified: Boolean(user.email_confirmed_at),
      });
    } catch {
      // Supabase not configured or offline: callers render without a name
    }
  }, []);

  React.useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  return { profile, reload: load };
}

/** Saves the display name to both the profile row and auth metadata. */
export async function saveDisplayName(userId: string, fullName: string) {
  const supabase = createClient();
  const name = fullName.trim().replace(/\s+/g, " ");
  const { error } = await supabase.from("profiles").update({ full_name: name }).eq("id", userId);
  if (error) return { success: false as const, error: error.message };
  await supabase.auth.updateUser({ data: { full_name: name } });
  return { success: true as const };
}

export function firstName(fullName: string | null | undefined): string | null {
  const first = fullName?.trim().split(/\s+/)[0];
  return first || null;
}

export function initials(fullName: string | null | undefined, email?: string | null): string {
  const parts = (fullName ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}
