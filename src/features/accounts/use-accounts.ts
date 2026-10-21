"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeTable } from "@/lib/supabase/realtime";
import type { CurrencyCode } from "@/lib/money";
import { computeAccountBalances, totalInCurrency, type BalanceTransaction } from "./balances";
import type { AccountKind } from "./schema";

export interface AccountWithBalance {
  id: string;
  name: string;
  kind: AccountKind;
  currency: CurrencyCode;
  color: string | null;
  openingBalance: bigint;
  balance: bigint;
}

const PAGE_SIZE = 1000; // Supabase caps a single select at 1000 rows

/**
 * Loads the signed-in user's active accounts with live balances.
 * Balances are recomputed from transactions whenever either table changes.
 */
export function useAccounts({
  withBalances = true,
  enabled = true,
}: {
  withBalances?: boolean;
  /** Skip loading and realtime until needed (e.g. while a dialog is closed) */
  enabled?: boolean;
} = {}) {
  const [accounts, setAccounts] = React.useState<AccountWithBalance[]>([]);
  const [netWorthUsd, setNetWorthUsd] = React.useState(0n);
  const [isLoading, setIsLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rows } = await supabase
        .from("accounts")
        .select("id, name, kind, currency, color, opening_balance, created_at")
        .eq("user_id", user.id)
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      const base = (rows ?? []).map((a) => ({
        id: a.id,
        name: a.name,
        kind: (a.kind ?? "cash") as AccountKind,
        currency: (a.currency === "KHR" ? "KHR" : "USD") as CurrencyCode,
        color: a.color ?? null,
        openingBalance: BigInt(a.opening_balance ?? 0),
      }));

      let txs: BalanceTransaction[] = [];
      if (withBalances && base.length > 0) {
        for (let from = 0; ; from += PAGE_SIZE) {
          const { data: page } = await supabase
            .from("transactions")
            .select("type, amount, currency, account_id, to_account_id")
            .eq("user_id", user.id)
            .is("deleted_at", null)
            .range(from, from + PAGE_SIZE - 1);
          if (!page) break;
          txs = txs.concat(
            page.map((t) => ({
              type: t.type as BalanceTransaction["type"],
              amount: BigInt(t.amount),
              currency: (t.currency === "KHR" ? "KHR" : "USD") as CurrencyCode,
              accountId: t.account_id,
              toAccountId: t.to_account_id,
            }))
          );
          if (page.length < PAGE_SIZE) break;
        }
      }

      const balances = computeAccountBalances(base, txs);
      setAccounts(base.map((a) => ({ ...a, balance: balances.get(a.id) ?? a.openingBalance })));
      setNetWorthUsd(totalInCurrency(base, balances, "USD"));
    } catch {
      // Offline or Supabase not configured: keep the last known list
    } finally {
      setIsLoading(false);
    }
  }, [withBalances]);

  React.useEffect(() => {
    if (!enabled) return;
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load, enabled]);

  useRealtimeTable({ table: "accounts", onUpdate: load, enabled });
  useRealtimeTable({ table: "transactions", onUpdate: load, enabled: enabled && withBalances });

  return { accounts, netWorthUsd, isLoading, reload: load };
}
