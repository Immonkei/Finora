"use client";

import * as React from "react";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_LABELS, useLocale, useT } from "@/lib/i18n";

interface LanguageToggleProps {
  className?: string;
}

/**
 * Modern segmented switch for bilingual toggle (English <-> Khmer).
 * Features a tactile pill design, high-contrast active indicator,
 * accessible radiogroup semantics, and smooth micro-interactions.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale, setLocale } = useLocale();
  const t = useT("nav");

  const toggle = () => {
    setLocale(locale === "en" ? "km" : "en");
  };

  return (
    <div
      role="radiogroup"
      aria-label={t("switchLanguage")}
      className={cn(
        "relative inline-flex items-center gap-0.5 rounded-full p-1 bg-zinc-200/60 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-700/60 shadow-xs backdrop-blur-xs select-none transition-colors",
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="pl-1.5 pr-0.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
        aria-label={t("switchLanguage")}
        title={t("switchLanguage")}
      >
        <Globe className="h-3.5 w-3.5" />
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={locale === "en"}
        onClick={() => setLocale("en")}
        lang="en"
        title={LOCALE_LABELS.en.native}
        className={cn(
          "relative z-10 flex h-7 items-center justify-center rounded-full px-2.5 text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:focus-visible:ring-accent-400/40",
          locale === "en"
            ? "bg-white dark:bg-zinc-900 text-brand-700 dark:text-accent-400 font-bold shadow-xs border border-zinc-200/70 dark:border-zinc-700/80"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40"
        )}
      >
        EN
      </button>

      <button
        type="button"
        role="radio"
        aria-checked={locale === "km"}
        onClick={() => setLocale("km")}
        lang="km"
        title={LOCALE_LABELS.km.native}
        className={cn(
          "relative z-10 flex h-7 items-center justify-center rounded-full px-2.5 text-xs font-semibold transition-all duration-200 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:focus-visible:ring-accent-400/40",
          locale === "km"
            ? "bg-white dark:bg-zinc-900 text-brand-700 dark:text-accent-400 font-bold shadow-xs border border-zinc-200/70 dark:border-zinc-700/80"
            : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-200/50 dark:hover:bg-zinc-700/40"
        )}
      >
        ខ្មែរ
      </button>
    </div>
  );
}
