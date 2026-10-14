/**
 * Incident list table — same usePaginatedSortedData + SortableTableHead +
 * Pagination scaffolding as VisitorTable/UnitTable.
 */

import { useState, type MouseEvent } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import type {
  IncidentPriority,
  IncidentStatus,
  IncidentWithRelations,
} from "@/types/incident.types";
import { IncidentPriorityMenu } from "@/components/incidents/IncidentPriorityMenu";
import { IncidentStatusMenu } from "@/components/incidents/IncidentStatusMenu";

interface IncidentTableProps {
  incidents: IncidentWithRelations[];
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  emptyMessage: string;
  /** One-click row actions (take / resolve); hidden when not provided. */
  canOperate?: boolean;
  onSetStatus?: (id: string, status: IncidentStatus) => Promise<void>;
  onSetPriority?: (id: string, priority: IncidentPriority) => Promise<void>;
  onResolve?: (ids: string[]) => Promise<void>;
  onOpen: (incident: IncidentWithRelations) => void;
  onDelete: (id: string) => Promise<boolean>;
}

export function IncidentTable({
  incidents,
  isLoading,
  isSubmitting,
  canManage,
  emptyMessage,
  canOperate = false,
  onSetStatus,
  onSetPriority,
  onResolve,
  onOpen,
  onDelete,
}: IncidentTableProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const {
    paginatedData: paginatedIncidents,
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
    data: incidents,
    defaultSortField: "created_at" as keyof IncidentWithRelations,
    defaultSortOrder: "desc",
    itemsPerPage: 10,
  });

  const isOpenStatus = (status: IncidentStatus) =>
    status === "new" || status === "in_progress";
  const resolvableIds = incidents
    .filter((incident) => isOpenStatus(incident.status))
    .map((incident) => incident.id);
  const selectedResolvable = resolvableIds.filter((id) => selectedIds.has(id));
  const allSelected =
    resolvableIds.length > 0 &&
    selectedResolvable.length === resolvableIds.length;
  const showSelection =
    canOperate && Boolean(onResolve) && resolvableIds.length > 0;

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelectedIds(allSelected ? new Set() : new Set(resolvableIds));

  const resolveSelected = async () => {
    await onResolve?.(selectedResolvable);
    setSelectedIds(new Set());
  };

  const handleDelete = (id: string, title: string) => {
    confirmDeleteToast(title, async () => {
      await onDelete(id);
    });
  };

  const renderActions = (
    incident: IncidentWithRelations,
    showOpen: boolean,
  ) => (
    <div
      className="flex justify-end gap-1"
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      {showOpen && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onOpen(incident)}
          disabled={isSubmitting}
        >
          {t("incidents.table.open")}
        </Button>
      )}
      {canManage && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleDelete(incident.id, incident.title)}
          disabled={isSubmitting}
        >
          <DeleteIcon />
        </Button>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showSelection && selectedResolvable.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-gates-accent px-4 py-2">
          <p className="flex-1 text-sm font-medium text-gates-text-brand">
            {t("incidents.bulk.selected", { count: selectedResolvable.length })}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedIds(new Set())}
          >
            {t("common.cancel")}
          </Button>
          <Button
            size="sm"
            onClick={() => void resolveSelected()}
            disabled={isSubmitting}
          >
            {t("incidents.bulk.resolve")}
          </Button>
        </div>
      )}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {showSelection && (
                <TableHead className="w-[44px]">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    disabled={isSubmitting}
                    aria-label={t("incidents.bulk.selectAll")}
                  />
                </TableHead>
              )}
              <SortableTableHead
                field="title"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              >
                {t("incidents.table.title")}
              </SortableTableHead>
              <TableHead>{t("common.unit")}</TableHead>
              <TableHead>{t("incidents.table.category")}</TableHead>
              <TableHead>{t("incidents.table.priority")}</TableHead>
              <TableHead>{t("common.status")}</TableHead>
              <TableHead>{t("incidents.table.assignedTo")}</TableHead>
              <SortableTableHead
                field="created_at"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
              >
                {t("incidents.table.created")}
              </SortableTableHead>
              <TableHead className="text-right">
                {t("common.actions")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedIncidents.map((incident) => (
              <TableRow key={incident.id}>
                {showSelection && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(incident.id)}
                      onCheckedChange={() => toggleOne(incident.id)}
                      disabled={!isOpenStatus(incident.status) || isSubmitting}
                      aria-label={incident.title}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{incident.title}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {incident.units?.name ?? "—"}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {incident.incident_types?.name ?? "—"}
                </TableCell>
                <TableCell>
                  <IncidentPriorityMenu
                    priority={incident.priority}
                    editable={canOperate && Boolean(onSetPriority)}
                    disabled={isSubmitting}
                    onChange={(priority) =>
                      void onSetPriority?.(incident.id, priority)
                    }
                  />
                </TableCell>
                <TableCell>
                  <IncidentStatusMenu
                    status={incident.status}
                    editable={canOperate && Boolean(onSetStatus)}
                    disabled={isSubmitting}
                    onChange={(status) =>
                      void onSetStatus?.(incident.id, status)
                    }
                  />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {incident.assignee?.email ?? t("incidents.unassigned")}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {new Date(incident.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {renderActions(incident, true)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
