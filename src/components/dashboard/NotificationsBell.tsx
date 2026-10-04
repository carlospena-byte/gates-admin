import { IconBell } from "@tabler/icons-react";
import { useState } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { navigateTo, navigateToNotification, type RouteType } from "@/config/routes";
import { useAdminAlerts } from "@/hooks/useAdminAlerts";
import { usePendingCounts } from "@/hooks/usePendingCounts";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { alertSummary, alertTitle, relativeTime } from "@/lib/notificationText";
import { cn } from "@/lib/utils";
import { canManageResidential } from "@/state/useAccess";
import type { ResidentialRole } from "@/types/database.types";

const ITEMS: { key: "payments" | "incidents" | "reservations"; labelKey: MessageKey; route: RouteType }[] = [
  { key: "payments", labelKey: "inbox.bell.payments", route: "billing" },
  { key: "incidents", labelKey: "inbox.bell.incidents", route: "incidents" },
  { key: "reservations", labelKey: "inbox.bell.reservations", route: "reservations" },
];

const RECENT = 5;

/**
 * Header bell: quick look at the latest notifications still pending action
 * plus the live count of pending work. The full inbox lives on the Notifications page.
 */
export function NotificationsBell({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const canSeeNotifications = canManageResidential(role);
  const { counts } = usePendingCounts(residentialId);
  const { alerts, unreadCount, setRead } = useAdminAlerts(residentialId, canSeeNotifications);

  const queueTotal = counts ? counts.payments + counts.incidents + counts.reservations : 0;
  const total = queueTotal + (canSeeNotifications ? unreadCount : 0);
  // Only what still needs action; resolved ones stay in the inbox page.
  const recent = alerts.filter((a) => !a.archived_at && !a.resolved_at).slice(0, RECENT);
  const unreadIds = alerts.filter((a) => !a.read_at && !a.archived_at).map((a) => a.id);
  const queues = ITEMS.filter((item) => (counts?.[item.key] ?? 0) > 0);

  const go = (action: () => void) => {
    setOpen(false);
    action();
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("inbox.bell.title")}
          className="relative flex size-11 items-center justify-center rounded-full bg-gates-surface shadow-gates-card"
        >
          <IconBell className="size-5 text-gates-text-primary" />
          {total > 0 && (
            <span className="absolute -right-0.5 -top-0.5 min-w-5 rounded-full bg-gates-error px-1.5 py-0.5 text-center text-[11px] font-semibold leading-none text-white">
              {total > 99 ? "99+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="max-h-[80vh] w-[22rem] overflow-y-auto p-0">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-sm font-semibold text-gates-text-primary">{t("notifications.page.title")}</p>
          {canSeeNotifications && unreadIds.length > 0 && (
            <button
              type="button"
              onClick={() => void setRead(unreadIds, true)}
              className="text-xs font-medium text-gates-text-brand hover:underline"
            >
              {t("notifications.markAllRead")}
            </button>
          )}
        </div>

        {canSeeNotifications && recent.length > 0 && (
          <ul className="divide-y divide-border border-y border-border">
            {recent.map((alert) => {
              const unread = !alert.read_at;
              return (
                <li key={alert.id}>
                  <button
                    type="button"
                    onClick={() => go(() => navigateToNotification(alert.id))}
                    className="flex w-full gap-3 px-4 py-3 text-left hover:bg-gates-subtle"
                  >
                    <span
                      className={cn("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-gates-error" : "bg-transparent")}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("truncate text-sm text-gates-text-primary", unread && "font-semibold")}>
                          {alertTitle(t, alert)}
                        </span>
                        <span className="shrink-0 text-xs text-gates-text-secondary">
                          {relativeTime(alert.created_at, locale)}
                        </span>
                      </span>
                      <span className="mt-0.5 line-clamp-2 text-xs text-gates-text-secondary">
                        {alertSummary(t, alert)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {canSeeNotifications && recent.length === 0 && queues.length === 0 && (
          <p className="px-4 pb-3 text-sm text-gates-text-secondary">{t("inbox.allClear")}</p>
        )}

        {queues.length > 0 && (
          <div className="p-2">
            <p className="px-2 pb-1 pt-2 text-xs font-medium uppercase tracking-tight text-gates-text-secondary">
              {t("inbox.bell.title")}
            </p>
            {queues.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => go(() => navigateTo(item.route))}
                className="flex w-full items-center rounded-xl px-2 py-2 text-left text-sm text-gates-text-primary hover:bg-gates-subtle"
              >
                {t(item.labelKey, { count: counts?.[item.key] ?? 0 })}
              </button>
            ))}
          </div>
        )}

        {!canSeeNotifications && queues.length === 0 && (
          <p className="px-4 pb-3 text-sm text-gates-text-secondary">{t("inbox.allClear")}</p>
        )}

        {canSeeNotifications && (
          <button
            type="button"
            onClick={() => go(() => navigateToNotification())}
            className="w-full border-t border-border px-4 py-3 text-center text-sm font-medium text-gates-text-brand hover:bg-gates-subtle"
          >
            {t("notifications.viewAll")}
          </button>
        )}
      </PopoverContent>
    </Popover>
  );
}
