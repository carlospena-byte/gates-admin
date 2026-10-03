import { useCallback, useEffect, useMemo, useState } from "react";

import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { inboxService, type AdminAlert } from "@/services";

const LIVE_TABLES = ["admin_alerts"] as const;

// The bell (header) and the inbox page each run this hook; a change made in
// one has to reach the other right away, without waiting for realtime.
const CHANGED_EVENT = "admin-alerts-changed";

/**
 * The admin's notification inbox: every alert for the residential, with
 * mailbox-style read / archive actions (optimistic, refetched on failure) and
 * live refresh.
 */
export function useAdminAlerts(residentialId: string | undefined, enabled = true) {
  const [alerts, setAlerts] = useState<AdminAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!residentialId) return;
    const result = await inboxService.listAdminAlerts(residentialId);
    if (result.success) setAlerts(result.data);
    setIsLoading(false);
  }, [residentialId]);

  useEffect(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  useLiveRefresh(enabled ? residentialId : undefined, LIVE_TABLES, refetch);

  useEffect(() => {
    if (!enabled) return;
    const onChanged = () => void refetch();
    window.addEventListener(CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(CHANGED_EVENT, onChanged);
  }, [enabled, refetch]);

  const patch = useCallback(
    async (ids: string[], change: Partial<AdminAlert>, save: () => Promise<{ success: boolean }>) => {
      if (ids.length === 0) return;
      setAlerts((prev) => prev.map((a) => (ids.includes(a.id) ? { ...a, ...change } : a)));
      const result = await save();
      if (!result.success) void refetch();
      else window.dispatchEvent(new Event(CHANGED_EVENT));
    },
    [refetch],
  );

  const setRead = useCallback(
    (ids: string[], read: boolean) =>
      patch(ids, { read_at: read ? new Date().toISOString() : null }, () =>
        inboxService.setAdminAlertsRead(ids, read),
      ),
    [patch],
  );

  const setArchived = useCallback(
    (ids: string[], archived: boolean) =>
      patch(
        ids,
        archived
          ? { archived_at: new Date().toISOString(), read_at: new Date().toISOString() }
          : { archived_at: null },
        () => inboxService.setAdminAlertsArchived(ids, archived),
      ),
    [patch],
  );

  const unreadCount = useMemo(() => alerts.filter((a) => !a.read_at && !a.archived_at).length, [alerts]);

  return { alerts, isLoading, unreadCount, setRead, setArchived, refetch };
}
