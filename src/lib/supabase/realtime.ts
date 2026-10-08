"use client";

import * as React from "react";
import { createClient } from "./client";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface UseRealtimeTableOptions<T extends Record<string, unknown> = Record<string, unknown>> {
  table: string;
  schema?: string;
  event?: "INSERT" | "UPDATE" | "DELETE" | "*";
  onPayload?: (payload: RealtimePostgresChangesPayload<T>) => void;
  onUpdate?: () => void;
  enabled?: boolean;
}

/**
 * Reusable hook to subscribe to Supabase Realtime changes on Postgres tables.
 * Auto-manages channel subscription and cleanup.
 */
export function useRealtimeTable<T extends Record<string, unknown> = Record<string, unknown>>({
  table,
  schema = "public",
  event = "*",
  onPayload,
  onUpdate,
  enabled = true,
}: UseRealtimeTableOptions<T>) {
  const onPayloadRef = React.useRef(onPayload);
  const onUpdateRef = React.useRef(onUpdate);

  React.useEffect(() => {
    onPayloadRef.current = onPayload;
    onUpdateRef.current = onUpdate;
  });

  React.useEffect(() => {
    if (!enabled) return;

    try {
      const supabase = createClient();
      const channelName = `rt-${table}-${Math.random().toString(36).substring(2, 9)}`;

      const channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes" as never,
          {
            event,
            schema,
            table,
          },
          (payload: RealtimePostgresChangesPayload<T>) => {
            onPayloadRef.current?.(payload);
            onUpdateRef.current?.();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    } catch {
      // Ignore if socket unsupported
    }
  }, [table, schema, event, enabled]);
}
