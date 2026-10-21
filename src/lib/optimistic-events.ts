import type { CurrencyCode } from "./money";

export interface OptimisticTransactionPayload {
  id: string;
  note: string;
  category: string;
  categoryColor: string;
  account: string;
  amountMinor: bigint;
  currency: CurrencyCode;
  type: "expense" | "income" | "transfer";
  rawDate: string;
  time: string;
  receiptUrl?: string | null;
}

const EVENT_TX_CREATED = "finora:tx-created";
const EVENT_TX_UPDATED = "finora:tx-updated";
const EVENT_TX_DELETED = "finora:tx-deleted";

export function emitOptimisticTxCreated(tx: OptimisticTransactionPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_TX_CREATED, { detail: tx }));
}

export function subscribeOptimisticTxCreated(callback: (tx: OptimisticTransactionPayload) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<OptimisticTransactionPayload>;
    if (custom.detail) callback(custom.detail);
  };
  window.addEventListener(EVENT_TX_CREATED, handler);
  return () => window.removeEventListener(EVENT_TX_CREATED, handler);
}

export function emitOptimisticTxUpdated(tx: Partial<OptimisticTransactionPayload> & { id: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_TX_UPDATED, { detail: tx }));
}

export function subscribeOptimisticTxUpdated(callback: (tx: Partial<OptimisticTransactionPayload> & { id: string }) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<Partial<OptimisticTransactionPayload> & { id: string }>;
    if (custom.detail) callback(custom.detail);
  };
  window.addEventListener(EVENT_TX_UPDATED, handler);
  return () => window.removeEventListener(EVENT_TX_UPDATED, handler);
}

export function emitOptimisticTxDeleted(id: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(EVENT_TX_DELETED, { detail: { id } }));
}

export function subscribeOptimisticTxDeleted(callback: (id: string) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ id: string }>;
    if (custom.detail?.id) callback(custom.detail.id);
  };
  window.addEventListener(EVENT_TX_DELETED, handler);
  return () => window.removeEventListener(EVENT_TX_DELETED, handler);
}
