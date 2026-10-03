/** Shared wording for admin notifications (inbox page and bell). */

import type { MessageKey } from "@/i18n/messages";
import type { AdminAlert } from "@/services";

type Translate = (key: MessageKey, params?: Record<string, string | number>) => string;

const TITLE_BY_KIND: Record<string, MessageKey> = {
  booking_cancelled_paid: "notifications.title.bookingCancelledPaid",
};

const NEXT_STEPS_BY_KIND: Record<string, MessageKey> = {
  booking_cancelled_paid: "notifications.next.bookingCancelledPaid",
};

export function alertTitle(t: Translate, alert: AdminAlert): string {
  const key = TITLE_BY_KIND[alert.kind];
  return key ? t(key) : alert.title;
}

export function alertNextSteps(t: Translate, alert: AdminAlert): string | null {
  const key = NEXT_STEPS_BY_KIND[alert.kind];
  return key ? t(key) : null;
}

/** One line: who did what. Falls back to the stored body for unknown kinds. */
export function alertSummary(t: Translate, alert: AdminAlert): string {
  if (alert.kind !== "booking_cancelled_paid") return alert.body;
  return t("inbox.alert.summary", {
    resident: alert.details.resident ?? "—",
    unit: alert.details.unit ?? t("inbox.alert.noUnit"),
    amenity: alert.details.amenity ?? "—",
    when: alert.details.booking_start ?? "—",
  });
}

/** "3 min ago" / "hace 3 min", falling back to the date after a week. */
export function relativeTime(iso: string, locale: string): string {
  const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
  const abs = Math.abs(seconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(seconds / 1), "second");
  if (abs < 3600) return rtf.format(Math.round(seconds / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(seconds / 3600), "hour");
  if (abs < 7 * 86400) return rtf.format(Math.round(seconds / 86400), "day");
  return new Date(iso).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
}
