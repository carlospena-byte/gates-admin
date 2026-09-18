/**
 * Assigned add-ons for a unit, shown as a table with Edit/Remove actions.
 * Available add-ons are picked from a side sheet (AddAddonSheet) instead of
 * a flat filtered list inline on the page. Selection lives in the parent's
 * `selectedIds` draft state — nothing here touches the backend directly
 * except editing the underlying addon item (AddonItemEditSheet), which
 * already persists immediately elsewhere in the app.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AddonItemEditSheet } from "@/components/addons/AddonItemEditSheet";
import { AddAddonSheet } from "@/components/units/AddAddonSheet";
import { DeleteIcon, EditIcon, PlusIcon } from "@/components/icons";
import { getAddonTypeIcon } from "@/lib/addonTypeIcon";
import { getLocationFullPath } from "@/lib/locationHierarchy";
import { formatCurrency } from "@/lib/utils";
import type {
  AddonItem,
  AddonType,
  Location,
  LocationTypeDefinition,
  UpdateAddonItemDto,
} from "@/types/unit-wizard.types";

interface UnitAddonsSectionProps {
  addonItems: AddonItem[];
  addonTypes: AddonType[];
  locations: Location[];
  locationTypes: LocationTypeDefinition[];
  selectedIds: string[];
  onSetSelected: (ids: string[]) => void;
  onUpdateAddonItem: (id: string, dto: UpdateAddonItemDto) => Promise<boolean>;
  isSubmitting: boolean;
  disabled?: boolean;
}

export function UnitAddonsSection({
  addonItems,
  addonTypes,
  locations,
  locationTypes,
  selectedIds,
  onSetSelected,
  onUpdateAddonItem,
  isSubmitting,
  disabled,
}: UnitAddonsSectionProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<AddonItem | null>(null);

  const assignedItems = addonItems.filter((item) => selectedIds.includes(item.id));

  const handleRemove = (id: string) => {
    onSetSelected(selectedIds.filter((selectedId) => selectedId !== id));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Add-ons ({assignedItems.length})</p>
          <p className="text-xs text-muted-foreground">Additional items or services assigned to this unit.</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} disabled={disabled}>
          <PlusIcon /> <span className="ml-2">Add add-on</span>
        </Button>
      </div>

      {assignedItems.length === 0 ? (
        <div className="space-y-3 rounded-md border p-6 text-center">
          <p className="text-sm text-muted-foreground">No add-ons assigned to this unit yet.</p>
          <Button variant="outline" size="sm" onClick={() => setSheetOpen(true)} disabled={disabled}>
            <PlusIcon /> <span className="ml-2">Add add-on</span>
          </Button>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Add-on</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="w-[110px]">Price</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignedItems.map((item) => {
                const Icon = getAddonTypeIcon(item.addons?.addon_types?.name);
                return (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                          <Icon className="h-4 w-4 text-muted-foreground" />
                        </span>
                        <span className="truncate text-sm font-medium">
                          {item.addons?.name} — {item.name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.addons?.addon_types?.name || "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.locations ? getLocationFullPath(item.locations, locations) : "No location"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {item.price !== null ? `${formatCurrency(item.price)} / month` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingItem(item)}
                          disabled={disabled || isSubmitting}
                        >
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemove(item.id)}
                          disabled={disabled}
                        >
                          <DeleteIcon />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <AddAddonSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        addonItems={addonItems}
        addonTypes={addonTypes}
        locations={locations}
        locationTypes={locationTypes}
        assignedIds={selectedIds}
        onAdd={(ids) => onSetSelected([...selectedIds, ...ids])}
        disabled={disabled}
      />

      <AddonItemEditSheet
        item={editingItem}
        locations={locations}
        locationTypes={locationTypes}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => !open && setEditingItem(null)}
        onSave={onUpdateAddonItem}
      />
    </div>
  );
}
