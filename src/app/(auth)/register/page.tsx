"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinoraLogo } from "@/components/finora-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import { describeUnknownError, translateAuthError } from "../auth-i18n";

export default function RegisterPage() {
  const router = useRouter();
  const t = useT("auth");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error(t("passwordTooShort"), { description: t("passwordTooShortDesc") });
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        toast.error(t("signUpFailed"), { description: translateAuthError(t, error.message) });
        setLoading(false);
        return;
      }

      if (data?.session) {
        toast.success(t("accountCreated"));
        router.push("/today");
        router.refresh();
      } else {
        toast.success(t("checkEmailToConfirm"), { description: t("checkEmailToConfirmDesc") });
        router.push("/login");
      }
    } catch (err) {
      toast.error(t("unexpectedError"), { description: describeUnknownError(t, err) });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(t("googleSignInFailed"), { description: translateAuthError(t, error.message) });
      }
    } catch (err) {
      toast.error(t("googleInitFailed"), { description: describeUnknownError(t, err) });
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-zinc-50/70 dark:bg-[#090E15]">
      <div className="absolute top-3 right-3">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <FinoraLogo variant="full" size="lg" priority />
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("registerTagline")}
          </p>
        </div>

        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-[#0F1822]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">{t("signUpTitle")}</CardTitle>
            <CardDescription>
              {t("signUpDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="email"
                    placeholder={t("emailPlaceholder")}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("passwordMin")}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 rounded-xl text-xs text-brand-800 dark:text-brand-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-accent-500" />
                <span>
                  {t("privacyNote")}
                </span>
              </div>

              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? t("creatingAccount") : t("createAccount")}
              </Button>
            </form>

            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-zinc-200 dark:border-zinc-800" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white dark:bg-[#0F1822] px-2 text-zinc-500">
                  {t("orContinueWith")}
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              type="button"
              className="w-full gap-2 font-medium"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              {t("continueWithGoogle")}
            </Button>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-zinc-500">
          {t("haveAccount")}{" "}
          <Link
            href="/login"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-accent-400"
          >
            {t("signIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
