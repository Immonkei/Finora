"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { FinoraLogo } from "@/components/finora-logo";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { LanguageToggle } from "@/components/language-toggle";
import { useT } from "@/lib/i18n";
import { describeUnknownError, translateAuthError } from "../auth-i18n";

export default function ResetPasswordPage() {
  const t = useT("auth");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [submitted, setSubmitted] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        toast.error(t("resetFailed"), { description: translateAuthError(t, error.message) });
        setLoading(false);
        return;
      }

      setSubmitted(true);
      toast.success(t("resetSent"));
    } catch (err) {
      toast.error(t("unexpectedError"), { description: describeUnknownError(t, err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 bg-zinc-50/70 dark:bg-[#090E15]">
      <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20">
        <LanguageToggle />
      </div>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link href="/" className="inline-block transition-transform hover:scale-[1.02]">
            <FinoraLogo variant="full" size="lg" priority />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("resetTitle")}
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t("resetTagline")}
          </p>
        </div>

        <Card className="border border-zinc-200/80 dark:border-zinc-800/80 shadow-md bg-white dark:bg-[#0F1822]">
          <CardContent className="pt-6">
            {submitted ? (
              <div className="text-center space-y-3 py-4">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-accent-100 dark:bg-accent-950/60 text-accent-700 dark:text-accent-300">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <h3 className="text-base font-semibold">{t("checkInbox")}</h3>
                <p className="text-xs text-zinc-500">
                  {t("resetSentTo")} <span className="font-semibold text-zinc-800 dark:text-zinc-200">{email}</span>
                </p>
                <div className="pt-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full">
                      {t("backToSignIn")}
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                    {t("emailAddress")}
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

                <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                  {loading ? t("sending") : t("sendResetLink")}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="text-center">
          <Link
            href="/login"
            className="inline-flex items-center text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 gap-1.5 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> {t("backToSignIn")}
          </Link>
        </div>
      </div>
    </div>
  );
}
