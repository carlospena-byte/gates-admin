/**
 * Compact "recent activity" feed for the residential dashboard — the 5
 * most recent rows from the existing auditLogService (built for
 * ActivityLogManager), not a new activity system.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { auditLogService } from "@/services";
import type { AuditLogWithActor } from "@/types/audit.types";

const ACTION_LABEL: Record<AuditLogWithActor["action"], string> = {
  INSERT: "created",
  UPDATE: "updated",
  DELETE: "deleted",
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentActivityCard({ residentialId }: { residentialId: string }) {
  const [entries, setEntries] = useState<AuditLogWithActor[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    auditLogService.listByResidential(residentialId, 5).then((result) => {
      if (!isMounted) return;
      setIsLoading(false);
      if (result.success) setEntries(result.data);
    });
    return () => {
      isMounted = false;
    };
  }, [residentialId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>The last few changes across this residential</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No activity yet.</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  <span className="font-medium">{entry.profiles?.email ?? "Someone"}</span>{" "}
                  <span className="text-muted-foreground">
                    {ACTION_LABEL[entry.action]} {entry.table_name.replace(/_/g, " ")}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(entry.created_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
