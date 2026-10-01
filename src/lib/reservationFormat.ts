/**
 * Date/time display helpers shared by the reservations table and detail
 * sheet, so "Fecha y horario" reads the same everywhere: "27 sep 2026" on
 * its own when the booking starts and ends the same day, a date range when
 * it spans several, and a "start–end · Nh" duration line underneath.
 */

import type { Locale } from "@/i18n/messages";

function toIntlLocale(locale: Locale): string {
  return locale === "es" ? "es-ES" : "en-US";
}

export function formatReservationDateLabel(startISO: string, endISO: string, locale: Locale): string {
  const intlLocale = toIntlLocale(locale);
  const start = new Date(startISO);
  const end = new Date(endISO);
  const dateOptions: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  const startLabel = start.toLocaleDateString(intlLocale, dateOptions);

  if (start.toDateString() === end.toDateString()) return startLabel;
  return `${startLabel} – ${end.toLocaleDateString(intlLocale, dateOptions)}`;
}

export function formatReservationTimeLabel(startISO: string, endISO: string, locale: Locale): string {
  const intlLocale = toIntlLocale(locale);
  const start = new Date(startISO);
  const end = new Date(endISO);
  const timeOptions: Intl.DateTimeFormatOptions = { hour: "numeric", minute: "2-digit" };
  const hours = Math.round((end.getTime() - start.getTime()) / (60 * 60 * 1000));

  return `${start.toLocaleTimeString(intlLocale, timeOptions)}–${end.toLocaleTimeString(intlLocale, timeOptions)} · ${hours} h`;
}

/** Whether a still-pending booking's start time has already gone by. */
export function isPastPendingBooking(startISO: string, status: string): boolean {
  return status === "pending" && new Date(startISO).getTime() < Date.now();
}
