"use client";

import * as React from "react";
import { Banknote, Building2, Smartphone, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AccountKind } from "../schema";
import type { AccountWithBalance } from "../use-accounts";

export const ACCOUNT_KIND_ICONS: Record<AccountKind, typeof Wallet> = {
  cash: Banknote,
  bank: Building2,
  ewallet: Smartphone,
  other: Wallet,
};

/** Horizontally scrolling single-select row of accounts (thumb friendly). */
export function AccountChips({
  label,
  accounts,
  value,
  onChange,
  disabledId,
}: {
  label: string;
  accounts: AccountWithBalance[];
  value: string | null;
  onChange: (id: string) => void;
  /** e.g. the source account when picking a transfer destination */
  disabledId?: string | null;
}) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
        {label}
      </span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar min-w-0">
        {accounts.map((a) => {
          const Icon = ACCOUNT_KIND_ICONS[a.kind];
          const selected = a.id === value;
          const disabled = a.id === disabledId;
          return (
            <button
              key={a.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(a.id)}
              aria-pressed={selected}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer active:scale-95 disabled:opacity-35 disabled:cursor-not-allowed",
                selected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-zinc-200 bg-white text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
              )}
            >
              <Icon
                className="h-3.5 w-3.5"
                style={!selected && a.color ? { color: a.color } : undefined}
              />
              <span className="max-w-[9rem] truncate">{a.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
