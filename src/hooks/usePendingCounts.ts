import { useCallback, useEffect, useState } from "react";

import { inboxService, type PendingCounts } from "@/services";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";

const LIVE_TABLES = ["unit_rental_payments", "incidents", "amenity_bookings", "admin_alerts"] as const;

/** Pending-work counts for sidebar badges and the bell; refreshes live. */
export function usePendingCounts(residentialId: string | undefined, enabled = true) {
  const [counts, setCounts] = useState<PendingCounts | null>(null);

  const refetch = useCallback(async () => {
    if (!residentialId) return;
    const result = await inboxService.getPendingCounts(residentialId);
    if (result.success) setCounts(result.data);
  }, [residentialId]);

  useEffect(() => {
    if (enabled) void refetch();
  }, [enabled, refetch]);

  useLiveRefresh(enabled ? residentialId : undefined, LIVE_TABLES, refetch);

  return { counts, refetch };
}
