/**
 * Residential-wide resident list — same usePaginatedSortedData +
 * SortableTableHead + Pagination scaffolding as every other table.
 */

import { useState } from "react";
import { IconMailForward } from "@tabler/icons-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { DeleteIcon, EditIcon } from "@/components/icons";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { navigateToUnitDetail } from "@/config/routes";
import { useI18n } from "@/i18n/useI18n";
import { RESIDENT_STATUS_BADGE_VARIANT, residentStatusMessageKey } from "@/components/residents/residentStatus";
import type { ResidentStatus, ResidentWithStatus } from "@/types/unit-wizard.types";

interface ResidentTableProps {
  residents: ResidentWithStatus[];
  isLoading: boolean;
  isSubmitting: boolean;
  canManage: boolean;
  onToggleActive: (id: string, currentStatus: boolean) => void;
  onDelete: (id: string) => Promise<boolean>;
  onInvite: (resident: ResidentWithStatus) => Promise<void>;
  onEdit: (resident: ResidentWithStatus) => void;
}

export function ResidentTable({
  residents,
  isLoading,
  isSubmitting,
  canManage,
  onToggleActive,
  onDelete,
  onInvite,
  onEdit,
}: ResidentTableProps) {
  const { t } = useI18n();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkInviting, setIsBulkInviting] = useState(false);
  const {
    paginatedData: paginatedResidents,
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
    data: residents,
    defaultSortField: "full_name" as keyof ResidentWithStatus,
    itemsPerPage: 10,
  });

  const handleDelete = (resident: ResidentWithStatus) => {
    const description =
      resident.status === "active" ? t("residents.remove.confirmActiveDescription") : undefined;
    confirmDeleteToast(
      resident.full_name,
      async () => {
        await onDelete(resident.id);
      },
      description,
    );
  };

  // Residents who still need an invitation (not yet active) can be invited in one go.
  const invitable = residents.filter((resident) => resident.status !== "active");
  const selectedInvitable = invitable.filter((resident) => selectedIds.has(resident.id));
  const allSelected = invitable.length > 0 && selectedInvitable.length === invitable.length;
  const showSelection = canManage && invitable.length > 0;

  const toggleOne = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const inviteSelected = async () => {
    setIsBulkInviting(true);
    for (const resident of selectedInvitable) {
      await onInvite(resident);
    }
    setIsBulkInviting(false);
    setSelectedIds(new Set());
  };

  const statusLabel = (status: ResidentStatus) => t(residentStatusMessageKey(status));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (residents.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">{t("residents.table.empty")}</div>;
  }

  return (
    <div className="space-y-2">
      {showSelection && selectedInvitable.length > 0 && (
        <div className="flex items-center gap-3 rounded-lg bg-gates-accent px-4 py-2">
          <p className="flex-1 text-sm font-medium text-gates-text-brand">
            {t("residents.bulk.selected", { count: selectedInvitable.length })}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            {t("common.cancel")}
          </Button>
          <Button size="sm" onClick={() => void inviteSelected()} disabled={isSubmitting || isBulkInviting}>
            {t("residents.bulk.invite")}
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
                    onCheckedChange={() => setSelectedIds(allSelected ? new Set() : new Set(invitable.map((r) => r.id)))}
                    disabled={isSubmitting || isBulkInviting}
                    aria-label={t("residents.bulk.selectAll")}
                  />
                </TableHead>
              )}
              <SortableTableHead field="full_name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                {t("common.name")}
              </SortableTableHead>
              <TableHead>{t("residents.table.property")}</TableHead>
              <TableHead>{t("common.phone")}</TableHead>
              <TableHead>{t("common.email")}</TableHead>
              <TableHead>{t("residents.table.status")}</TableHead>
              <TableHead>{t("residents.table.active")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedResidents.map((resident) => (
              <TableRow key={resident.id}>
                {showSelection && (
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(resident.id)}
                      onCheckedChange={() => toggleOne(resident.id)}
                      disabled={resident.status === "active" || isSubmitting || isBulkInviting}
                      aria-label={resident.full_name}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">{resident.full_name}</TableCell>
                <TableCell>
                  {resident.units?.name ? (
                    <button
                      type="button"
                      className="text-sm text-primary underline-offset-4 hover:underline"
                      onClick={() => navigateToUnitDetail(resident.unit_id)}
                    >
                      {resident.units.name}
                    </button>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{resident.phone ?? "—"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{resident.email}</TableCell>
                <TableCell>
                  <Badge variant={RESIDENT_STATUS_BADGE_VARIANT[resident.status]}>{statusLabel(resident.status)}</Badge>
                </TableCell>
                <TableCell>
                  <Switch
                    checked={resident.is_active}
                    onCheckedChange={() => onToggleActive(resident.id, resident.is_active)}
                    disabled={isSubmitting || !canManage}
                    aria-label={t("residents.table.setActiveAriaLabel", {
                      name: resident.full_name,
                      status: resident.is_active ? t("common.inactive") : t("common.active"),
                    })}
                  />
                </TableCell>
                <TableCell className="text-right">
                  {canManage && (
                    <>
                      {resident.status !== "active" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onInvite(resident)}
                          disabled={isSubmitting}
                          title={
                            resident.status === "not_invited"
                              ? t("residents.table.invite")
                              : t("residents.table.reinvite")
                          }
                        >
                          <IconMailForward className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(resident)}
                        disabled={isSubmitting}
                        title={t("common.edit")}
                      >
                        <EditIcon />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(resident)} disabled={isSubmitting}>
                        <DeleteIcon />
                      </Button>
                    </>
                  )}
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
