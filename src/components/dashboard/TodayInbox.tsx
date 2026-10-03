import { useEffect, useState, type ReactNode } from "react";
import { IconCircleCheck } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { navigateTo } from "@/config/routes";
import { useTodayInbox } from "@/hooks/useTodayInbox";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { cn, formatCurrency } from "@/lib/utils";
import { canManageResidential } from "@/state/useAccess";
import type { ResidentialRole } from "@/types/database.types";

type InboxTab = "payments" | "incidents" | "reservations" | "inside";

const TABS: { id: InboxTab; labelKey: MessageKey }[] = [
  { id: "payments", labelKey: "inbox.tab.payments" },
  { id: "incidents", labelKey: "inbox.tab.incidents" },
  { id: "reservations", labelKey: "inbox.tab.reservations" },
  { id: "inside", labelKey: "inbox.tab.inside" },
];

function Row({ title, subtitle, actions }: { title: string; subtitle?: string; actions: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-gates-canvas px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gates-text-primary">{title}</p>
        {subtitle && <p className="truncate text-xs text-gates-text-secondary">{subtitle}</p>}
      </div>
      <div className="flex shrink-0 flex-wrap gap-2">{actions}</div>
    </div>
  );
}

/**
 * "Today" — everything that needs the admin, with the action on the row so
 * approving a payment or resolving an incident is one click, no navigation.
 */
