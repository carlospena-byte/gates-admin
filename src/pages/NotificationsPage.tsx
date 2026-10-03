/**
 * Notifications — the admin's inbox. Works like a mailbox: a list on the
 * left (unread in bold with a dot), a reading pane on the right, and
 * read/unread + archive actions. Opening a message marks it read. A message
 * can be deep-linked as "#notifications/<id>" (the bell does this).
 */

import { IconArchive, IconArrowLeft, IconArrowBackUp, IconMail, IconMailOpened } from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { VoidBookingPaymentDialog } from "@/components/notifications/VoidBookingPaymentDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/LoadingStates";
import { getNotificationIdFromHash, navigateToNotification } from "@/config/routes";
import { useAdminAlerts } from "@/hooks/useAdminAlerts";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { alertNextSteps, alertSummary, alertTitle, relativeTime } from "@/lib/notificationText";
import { cn, formatCurrency } from "@/lib/utils";
import { authService, type AdminAlert } from "@/services";
import { useSession } from "@/state/useSession";
import type { ResidentialRole } from "@/types/database.types";

type Tab = "inbox" | "unread" | "archived";
const TABS: Tab[] = ["inbox", "unread", "archived"];

function matchesTab(alert: AdminAlert, tab: Tab): boolean {
  if (tab === "archived") return Boolean(alert.archived_at);
  if (alert.archived_at) return false;
  return tab === "unread" ? !alert.read_at : true;
}

