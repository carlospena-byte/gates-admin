/**
 * Visitor list table — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as UnitTable. Check-in/Check-out actions swap
 * based on status; both are visible to owner/admin and security alike
 * (RLS is the real gate — see the visitors_security migration).
 */

import { useRef, useState } from "react";
import { toast } from "sonner";
import { IconCamera, IconId } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { visitorService } from "@/services";
import { ImageViewerDialog } from "@/components/ui/image-viewer-dialog";
import { STATUS_LABEL_KEYS, VISIT_TYPE_LABEL_KEYS } from "./visitorLabels";
import { inviterName } from "@/lib/inviter";
import type { ResidentialRole } from "@/types/database.types";
import { displayVisitType, isStandingFrequent } from "@/lib/standingVisit";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import type { Locale, MessageKey } from "@/i18n/messages";
import type { UnitWithOwner } from "@/services";
import type { Location } from "@/types/unit-wizard.types";
import type { RecurrenceDay, VisitorStatus, VisitorWithInviter } from "@/types/visitor.types";

const STATUS_TONES: Record<VisitorStatus, StatusTone> = {
  pending_registration: "warning",
  scheduled: "info",
  active: "info",
  inside: "success",
  completed: "neutral",
  cancelled: "error",
  rejected: "error",
  expired: "neutral",
};

/** Terminal/history statuses — no further check-in/out or deletion applies. */
const HISTORY_STATUSES: ReadonlySet<VisitorStatus> = new Set([
  "completed",
  "cancelled",
  "rejected",
  "expired",
]);

const MS_PER_DAY = 86_400_000;

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

/**
 * Two-line validity summary. Same-day visits read "Today / 2:00 PM – 6:00 PM";
 * multi-day ones read "Oct 3 → Dec 30, 2099" over the closing time, so the
 * window is explicit instead of a bare "valid until" timestamp.
 */
function formatValidity(
  fromISO: string,
  untilISO: string,
  locale: Locale,
  untilLabel: string,
): { primary: string; secondary: string } {
  const intl = locale === "es" ? "es-ES" : "en-US";
  const from = new Date(fromISO);
  const until = new Date(untilISO);
  const time = new Intl.DateTimeFormat(intl, { hour: "numeric", minute: "2-digit" });
  const withYear = from.getFullYear() !== new Date().getFullYear() || until.getFullYear() !== from.getFullYear();
  const day = (d: Date) =>
    new Intl.DateTimeFormat(intl, { day: "numeric", month: "short", ...(withYear ? { year: "numeric" } : {}) }).format(d);

  if (startOfDay(from) === startOfDay(until)) {
    const diffDays = Math.round((startOfDay(from) - startOfDay(new Date())) / MS_PER_DAY);
    const primary =
      Math.abs(diffDays) <= 1
        ? new Intl.RelativeTimeFormat(intl, { numeric: "auto" }).format(diffDays, "day")
        : new Intl.DateTimeFormat(intl, { weekday: "short", day: "numeric", month: "short" }).format(from);
    return {
      primary: primary.charAt(0).toUpperCase() + primary.slice(1),
      secondary: `${time.format(from)} – ${time.format(until)}`,
    };
  }
  return {
    primary: `${day(from)} → ${day(until)}`,
    secondary: `${untilLabel} ${time.format(until)}`,
  };
}

const DAY_LABEL_KEYS = {
  mon: "visitors.frequent.day.mon",
  tue: "visitors.frequent.day.tue",
  wed: "visitors.frequent.day.wed",
  thu: "visitors.frequent.day.thu",
  fri: "visitors.frequent.day.fri",
  sat: "visitors.frequent.day.sat",
  sun: "visitors.frequent.day.sun",
} as const satisfies Record<RecurrenceDay, MessageKey>;

interface VisitorTableProps {
  /**
   * "frequent" is the standing-authorization view: swaps the one-off validity
   * window for the recurrence + last movement, since these rows are permanent.
   */
  variant?: "default" | "frequent";
  /** Hidden on the Today/Upcoming/Inside tabs, where the status is just the tab itself. */
  showStatus?: boolean;
  /** inviter user id → role, for admin/owner/security only; shown under their name. */
  staffRoles?: Map<string, ResidentialRole>;
  /** visitor id → ISO time of that visitor's most recent entry (frequent variant). */
  lastMovementByVisitor?: Map<string, string>;
  visitors: VisitorWithInviter[];
  units: UnitWithOwner[];
  locations: Location[];
  isLoading: boolean;
  isSubmitting: boolean;
  /** Owner/admin only — deleting a visitor record. */
  canManage: boolean;
  /** Owner/admin or security — check-in/check-out, per the visitors RLS policies. */
  canCheckInOut: boolean;
  emptyMessage: string;
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onDelete: (id: string) => Promise<boolean>;
  /** Admin or security — attach/replace the visitor's document photo. */
  onUploadIdPhoto: (id: string, file: File) => Promise<boolean>;
}

