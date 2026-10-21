import { DEFAULT_USD_TO_KHR_RATE, type CurrencyCode } from "@/lib/money";

export interface BalanceAccount {
  id: string;
  currency: CurrencyCode;
  /** Starting balance in the account's own minor units */
  openingBalance: bigint;
}

export interface BalanceTransaction {
  type: "expense" | "income" | "transfer";
  /** Amount in the transaction's own currency minor units */
  amount: bigint;
  currency: CurrencyCode;
  accountId: string;
  toAccountId: string | null;
}

/**
 * Converts minor units between USD (cents) and KHR (riel) with integer math.
 * `rate` is riel per US dollar.
 */
export function convertMinor(
  amount: bigint,
  from: CurrencyCode,
  to: CurrencyCode,
  rate: number = DEFAULT_USD_TO_KHR_RATE
): bigint {
  if (from === to) return amount;
  const r = BigInt(Math.round(rate));
  // cents -> riel: * rate / 100 ; riel -> cents: * 100 / rate (rounded half up)
  if (from === "USD") return (amount * r) / 100n;
  return (amount * 100n + r / 2n) / r;
}

/**
 * Current balance of every account, in that account's currency:
 * opening + income - expenses - transfers out + transfers in.
 * Soft-deleted transactions must be filtered out by the caller.
 */
export function computeAccountBalances(
  accounts: BalanceAccount[],
  transactions: BalanceTransaction[],
  rate: number = DEFAULT_USD_TO_KHR_RATE
): Map<string, bigint> {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const balances = new Map(accounts.map((a) => [a.id, a.openingBalance]));

  const apply = (accountId: string | null, tx: BalanceTransaction, sign: 1n | -1n) => {
    const account = accountId ? byId.get(accountId) : undefined;
    if (!account) return;
    const delta = convertMinor(tx.amount, tx.currency, account.currency, rate) * sign;
    balances.set(account.id, (balances.get(account.id) ?? 0n) + delta);
  };

  for (const tx of transactions) {
    if (tx.type === "income") apply(tx.accountId, tx, 1n);
    else if (tx.type === "expense") apply(tx.accountId, tx, -1n);
    else {
      apply(tx.accountId, tx, -1n);
      apply(tx.toAccountId, tx, 1n);
    }
  }
  return balances;
}

/** Sum of all balances expressed in one currency (e.g. net worth in USD). */
export function totalInCurrency(
  accounts: BalanceAccount[],
  balances: Map<string, bigint>,
  currency: CurrencyCode,
  rate: number = DEFAULT_USD_TO_KHR_RATE
): bigint {
  return accounts.reduce(
    (sum, a) => sum + convertMinor(balances.get(a.id) ?? 0n, a.currency, currency, rate),
    0n
  );
}
