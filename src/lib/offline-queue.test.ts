import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// Mock localStorage for Node test environment
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => mockStorage[key] ?? null,
  setItem: (key: string, val: string) => {
    mockStorage[key] = val;
  },
  removeItem: (key: string) => {
    delete mockStorage[key];
  },
  clear: () => {
    for (const key in mockStorage) {
      delete mockStorage[key];
    }
  },
};

// Polyfill window and global objects for node test
const listeners: Record<string, Array<() => void>> = {};
const windowMock = {
  localStorage: localStorageMock,
  addEventListener: (event: string, cb: () => void) => {
    if (!listeners[event]) listeners[event] = [];
    listeners[event].push(cb);
  },
  removeEventListener: (event: string, cb: () => void) => {
    if (listeners[event]) {
      listeners[event] = listeners[event].filter((f) => f !== cb);
    }
  },
  dispatchEvent: (event: Event) => {
    const handlers = listeners[event.type] || [];
    handlers.forEach((h) => h());
    return true;
  },
};

const navigatorMock = {
  onLine: true,
};

vi.stubGlobal("window", windowMock);
vi.stubGlobal("localStorage", localStorageMock);
vi.stubGlobal("navigator", navigatorMock);
vi.stubGlobal("Event", class {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
});
vi.stubGlobal("CustomEvent", class {
  type: string;
  detail: unknown;
  constructor(type: string, opts?: { detail?: unknown }) {
    this.type = type;
    this.detail = opts?.detail;
  }
});

// Mock createTransaction action
vi.mock("@/features/transactions/actions", () => ({
  createTransaction: vi.fn().mockImplementation(async () => {
    return { success: true, data: { id: "tx-mock-123" } };
  }),
}));

// Mock sonner toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

import {
  enqueueOfflineTransaction,
  getOfflineQueue,
  removeOfflineTransaction,
  clearOfflineQueue,
  flushOfflineQueue,
  QUEUE_STORAGE_KEY,
} from "./offline-queue";

describe("Offline Transaction Sync Queue", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    navigatorMock.onLine = true;
  });

  afterEach(() => {
    localStorageMock.clear();
  });

  it("enqueues a transaction into localStorage", () => {
    const item = enqueueOfflineTransaction({
      type: "expense",
      amount: 4.5,
      currency: "USD",
      note: "Iced latte",
      occurred_at: new Date().toISOString(),
    });

    expect(item.id).toBeDefined();
    expect(item.amount).toBe(4.5);
    expect(item.currency).toBe("USD");

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item.id);
    expect(queue[0].note).toBe("Iced latte");
  });

  it("removes a specific transaction by id", () => {
    const item1 = enqueueOfflineTransaction({
      type: "expense",
      amount: 10,
      currency: "USD",
      occurred_at: new Date().toISOString(),
    });
    const item2 = enqueueOfflineTransaction({
      type: "income",
      amount: 50,
      currency: "USD",
      occurred_at: new Date().toISOString(),
    });

    expect(getOfflineQueue().length).toBe(2);

    removeOfflineTransaction(item1.id);

    const queue = getOfflineQueue();
    expect(queue.length).toBe(1);
    expect(queue[0].id).toBe(item2.id);
  });

  it("clears the entire offline queue", () => {
    enqueueOfflineTransaction({
      type: "expense",
      amount: 15,
      currency: "USD",
      occurred_at: new Date().toISOString(),
    });
    enqueueOfflineTransaction({
      type: "expense",
      amount: 25,
      currency: "USD",
      occurred_at: new Date().toISOString(),
    });

    expect(getOfflineQueue().length).toBe(2);
    clearOfflineQueue();
    expect(getOfflineQueue().length).toBe(0);
    expect(localStorageMock.getItem(QUEUE_STORAGE_KEY)).toBe("[]");
  });

  it("does not flush queue when offline", async () => {
    navigatorMock.onLine = false;

    enqueueOfflineTransaction({
      type: "expense",
      amount: 12,
      currency: "USD",
      occurred_at: new Date().toISOString(),
    });

    const result = await flushOfflineQueue(true);
    expect(result.synced).toBe(0);
    expect(getOfflineQueue().length).toBe(1);
  });

  it("successfully flushes queue when online", async () => {
    navigatorMock.onLine = true;

    enqueueOfflineTransaction({
      type: "expense",
      amount: 3.5,
      currency: "USD",
      note: "Espresso",
      occurred_at: new Date().toISOString(),
    });

    const result = await flushOfflineQueue(true);
    expect(result.synced).toBe(1);
    expect(getOfflineQueue().length).toBe(0);
  });
});
