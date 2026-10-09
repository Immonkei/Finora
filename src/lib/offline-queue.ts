import { toast } from "sonner";
import { createTransaction } from "@/features/transactions/actions";

export interface QueuedTransaction {
  id: string;
  type: "expense" | "income" | "transfer";
  amount: number;
  currency: "USD" | "KHR";
  account_id?: string;
  category_id?: string;
  note?: string;
  occurred_at: string;
  queued_at: string;
  retry_count?: number;
}

export const QUEUE_STORAGE_KEY = "finora_offline_tx_queue";
export const QUEUE_CHANGED_EVENT = "finora-offline-queue-changed";
export const QUEUE_SYNCED_EVENT = "finora-offline-synced";

/**
 * Returns all currently queued transactions stored in localStorage.
 */
export function getOfflineQueue(): QueuedTransaction[] {
  if (typeof window === "undefined" || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(QUEUE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error("[Finora Offline] Error reading queue:", e);
    return [];
  }
}

/**
 * Saves queued transactions array to localStorage and dispatches change event.
 */
function saveQueue(queue: QueuedTransaction[]) {
  if (typeof window === "undefined" || !window.localStorage) return;
  try {
    window.localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event(QUEUE_CHANGED_EVENT));
  } catch (e) {
    console.error("[Finora Offline] Error saving queue:", e);
  }
}

/**
 * Enqueues a transaction locally when offline or when network request fails.
 */
export function enqueueOfflineTransaction(
  item: Omit<QueuedTransaction, "id" | "queued_at">
): QueuedTransaction {
  const queuedTx: QueuedTransaction = {
    ...item,
    id:
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `offline-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    queued_at: new Date().toISOString(),
    retry_count: 0,
  };

  const queue = getOfflineQueue();
  queue.push(queuedTx);
  saveQueue(queue);

  return queuedTx;
}

/**
 * Removes a specific transaction from the offline queue.
 */
export function removeOfflineTransaction(id: string): void {
  const queue = getOfflineQueue().filter((item) => item.id !== id);
  saveQueue(queue);
}

/**
 * Clears all pending transactions from the offline queue.
 */
export function clearOfflineQueue(): void {
  saveQueue([]);
}

let isFlushing = false;

/**
 * Flushes all pending transactions to the server sequentially.
 */
export async function flushOfflineQueue(silent = false): Promise<{
  total: number;
  synced: number;
  failed: number;
}> {
  if (typeof window === "undefined") {
    return { total: 0, synced: 0, failed: 0 };
  }

  if (isFlushing) {
    return { total: 0, synced: 0, failed: 0 };
  }

  if (!navigator.onLine) {
    return { total: getOfflineQueue().length, synced: 0, failed: 0 };
  }

  const queue = getOfflineQueue();
  if (queue.length === 0) {
    return { total: 0, synced: 0, failed: 0 };
  }

  isFlushing = true;
  let synced = 0;
  let failed = 0;

  try {
    for (const item of [...queue]) {
      // If client loses connection mid-sync, abort cleanly
      if (!navigator.onLine) {
        break;
      }

      try {
        const res = await createTransaction({
          type: item.type,
          amount: item.amount,
          currency: item.currency,
          account_id: item.account_id || "00000000-0000-0000-0000-000000000001",
          category_id: item.category_id,
          note: item.note,
          occurred_at: item.occurred_at,
        });

        if (res.success) {
          removeOfflineTransaction(item.id);
          synced++;
        } else {
          failed++;
          const current = getOfflineQueue();
          const found = current.find((q) => q.id === item.id);
          if (found) {
            found.retry_count = (found.retry_count || 0) + 1;
            saveQueue(current);
          }
        }
      } catch {
        // Network or fetch error interrupted execution
        failed++;
        break;
      }
    }
  } finally {
    isFlushing = false;
  }

  if (synced > 0) {
    window.dispatchEvent(
      new CustomEvent(QUEUE_SYNCED_EVENT, { detail: { syncedCount: synced } })
    );
    if (!silent) {
      toast.success("Offline transactions synced!", {
        description: `Successfully uploaded ${synced} queued transaction${
          synced === 1 ? "" : "s"
        } to your cloud database.`,
      });
    }
  }

  return { total: queue.length, synced, failed };
}

/**
 * Subscription helper for React useSyncExternalStore
 */
export function subscribeOfflineQueue(callback: () => void): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener(QUEUE_CHANGED_EVENT, callback);
  window.addEventListener(QUEUE_SYNCED_EVENT, callback);
  window.addEventListener("storage", callback);

  return () => {
    window.removeEventListener(QUEUE_CHANGED_EVENT, callback);
    window.removeEventListener(QUEUE_SYNCED_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getOfflineQueueCountSnapshot(): number {
  return getOfflineQueue().length;
}

export function getOfflineQueueServerSnapshot(): number {
  return 0;
}
