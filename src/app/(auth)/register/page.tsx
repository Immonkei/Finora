"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck, UserRound } from "lucide-react";
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
import { PasswordInput, PasswordStrengthMeter } from "../password-input";

export default function RegisterPage() {
  const router = useRouter();
  const t = useT("auth");
  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [agreed, setAgreed] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const passwordsMismatch = confirmPassword.length > 0 && confirmPassword !== password;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = fullName.trim().replace(/\s+/g, " ");
    if (name.length < 2) {
      toast.error(t("nameRequired"));
      return;
    }
    if (password.length < 8) {
      toast.error(t("passwordTooShort"), { description: t("passwordTooShortDesc") });
      return;
    }
    if (password !== confirmPassword) {
      toast.error(t("passwordsDontMatch"));
      return;
    }
    if (!agreed) {
      toast.error(t("mustAgree"));
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          // Saved to user metadata and copied into profiles.full_name by the new-user trigger
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/today`,
        },
      });

      if (error) {
        toast.error(t("signUpFailed"), { description: translateAuthError(t, error.message) });
        setLoading(false);
        return;
      }

      // Supabase returns a user with no identities when the email is already registered
      if (data.user && data.user.identities?.length === 0) {
        toast.error(t("signUpFailed"), { description: t("errUserExists") });
        setLoading(false);
        return;
      }

      if (data?.session) {
        // Email confirmation is disabled on this Supabase project
        toast.success(t("welcomeName", { name: name.split(" ")[0] }));
        router.push("/today");
        router.refresh();
      } else {
        router.push(`/verify-email?email=${encodeURIComponent(normalizedEmail)}`);
      }
    } catch (err) {
      toast.error(t("unexpectedError"), { description: describeUnknownError(t, err) });
      setLoading(false);
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
            <GoogleButton />
            <AuthDivider />

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="full-name" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("fullName")}
                </label>
                <div className="relative">
                  <UserRound className="absolute left-3.5 top-3.5 h-4 w-4 text-zinc-400" />
                  <Input
                    id="full-name"
                    autoComplete="name"
                    placeholder={t("fullNamePlaceholder")}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={60}
                    required
                    className="pl-10"
                  />
                </div>
              </div>

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
                <label htmlFor="password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("password")}
                </label>
                <PasswordInput
                  id="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
                <PasswordStrengthMeter password={password} />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirm-password" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {t("confirmPassword")}
                </label>
                <PasswordInput
                  id="confirm-password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  aria-invalid={passwordsMismatch}
                  className={passwordsMismatch ? "border-rose-400 focus-visible:ring-rose-400" : undefined}
                />
                {passwordsMismatch && (
                  <p className="text-[11px] text-rose-600 dark:text-rose-400">{t("passwordsDontMatch")}</p>
                )}
              </div>

              <label className="flex items-start gap-2.5 text-xs text-zinc-600 dark:text-zinc-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-brand-600"
                />
                <span>{t("agreeTerms")}</span>
              </label>

              <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 rounded-xl text-xs text-brand-800 dark:text-brand-200 flex items-start gap-2">
                <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5 text-accent-500" />
                <span>{t("privacyNote")}</span>
              </div>

              <Button type="submit" size="lg" className="w-full" disabled={loading}>
                {loading ? t("creatingAccount") : t("createAccount")}
              </Button>
            </form>
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
