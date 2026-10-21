"use client";

import * as React from "react";
import { toast } from "sonner";
import { useT } from "@/lib/i18n";
import { QuickAddDialog } from "./quick-add-dialog";

// Must match public/sw.js
const SHARE_CACHE_NAME = "finora-share";
const SHARED_SLIP_KEY = "/__shared-slip";

async function takeSharedSlip(): Promise<File | null> {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open(SHARE_CACHE_NAME);
  const response = await cache.match(SHARED_SLIP_KEY);
  if (!response) return null;
  await cache.delete(SHARED_SLIP_KEY);
  const blob = await response.blob();
  const name = decodeURIComponent(response.headers.get("X-File-Name") ?? "slip.jpg");
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

/**
 * Opens Quick Add from outside the app:
 * - `?shared=1` after an image is shared to Finora (Web Share Target), pre-scanned
 * - `?add=1` from the home-screen "Add expense" shortcut
 */
export function ShareTargetLauncher() {
  const t = useT("txDialogs");
  const [isOpen, setIsOpen] = React.useState(false);
  const [sharedFile, setSharedFile] = React.useState<File | null>(null);

  // Read through a ref so a locale change can't re-run (and drop) the launch
  const tRef = React.useRef(t);
  React.useEffect(() => {
    tRef.current = t;
  }, [t]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shared = params.get("shared") === "1";
    const add = params.get("add") === "1";
    if (!shared && !add) return;

    // Drop the trigger params so a refresh doesn't reopen the dialog
    params.delete("shared");
    params.delete("add");
    const query = params.toString();
    window.history.replaceState(null, "", window.location.pathname + (query ? `?${query}` : ""));

    (async () => {
      const file = shared ? await takeSharedSlip().catch(() => null) : null;
      if (shared && !file) toast.error(tRef.current("sharedImageMissing"));
      setSharedFile(file);
      setIsOpen(true);
    })();
  }, []);

  return (
    <QuickAddDialog
      isOpen={isOpen}
      initialFile={sharedFile}
      onClose={() => {
        setIsOpen(false);
        setSharedFile(null);
      }}
    />
  );
}
