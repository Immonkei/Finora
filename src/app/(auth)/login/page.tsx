"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FinoraLogo } from "@/components/finora-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import { describeUnknownError, translateAuthError } from "../auth-i18n";
import { AuthDivider, GoogleButton } from "../google-button";
import { PasswordInput } from "../password-input";

export default function LoginPage() {
  const router = useRouter();
  const t = useT("auth");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [needsVerification, setNeedsVerification] = React.useState(false);
  // Error passed back from /auth/callback or /auth/confirm
  const [linkError, setLinkError] = React.useState<"link_expired" | "oauth_failed" | null>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      const error = new URLSearchParams(window.location.search).get("error");
      if (error === "oauth_failed") setLinkError("oauth_failed");
      else if (error) setLinkError("link_expired");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        setNeedsVerification(/email not confirmed/i.test(error.message));
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

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-zinc-50/70 dark:bg-[#090E15]">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
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
            {linkError && (
              <div role="alert" className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{linkError === "oauth_failed" ? t("signInWithGoogleFailedBanner") : t("linkExpired")}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="email" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("email")}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    inputMode="email"
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
                  <label htmlFor="password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("password")}
                  </label>
                  <Link
                    href="/reset-password"
                    className="text-xs font-medium text-brand-600 hover:text-brand-700 dark:text-accent-400"
                  >
                    {t("forgotPassword")}
                  </Link>
                </div>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              {needsVerification && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(email.trim().toLowerCase())}`}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-brand-200 bg-brand-50/70 p-2.5 text-xs font-semibold text-brand-700 dark:border-brand-800/50 dark:bg-brand-950/40 dark:text-accent-300"
                >
                  <Mail className="h-3.5 w-3.5" /> {t("verifyEmailAction")}
                </Link>
              )}

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? t("signingIn") : t("signIn")}
              </Button>
            </form>

            <AuthDivider />
            <GoogleButton />

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
