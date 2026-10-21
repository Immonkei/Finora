"use client";

import * as React from "react";
import { km as kmDateLocale } from "date-fns/locale/km";
import { enUS as enDateLocale } from "date-fns/locale/en-US";
import type { Locale as DateFnsLocale } from "date-fns";
import { DEFAULT_LOCALE, LOCALE_STORAGE_KEY, isLocale, type Locale } from "./config";
import { interpolate } from "./define";
import { MESSAGES, type Namespace } from "./messages";

// The locale lives in localStorage (per device) and is shared through a tiny
// external store, so every component re-renders together when it changes.
const listeners = new Set<() => void>();
// Fallback when storage is unavailable (private mode): the choice still applies to this tab
let memoryLocale: Locale | null = null;

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // fall through to the in-memory choice
  }
  return memoryLocale ?? DEFAULT_LOCALE;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => {
    if (e.key === LOCALE_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function writeLocale(locale: Locale) {
  memoryLocale = locale;
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Storage unavailable: memoryLocale keeps the choice for this tab
  }
  listeners.forEach((listener) => listener());
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  dateLocale: DateFnsLocale;
}

const LocaleContext = React.createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  dateLocale: enDateLocale,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const locale = React.useSyncExternalStore(
    subscribe,
    readStoredLocale,
    () => DEFAULT_LOCALE
  );

  React.useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = React.useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale: writeLocale,
      dateLocale: locale === "km" ? kmDateLocale : enDateLocale,
    }),
    [locale]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return React.useContext(LocaleContext);
}

/**
 * Returns a translator for one namespace:
 *   const t = useT("today");
 *   t("title"); t("daysLeft", { count: 3 });
 */
export function useT<N extends Namespace>(namespace: N) {
  const { locale } = useLocale();
  return React.useCallback(
    (key: keyof (typeof MESSAGES)[N]["en"], values?: Record<string, string | number>) => {
      const table = MESSAGES[namespace][locale] as Record<string, string>;
      const fallback = MESSAGES[namespace].en as Record<string, string>;
      const k = key as string;
      return interpolate(table[k] ?? fallback[k] ?? k, values);
    },
    [namespace, locale]
  );
}
