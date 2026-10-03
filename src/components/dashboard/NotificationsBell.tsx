import { IconBell } from "@tabler/icons-react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { navigateTo, type RouteType } from "@/config/routes";
import { usePendingCounts } from "@/hooks/usePendingCounts";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";

const ITEMS: { key: "payments" | "incidents" | "reservations"; labelKey: MessageKey; route: RouteType }[] = [
  { key: "payments", labelKey: "inbox.bell.payments", route: "billing" },
  { key: "incidents", labelKey: "inbox.bell.incidents", route: "incidents" },
  { key: "reservations", labelKey: "inbox.bell.reservations", route: "reservations" },
];

/** Header bell: live count of pending work with a jump to each queue. */
export function NotificationsBell({ residentialId }: { residentialId: string }) {
  const { t } = useI18n();
  const { counts } = usePendingCounts(residentialId);
  const total = counts ? counts.payments + counts.incidents + counts.reservations : 0;

  return (
    <Popover>
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
      <PopoverContent align="end" className="w-72 p-2">
        <p className="px-3 py-2 text-sm font-semibold text-gates-text-primary">{t("inbox.bell.title")}</p>
        {total === 0 ? (
          <p className="px-3 pb-3 text-sm text-gates-text-secondary">{t("inbox.allClear")}</p>
        ) : (
          ITEMS.filter((item) => (counts?.[item.key] ?? 0) > 0).map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => navigateTo(item.route)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm hover:bg-gates-subtle"
            >
              <span className="flex-1 text-gates-text-primary">{t(item.labelKey, { count: counts?.[item.key] ?? 0 })}</span>
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}