export function VisitorTable({
  variant = "default",
  showStatus = true,
  staffRoles,
  lastMovementByVisitor,
  visitors,
  units,
  locations,
  isLoading,
  isSubmitting,
  canManage,
  canCheckInOut,
  emptyMessage,
  onCheckIn,
  onCheckOut,
  onDelete,
  onUploadIdPhoto,
}: VisitorTableProps) {
  const { t, locale } = useI18n();
  const photoInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const photoTargetRef = useRef<string | null>(null);
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(null);

  const pickPhoto = (visitorId: string, source: "camera" | "file") => {
    photoTargetRef.current = visitorId;
    (source === "camera" ? cameraInputRef : photoInputRef).current?.click();
  };

  const viewPhoto = async (path: string, name: string | null) => {
    const result = await visitorService.getIdPhotoUrl(path);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setViewer({ src: result.data, title: name ?? t("visitors.table.pendingRegistration") });
  };
  const {
    paginatedData: paginatedVisitors,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
  } = usePaginatedSortedData({
    data: visitors,
    defaultSortField: "valid_from" as keyof VisitorWithInviter,
    itemsPerPage: 10,
  });

  const isFrequent = variant === "frequent";
  const intlLocale = locale === "es" ? "es-ES" : "en-US";

  const recurrenceLines = (visitor: VisitorWithInviter) => {
    const label =
      visitor.recurrence === "custom"
        ? (visitor.recurrence_days ?? []).map((d) => t(DAY_LABEL_KEYS[d])).join(", ")
        : visitor.recurrence
          ? t(`visitors.frequent.recurrence.${visitor.recurrence}` as MessageKey)
          : "—";
    const until = new Intl.DateTimeFormat(intlLocale, { day: "numeric", month: "short", year: "numeric" }).format(
      new Date(visitor.valid_until),
    );
    return { primary: label, secondary: `${t("visitors.table.until")} ${until}` };
  };

  const unitById = new Map(units.map((unit) => [unit.id, unit]));

  const unitLabel = (unitId: string | null) => {
    const unit = unitId ? unitById.get(unitId) : undefined;
    if (!unit) return null;
    const location = unit.location ? locations.find((l) => l.id === unit.location!.id) : null;
    return { name: unit.name, path: getLocationFullPath(location, locations) };
  };

  const handleDelete = (id: string, name: string | null) => {
    confirmDeleteToast(name ?? t("visitors.table.pendingRegistration"), async () => {
      await onDelete(id);
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (visitors.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{emptyMessage}</div>;
  }

  return (
    <div className="space-y-2">
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead field="name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("visitors.table.visitor")}
              </SortableTableHead>
              <TableHead>{t("common.unit")}</TableHead>
              {isFrequent ? (
                <>
                  <TableHead>{t("visitors.table.recurrence")}</TableHead>
                  <TableHead>{t("visitors.table.lastMovement")}</TableHead>
                </>
              ) : (
                <SortableTableHead
                  field="valid_until"
                  currentSortField={sortField}
                  sortOrder={sortOrder}
                  onSort={handleSort}
                >
                  {t("visitors.table.validity")}
                </SortableTableHead>
              )}
              <TableHead>{t("visitors.table.invitedBy")}</TableHead>
              {showStatus && <TableHead>{t("common.status")}</TableHead>}
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedVisitors.map((visitor) => (
              <TableRow key={visitor.id}>
                <TableCell className="whitespace-nowrap">
                  <div className="font-medium">
                    {visitor.name ?? (
                      <span className="italic text-muted-foreground">{t("visitors.table.pendingRegistration")}</span>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      t(VISIT_TYPE_LABEL_KEYS[displayVisitType(visitor)]),
                      isStandingFrequent(visitor) && visitor.visitor_role ? t(`visitors.frequent.role.${visitor.visitor_role}` as MessageKey) : null,
                      visitor.plate ? `${t("visitors.table.plate")} ${visitor.plate}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </TableCell>
                <TableCell>
                  {(() => {
                    const unit = unitLabel(visitor.unit_id);
                    if (!unit) return <span className="text-sm text-muted-foreground">—</span>;
                    return (
                      <>
                        <div className="whitespace-nowrap font-medium">{unit.name}</div>
                        {unit.path && <div className="text-xs text-muted-foreground">{unit.path}</div>}
                      </>
                    );
                  })()}
                </TableCell>
                {isFrequent ? (
                  <>
                    <TableCell className="whitespace-nowrap">
                      <div className="text-sm font-medium">{recurrenceLines(visitor).primary}</div>
                      <div className="text-xs text-muted-foreground">{recurrenceLines(visitor).secondary}</div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {lastMovementByVisitor?.get(visitor.id)
                        ? new Intl.DateTimeFormat(intlLocale, { dateStyle: "medium", timeStyle: "short" }).format(
                            new Date(lastMovementByVisitor.get(visitor.id)!),
                          )
                        : "—"}
                    </TableCell>
                  </>
                ) : (
                  <TableCell className="whitespace-nowrap">
                  {(() => {
                    const validity = formatValidity(
                      visitor.valid_from,
                      visitor.valid_until,
                      locale,
                      t("visitors.table.until"),
                    );
                    return (
                      <>
                        <div className="text-sm font-medium">{validity.primary}</div>
                        <div className="text-xs text-muted-foreground">{validity.secondary}</div>
                      </>
                    );
                  })()}
                </TableCell>
                )}
                <TableCell className="whitespace-nowrap">
                  {(() => {
                    const name = inviterName(visitor);
                    const staffRole = visitor.invited_by ? staffRoles?.get(visitor.invited_by) : undefined;
                    if (!name) return <span className="text-sm text-muted-foreground">—</span>;
                    return (
                      <>
                        <div className="text-sm font-medium">{name}</div>
                        {staffRole && <div className="text-xs text-muted-foreground">{t(`role.${staffRole}` as MessageKey)}</div>}
                      </>
                    );
                  })()}
                </TableCell>
                {showStatus && (
                  <TableCell>
                    <StatusBadge tone={STATUS_TONES[visitor.status]}>{t(STATUS_LABEL_KEYS[visitor.status])}</StatusBadge>
                  </TableCell>
                )}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    {visitor.id_photo_path && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => viewPhoto(visitor.id_photo_path!, visitor.name)}
                        title={t("visitors.idPhoto.view")}
                        aria-label={t("visitors.idPhoto.view")}
                      >
                        <IconId className="h-4 w-4 text-green-600" />
                      </Button>
                    )}
                    {canCheckInOut && !HISTORY_STATUSES.has(visitor.status) && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => pickPhoto(visitor.id, "camera")}
                          disabled={isSubmitting}
                          title={t("visitors.idPhoto.takePhoto")}
                          aria-label={t("visitors.idPhoto.takePhoto")}
                        >
                          <IconCamera className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => pickPhoto(visitor.id, "file")} disabled={isSubmitting}>
                          {visitor.id_photo_path ? t("visitors.idPhoto.replace") : t("visitors.idPhoto.upload")}
                        </Button>
                      </>
                    )}
                    {canCheckInOut && visitor.status !== "inside" && !HISTORY_STATUSES.has(visitor.status) && (
                      <Button size="sm" variant="outline" onClick={() => onCheckIn(visitor.id)} disabled={isSubmitting}>
                        {t("visitors.table.checkIn")}
                      </Button>
                    )}
                    {canCheckInOut && visitor.status === "inside" && (
                      <Button size="sm" variant="outline" onClick={() => onCheckOut(visitor.id)} disabled={isSubmitting}>
                        {t("visitors.table.checkOut")}
                      </Button>
                    )}
                    {canManage && !HISTORY_STATUSES.has(visitor.status) && (
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(visitor.id, visitor.name)} disabled={isSubmitting}>
                        <DeleteIcon />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <input
        ref={photoInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const target = photoTargetRef.current;
          e.target.value = "";
          if (file && target) await onUploadIdPhoto(target, file);
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          const target = photoTargetRef.current;
          e.target.value = "";
          if (file && target) await onUploadIdPhoto(target, file);
        }}
      />
      <ImageViewerDialog
        src={viewer?.src ?? null}
        title={viewer?.title ?? ""}
        onOpenChange={(open) => !open && setViewer(null)}
        labels={{
          zoomIn: t("incidents.viewer.zoomIn"),
          zoomOut: t("incidents.viewer.zoomOut"),
          reset: t("incidents.viewer.reset"),
          rotateLeft: t("incidents.viewer.rotateLeft"),
          rotateRight: t("incidents.viewer.rotateRight"),
          close: t("common.close"),
        }}
      />

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalItems}
        startIndex={startIndex}
        endIndex={endIndex}
        onPageChange={setCurrentPage}
      />
    </div>
  );
}
