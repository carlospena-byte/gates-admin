/**
 * Kanban view of incidents: one column per status; dragging a card to
 * another column changes its status (native HTML5 drag & drop). The move is
 * applied optimistically and rolled back if the update fails.
 */

import { useState, type DragEvent, type MouseEvent } from "react";
import { IconBuilding, IconTag } from "@tabler/icons-react";

import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Spinner } from "@/components/LoadingStates";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import type {
  IncidentStatus,
  IncidentWithRelations,
} from "@/types/incident.types";
import {
  PRIORITY_LABEL_KEYS,
  PRIORITY_TONES,
  STATUS_LABEL_KEYS,
  STATUS_TONES,
  descriptionSnippet,
} from "@/components/incidents/incidentMeta";

const COLUMNS = ["new", "in_progress", "resolved", "closed"] as const;
type ColumnStatus = (typeof COLUMNS)[number];

interface IncidentBoardProps {
  incidents: IncidentWithRelations[];
  isLoading: boolean;
  canManage: boolean;
  /** Can change status (drag, take, resolve). */
  canOperate: boolean;
  onOpen: (incident: IncidentWithRelations) => void;
  onSetStatus: (id: string, status: IncidentStatus) => Promise<void>;
  onDelete: (id: string) => Promise<boolean>;
}

export function IncidentBoard({
  incidents,
  isLoading,
  canManage,
  canOperate,
  onOpen,
  onSetStatus,
  onDelete,
}: IncidentBoardProps) {
  const { t } = useI18n();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overColumn, setOverColumn] = useState<ColumnStatus | null>(null);
  // Optimistic status per incident while its update is in flight.
  const [pending, setPending] = useState<Record<string, ColumnStatus>>({});

  // Cancelled reports (withdrawn by the resident) live with the closed ones.
  const columnOf = (incident: IncidentWithRelations): ColumnStatus =>
    pending[incident.id] ??
    (incident.status === "cancelled"
      ? "closed"
      : (incident.status as ColumnStatus));

  const moveTo = async (id: string, target: ColumnStatus) => {
    const incident = incidents.find((i) => i.id === id);
    if (!incident || columnOf(incident) === target) return;
    setPending((prev) => ({ ...prev, [id]: target }));
    await onSetStatus(id, target);
    setPending((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleDrop = (event: DragEvent, target: ColumnStatus) => {
    event.preventDefault();
    const id = event.dataTransfer.getData("text/plain") || draggingId;
    setOverColumn(null);
    setDraggingId(null);
    if (id) void moveTo(id, target);
  };

  const handleDelete = (incident: IncidentWithRelations) =>
    confirmDeleteToast(incident.title, async () => {
      await onDelete(incident.id);
    });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {COLUMNS.map((column) => {
        const items = incidents
          .filter((i) => columnOf(i) === column)
          .sort((a, b) => b.created_at.localeCompare(a.created_at));
        const isOver = overColumn === column && draggingId !== null;
        return (
          <section
            key={column}
            aria-label={t(STATUS_LABEL_KEYS[column])}
            onDragOver={(e) => {
              if (!canOperate || !draggingId) return;
              e.preventDefault();
              setOverColumn(column);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node))
                setOverColumn(null);
            }}
            onDrop={(e) => canOperate && handleDrop(e, column)}
            className={cn(
              "flex min-h-[320px] min-w-[270px] flex-1 flex-col gap-3 rounded-xl bg-muted/50 p-3 transition-colors",
              isOver && "bg-gates-accent ring-2 ring-gates-text-brand/40",
            )}
          >
            <header className="flex items-center justify-between px-1">
              <StatusBadge tone={STATUS_TONES[column]}>
                {t(STATUS_LABEL_KEYS[column])}
              </StatusBadge>
              <span className="text-xs font-medium text-muted-foreground">
                {items.length}
              </span>
            </header>

            {items.length === 0 && (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                {t(
                  `incidents.empty.${column === "in_progress" ? "inProgress" : column}` as "incidents.empty.new",
                )}
              </p>
            )}

            {items.map((incident) => {
              const snippet = descriptionSnippet(incident.description);
              const isPending = incident.id in pending;
              return (
                <div
                  key={incident.id}
                  role="button"
                  tabIndex={0}
                  draggable={canOperate}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", incident.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggingId(incident.id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setOverColumn(null);
                  }}
                  onClick={() => onOpen(incident)}
                  onKeyDown={(e) => {
                    if (
                      e.target === e.currentTarget &&
                      (e.key === "Enter" || e.key === " ")
                    ) {
                      e.preventDefault();
                      onOpen(incident);
                    }
                  }}
                  className={cn(
                    "flex flex-col gap-3 rounded-xl border bg-card p-3 text-left shadow-sm transition",
                    "hover:border-gates-text-brand/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    canOperate
                      ? "cursor-grab active:cursor-grabbing"
                      : "cursor-pointer",
                    draggingId === incident.id && "opacity-40",
                    isPending && "pointer-events-none opacity-70",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      tone={PRIORITY_TONES[incident.priority]}
                      hideDot
                    >
                      {t(PRIORITY_LABEL_KEYS[incident.priority])}
                    </StatusBadge>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h3 className="truncate text-sm font-semibold">
                      {incident.title}
                    </h3>
                    {snippet && (
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {snippet}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {incident.units?.name && (
                      <span className="flex items-center gap-1">
                        <IconBuilding className="h-3.5 w-3.5" />
                        {incident.units.name}
                      </span>
                    )}
                    {incident.incident_types?.name && (
                      <span className="flex items-center gap-1">
                        <IconTag className="h-3.5 w-3.5" />
                        {incident.incident_types.name}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 border-t pt-2">
                    <div className="min-w-0 text-xs text-muted-foreground">
                      <p className="truncate">
                        {incident.assignee?.email ?? t("incidents.unassigned")}
                      </p>
                      <p>
                        {new Date(incident.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {canManage && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e: MouseEvent) => {
                          e.stopPropagation();
                          handleDelete(incident);
                        }}
                      >
                        <DeleteIcon />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
