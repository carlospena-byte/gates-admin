/**
 * Right-side sheet showing one incident's full detail — triage (priority,
 * assignee, status) for owner/admin, a single progress action for
 * security/member, and a minimal photo-attachment list. Opened by clicking
 * a row's "Open" button in IncidentTable.
 */

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
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

  return (
    <Sheet open={!!incident} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{incident.title}</SheetTitle>
          <SheetDescription>
            {t("incidents.detail.reportedBy", {
              email:
                incident.reporter?.email ??
                t("incidents.detail.unknownReporter"),
              date: new Date(incident.created_at).toLocaleString(),
            })}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {incident.description && (
            <RichDescription html={incident.description} />
          )}

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {incident.units?.name && (
              <Badge variant="secondary">{incident.units.name}</Badge>
            )}
            {incident.incident_types?.name && (
              <Badge variant="secondary">{incident.incident_types.name}</Badge>
            )}
            {incident.location && (
              <Badge variant="secondary">{incident.location}</Badge>
            )}
          </div>

          {canManage ? (
            <div className="grid gap-2 grid-cols-1">
              <Select
                value={incident.priority}
                onValueChange={(v) =>
                  onSetPriority(incident.id, v as IncidentPriority)
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
                value={incident.status}
                onValueChange={(v) =>
                  onSetStatus(incident.id, v as IncidentStatus)
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
                value={incident.assigned_to ?? "none"}
                onValueChange={(v) =>
                  onAssign(incident.id, v === "none" ? null : v)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger
                  label={t("incidents.detail.assignToLabel")}
                  className="sm:col-span-2"
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
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {t(STATUS_LABEL_KEYS[incident.status])}
              </Badge>
              {incident.status === "new" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => onSetStatus(incident.id, "in_progress")}
                >
                  {t("incidents.detail.moveToInProgress")}
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">
              {t("incidents.detail.photosLabel")} ({attachments.length}/
              {MAX_INCIDENT_PHOTOS})
            </p>

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
