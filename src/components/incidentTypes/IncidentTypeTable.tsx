import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { EditIcon, DeleteIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";
import type { IncidentType, IncidentTypeAssignableRole } from "@/types/incidentType.types";

const ASSIGNABLE_ROLES: IncidentTypeAssignableRole[] = ["security", "member"];

interface IncidentTypeTableProps {
  items: IncidentType[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, changes: { name?: string; roles?: IncidentTypeAssignableRole[] }) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function IncidentTypeTable({
  items,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: IncidentTypeTableProps) {
  const { t } = useI18n();
  const entityLabel = t("incidentTypes.entityLabel");
  const {
    paginatedData: paginatedItems,
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
  } = usePaginatedSortedData<IncidentType, "name">({
    data: items,
    defaultSortField: "name",
    itemsPerPage: 10,
  });

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingRoles, setEditingRoles] = useState<IncidentTypeAssignableRole[]>([]);

  const startEditing = (item: IncidentType) => {
    setEditingId(item.id);
    setEditingName(item.name);
    setEditingRoles(item.incident_type_roles.map((r) => r.role));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingRoles([]);
  };

  const toggleEditingRole = (role: IncidentTypeAssignableRole) =>
    setEditingRoles((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    const ok = await onUpdate(id, { name: editingName.trim(), roles: editingRoles });
    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  const lowerLabel = entityLabel.toLowerCase();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">
          {t("namedType.table.existing", { entityLabel })}
          {totalItems > 0 && <span className="ml-2 text-muted-foreground">({totalItems} total)</span>}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : items.length > 0 ? (
        <>
          <div className="rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableTableHead field="name" currentSortField={sortField} sortOrder={sortOrder} onSort={handleSort}>
                    {t("common.name")}
                  </SortableTableHead>
                  <TableHead>{t("incidentTypes.rolesLabel")}</TableHead>
                  <TableHead className="w-[110px]">{t("common.active")}</TableHead>
                  <TableHead className="w-[140px] text-right">{t("common.actions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedItems.map((item) => {
                  const isEditing = editingId === item.id;
                  const roles = isEditing ? editingRoles : item.incident_type_roles.map((r) => r.role);

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {isEditing ? (
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate(item.id);
                              if (e.key === "Escape") cancelEditing();
                            }}
                            className="h-8"
                            autoFocus
                            disabled={isSubmitting}
                          />
                        ) : (
                          <span className="truncate">{item.name}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isEditing ? (
                          <div className="flex flex-wrap gap-3">
                            {ASSIGNABLE_ROLES.map((role) => (
                              <Checkbox
                                key={role}
                                checked={editingRoles.includes(role)}
                                onCheckedChange={() => toggleEditingRole(role)}
                                disabled={isSubmitting}
                                label={t(`incidentTypes.role.${role}`)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            <Badge variant="secondary">{t("incidentTypes.role.owner")}</Badge>
                            <Badge variant="secondary">{t("incidentTypes.role.admin")}</Badge>
                            {roles.map((role) => (
                              <Badge key={role}>{t(`incidentTypes.role.${role}`)}</Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={item.is_active}
                          onCheckedChange={() => onToggleActive(item.id, item.is_active)}
                          disabled={isSubmitting || isEditing}
                          aria-label={
                            item.is_active
                              ? t("namedType.table.setInactive", { name: item.name })
                              : t("namedType.table.setActive", { name: item.name })
                          }
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        {isEditing ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleUpdate(item.id)}
                              disabled={isSubmitting || !editingName.trim()}
                            >
                              {isSubmitting ? <Spinner size="sm" /> : t("common.save")}
                            </Button>
                            <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                              {t("common.cancel")}
                            </Button>
                          </div>
                        ) : (
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => startEditing(item)} disabled={isSubmitting}>
                              <EditIcon />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id, item.name)}
                              disabled={isSubmitting}
                            >
                              <DeleteIcon />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
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
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("namedType.table.empty", { entityLabel: lowerLabel })}
        </div>
      )}
    </div>
  );
}
