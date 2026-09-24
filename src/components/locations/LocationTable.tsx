import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import {
  getEligibleParentLocations,
  getLocationFullPath,
  getLocationTypeLabel,
  sortLocationTypesByLevel,
  typeRequiresParent,
} from "@/lib/locationHierarchy";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { EditIcon, DeleteIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";
import type { Location, LocationTypeDefinition, UpdateLocationDto } from "@/types/unit-wizard.types";

interface LocationTableProps {
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, dto: UpdateLocationDto) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

interface RankedLocation {
  location: Location;
  depth: number;
}

/**
 * Flattens locations into parent-then-children render order (root locations
 * sorted by name, each immediately followed by its own children, recursively)
 * instead of one flat alphabetical list — grouping Piso 1/2/3 under their
 * Torre instead of interleaving them with unrelated top-level locations.
 */
function rankLocationsByHierarchy(locations: Location[]): RankedLocation[] {
  const validIds = new Set(locations.map((l) => l.id));
  const childrenByParent = new Map<string | null, Location[]>();

  for (const location of locations) {
    const parentKey = location.parent_id && validIds.has(location.parent_id) ? location.parent_id : null;
    const siblings = childrenByParent.get(parentKey) ?? [];
    siblings.push(location);
    childrenByParent.set(parentKey, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const ranked: RankedLocation[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const location of childrenByParent.get(parentId) ?? []) {
      ranked.push({ location, depth });
      visit(location.id, depth + 1);
    }
  };
  visit(null, 0);

  return ranked;
}

export function LocationTable({
  locations,
  locationTypes,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: LocationTableProps) {
  const { t } = useI18n();
  const rankedLocations = useMemo(() => rankLocationsByHierarchy(locations), [locations]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState("");
  const [editingParentId, setEditingParentId] = useState("");

  const startEditing = (location: Location) => {
    setEditingId(location.id);
    setEditingName(location.name);
    setEditingType(location.type);
    setEditingParentId(location.parent_id || "");
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingType("");
    setEditingParentId("");
  };

  const sortedTypes = sortLocationTypesByLevel(locationTypes);
  const editingNeedsParent = typeRequiresParent(editingType, locationTypes);
  const eligibleParentsForEditing = editingId
    ? getEligibleParentLocations(editingType, locations, locationTypes, editingId)
    : [];
  const isEditingMissingParent = editingNeedsParent && !editingParentId;

  const handleTypeChange = (newType: string) => {
    setEditingType(newType);
    // A type change can invalidate the previously selected parent's level.
    setEditingParentId("");
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingType || isEditingMissingParent) return;

    const ok = await onUpdate(id, {
      name: editingName.trim(),
      type: editingType,
      parent_id: editingNeedsParent ? editingParentId : null,
    });

    if (ok) cancelEditing();
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
          {t("location.table.title")}
          {locations.length > 0 && <span className="ml-2 text-muted-foreground">({locations.length} total)</span>}
        </label>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : locations.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-1/4">{t("common.name")}</TableHead>
                <TableHead className="w-1/6">{t("common.type")}</TableHead>
                <TableHead className="w-1/4">{t("location.table.parent")}</TableHead>
                <TableHead className="w-[110px]">{t("common.active")}</TableHead>
                <TableHead className="w-[140px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rankedLocations.map(({ location, depth }) => (
                <TableRow key={location.id} className={depth > 0 ? "bg-muted/30" : undefined}>
                  <TableCell className="font-medium">
                    {editingId === location.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder={t("location.table.namePlaceholder")}
                        className="h-8"
                        autoFocus
                        disabled={isSubmitting}
                      />
                    ) : (
                      <span
                        className={depth === 0 ? "truncate font-semibold" : "truncate text-muted-foreground"}
                        style={depth > 0 ? { paddingLeft: `${depth * 20}px` } : undefined}
                      >
                        {depth > 0 ? "↳ " : ""}
                        {location.name}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === location.id ? (
                      <Select value={editingType} onValueChange={handleTypeChange} disabled={isSubmitting}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder={t("common.type")} />
                        </SelectTrigger>
                        <SelectContent>
                          {sortedTypes.map((locType) => (
                            <SelectItem key={locType.id} value={locType.code}>
                              {locType.name} {t("location.create.levelSuffix", { level: locType.level })}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm truncate">{getLocationTypeLabel(location.type, locationTypes)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === location.id ? (
                      editingNeedsParent ? (
                        <Select
                          value={editingParentId || "none"}
                          onValueChange={(value) => setEditingParentId(value === "none" ? "" : value)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className="h-8">
                            <SelectValue placeholder={t("location.table.parent")} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>
                              {eligibleParentsForEditing.length > 0
                                ? t("location.table.selectParent")
                                : t("location.table.noEligibleParents")}
                            </SelectItem>
                            {eligibleParentsForEditing.map((parent) => (
                              <SelectItem key={parent.id} value={parent.id}>
                                {getLocationFullPath(parent, locations)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t("location.table.rootLevel")}</span>
                      )
                    ) : (
                      <span className="text-sm text-muted-foreground truncate">
                        {location.parent_id
                          ? locations.find((l) => l.id === location.parent_id)?.name || t("location.table.unknownParent")
                          : t("common.none")}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={location.is_active}
                      onCheckedChange={() => onToggleActive(location.id, location.is_active)}
                      disabled={isSubmitting || editingId === location.id}
                      aria-label={
                        location.is_active
                          ? t("location.table.setInactive", { name: location.name })
                          : t("location.table.setActive", { name: location.name })
                      }
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === location.id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(location.id)}
                          disabled={
                            isSubmitting || !editingName.trim() || !editingType || isEditingMissingParent
                          }
                        >
                          {isSubmitting ? <Spinner size="sm" /> : t("common.save")}
                        </Button>
                        <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                          {t("common.cancel")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEditing(location)} disabled={isSubmitting}>
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(location.id, location.name)}
                          disabled={isSubmitting}
                        >
                          <DeleteIcon />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">{t("location.table.empty")}</div>
      )}
    </div>
  );
}
