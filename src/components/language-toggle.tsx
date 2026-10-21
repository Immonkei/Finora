"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale, useT } from "@/lib/i18n";

interface LanguageToggleProps {
  className?: string;
}

/** Cambodia Flag Vector */
function CambodiaFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={cn(
        "h-3.5 w-5 shrink-0 rounded-[2px] shadow-xs overflow-hidden ring-1 ring-black/10 dark:ring-white/10",
        className
      )}
      aria-hidden="true"
    >
      <rect width="24" height="4" fill="#032ea6" />
      <rect y="4" width="24" height="8" fill="#e00025" />
      <rect y="12" width="24" height="4" fill="#032ea6" />
      {/* Angkor Wat Base */}
      <rect x="7" y="9.6" width="10" height="1.4" rx="0.3" fill="#ffffff" />
      <rect x="8.5" y="8.2" width="7" height="1.4" rx="0.3" fill="#ffffff" />
      {/* Towers */}
      <path d="M 12 5.2 L 13.3 8.2 L 10.7 8.2 Z" fill="#ffffff" />
      <path d="M 9.7 6.2 L 10.7 8.2 L 8.7 8.2 Z" fill="#ffffff" />
      <path d="M 14.3 6.2 L 15.3 8.2 L 13.3 8.2 Z" fill="#ffffff" />
      {/* Central Portal */}
      <path d="M 11.5 11 L 11.5 9.9 Q 12 9.6 12.5 9.9 L 12.5 11 Z" fill="#e00025" />
    </svg>
  );
}

/** US Flag Vector */
function UsFlag({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={cn(
        "h-3.5 w-5 shrink-0 rounded-[2px] shadow-xs overflow-hidden ring-1 ring-black/10 dark:ring-white/10",
        className
      )}
      aria-hidden="true"
    >
      <rect width="24" height="16" fill="#b22234" />
      <path
        d="M0 1.23h24v1.23H0z M0 3.69h24v1.23H0z M0 6.15h24v1.23H0z M0 8.61h24v1.23H0z M0 11.07h24v1.23H0z M0 13.53h24v1.23H0z"
        fill="#ffffff"
      />
      <rect width="10" height="8.6" fill="#1b4d72" />
      {/* Stylized White Stars */}
      <circle cx="2.2" cy="2.2" r="0.65" fill="#ffffff" />
      <circle cx="5" cy="2.2" r="0.65" fill="#ffffff" />
      <circle cx="7.8" cy="2.2" r="0.65" fill="#ffffff" />
      <circle cx="3.6" cy="4.3" r="0.65" fill="#ffffff" />
      <circle cx="6.4" cy="4.3" r="0.65" fill="#ffffff" />
      <circle cx="2.2" cy="6.4" r="0.65" fill="#ffffff" />
      <circle cx="5" cy="6.4" r="0.65" fill="#ffffff" />
      <circle cx="7.8" cy="6.4" r="0.65" fill="#ffffff" />
    </svg>
  );
}

const LANGUAGES = [
  {
    code: "en" as const,
    label: "English",
    short: "EN",
    Flag: UsFlag,
  },
  {
    code: "km" as const,
    label: "ភាសាខ្មែរ",
    short: "ខ្មែរ",
    Flag: CambodiaFlag,
  },
] as const;

/**
 * Modern compact language dropdown trigger showing the current flag.
 * Clicking opens a sleek floating dropdown to pick between English and Khmer.
 */
export function LanguageToggle({ className }: LanguageToggleProps) {
  const { locale, setLocale } = useLocale();
  const t = useT("nav");
  const [isOpen, setIsOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find((l) => l.code === locale) || LANGUAGES[0];
  const CurrentFlag = currentLang.Flag;

  // Close when clicking outside or pressing Escape
  React.useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`${t("switchLanguage")}: ${currentLang.label}`}
        title={`${t("switchLanguage")}: ${currentLang.label}`}
        className={cn(
          "flex items-center gap-1.5 h-8 px-2.5 rounded-full bg-white/95 dark:bg-[#0F1822]/90 border border-zinc-200/90 dark:border-zinc-700/80 shadow-xs hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all text-xs font-semibold cursor-pointer select-none active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40 dark:focus-visible:ring-accent-400/40",
          isOpen && "ring-2 ring-brand-500/30 dark:ring-accent-400/30 bg-zinc-100 dark:bg-zinc-800",
          className
        )}
      >
        <CurrentFlag />
        <span className="font-bold tracking-tight text-zinc-800 dark:text-zinc-100">{currentLang.short}</span>
        <ChevronDown
          className={cn(
            "h-3 w-3 text-zinc-400 transition-transform duration-200",
            isOpen && "rotate-180 text-zinc-700 dark:text-zinc-200"
          )}
        />
      </button>

      {isOpen && (
        <div
          role="listbox"
          aria-label={t("switchLanguage")}
          className="absolute right-0 top-full mt-1.5 w-38 p-1 rounded-2xl bg-white/95 dark:bg-[#0F1822]/95 border border-zinc-200/90 dark:border-zinc-800 shadow-xl backdrop-blur-md z-50 animate-in fade-in zoom-in-95 duration-150 space-y-0.5"
        >
          {LANGUAGES.map((lang) => {
            const isSelected = locale === lang.code;
            const FlagComponent = lang.Flag;
            return (
              <button
                key={lang.code}
                type="button"
                role="option"
                aria-selected={isSelected}
                lang={lang.code}
                onClick={() => {
                  setLocale(lang.code);
                  setIsOpen(false);
                }}
                className={cn(
                  "flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer text-left",
                  isSelected
                    ? "bg-zinc-100/90 dark:bg-zinc-800/90 text-brand-700 dark:text-accent-400 font-bold"
                    : "text-zinc-600 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FlagComponent />
                  <span className="truncate">{lang.label}</span>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-brand-600 dark:text-accent-400 shrink-0 ml-1.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
