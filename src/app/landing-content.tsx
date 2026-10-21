"use client";

import Link from "next/link";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Clock,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FinoraLogo } from "@/components/finora-logo";
import { LanguageToggle } from "@/components/language-toggle";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

export function LandingContent() {
  const t = useT("landing");
  const { locale } = useLocale();
  const isKm = locale === "km";

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50/70 dark:bg-[#090E15] text-zinc-900 dark:text-zinc-50 selection:bg-accent-500/20 selection:text-brand-900">
      {/* Top Navigation */}
      <header className="border-b border-zinc-200/80 dark:border-zinc-800/80 bg-white/80 dark:bg-[#0F1822]/80 backdrop-blur-md sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center">
              <FinoraLogo variant="full" size="md" priority />
            </Link>
            <Badge variant="outline" className="hidden sm:inline-flex text-[10px] border-accent-500/30 text-accent-700 dark:text-accent-300">
              {t("versionBadge")}
            </Badge>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3">
            <LanguageToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm">
                {t("signIn")}
              </Button>
            </Link>
            <Link href="/today">
              <Button size="sm" className="shadow-xs shadow-brand-500/20">
                {t("openApp")} <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 sm:py-24 max-w-4xl mx-auto">
        <Badge
          variant="secondary"
          className="mb-6 px-3 py-1 text-xs gap-1.5 border border-brand-200/50 bg-brand-50/70 text-brand-700 dark:bg-brand-950/40 dark:text-brand-200 dark:border-brand-800/40"
        >
          <Sparkles className="h-3.5 w-3.5 text-accent-500" />
          {t("heroBadge")}
        </Badge>

        <h1
          className={cn(
            "font-extrabold text-zinc-900 dark:text-zinc-50 max-w-3xl",
            isKm
              ? "text-3xl sm:text-5xl leading-[1.5]"
              : "text-4xl sm:text-6xl tracking-tight leading-[1.12]"
          )}
        >
          {t("heroTitle")}{" "}
          <span className="text-brand-600 dark:text-accent-400">
            {t("heroTitleAccent")}
          </span>
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
          {t("heroSubtitle")}
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link href="/register" className="w-full sm:w-auto">
            <Button size="lg" className="w-full sm:w-auto gap-2 shadow-lg shadow-brand-600/20 px-8 text-base font-semibold">
              {t("getStarted")} <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login" className="w-full sm:w-auto">
            <Button variant="outline" size="lg" className="w-full sm:w-auto px-6">
              {t("signInToAccount")}
            </Button>
          </Link>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full text-left">
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F1822] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-2.5 transition-all hover:border-brand-200 dark:hover:border-brand-800/60">
            <div className="h-10 w-10 rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-950/50 dark:text-brand-300 flex items-center justify-center">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              {t("featureQuickAddTitle")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {t("featureQuickAddBody")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F1822] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-2.5 transition-all hover:border-accent-200 dark:hover:border-accent-800/60">
            <div className="h-10 w-10 rounded-xl bg-accent-50 text-accent-600 dark:bg-accent-950/50 dark:text-accent-300 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              {t("featureAllowanceTitle")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {t("featureAllowanceBody")}
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-white dark:bg-[#0F1822] border border-zinc-200/80 dark:border-zinc-800/80 shadow-xs space-y-2.5 transition-all hover:border-brand-200 dark:hover:border-brand-800/60">
            <div className="h-10 w-10 rounded-xl bg-zinc-100 text-brand-700 dark:bg-zinc-800 dark:text-brand-200 flex items-center justify-center">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
              {t("featurePrivacyTitle")}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              {t("featurePrivacyBody")}
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200/80 dark:border-zinc-800/80 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <FinoraLogo variant="full" size="xs" />
          <p>{t("footerTagline", { year: 2026 })}</p>
        </div>
      </footer>
    </div>
  );
}
