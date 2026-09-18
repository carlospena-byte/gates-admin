/**
 * Right-side sheet showing one incident's full detail — triage (priority,
 * assignee, status) for owner/admin, a single progress action for
 * security/member, and a minimal photo-attachment list. Opened by clicking
 * a row's "Open" button in IncidentTable.
 */

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { IconPaperclip } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Spinner } from "@/components/LoadingStates";
import { incidentAttachmentService, type ResidentialUserWithProfile } from "@/services";
import type { IncidentPriority, IncidentStatus, IncidentWithRelations } from "@/types/incident.types";

const PRIORITIES: IncidentPriority[] = ["low", "medium", "high", "urgent"];
const STATUSES: IncidentStatus[] = ["new", "in_progress", "resolved", "closed"];

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachments, setAttachments] = useState<{ id: string; storage_path: string }[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (!incident) return;
    setIsLoadingAttachments(true);
    incidentAttachmentService.list(incident.id).then((result) => {
      setIsLoadingAttachments(false);
      if (result.success) setAttachments(result.data);
    });
  }, [incident]);

  if (!incident) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setIsUploading(true);
    const result = await incidentAttachmentService.upload(incident.id, residentialId, file);
    setIsUploading(false);

    if (!result.success) {
      toast.error(result.error.message);
      return;
    }

    setAttachments((prev) => [...prev, result.data]);
    toast.success("Photo attached");
  };

  const handleViewAttachment = async (path: string) => {
    const result = await incidentAttachmentService.getSignedUrl(path);
    if (!result.success) {
      toast.error(result.error.message);
      return;
    }
    window.open(result.data, "_blank", "noopener,noreferrer");
  };

  return (
    <Sheet open={!!incident} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{incident.title}</SheetTitle>
          <SheetDescription>
            Reported by {incident.reporter?.email ?? "unknown"} · {new Date(incident.created_at).toLocaleString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {incident.description && <p className="text-sm text-muted-foreground">{incident.description}</p>}

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            {incident.units?.name && <Badge variant="secondary">{incident.units.name}</Badge>}
            {incident.category && <Badge variant="secondary">{incident.category}</Badge>}
            {incident.location && <Badge variant="secondary">{incident.location}</Badge>}
          </div>

          {canManage ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={incident.priority}
                onValueChange={(v) => onSetPriority(incident.id, v as IncidentPriority)}
                disabled={isSubmitting}
              >
                <SelectTrigger label="Priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p} className="capitalize">
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={incident.status}
                onValueChange={(v) => onSetStatus(incident.id, v as IncidentStatus)}
                disabled={isSubmitting}
              >
                <SelectTrigger label="Status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={incident.assigned_to ?? "none"}
                onValueChange={(v) => onAssign(incident.id, v === "none" ? null : v)}
                disabled={isSubmitting}
              >
                <SelectTrigger label="Assign to" className="sm:col-span-2">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
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
                {incident.status.replace("_", " ")}
              </Badge>
              {incident.status === "new" && (
                <Button size="sm" variant="outline" disabled={isSubmitting} onClick={() => onSetStatus(incident.id, "in_progress")}>
                  Move to In Progress
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2 border-t pt-4">
            <p className="text-xs font-medium text-muted-foreground">Photos</p>

            {isLoadingAttachments ? (
              <Spinner size="sm" />
            ) : attachments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No photos attached.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {attachments.map((a, i) => (
                  <Button
                    key={a.id}
                    size="sm"
                    variant="outline"
                    className="w-fit"
                    onClick={() => handleViewAttachment(a.storage_path)}
                  >
                    View photo {i + 1}
                  </Button>
                ))}
              </div>
            )}

            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
            <Button size="sm" variant="outline" disabled={isUploading} onClick={() => fileInputRef.current?.click()}>
              <IconPaperclip className="h-4 w-4" /> <span className="ml-1">Attach photo</span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
