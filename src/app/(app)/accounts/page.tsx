"use client";

import * as React from "react";
import { Plus, Pencil, Archive, Landmark } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatMoney, fromMinorUnits, type CurrencyCode } from "@/lib/money";
import { useT } from "@/lib/i18n";
import { useAccounts, type AccountWithBalance } from "@/features/accounts/use-accounts";
import { ACCOUNT_KIND_ICONS } from "@/features/accounts/components/account-chips";
import { archiveAccount, createAccount, updateAccount } from "@/features/accounts/actions";
import { ACCOUNT_KINDS, type AccountKind } from "@/features/accounts/schema";

const KIND_LABEL_KEYS = {
  cash: "kindCash",
  bank: "kindBank",
  ewallet: "kindEwallet",
  other: "kindOther",
} as const;

const ACCOUNT_COLORS = ["#1B4D72", "#4FA3B3", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

interface FormState {
  id: string | null;
  name: string;
  kind: AccountKind;
  currency: CurrencyCode;
  openingBalance: string;
  color: string;
}

const EMPTY_FORM: FormState = {
  id: null,
  name: "",
  kind: "cash",
  currency: "USD",
  openingBalance: "",
  color: ACCOUNT_COLORS[0],
};

export default function AccountsPage() {
  const t = useT("accounts");
  const tc = useT("common");
  const { accounts, netWorthUsd, isLoading, reload } = useAccounts();
  const [form, setForm] = React.useState<FormState | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  const openEdit = (a: AccountWithBalance) =>
    setForm({
      id: a.id,
      name: a.name,
      kind: a.kind,
      currency: a.currency,
      openingBalance: String(fromMinorUnits(a.openingBalance, a.currency)),
      color: a.color ?? ACCOUNT_COLORS[0],
    });

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    if (!form.name.trim()) {
      toast.error(t("nameRequired"));
      return;
    }
    setIsSaving(true);
    const payload = {
      name: form.name.trim(),
      kind: form.kind,
      currency: form.currency,
      opening_balance: parseFloat(form.openingBalance) || 0,
      color: form.color,
    };
    const res = form.id
      ? await updateAccount({ id: form.id, ...payload })
      : await createAccount(payload);
    setIsSaving(false);

    if (res.success) {
      toast.success(form.id ? t("saved") : t("created"));
      setForm(null);
      reload();
    } else {
      toast.error(t("saveFailed"), { description: res.error });
    }
  };

  const handleArchive = async (a: AccountWithBalance) => {
    if (!window.confirm(t("archiveConfirm", { name: a.name }))) return;
    const res = await archiveAccount({ id: a.id });
    if (res.success) {
      toast.success(t("archived"));
      setForm(null);
      reload();
    } else {
      toast.error(res.error === "LAST_ACCOUNT" ? t("lastAccount") : t("saveFailed"), {
        description: res.error === "LAST_ACCOUNT" ? undefined : res.error,
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <p className="text-xs font-semibold tracking-wider text-brand-600 dark:text-accent-400 uppercase">
            {t("eyebrow")}
          </p>
          <h1 className="text-xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
            {t("title")}
          </h1>
        </div>
        <Button onClick={() => setForm(EMPTY_FORM)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" /> {t("addAccount")}
        </Button>
      </div>

      {/* Net worth */}
      <Card className="bg-gradient-to-br from-brand-600 via-[#164366] to-[#0a1e2f] text-white border border-brand-500/30 shadow-xl shadow-brand-950/20">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <span className="text-brand-100/90 text-[11px] font-bold uppercase tracking-wider">
              {t("netWorth")}
            </span>
            <span className="text-xs text-brand-100/80 whitespace-nowrap">
              {t("accountsCount", { count: accounts.length })}
            </span>
          </div>
          <p
            className={cn(
              "mt-1.5 text-2xl sm:text-4xl font-extrabold tabular-nums tracking-tight",
              netWorthUsd < 0n && "text-rose-200"
            )}
          >
            {formatMoney(netWorthUsd, "USD")}
          </p>
          <p className="mt-1 text-xs text-brand-100/80">{t("netWorthHint")}</p>
        </CardContent>
      </Card>

      {/* Account list */}
      {isLoading ? (
        <p className="py-10 text-center text-sm text-zinc-500">{t("loading")}</p>
      ) : accounts.length === 0 ? (
        <Card className="p-10 text-center border-dashed border-zinc-200 dark:border-zinc-800">
          <div className="flex flex-col items-center gap-3">
            <span className="p-3 rounded-2xl bg-brand-50 dark:bg-brand-950/50 text-brand-600 dark:text-accent-400">
              <Landmark className="h-6 w-6" />
            </span>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{t("emptyTitle")}</h3>
            <p className="text-sm text-zinc-500 max-w-sm">{t("emptyHint")}</p>
            <Button size="sm" onClick={() => setForm(EMPTY_FORM)} className="mt-1 gap-1">
              <Plus className="h-4 w-4" /> {t("addAccount")}
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="divide-y divide-zinc-100 dark:divide-zinc-800 overflow-hidden">
          {accounts.map((a) => {
            const Icon = ACCOUNT_KIND_ICONS[a.kind];
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => openEdit(a)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-zinc-50/60 active:bg-zinc-100/60 dark:hover:bg-zinc-900/50 cursor-pointer"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: a.color ?? ACCOUNT_COLORS[0] }}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {a.name}
                  </span>
                  <span className="block text-xs text-zinc-500 dark:text-zinc-400">
                    {t(KIND_LABEL_KEYS[a.kind])} • {a.currency}
                  </span>
                </span>
                <span
                  className={cn(
                    "shrink-0 text-sm font-bold tabular-nums tracking-tight",
                    a.balance < 0n ? "text-rose-600 dark:text-rose-400" : "text-zinc-900 dark:text-zinc-100"
                  )}
                >
                  {formatMoney(a.balance, a.currency)}
                </span>
                <Pencil className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
              </button>
            );
          })}
        </Card>
      )}

      {/* Create / edit sheet */}
      {form && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
          onClick={() => setForm(null)}
        >
          <div
            role="dialog"
            aria-label={form.id ? t("editAccount") : t("newAccount")}
            onClick={(e) => e.stopPropagation()}
            className="mobile-sheet w-full max-w-md rounded-t-3xl sm:rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-2xl p-5 sm:p-6 space-y-4"
          >
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              {form.id ? t("editAccount") : t("newAccount")}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label htmlFor="account-name" className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                  {t("name")}
                </label>
                <Input
                  id="account-name"
                  placeholder={t("namePlaceholder")}
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={60}
                  required
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t("type")}</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {ACCOUNT_KINDS.map((kind) => {
                    const Icon = ACCOUNT_KIND_ICONS[kind];
                    const selected = form.kind === kind;
                    return (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => setForm({ ...form, kind })}
                        aria-pressed={selected}
                        className={cn(
                          "flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-[11px] font-semibold transition-all cursor-pointer",
                          selected
                            ? "border-brand-600 bg-brand-600 text-white"
                            : "border-zinc-200 text-zinc-600 dark:border-zinc-800 dark:text-zinc-300"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span className="w-full truncate text-center">{t(KIND_LABEL_KEYS[kind])}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-[auto_1fr] gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t("currency")}</span>
                  <div className="flex rounded-xl bg-zinc-100 p-1 dark:bg-zinc-800">
                    {(["USD", "KHR"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, currency: c })}
                        aria-pressed={form.currency === c}
                        className={cn(
                          "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                          form.currency === c
                            ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-900 dark:text-zinc-50"
                            : "text-zinc-500"
                        )}
                      >
                        {c === "USD" ? "$ USD" : "៛ KHR"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1 min-w-0">
                  <label htmlFor="account-opening" className="block truncate text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    {t("openingBalance")}
                  </label>
                  <Input
                    id="account-opening"
                    type="number"
                    inputMode="decimal"
                    step={form.currency === "USD" ? "0.01" : "100"}
                    placeholder="0"
                    value={form.openingBalance}
                    onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                  />
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-zinc-500">{t("openingBalanceHint")}</p>

              <div className="space-y-1">
                <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">{t("color")}</span>
                <div className="flex gap-2">
                  {ACCOUNT_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setForm({ ...form, color })}
                      aria-label={color}
                      aria-pressed={form.color === color}
                      className={cn(
                        "h-8 w-8 rounded-full transition-all cursor-pointer",
                        form.color === color && "ring-2 ring-offset-2 ring-brand-600 dark:ring-offset-zinc-900"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                {form.id && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const a = accounts.find((x) => x.id === form.id);
                      if (a) handleArchive(a);
                    }}
                    className="gap-1.5 text-rose-600 dark:text-rose-400"
                  >
                    <Archive className="h-4 w-4" /> {t("archive")}
                  </Button>
                )}
                <Button type="button" variant="outline" onClick={() => setForm(null)} className="flex-1">
                  {tc("cancel")}
                </Button>
                <Button type="submit" disabled={isSaving} className="flex-1">
                  {isSaving ? tc("saving") : tc("save")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