export function NotificationsPage({ residentialId, role }: { residentialId: string; role: ResidentialRole }) {
  const { t, locale } = useI18n();
  const { session } = useSession();
  const { alerts, isLoading, unreadCount, setRead, setArchived, refetch } = useAdminAlerts(residentialId);
  const [voidTarget, setVoidTarget] = useState<AdminAlert | null>(null);
  const [tab, setTab] = useState<Tab>("inbox");
  const [selectedId, setSelectedId] = useState<string | null>(getNotificationIdFromHash);

  useEffect(() => {
    const onHash = () => setSelectedId(getNotificationIdFromHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const selected = useMemo(() => alerts.find((a) => a.id === selectedId) ?? null, [alerts, selectedId]);
  const visible = useMemo(() => alerts.filter((a) => matchesTab(a, tab)), [alerts, tab]);

  // Opening a message reads it, like a mailbox.
  const selectedUnread = selected !== null && !selected.read_at;
  useEffect(() => {
    if (selected && selectedUnread) void setRead([selected.id], true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected?.id, selectedUnread]);

  const counts: Record<Tab, number> = {
    inbox: alerts.filter((a) => matchesTab(a, "inbox")).length,
    unread: unreadCount,
    archived: alerts.filter((a) => matchesTab(a, "archived")).length,
  };

  const unreadIds = alerts.filter((a) => !a.read_at && !a.archived_at).map((a) => a.id);

  return (
    <div className="min-h-screen">
      <AppSidebar userEmail={session?.user?.email} residentialId={residentialId} role={role} onSignOut={() => authService.signOut()} showUserMenu />

      <div className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col gap-3 space-y-0 border-b border-border sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>{t("notifications.page.title")}</CardTitle>
                <CardDescription>{t("notifications.page.description")}</CardDescription>
              </div>
              <Button variant="outline" disabled={unreadIds.length === 0} onClick={() => void setRead(unreadIds, true)}>
                <IconMailOpened className="mr-2 h-4 w-4" />
                {t("notifications.markAllRead")}
              </Button>
            </CardHeader>

            <div className="grid min-h-[560px] lg:grid-cols-[380px_1fr]">
              {/* List */}
              <div className={cn("flex flex-col border-border lg:border-r", selected && "hidden lg:flex")}>
                <div className="flex gap-1 border-b border-border p-2">
                  {TABS.map((key) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTab(key)}
                      className={cn(
                        "flex-1 rounded-lg px-3 py-1.5 text-sm font-medium",
                        tab === key ? "bg-gates-subtle text-gates-text-primary" : "text-gates-text-secondary hover:bg-gates-subtle",
                      )}
                    >
                      {t(`notifications.tab.${key}` as MessageKey)}
                      {counts[key] > 0 && <span className="ml-1.5 text-xs text-gates-text-secondary">{counts[key]}</span>}
                    </button>
                  ))}
                </div>

                {isLoading ? (
                  <div className="flex flex-1 items-center justify-center p-8">
                    <Spinner />
                  </div>
                ) : visible.length === 0 ? (
                  <p className="p-8 text-center text-sm text-gates-text-secondary">
                    {t(`notifications.empty.${tab}` as MessageKey)}
                  </p>
                ) : (
                  <ul className="flex-1 divide-y divide-border overflow-y-auto">
                    {visible.map((alert) => {
                      const unread = !alert.read_at;
                      return (
                        <li key={alert.id}>
                          <button
                            type="button"
                            onClick={() => navigateToNotification(alert.id)}
                            className={cn(
                              "flex w-full gap-3 px-4 py-3 text-left hover:bg-gates-subtle",
                              selectedId === alert.id && "bg-gates-subtle",
                            )}
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
                              <span className="mt-0.5 line-clamp-2 text-sm text-gates-text-secondary">
                                {alertSummary(t, alert)}
                              </span>
                              {alert.resolved_at && (
                                <Badge variant="success" className="mt-1.5">
                                  {t("notifications.status.resolved")}
                                </Badge>
                              )}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              {/* Reading pane */}
              <div className={cn("flex flex-col", !selected && "hidden lg:flex")}>
                {selected ? (
                  <ReadingPane
                    alert={selected}
                    onBack={() => navigateToNotification()}
                    onVoid={() => setVoidTarget(selected)}
                    onToggleRead={() => void setRead([selected.id], !selected.read_at)}
                    onToggleArchive={() => {
                      const archive = !selected.archived_at;
                      void setArchived([selected.id], archive);
                      if (archive) navigateToNotification();
                    }}
                  />
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-gates-text-secondary">
                    <IconMail className="h-10 w-10 opacity-40" />
                    <p className="text-sm">{t("notifications.empty.select")}</p>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      <VoidBookingPaymentDialog
        alert={voidTarget}
        onOpenChange={(open) => !open && setVoidTarget(null)}
        onVoided={() => {
          void refetch();
          window.dispatchEvent(new Event("admin-alerts-changed"));
        }}
      />
    </div>
  );
}

function ReadingPane({
  alert,
  onBack,
  onVoid,
  onToggleRead,
  onToggleArchive,
}: {
  alert: AdminAlert;
  onBack: () => void;
  onVoid: () => void;
  onToggleRead: () => void;
  onToggleArchive: () => void;
}) {
  const { t, locale } = useI18n();
  const { details } = alert;
  const nextSteps = alert.resolved_at ? null : alertNextSteps(t, alert);
  const fields: [MessageKey, string | null | undefined][] = [
    ["notifications.field.resident", details.resident],
    ["notifications.field.unit", details.unit],
    ["notifications.field.amenity", details.amenity],
    ["notifications.field.booking", details.booking_start],
  ];

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Button variant="ghost" size="sm" className="lg:hidden" onClick={onBack}>
          <IconArrowLeft className="mr-1 h-4 w-4" />
          {t("notifications.back")}
        </Button>
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={onToggleRead}>
          {alert.read_at ? <IconMail className="mr-1.5 h-4 w-4" /> : <IconMailOpened className="mr-1.5 h-4 w-4" />}
          {alert.read_at ? t("notifications.markUnread") : t("notifications.markRead")}
        </Button>
        <Button variant="ghost" size="sm" onClick={onToggleArchive}>
          {alert.archived_at ? <IconArrowBackUp className="mr-1.5 h-4 w-4" /> : <IconArchive className="mr-1.5 h-4 w-4" />}
          {alert.archived_at ? t("notifications.unarchive") : t("notifications.archive")}
        </Button>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-medium text-gates-text-primary">{alertTitle(t, alert)}</h2>
            <Badge variant={alert.resolved_at ? "success" : "warning"}>
              {alert.resolved_at ? t("notifications.status.resolved") : t("notifications.status.pending")}
            </Badge>
          </div>
          <p className="text-sm text-gates-text-secondary">
            {new Date(alert.created_at).toLocaleString(locale, { dateStyle: "long", timeStyle: "short" })}
          </p>
          <p className="pt-1 text-base text-gates-text-primary">{alertSummary(t, alert)}</p>
        </div>

        {alert.kind === "booking_cancelled_paid" && (
          <>
            <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 rounded-xl border border-border p-4 text-sm">
              {fields.map(([label, value]) => (
                <div key={label} className="contents">
                  <dt className="text-gates-text-secondary">{t(label)}</dt>
                  <dd className="text-gates-text-primary">{value ?? "—"}</dd>
                </div>
              ))}
            </dl>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gates-text-primary">{t("notifications.payments")}</p>
              <div className="divide-y divide-border rounded-xl border border-border text-sm">
                {(details.payments ?? []).map((payment) => (
                  <div key={payment.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                    <span className="font-medium text-gates-text-primary">{formatCurrency(payment.amount)}</span>
                    <span className="text-gates-text-secondary">
                      {[
                        payment.method ? t(`billing.method.${payment.method}` as MessageKey) : null,
                        payment.reference ? `ref. ${payment.reference}` : null,
                        payment.paid_on,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between bg-gates-subtle p-3 font-medium">
                  <span>{t("notifications.paidTotal")}</span>
                  <span>{formatCurrency(details.paid_total ?? 0)}</span>
                </div>
              </div>
            </div>
          </>
        )}

        {nextSteps && (
          <div className="space-y-1 rounded-xl bg-gates-subtle p-4 text-sm">
            <p className="font-medium text-gates-text-primary">{t("notifications.next")}</p>
            <p className="text-gates-text-secondary">{nextSteps}</p>
          </div>
        )}

        {alert.resolution_note && (
          <div className="space-y-1 rounded-xl bg-gates-success-bg p-4 text-sm">
            <p className="font-medium text-gates-text-brand">{t("notifications.void.resolvedNote")}</p>
            <p className="whitespace-pre-line text-gates-text-primary">{alert.resolution_note}</p>
          </div>
        )}

        {alert.kind === "booking_cancelled_paid" && !alert.resolved_at && (
          <div>
            <Button variant="destructive" onClick={onVoid}>
              {t("notifications.void.button")}
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
