/**
 * Addon Manager
 * Side sheet for managing addons CRUD
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/LoadingStates";
import { addonService, addonTypeService } from "@/services";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { AddonTypeManager } from "@/components/AddonTypeManager";
import type { Addon, AddonType } from "@/types/unit-wizard.types";

interface AddonManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

const PlusIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);

const TrashIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const EditIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
    />
  </svg>
);

const SettingsIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
    />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

export function AddonManager({ open, onOpenChange, residentialId }: AddonManagerProps) {
  // Manual state management for data fetching
  const [addons, setAddons] = useState<Addon[]>([]);
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use pagination & sorting hook
  const {
    paginatedData: paginatedAddons,
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
    data: addons,
    defaultSortField: "name" as keyof Addon,
    itemsPerPage: 10,
  });

  // Form state
  const [newName, setNewName] = useState("");
  const [newTypeId, setNewTypeId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeId, setEditingTypeId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Type manager state
  const [typeManagerOpen, setTypeManagerOpen] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);

    const [addonsResult, typesResult] = await Promise.all([
      addonService.list(residentialId),
      addonTypeService.list(residentialId),
    ]);

    setIsLoading(false);

    if (addonsResult.success) {
      setAddons(addonsResult.data);
      resetPage(); // Reset to first page when data loads
    } else {
      toast.error(addonsResult.error.message);
    }

    if (typesResult.success) {
      setAddonTypes(typesResult.data);
    }
  }, [residentialId, resetPage]);

  // Load data when sheet opens
  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open, loadData]);

  const handleCreate = async () => {
    if (!newName.trim() || !newTypeId) return;

    setIsSubmitting(true);

    const result = await addonService.create({
      residential_id: residentialId,
      addon_type_id: newTypeId,
      name: newName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setNewName("");
      setNewTypeId("");
      toast.success("Addon created successfully");
      await loadData();
    } else {
      toast.error(result.error?.message || "Failed to create addon");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingTypeId) return;

    setIsSubmitting(true);

    const result = await addonService.update(id, {
      name: editingName.trim(),
      addon_type_id: editingTypeId,
    });

    setIsSubmitting(false);

    if (result.success) {
      setEditingId(null);
      setEditingName("");
      setEditingTypeId("");
      toast.success("Addon updated successfully");
      await loadData();
    } else {
      toast.error(result.error?.message || "Failed to update addon");
    }
  };

  const handleDelete = (id: string, name: string) => {
    const toastId = toast(`Delete "${name}"?`, {
      description: "This action cannot be undone.",
      duration: Infinity,
      action: {
        label: "Delete",
        onClick: async () => {
          toast.dismiss(toastId);
          setIsSubmitting(true);
          const result = await addonService.delete(id);
          setIsSubmitting(false);

          if (result.success) {
            toast.success("Addon deleted successfully");
            await loadData();
          } else {
            toast.error(result.error?.message || "Failed to delete addon");
          }
        },
      },
      cancel: {
        label: "Cancel",
        onClick: () => {
          toast.dismiss(toastId);
        },
      },
    });
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    const result = await addonService.toggleActive(id, currentStatus);
    if (result.success) {
      await loadData();
    } else {
      toast.error("Failed to toggle addon status");
    }
  };

  const startEditing = (id: string, name: string, typeId: string) => {
    setEditingId(id);
    setEditingName(name);
    setEditingTypeId(typeId);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingTypeId("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>Manage Addons</SheetTitle>
              <SheetDescription>
                Create and manage addons for units (Covered Parking, Storage Unit, etc.)
              </SheetDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTypeManagerOpen(true)}
            >
              <SettingsIcon />
              <span className="ml-2">Manage Types</span>
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {/* Create Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Addon</label>
            <div className="space-y-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Covered Parking, Storage Unit..."
                disabled={isSubmitting}
              />
              <Select value={newTypeId} onValueChange={setNewTypeId} disabled={isSubmitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select addon type" />
                </SelectTrigger>
                <SelectContent>
                  {addonTypes && addonTypes.length > 0 ? (
                    addonTypes
                      .filter((type) => type.is_active)
                      .map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                  ) : (
                    <SelectItem value="none" disabled>
                      No types available - Click "Manage Types" to add
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newName.trim() || !newTypeId}
                className="w-full"
              >
                {isSubmitting ? <Spinner size="sm" /> : <><PlusIcon /> <span className="ml-2">Add Addon</span></>}
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Existing Addons
                {totalItems > 0 && (
                  <span className="ml-2 text-muted-foreground">({totalItems} total)</span>
                )}
              </label>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : addons && addons.length > 0 ? (
              <>
                <div className="rounded-lg border bg-card">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead
                          field="name"
                          currentSortField={sortField}
                          sortOrder={sortOrder}
                          onSort={handleSort}
                          className="w-1/3"
                        >
                          Name
                        </SortableTableHead>
                        <TableHead className="w-1/3">Type</TableHead>
                        <TableHead className="w-[110px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAddons.map((addon) => (
                        <TableRow key={addon.id}>
                          <TableCell className="font-medium">
                            {editingId === addon.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                placeholder="Addon name"
                                className="h-8"
                                autoFocus
                                disabled={isSubmitting}
                              />
                            ) : (
                              <span className="truncate">{addon.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editingId === addon.id ? (
                              <Select value={editingTypeId} onValueChange={setEditingTypeId} disabled={isSubmitting}>
                                <SelectTrigger className="h-8">
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {addonTypes?.map((type) => (
                                    <SelectItem key={type.id} value={type.id}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <span className="text-sm text-muted-foreground truncate">
                                {addon.addon_types?.name || "No type"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={addon.is_active}
                              onCheckedChange={() => handleToggleActive(addon.id, addon.is_active)}
                              disabled={isSubmitting || editingId === addon.id}
                              aria-label={`Set ${addon.name} ${addon.is_active ? "inactive" : "active"}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {editingId === addon.id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdate(addon.id)}
                                  disabled={isSubmitting || !editingName.trim() || !editingTypeId}
                                >
                                  {isSubmitting ? <Spinner size="sm" /> : "Save"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={cancelEditing}
                                  disabled={isSubmitting}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => startEditing(addon.id, addon.name, addon.addon_type_id)}
                                  disabled={isSubmitting}
                                >
                                  <EditIcon />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(addon.id, addon.name)}
                                  disabled={isSubmitting}
                                >
                                  <TrashIcon />
                                </Button>
                              </div>
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
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No addons yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </SheetContent>

      {/* Addon Type Manager Sheet */}
      <AddonTypeManager
        open={typeManagerOpen}
        onOpenChange={setTypeManagerOpen}
        residentialId={residentialId}
        onTypesUpdated={loadData}
      />
    </Sheet>
  );
}
