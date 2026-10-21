"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinoraLogo } from "@/components/finora-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import { describeUnknownError, translateAuthError } from "../auth-i18n";

export default function LoginPage() {
  const router = useRouter();
  const t = useT("auth");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast.error(t("signInFailed"), { description: translateAuthError(t, error.message) });
        setLoading(false);
        return;
      }

      toast.success(t("welcomeBack"));
      router.push("/today");
      router.refresh();
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
        {/* Brand Header */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <FinoraLogo variant="full" size="lg" priority />
          </Link>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("loginTagline")}
          </p>
        </div>

        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-[#0F1822]">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-lg">{t("signInTitle")}</CardTitle>
            <CardDescription>
              {t("signInDescription")}
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
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("password")}
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-accent-400"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                {loading ? t("signingIn") : t("signIn")}
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
          {t("noAccount")}{" "}
          <Link
            href="/register"
            className="font-semibold text-brand-600 hover:text-brand-700 dark:text-accent-400"
          >
            {t("createOne")}
          </Link>
        </p>
      </div>
    </div>
  );
}
