/**
 * Keeps a screen fresh without manual "refresh" clicks: reruns `onChange`
 * (debounced) whenever one of the residential's rows changes via Supabase
 * Realtime, and as a fallback on window focus and every minute — so it still
 * works if a table isn't in the realtime publication.
 */

import { useEffect, useRef } from "react";

import { supabase } from "@/lib/supabaseClient";

const DEBOUNCE_MS = 400;
const POLL_MS = 60_000;

export function useLiveRefresh(
  residentialId: string | undefined,
  tables: readonly string[],
  onChange: () => void,
): void {
  const callbackRef = useRef(onChange);
  useEffect(() => {
    callbackRef.current = onChange;
  });
  const tablesKey = tables.join(",");

  useEffect(() => {
    if (!residentialId) return;

    let timer: ReturnType<typeof setTimeout> | undefined;
    const trigger = () => {
      clearTimeout(timer);
      timer = setTimeout(() => callbackRef.current(), DEBOUNCE_MS);
    };

    const channel = supabase?.channel(`live-${residentialId}-${tablesKey}`);
    if (channel) {
      for (const table of tablesKey.split(",")) {
        channel.on(
          "postgres_changes",
          { event: "*", schema: "public", table, filter: `residential_id=eq.${residentialId}` },
          trigger,
        );
      }
      channel.subscribe();
    }

    const onFocus = () => trigger();
    window.addEventListener("focus", onFocus);
    const interval = setInterval(trigger, POLL_MS);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      if (channel) void supabase?.removeChannel(channel);
    };
  }, [residentialId, tablesKey]);
}
