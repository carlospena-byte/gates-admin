/** Detail content for one visit — shown in a bottom sheet (phone), side sheet or inline side panel (tablet). */

import { IconCamera, IconId, IconLogin2, IconLogout2, IconUpload } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import { inviterName } from "@/lib/inviter";
import { displayVisitType } from "@/lib/standingVisit";
import type { ResidentialRole } from "@/types/database.types";
import type { VisitorWithInviter } from "@/types/visitor.types";
import { VISIT_TYPE_LABEL_KEYS } from "../visitorLabels";
import { DocStatus } from "./VisitItem";
import { useVisitWhen } from "./useVisitWhen";
import { hasDocument, isClosedVisit } from "./securityVisits";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5">
      <dt className="text-xs font-medium uppercase tracking-tight text-gates-text-secondary">{label}</dt>
      <dd className="break-words text-base text-gates-text-primary">{children}</dd>
    </div>
  );
}

interface VisitDetailProps {
  visitor: VisitorWithInviter;
  unit: { name: string; place: string } | null;
  inviterRole?: ResidentialRole;
  busy: boolean;
  canCheckInOut: boolean;
  onEnter: () => void;
  onExit: () => void;
  onPickPhoto: (source: "camera" | "file") => void;
  onViewPhoto: () => void;
}

export function VisitDetail({ visitor, unit, inviterRole, busy, canCheckInOut, onEnter, onExit, onPickPhoto, onViewPhoto }: VisitDetailProps) {
  const { t } = useI18n();
  const when = useVisitWhen();
  const inviter = inviterName(visitor);
  const inside = visitor.status === "inside";
  const actionable = canCheckInOut && !isClosedVisit(visitor);

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h2 className="break-words text-xl font-semibold text-gates-text-primary">
          {visitor.name ?? t("visitors.table.pendingRegistration")}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone="info" hideDot>{t(VISIT_TYPE_LABEL_KEYS[displayVisitType(visitor)])}</StatusBadge>
          {inside && <StatusBadge tone="success">{t("security.visits.inside.badge")}</StatusBadge>}
        </div>
      </div>

      {actionable && (
        inside ? (
          <Button className="w-full" size="lg" disabled={busy} onClick={onExit}>
            <IconLogout2 aria-hidden />
            {t("security.visits.exit")}
          </Button>
        ) : (
          <Button className="w-full" size="lg" disabled={busy} onClick={onEnter}>
            <IconLogin2 aria-hidden />
            {t("security.visits.enter")}
          </Button>
        )
      )}

      <dl className="grid gap-4 rounded-gates-md border border-gates-border bg-gates-surface p-4 sm:grid-cols-2 lg:grid-cols-1">
        <Field label={t("common.unit")}>{unit ? t("security.visits.unit", { name: unit.name }) : "—"}</Field>
        {unit?.place && <Field label={t("security.visits.detail.location")}>{unit.place}</Field>}
        <Field label={t("security.visits.detail.access")}>{when(visitor)}</Field>
        <Field label={t("visitors.table.invitedBy")}>
          {inviter ?? "—"}
          {inviter && inviterRole && <span className="block text-sm text-gates-text-secondary">{t(`role.${inviterRole}` as MessageKey)}</span>}
        </Field>
        {visitor.plate && <Field label={t("visitors.table.plate")}>{visitor.plate}</Field>}
        {visitor.phone && <Field label={t("security.visits.detail.phone")}>{visitor.phone}</Field>}
        {visitor.access_code && <Field label={t("security.visits.detail.code")}>{visitor.access_code}</Field>}
        {visitor.notes && <Field label={t("security.visits.detail.notes")}>{visitor.notes}</Field>}
      </dl>

      <section className="space-y-3 rounded-gates-md border border-gates-border bg-gates-surface p-4">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-gates-text-primary">{t("security.visits.detail.documents")}</h3>
          <DocStatus ready={hasDocument(visitor)} />
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          {hasDocument(visitor) && (
            <Button variant="secondary" onClick={onViewPhoto} className="w-full">
              <IconId aria-hidden />
              {t("visitors.idPhoto.view")}
            </Button>
          )}
          {!isClosedVisit(visitor) && canCheckInOut && (
            <>
              <Button variant="outline" disabled={busy} onClick={() => onPickPhoto("camera")} className="w-full">
                <IconCamera aria-hidden />
                {t("visitors.idPhoto.takePhoto")}
              </Button>
              <Button variant="outline" disabled={busy} onClick={() => onPickPhoto("file")} className="w-full">
                <IconUpload aria-hidden />
                {hasDocument(visitor) ? t("visitors.idPhoto.replace") : t("visitors.idPhoto.upload")}
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
