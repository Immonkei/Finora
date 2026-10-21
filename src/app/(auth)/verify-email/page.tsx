"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Mail, MailCheck, RotateCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FinoraLogo } from "@/components/finora-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { createClient } from "@/lib/supabase/client";
import { useT } from "@/lib/i18n";
import { translateAuthError } from "../auth-i18n";
import { detectMailProvider, maskEmail } from "./mail-provider";

const RESEND_COOLDOWN_SECONDS = 60;

export default function VerifyEmailPage() {
  const router = useRouter();
  const t = useT("auth");
  // null until read on the client; "" means the page was opened without an email
  const [email, setEmail] = React.useState<string | null>(null);
  const [code, setCode] = React.useState("");
  const [verifying, setVerifying] = React.useState(false);
  const [cooldown, setCooldown] = React.useState(RESEND_COOLDOWN_SECONDS);
  const [resending, setResending] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setEmail(new URLSearchParams(window.location.search).get("email") ?? "");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Count down the resend button (sign up has just sent an email)
  React.useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  // If the link is confirmed in another tab of this browser, continue here too
  React.useEffect(() => {
    const supabase = createClient();
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user.email_confirmed_at) {
        router.replace("/today");
      }
    });
    return () => data.subscription.unsubscribe();
  }, [router]);

  const provider = email ? detectMailProvider(email) : null;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || code.length !== 6) return;
    setVerifying(true);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({ email, token: code, type: "email" });
    setVerifying(false);
    if (error) {
      toast.error(t("invalidCode"), { description: translateAuthError(t, error.message) });
      return;
    }
    toast.success(t("emailVerified"));
    router.replace("/today");
    router.refresh();
  };

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setResending(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=/today` },
    });
    setResending(false);
    if (error) {
      toast.error(t("resetFailed"), { description: translateAuthError(t, error.message) });
      return;
    }
    toast.success(t("resent"));
    setCooldown(RESEND_COOLDOWN_SECONDS);
  };

  const providerLabel =
    provider?.kind === "gmail" ? t("openGmail") : provider?.kind === "outlook" ? t("openOutlook") : t("openMailApp");

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-zinc-50/70 dark:bg-[#090E15]">
      <div className="absolute top-3 right-3">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link href="/" className="inline-block">
            <FinoraLogo variant="full" size="lg" priority />
          </Link>
        </div>

        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-[#0F1822]">
          <CardContent className="space-y-5 p-5 sm:p-6">
            <div className="flex flex-col items-center text-center gap-3">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-accent-400">
                <MailCheck className="h-7 w-7" />
              </span>
              <div className="space-y-1">
                <h1 className="text-lg font-bold text-zinc-900 dark:text-zinc-50">{t("verifyTitle")}</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {provider?.kind === "gmail" ? t("verifyTaglineGmail") : t("verifyTagline")}
                </p>
              </div>
            </div>

            {email === "" ? (
              <p className="rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                {t("missingEmail")}
              </p>
            ) : (
              <p className="text-center text-sm text-zinc-600 dark:text-zinc-300">
                {t("verifySentTo")}{" "}
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 break-all">
                  {email ? maskEmail(email) : "…"}
                </span>
              </p>
            )}

            <ol className="space-y-2 rounded-xl border border-zinc-200/80 bg-zinc-50/70 p-3.5 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-900/50 dark:text-zinc-300">
              {[t("verifyStepOpen"), t("verifyStepTap"), t("verifyStepSpam")].map((step, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>

            {provider?.url && (
              <a
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 active:scale-[0.98]"
              >
                <Mail className="h-4 w-4" />
                {providerLabel}
                <ExternalLink className="h-3.5 w-3.5 opacity-70" />
              </a>
            )}

            <form onSubmit={handleVerify} className="space-y-2">
              <label htmlFor="otp" className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                {t("enterCode")}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  id="otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder={t("codePlaceholder")}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="min-w-0 flex-1 text-center font-mono text-lg tracking-[0.4em] placeholder:font-sans placeholder:text-sm placeholder:tracking-normal"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={!email || code.length !== 6 || verifying}
                  className="w-full shrink-0 sm:w-auto"
                >
                  {verifying ? t("verifying") : t("verifyCode")}
                </Button>
              </div>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-100 pt-4 text-xs dark:border-zinc-800">
              <button
                type="button"
                onClick={handleResend}
                disabled={!email || cooldown > 0 || resending}
                className="inline-flex items-center gap-1.5 font-semibold text-brand-600 disabled:text-zinc-400 dark:text-accent-400 dark:disabled:text-zinc-600 cursor-pointer disabled:cursor-not-allowed"
              >
                <RotateCw className={resending ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} />
                {cooldown > 0 ? t("resendIn", { seconds: cooldown }) : t("resendEmail")}
              </button>
              <span className="text-zinc-500">
                {t("wrongEmail")}{" "}
                <Link href="/register" className="font-semibold text-brand-600 dark:text-accent-400">
                  {t("useDifferentEmail")}
                </Link>
              </span>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs">
          <Link href="/login" className="font-semibold text-brand-600 hover:text-brand-700 dark:text-accent-400">
            {t("backToSignIn")}
          </Link>
        </p>
      </div>
    </div>
  );
}
