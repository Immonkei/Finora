"use client";

import * as React from "react";
import { Languages } from "lucide-react";
import { cn } from "@/lib/utils";
import { LOCALE_LABELS, useLocale, useT } from "@/lib/i18n";

/** Compact header control: flips between English and Khmer in one tap. */
export function LanguageToggle({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const t = useT("nav");
  const next = locale === "en" ? "km" : "en";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      className={cn(
        "flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 cursor-pointer",
        className
      )}
      aria-label={`${t("switchLanguage")}: ${LOCALE_LABELS[next].native}`}
      title={LOCALE_LABELS[next].native}
    >
      <Languages className="h-4 w-4" />
      <span>{locale === "en" ? "ខ្មែរ" : "EN"}</span>
    </button>
  );
}
