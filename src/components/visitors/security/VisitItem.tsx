/**
 * One visit for the guard view. A single-column card on phones; from `md` up
 * the same markup becomes a wide row with person / unit & time / action
 * clearly separated. The info area is one button (opens details) and the
 * entry/exit action is its sibling, so the two never nest.
 */

import { IconChevronRight, IconClock, IconFileAlert, IconFileCheck, IconLogin2, IconLogout2 } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { useI18n } from "@/i18n/useI18n";
import { cn } from "@/lib/utils";
import { displayVisitType } from "@/lib/standingVisit";
import { VISIT_TYPE_LABEL_KEYS } from "../visitorLabels";
import { hasDocument, isClosedVisit } from "./securityVisits";
import { useVisitWhen } from "./useVisitWhen";
import type { VisitorWithInviter } from "@/types/visitor.types";

export function DocStatus({ ready, className }: { ready: boolean; className?: string }) {
  const { t } = useI18n();
  const Icon = ready ? IconFileCheck : IconFileAlert;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm font-medium",
        ready ? "text-gates-success" : "text-gates-warning",
        className,
      )}
    >
      <Icon className="size-4 shrink-0" aria-hidden />
      {t(ready ? "security.visits.doc.ready" : "security.visits.doc.missing")}
    </span>
  );
}

interface VisitItemProps {
  visitor: VisitorWithInviter;
  unit: { name: string; place: string } | null;
  selected: boolean;
  busy: boolean;
  canCheckInOut: boolean;
  onOpen: () => void;
  onEnter: () => void;
  onExit: () => void;
}

export function VisitItem({ visitor, unit, selected, busy, canCheckInOut, onOpen, onEnter, onExit }: VisitItemProps) {
  const { t } = useI18n();
  const when = useVisitWhen();
  const inside = visitor.status === "inside";
  const closed = isClosedVisit(visitor);
  const name = visitor.name ?? t("visitors.table.pendingRegistration");

  return (
    <article
      className={cn(
        "flex flex-col gap-3 rounded-gates-md border bg-gates-surface p-4 shadow-gates-card transition-colors md:flex-row md:items-center md:gap-5",
        selected ? "border-gates-brand ring-1 ring-gates-brand" : "border-gates-border",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${t("security.visits.detail.title")}: ${name}`}
        aria-current={selected || undefined}
        className="group flex min-h-11 min-w-0 flex-1 items-start gap-2 rounded-gates-sm text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <div className="grid min-w-0 flex-1 gap-3 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] md:gap-5">
          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className={cn("break-words text-base font-semibold leading-snug text-gates-text-primary", !visitor.name && "italic text-gates-text-secondary")}>
                {name}
              </h3>
              <StatusBadge tone={inside ? "success" : "info"} hideDot>
                {t(VISIT_TYPE_LABEL_KEYS[displayVisitType(visitor)])}
              </StatusBadge>
            </div>
            {visitor.plate && (
              <p className="text-sm text-gates-text-secondary">
                {t("visitors.table.plate")} <span className="font-semibold tracking-wide text-gates-text-primary">{visitor.plate}</span>
              </p>
            )}
            <DocStatus ready={hasDocument(visitor)} />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="text-base font-semibold text-gates-text-primary">
              {unit ? t("security.visits.unit", { name: unit.name }) : "—"}
            </p>
            {unit?.place && <p className="text-sm text-gates-text-secondary">{unit.place}</p>}
            <p className="flex items-start gap-1.5 text-sm text-gates-text-secondary">
              <IconClock className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span className="min-w-0 break-words">{when(visitor)}</span>
            </p>
          </div>
        </div>
        <IconChevronRight className="mt-1 hidden size-5 shrink-0 text-gates-text-secondary group-hover:text-gates-text-brand md:block" aria-hidden />
      </button>

      {canCheckInOut && !closed && (
        <div className="md:w-48 md:shrink-0">
          {inside ? (
            <Button className="w-full" size="lg" disabled={busy} onClick={onExit}>
              <IconLogout2 aria-hidden />
              {t("security.visits.exit")}
            </Button>
          ) : (
            <Button className="w-full border-gates-brand text-gates-text-brand" size="lg" variant="outline" disabled={busy} onClick={onEnter}>
              <IconLogin2 aria-hidden />
              {t("security.visits.enter")}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}
