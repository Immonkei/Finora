"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { describeUnknownError, translateAuthError } from "./auth-i18n";

/**
 * "Continue with Google". Works for both sign in and sign up: Supabase creates
 * the account on first use, and Google accounts arrive already verified, with
 * the name and photo copied into the profile by the new-user trigger.
 */
export function GoogleButton() {
  const t = useT("auth");
  const [loading, setLoading] = React.useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/today`,
          // Always show the account chooser so people with several Gmail accounts can pick
          queryParams: { prompt: "select_account" },
        },
      });
      if (error) {
        toast.error(t("googleSignInFailed"), { description: translateAuthError(t, error.message) });
        setLoading(false);
      }
      // On success the browser navigates to Google, so keep the spinner
    } catch (err) {
      toast.error(t("googleInitFailed"), { description: describeUnknownError(t, err) });
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      size="lg"
      className="w-full gap-2.5 font-semibold"
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
        </svg>
      )}
      {t("continueWithGoogle")}
    </Button>
  );
}

export function AuthDivider({ label }: { label?: string } = {}) {
  const t = useT("auth");
  return (
    <div className="relative my-1">
      <div className="absolute inset-0 flex items-center">
        <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white dark:bg-[#0F1822] px-2 text-zinc-500">{label ?? t("orContinueWith")}</span>
      </div>
    </div>
  );
}
