/**
 * Existing-units table: pagination/sorting and the expandable addon list.
 * Editing happens on the unit's own detail page (see UnitDetailPage) —
 * this table only lists, deletes, and toggles active state.
 */

import { Fragment, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import { formatCurrency } from "@/lib/utils";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { navigateToUnitDetail } from "@/config/routes";
import { EditIcon, DeleteIcon, ChevronDownIcon, ChevronRightIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";
import type { Location, UnitWithWizardData } from "@/types/unit-wizard.types";

interface UnitTableProps {
  units: UnitWithWizardData[];
  locations: Location[];
  isLoading: boolean;
  isSubmitting: boolean;
  /** Only owner/admin can delete or toggle active — security/member get a read-only table. */
  canManage: boolean;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function UnitTable({
  units,
  locations,
  isLoading,
  isSubmitting,
  canManage,
  onDelete,
  onToggleActive,
}: UnitTableProps) {
  const { t } = useI18n();
  const {
    paginatedData: paginatedUnits,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    sortField,
    sortOrder,
    handleSort,
    currentPage,
    setCurrentPage,
    resetPage,
  } = usePaginatedSortedData({
    data: units,
    defaultSortField: "name" as keyof UnitWithWizardData,
    itemsPerPage: 10,
  });

  // Reset to the first page whenever the unit list is reloaded (including
  // after a create/update/delete, matching the manager's previous behavior).
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [units]);

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (unitId: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(unitId)) {
        next.delete(unitId);
      } else {
        next.add(unitId);
      }
      return next;
    });
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {t("units.table.existingUnits")}
          {totalItems > 0 && (
            <span className="ml-2 text-muted-foreground">({t("units.table.totalSuffix", { count: totalItems })})</span>
          )}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : units.length === 0 ? (
        <div className="text-center py-8 text-sm text-muted-foreground">{t("units.table.empty")}</div>
      ) : (
        <>
          <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[30px]"></TableHead>
              <SortableTableHead
                field="name"
                currentSortField={sortField}
                sortOrder={sortOrder}
                onSort={handleSort}
                className="w-1/5"
              >
                {t("common.name")}
              </SortableTableHead>
              <TableHead className="w-1/5">{t("common.owner")}</TableHead>
              <TableHead className="w-1/5">{t("common.type")}</TableHead>
              <TableHead className="w-1/5">{t("common.location")}</TableHead>
              <TableHead className="w-[100px]">{t("common.price")}</TableHead>
              <TableHead className="w-[120px]">{t("units.table.addons")}</TableHead>
              <TableHead className="w-[80px]">{t("common.active")}</TableHead>
              <TableHead className="w-[140px] text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedUnits.map((unit) => (
              <Fragment key={unit.id}>
                <TableRow>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(unit.id)}
                      className="h-6 w-6 p-0"
                    >
                      {expandedRows.has(unit.id) ? <ChevronDownIcon /> : <ChevronRightIcon />}
                    </Button>
                  </TableCell>
                  <TableCell className="font-medium">
                    <span className="truncate">{unit.name}</span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground truncate">
                    {unit.profiles?.email || t("units.common.unassigned")}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate">
                      {unit.unit_types?.name || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate">
                      {getLocationFullPath(unit.locations, locations) || "—"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground truncate">{formatCurrency(unit.price)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="cursor-default">
                      {unit.unit_addons?.length || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={unit.is_active}
                      onCheckedChange={() => onToggleActive(unit.id, unit.is_active)}
                      disabled={isSubmitting || !canManage}
                      aria-label={t("units.table.toggleActiveAria", {
                        name: unit.name,
                        state: unit.is_active ? t("common.inactive") : t("common.active"),
                      })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigateToUnitDetail(unit.id)}
                        disabled={isSubmitting}
                      >
                        <EditIcon />
                      </Button>
                      {canManage && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(unit.id, unit.name)}
                          disabled={isSubmitting}
                        >
                          <DeleteIcon />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>

                {expandedRows.has(unit.id) && (
                  <TableRow>
                    <TableCell colSpan={9} className="bg-muted/50 py-2">
                      <div className="flex gap-1 flex-wrap px-2">
                        {unit.unit_addons && unit.unit_addons.length > 0 ? (
                          unit.unit_addons.map((ua) => (
                            <Badge key={ua.id} variant="secondary">
                              {ua.addon_items?.addons?.name} — {ua.addon_items?.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">{t("units.table.noAddons")}</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
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
        </>
      )}
    </div>
  );
}