export function TodayInbox({
  residentialId,
  role,
  currentUserId,
}: {
  residentialId: string;
  role: ResidentialRole;
  currentUserId?: string;
}) {
  const { t, locale } = useI18n();
  const canManage = canManageResidential(role);
  const canOperate = canManage || role === "security";
  const inbox = useTodayInbox(residentialId, currentUserId, true);
  const [tab, setTab] = useState<InboxTab | null>(null);

  const counts: Record<InboxTab, number> = {
    payments: inbox.payments.length,
    incidents: inbox.incidents.length,
    reservations: inbox.reservations.length,
    inside: inbox.inside.length,
  };
  const attentionTabs = TABS.filter((entry) => entry.id !== "inside");
  const totalAttention = attentionTabs.reduce((sum, entry) => sum + counts[entry.id], 0);

  // Land on the first tab that has work; keep the user's choice afterwards.
  const firstWithWork = TABS.find((entry) => counts[entry.id] > 0)?.id ?? "payments";
  useEffect(() => {
    if (!inbox.isLoading && tab === null) setTab(firstWithWork);
  }, [inbox.isLoading, tab, firstWithWork]);
  const activeTab = tab ?? firstWithWork;

  const dateFormat = (iso: string) =>
    new Date(iso).toLocaleString(locale === "es" ? "es-ES" : "en-US", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  const askReason = (promptKey: MessageKey): string | null => window.prompt(t(promptKey));

  const renderEmpty = (key: MessageKey) => (
    <div className="flex items-center gap-3 rounded-2xl bg-gates-canvas px-4 py-6 text-sm text-gates-text-secondary">
      <IconCircleCheck className="size-5 text-gates-text-brand" />
      {t(key)}
    </div>
  );

  return (
    <Card className="flex flex-col gap-4 p-4 sm:p-6">
      <div>
        <CardTitle>{t("inbox.title")}</CardTitle>
        <CardDescription className="mt-1.5">
          {totalAttention === 0 ? t("inbox.allClear") : t("inbox.pendingSummary", { count: totalAttention })}
        </CardDescription>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setTab(value as typeof activeTab)}>
        <TabsList>
          {TABS.map((entry) => (
            <TabsTrigger key={entry.id} value={entry.id}>
              {t(entry.labelKey)}
              <span
                className={cn(
                  "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[11px] leading-none",
                  activeTab === entry.id ? "bg-gates-subtle" : "bg-gates-surface",
                )}
              >
                {counts[entry.id]}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-2">
        {activeTab === "payments" &&
          (inbox.payments.length === 0
            ? renderEmpty("inbox.empty.payments")
            : inbox.payments.map((payment) => (
                <Row
                  key={payment.id}
                  title={`${payment.unitName ?? "—"} · ${formatCurrency(payment.amount)}`}
                  subtitle={[payment.tenantName, t("inbox.payment.due", { date: payment.due_date })]
                    .filter(Boolean)
                    .join(" · ")}
                  actions={
                    <>
                      {payment.proof_url && (
                        <Button size="sm" variant="outline" onClick={() => void inbox.viewProof(payment.proof_url as string)}>
                          {t("inbox.payment.viewProof")}
                        </Button>
                      )}
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={inbox.busyId === payment.id}
                            onClick={() => {
                              const reason = askReason("inbox.rejectReason");
                              if (reason !== null) void inbox.rejectPayment(payment.id, t("inbox.payment.rejected"), reason);
                            }}
                          >
                            {t("inbox.reject")}
                          </Button>
                          <Button
                            size="sm"
                            disabled={inbox.busyId === payment.id}
                            onClick={() => void inbox.approvePayment(payment.id, t("inbox.payment.approved"))}
                          >
                            {t("inbox.approve")}
                          </Button>
                        </>
                      )}
                    </>
                  }
                />
              )))}

        {activeTab === "incidents" &&
          (inbox.incidents.length === 0
            ? renderEmpty("inbox.empty.incidents")
            : inbox.incidents.map((incident) => (
                <Row
                  key={incident.id}
                  title={incident.title}
                  subtitle={[
                    incident.units?.name,
                    t(`incidents.priority.${incident.priority}` as MessageKey),
                    incident.status === "new" ? t("incidents.status.new") : t("incidents.status.inProgress"),
                    dateFormat(incident.created_at),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  actions={
                    <>
                      <Button size="sm" variant="ghost" onClick={() => navigateTo("incidents")}>
                        {t("inbox.open")}
                      </Button>
                      {canOperate && incident.status === "new" && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={inbox.busyId === incident.id}
                          onClick={() => void inbox.takeIncident(incident.id, t("inbox.incident.taken"))}
                        >
                          {t("inbox.incident.take")}
                        </Button>
                      )}
                      {canOperate && (
                        <Button
                          size="sm"
                          disabled={inbox.busyId === incident.id}
                          onClick={() => void inbox.resolveIncident(incident.id, t("inbox.incident.resolved"))}
                        >
                          {t("inbox.incident.resolve")}
                        </Button>
                      )}
                    </>
                  }
                />
              )))}

        {activeTab === "reservations" &&
          (inbox.reservations.length === 0
            ? renderEmpty("inbox.empty.reservations")
            : inbox.reservations.map((booking) => (
                <Row
                  key={booking.id}
                  title={`${inbox.amenityNames[booking.amenity_id] ?? "—"}${
                    booking.unit_id && inbox.unitNames[booking.unit_id] ? ` · ${inbox.unitNames[booking.unit_id]}` : ""
                  }`}
                  subtitle={`${dateFormat(booking.start_time)} → ${dateFormat(booking.end_time)}`}
                  actions={
                    canManage ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={inbox.busyId === booking.id}
                          onClick={() => {
                            const reason = askReason("inbox.rejectReason");
                            if (reason !== null) void inbox.declineReservation(booking.id, t("inbox.reservation.declined"), reason);
                          }}
                        >
                          {t("inbox.reject")}
                        </Button>
                        <Button
                          size="sm"
                          disabled={inbox.busyId === booking.id}
                          onClick={() => void inbox.confirmReservation(booking.id, t("inbox.reservation.confirmed"))}
                        >
                          {t("inbox.approve")}
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => navigateTo("reservations")}>
                        {t("inbox.open")}
                      </Button>
                    )
                  }
                />
              )))}

        {activeTab === "inside" &&
          (inbox.inside.length === 0
            ? renderEmpty("inbox.empty.inside")
            : inbox.inside.map((visitor) => (
                <Row
                  key={visitor.id}
                  title={visitor.name ?? visitor.plate ?? visitor.phone ?? "—"}
                  subtitle={[
                    visitor.unit_id ? inbox.unitNames[visitor.unit_id] : null,
                    visitor.plate,
                    t("inbox.inside.until", { date: dateFormat(visitor.valid_until) }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                  actions={
                    canOperate ? (
                      <Button
                        size="sm"
                        disabled={inbox.busyId === visitor.id}
                        onClick={() => void inbox.checkOutVisitor(visitor.id, t("inbox.inside.checkedOut"))}
                      >
                        {t("inbox.inside.checkOut")}
                      </Button>
                    ) : null
                  }
                />
              )))}
      </div>
    </Card>
  );
}
