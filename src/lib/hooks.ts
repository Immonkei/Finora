import * as React from "react";

const emptySubscribe = () => () => {};

/**
 * Returns true once mounted on client side.
 * Uses useSyncExternalStore to prevent SSR hydration mismatches and avoid cascading render warnings.
 */
export function useMounted(): boolean {
  return React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}
