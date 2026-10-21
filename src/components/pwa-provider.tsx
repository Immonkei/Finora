"use client";

import * as React from "react";
import { Download, WifiOff, RefreshCw, CloudCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import {
  flushOfflineQueue,
  subscribeOfflineQueue,
  getOfflineQueueCountSnapshot,
  getOfflineQueueServerSnapshot,
  getOfflineQueue,
} from "@/lib/offline-queue";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAContextType {
  isInstalled: boolean;
  canInstall: boolean;
  isOffline: boolean;
  queuedCount: number;
  syncQueue: () => Promise<void>;
  installApp: () => Promise<void>;
}

const PWAContext = React.createContext<PWAContextType>({
  isInstalled: false,
  canInstall: false,
  isOffline: false,
  queuedCount: 0,
  syncQueue: async () => {},
  installApp: async () => {},
});

// The queue module runs outside React, so it flushes silently and the
// translated success toast is shown here instead.
function announceSynced(
  synced: number,
  t: (key: "syncedToast" | "syncedToastDescription", values?: Record<string, number>) => string
) {
  if (synced > 0) {
    toast.success(t("syncedToast"), {
      description: t("syncedToastDescription", { count: synced }),
    });
  }
}

export function usePWA() {
  return React.useContext(PWAContext);
}

function subscribeOnline(callback: () => void) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const t = useT("pwa");
  // Latest translator for long-lived listeners, so they do not re-subscribe on language change
  const tRef = React.useRef(t);
  React.useEffect(() => {
    tRef.current = t;
  }, [t]);
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);
  const [isSyncing, setIsSyncing] = React.useState(false);

  const isOnline = React.useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );
  const isOffline = !isOnline;

  const queuedCount = React.useSyncExternalStore(
    subscribeOfflineQueue,
    getOfflineQueueCountSnapshot,
    getOfflineQueueServerSnapshot
  );

  React.useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) {
      const timer = setTimeout(() => {
        setIsInstalled(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  React.useEffect(() => {
    // Register Service Worker
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => {
            console.log("[Finora PWA] Service Worker registered:", reg.scope);
          })
          .catch((err) => {
            console.warn("[Finora PWA] SW registration failed:", err);
          });
      });
    }

    // Capture beforeinstallprompt event
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  // Auto-sync when reconnecting or on startup if online with pending queue
  React.useEffect(() => {
    const handleReconnected = () => {
      toast.info(tRef.current("connectionRestored"), {
        description: tRef.current("connectionRestoredDescription"),
      });
      setTimeout(() => {
        flushOfflineQueue(true)
          .then((res) => announceSynced(res.synced, tRef.current))
          .catch(console.error);
      }, 300);
    };

    window.addEventListener("online", handleReconnected);

    // Initial check on mount
    if (typeof navigator !== "undefined" && navigator.onLine) {
      const existing = getOfflineQueue();
      if (existing.length > 0) {
        flushOfflineQueue(true).catch(console.error);
      }
    }

    return () => {
      window.removeEventListener("online", handleReconnected);
    };
  }, []);

  const syncQueue = async () => {
    if (isOffline) {
      toast.error(t("stillOffline"), {
        description: t("stillOfflineDescription"),
      });
      return;
    }

    setIsSyncing(true);
    try {
      const res = await flushOfflineQueue(true);
      announceSynced(res.synced, t);
      if (res.total === 0) {
        toast.info(t("queueEmpty"), {
          description: t("queueEmptyDescription"),
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const installApp = async () => {
    if (!deferredPrompt) {
      toast.info(t("installOption"), {
        description: t("installOptionDescription"),
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success(t("installed"));
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } catch {
      // Ignore
    }
  };

  return (
    <PWAContext.Provider
      value={{
        isInstalled,
        canInstall: !!deferredPrompt && !isInstalled,
        isOffline,
        queuedCount,
        syncQueue,
        installApp,
      }}
    >
      {/* Offline Status Banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 sticky top-0 z-50 shadow-sm animate-in fade-in">
          <WifiOff className="h-3.5 w-3.5 shrink-0" />
          <span>
            {t("offlineBanner")}
            {queuedCount > 0 && ` ${t("offlinePending", { count: queuedCount })}`}
          </span>
        </div>
      )}

      {/* Pending Sync Banner when back online */}
      {!isOffline && queuedCount > 0 && (
        <div className="bg-brand-600 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-between gap-2 sticky top-0 z-50 shadow-sm animate-in fade-in">
          <span className="flex items-center gap-1.5 min-w-0">
            <RefreshCw className={`h-3.5 w-3.5 shrink-0 ${isSyncing ? "animate-spin" : ""}`} />
            <span>
              {t(queuedCount === 1 ? "pendingBannerOne" : "pendingBannerOther", { count: queuedCount })}
            </span>
          </span>
          <button
            onClick={syncQueue}
            disabled={isSyncing}
            className="underline font-semibold hover:text-accent-300 disabled:opacity-50 text-[11px] shrink-0 whitespace-nowrap"
          >
            {isSyncing ? t("syncing") : t("syncNow")}
          </button>
        </div>
      )}

      {children}
    </PWAContext.Provider>
  );
}

/**
 * Reusable Install App Card / Button Component
 */
export function PWAInstallCard() {
  const { isInstalled, canInstall, installApp } = usePWA();
  const t = useT("pwa");

  if (isInstalled) {
    return (
      <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 rounded-xl text-xs flex items-center justify-between text-brand-900 dark:text-brand-200">
        <span className="font-medium">{t("installedStandalone")}</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white shrink-0 whitespace-nowrap">{t("active")}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-brand-200/70 bg-gradient-to-r from-brand-50/50 to-accent-50/30 dark:border-brand-800/40 dark:from-brand-950/30 dark:to-accent-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <Download className="h-4 w-4 text-brand-600 dark:text-accent-400" /> {t("installTitle")}
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {t("installDescription")}
        </p>
      </div>
      <Button
        size="sm"
        onClick={installApp}
        className="shrink-0 gap-1.5 bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
      >
        <Download className="h-3.5 w-3.5" /> {canInstall ? t("installApp") : t("addToHomeScreen")}
      </Button>
    </div>
  );
}

/**
 * Reusable Offline Sync Status Card (Settings & Dashboard)
 */
export function OfflineQueueCard() {
  const { isOffline, queuedCount, syncQueue } = usePWA();
  const t = useT("pwa");
  const [syncing, setSyncing] = React.useState(false);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await syncQueue();
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          {queuedCount > 0 ? (
            <RefreshCw className={`h-4 w-4 text-amber-500 ${syncing ? "animate-spin" : ""}`} />
          ) : (
            <CloudCheck className="h-4 w-4 text-emerald-500" />
          )}
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {t("queueTitle")}
          </p>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              queuedCount > 0
                ? "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
            }`}
          >
            {queuedCount > 0 ? t("queuedCount", { count: queuedCount }) : t("allSynced")}
          </span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400">
          {isOffline
            ? t("queueOffline")
            : queuedCount > 0
            ? t("queuePending")
            : t("queueClear")}
        </p>
      </div>

      <Button
        variant="outline"
        size="sm"
        disabled={isOffline || syncing || queuedCount === 0}
        onClick={handleManualSync}
        className="gap-1.5 shrink-0 self-start sm:self-auto"
      >
        <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
        {syncing ? t("syncing") : t("syncNow")}
      </Button>
    </div>
  );
}
