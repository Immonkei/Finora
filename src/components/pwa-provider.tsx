"use client";

import * as React from "react";
import { Download, WifiOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface PWAContextType {
  isInstalled: boolean;
  canInstall: boolean;
  isOffline: boolean;
  installApp: () => Promise<void>;
}

const PWAContext = React.createContext<PWAContextType>({
  isInstalled: false,
  canInstall: false,
  isOffline: false,
  installApp: async () => {},
});

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
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = React.useState(false);

  const isOnline = React.useSyncExternalStore(
    subscribeOnline,
    getOnlineSnapshot,
    getServerSnapshot
  );
  const isOffline = !isOnline;

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

  const installApp = async () => {
    if (!deferredPrompt) {
      toast.info("Install option", {
        description:
          "On iOS, tap the Share button and select 'Add to Home Screen'. On Android/Desktop, use browser menu 'Install App'.",
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        toast.success("Finora installed!");
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
        installApp,
      }}
    >
      {/* Offline status banner */}
      {isOffline && (
        <div className="bg-amber-600 text-white text-xs font-medium px-4 py-1.5 flex items-center justify-center gap-2 sticky top-0 z-50">
          <WifiOff className="h-3.5 w-3.5" />
          <span>You are currently offline. Running cached app shell.</span>
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

  if (isInstalled) {
    return (
      <div className="p-3 bg-brand-50/80 dark:bg-brand-950/40 border border-brand-200/50 dark:border-brand-800/40 rounded-xl text-xs flex items-center justify-between text-brand-900 dark:text-brand-200">
        <span className="font-medium">App installed as native standalone PWA</span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-600 text-white">Active</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-brand-200/70 bg-gradient-to-r from-brand-50/50 to-accent-50/30 dark:border-brand-800/40 dark:from-brand-950/30 dark:to-accent-950/20">
      <div>
        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
          <Download className="h-4 w-4 text-brand-600 dark:text-accent-400" /> Install Mobile App
        </p>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          Install Finora on your Home Screen for instant 5-second access and full offline support
        </p>
      </div>
      <Button
        size="sm"
        onClick={installApp}
        className="shrink-0 gap-1.5 bg-brand-600 hover:bg-brand-700 text-white shadow-xs"
      >
        <Download className="h-3.5 w-3.5" /> {canInstall ? "Install App" : "Add to Home Screen"}
      </Button>
    </div>
  );
}
