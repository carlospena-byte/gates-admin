/**
 * Right-side sheet showing one incident's full detail — triage (priority,
 * assignee, status) for owner/admin, a single progress action for
 * security/member, and a minimal photo-attachment list. Opened by clicking
 * a row's "Open" button in IncidentTable.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { IconBuilding, IconMapPin, IconTag } from "@tabler/icons-react";
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ImageViewerDialog } from "@/components/ui/image-viewer-dialog";
import {
  MultiImageUpload,
  type UploadItem,
} from "@/components/ui/multi-image-upload";
import { Spinner } from "@/components/LoadingStates";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import {
  incidentAttachmentService,
  type ResidentialUserWithProfile,
} from "@/services";
import { RichDescription } from "@/components/incidents/RichDescription";
import type {
  IncidentPriority,
  IncidentStatus,
  IncidentWithRelations,
} from "@/types/incident.types";

const PRIORITIES: IncidentPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: IncidentStatus[] = ["new", "in_progress", "resolved", "closed"];

const PRIORITY_LABEL_KEYS: Record<IncidentPriority, MessageKey> = {
  low: "incidents.priority.low",
  medium: "incidents.priority.medium",
  high: "incidents.priority.high",
  urgent: "incidents.priority.urgent",
};

const STATUS_LABEL_KEYS: Record<IncidentStatus, MessageKey> = {
  new: "incidents.status.new",
  in_progress: "incidents.status.inProgress",
  resolved: "incidents.status.resolved",
  closed: "incidents.status.closed",
  cancelled: "incidents.status.cancelled",
};

const PRIORITY_TONES: Record<IncidentPriority, StatusTone> = {
  low: "neutral",
  medium: "info",
  high: "warning",
  urgent: "error",
};

const STATUS_TONES: Record<IncidentStatus, StatusTone> = {
  new: "info",
  in_progress: "warning",
  resolved: "success",
  closed: "neutral",
  cancelled: "neutral",
};

interface IncidentDetailSheetProps {
  incident: IncidentWithRelations | null;
  residentialId: string;
  canManage: boolean;
  assignableUsers: ResidentialUserWithProfile[];
  isSubmitting: boolean;
  onOpenChange: (open: boolean) => void;
  onSetPriority: (id: string, priority: IncidentPriority) => void;
  onSetStatus: (id: string, status: IncidentStatus) => void;
  onAssign: (id: string, userId: string | null) => void;
}

const MAX_INCIDENT_PHOTOS = 10;

export function IncidentDetailSheet({
  incident,
  residentialId,
  canManage,
  assignableUsers,
  isSubmitting,
  onOpenChange,
  onSetPriority,
  onSetStatus,
  onAssign,
}: IncidentDetailSheetProps) {
  const { t } = useI18n();
  const [attachments, setAttachments] = useState<
    { id: string; storage_path: string }[]
  >([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [uploading, setUploading] = useState<UploadItem[]>([]);
  // Local name/size/thumbnail for photos uploaded in this session, keyed by attachment id.
  const [localMeta, setLocalMeta] = useState<
    Record<string, Pick<UploadItem, "name" | "size" | "previewUrl">>
  >({});
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [viewer, setViewer] = useState<{ src: string; title: string } | null>(
    null,
  );

  const [draft, setDraft] = useState<{
    priority: IncidentPriority;
    status: IncidentStatus;
    assignedTo: string | null;
  } | null>(null);

  useEffect(() => {
    if (!incident) return;
    setDraft({
      priority: incident.priority,
      status: incident.status,
      assignedTo: incident.assigned_to ?? null,
    });
  }, [incident]);

  useEffect(() => {
    if (!incident) return;
    setIsLoadingAttachments(true);
    incidentAttachmentService.list(incident.id).then((result) => {
      setIsLoadingAttachments(false);
      if (!result.success) return;
      setAttachments(result.data);
      result.data.forEach(async (a) => {
        const url = await incidentAttachmentService.getSignedUrl(
          a.storage_path,
        );
        if (url.success) setThumbs((prev) => ({ ...prev, [a.id]: url.data }));
      });
    });
  }, [incident]);

  if (!incident) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const handleFiles = async (files: File[]) => {
    const pending: UploadItem[] = files.map((file, i) => ({
      id: `pending-${Date.now()}-${i}`,
      name: file.name,
      size: file.size,
      status: "uploading",
      previewUrl: URL.createObjectURL(file),
    }));
    setUploading((prev) => [...prev, ...pending]);

    await Promise.all(
      files.map(async (file, i) => {
        const result = await incidentAttachmentService.upload(
          incident.id,
          residentialId,
          file,
        );
        setUploading((prev) => prev.filter((p) => p.id !== pending[i].id));
        if (!result.success) {
          toast.error(result.error.message);
          return;
        }
        setAttachments((prev) => [...prev, result.data]);
        setLocalMeta((prev) => ({
          ...prev,
          [result.data.id]: {
            name: file.name,
            size: file.size,
            previewUrl: pending[i].previewUrl,
          },
        }));
      }),
    );
    toast.success(t("incidents.detail.photoAttached"));
  };

  const handleRemove = async (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (!attachment) return;
    const result = await incidentAttachmentService.delete(
      id,
      attachment.storage_path,
    );
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const handleViewAttachment = async (id: string) => {
    const attachment = attachments.find((a) => a.id === id);
    if (!attachment) return;
    const result = await incidentAttachmentService.getSignedUrl(
      attachment.storage_path,
    );
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    const index = attachments.findIndex((a) => a.id === id);
    setViewer({
      src: result.data,
      title:
        localMeta[id]?.name ??
        t("incidents.detail.viewPhoto", { index: index + 1 }),
    });
  };

  const current = draft ?? {
    priority: incident.priority,
    status: incident.status,
    assignedTo: incident.assigned_to ?? null,
  };
  const hasChanges =
    current.priority !== incident.priority ||
    current.status !== incident.status ||
    current.assignedTo !== (incident.assigned_to ?? null);

  const handleSave = () => {
    if (current.priority !== incident.priority)
      onSetPriority(incident.id, current.priority);
    if (current.status !== incident.status)
      onSetStatus(incident.id, current.status);
    if (current.assignedTo !== (incident.assigned_to ?? null))
      onAssign(incident.id, current.assignedTo);
  };

  const items: UploadItem[] = [
    ...attachments.map((a, i) => ({
      id: a.id,
      name:
        localMeta[a.id]?.name ??
        t("incidents.detail.viewPhoto", { index: i + 1 }),
      size: localMeta[a.id]?.size,
      status: "uploaded" as const,
      previewUrl: localMeta[a.id]?.previewUrl ?? thumbs[a.id],
    })),
    ...uploading,
  ];

  const tile = "rounded-xl border bg-card p-3";

  return (
    <Sheet open={!!incident} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-lg sm:p-0"
      >
        <SheetHeader className="space-y-3 border-b p-4 pr-12 text-left sm:p-6 sm:pr-12">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={STATUS_TONES[incident.status]}>
              {t(STATUS_LABEL_KEYS[incident.status])}
            </StatusBadge>
            <StatusBadge tone={PRIORITY_TONES[incident.priority]}>
              {t(PRIORITY_LABEL_KEYS[incident.priority])}
            </StatusBadge>
          </div>
          <SheetTitle className="text-2xl font-semibold leading-tight">
            {incident.title}
          </SheetTitle>
          <SheetDescription className="text-sm">
            {t("incidents.detail.reportedBy", {
              email:
                incident.reporter?.email ??
                t("incidents.detail.unknownReporter"),
              date: new Date(incident.created_at).toLocaleString(),
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto p-4 sm:p-6">
          {incident.description && (
            <div className={tile}>
              <RichDescription
                html={incident.description}
                className="space-y-2 px-1 text-base text-foreground"
              />
            </div>
          )}

          {(incident.units?.name ||
            incident.incident_types?.name ||
            incident.location) && (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              {incident.units?.name && (
                <div className={tile}>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconBuilding className="h-4 w-4" />
                    {t("incidents.detail.unitLabel")}
                  </dt>
                  <dd className="mt-1 truncate font-semibold">
                    {incident.units.name}
                  </dd>
                </div>
              )}
              {incident.incident_types?.name && (
                <div className={tile}>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconTag className="h-4 w-4" />
                    {t("incidents.table.category")}
                  </dt>
                  <dd className="mt-1 truncate font-semibold">
                    {incident.incident_types.name}
                  </dd>
                </div>
              )}
              {incident.location && (
                <div className={`${tile} col-span-2`}>
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <IconMapPin className="h-4 w-4" />
                    {t("incidents.detail.locationLabel")}
                  </dt>
                  <dd className="mt-1 font-semibold">{incident.location}</dd>
                </div>
              )}
            </dl>
          )}

          {canManage && (
            <section className="space-y-3 border-t pt-5">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-sm font-semibold">
                  {t("incidents.detail.manageLabel")}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t("incidents.detail.manageHint")}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={current.priority}
                  onValueChange={(v) =>
                    setDraft({ ...current, priority: v as IncidentPriority })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger label={t("incidents.detail.priorityLabel")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p} className="capitalize">
                        {t(PRIORITY_LABEL_KEYS[p])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={current.status}
                  onValueChange={(v) =>
                    setDraft({ ...current, status: v as IncidentStatus })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger label={t("common.status")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(incident.status === "cancelled"
                      ? [...STATUSES, "cancelled" as const]
                      : STATUSES
                    ).map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {t(STATUS_LABEL_KEYS[s])}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={current.assignedTo ?? "none"}
                  onValueChange={(v) =>
                    setDraft({
                      ...current,
                      assignedTo: v === "none" ? null : v,
                    })
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    label={t("incidents.detail.assignToLabel")}
                    className="col-span-2"
                  >
                    <SelectValue placeholder={t("incidents.unassigned")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("incidents.unassigned")}
                    </SelectItem>
                    {assignableUsers.map((u) => (
                      <SelectItem key={u.user_id} value={u.user_id}>
                        {u.profiles?.email ?? u.user_id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
          )}

          <div className="space-y-3 border-t pt-5">
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold">
                {t("incidents.detail.photosLabel")}
              </h3>
              <p className="text-xs text-muted-foreground">
                {t("incidents.detail.photosCount", {
                  count: attachments.length,
                  max: MAX_INCIDENT_PHOTOS,
                })}
              </p>
            </div>

            {isLoadingAttachments ? (
              <Spinner size="sm" />
            ) : (
              <MultiImageUpload
                items={items}
                max={MAX_INCIDENT_PHOTOS}
                title={t("incidents.detail.uploadTitle")}
                hint={t("incidents.detail.uploadHint", {
                  max: MAX_INCIDENT_PHOTOS,
                })}
                onFiles={handleFiles}
                onRemove={handleRemove}
                onView={handleViewAttachment}
                onLimitExceeded={() =>
                  toast.error(
                    t("incidents.detail.photoLimitReached", {
                      max: MAX_INCIDENT_PHOTOS,
                    }),
                  )
                }
              />
            )}
          </div>
        </div>

        {(canManage || incident.status === "new") && (
          <div className="flex items-center justify-end gap-3 border-t bg-background p-4 sm:px-6">
            {canManage ? (
              <Button
                disabled={isSubmitting || !hasChanges}
                onClick={handleSave}
              >
                {t("incidents.detail.saveChanges")}
              </Button>
            ) : (
              <Button
                disabled={isSubmitting}
                onClick={() => onSetStatus(incident.id, "in_progress")}
              >
                {t("incidents.detail.moveToInProgress")}
              </Button>
            )}
          </div>
        )}
      </SheetContent>

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
    </Sheet>
  );
}
