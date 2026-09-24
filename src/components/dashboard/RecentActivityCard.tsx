/**
 * Compact "recent activity" feed for the residential dashboard — the 5
 * most recent rows from the existing auditLogService (built for
 * ActivityLogManager), not a new activity system.
 */

import { useEffect, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/LoadingStates";
import { auditLogService } from "@/services";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import type { AuditLogWithActor } from "@/types/audit.types";

const ACTION_LABEL_KEYS: Record<AuditLogWithActor["action"], MessageKey> = {
  INSERT: "dashboard.recentActivity.action.created",
  UPDATE: "dashboard.recentActivity.action.updated",
  DELETE: "dashboard.recentActivity.action.deleted",
};

function timeAgo(iso: string, t: (key: MessageKey, vars?: Record<string, string | number>) => string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return t("dashboard.recentActivity.timeAgo.justNow");
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return t("dashboard.recentActivity.timeAgo.minutes", { count: minutes });
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return t("dashboard.recentActivity.timeAgo.hours", { count: hours });
  return t("dashboard.recentActivity.timeAgo.days", { count: Math.floor(hours / 24) });
}

export function RecentActivityCard({
  residentialId,
  onViewAll,
}: {
  residentialId: string;
  onViewAll: () => void;
}) {
  const { t } = useI18n();
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
    <div className="flex flex-col gap-4 rounded-gates-lg bg-gates-surface p-6 shadow-gates-card">
      <div className="flex items-center gap-4">
        <p className="text-xl font-semibold text-gates-text-primary">{t("dashboard.recentActivity.title")}</p>
        <div className="flex-1" />
        <p className="text-xs text-gates-text-secondary">{t("dashboard.recentActivity.latest")}</p>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gates-text-secondary">{t("dashboard.recentActivity.empty")}</p>
      ) : (
        entries.map((entry) => {
          const actorName = entry.profiles?.email ?? t("dashboard.recentActivity.someone");
          return (
            <div key={entry.id} className="flex items-center gap-3">
              <Avatar name={actorName} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-gates-text-primary">
                  {t(ACTION_LABEL_KEYS[entry.action])} {entry.table_name.replace(/_/g, " ")}
                </p>
                <p className="truncate text-xs text-gates-text-secondary">
                  {actorName} · {timeAgo(entry.created_at, t)}
                </p>
              </div>
            </div>
          );
        })
      )}
      <button
        type="button"
        className="text-left text-sm font-semibold text-gates-text-brand"
        onClick={onViewAll}
      >
        {t("dashboard.recentActivity.viewAll")} →
      </button>
    </div>
  );
}
