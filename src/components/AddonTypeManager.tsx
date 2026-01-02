/**
 * Addon Type Manager
 * Side sheet for managing addon types CRUD
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
import { Spinner } from "@/components/LoadingStates";
import { addonTypeService } from "@/services";
import { Pagination } from "@/components/Pagination";
import { SortableTableHead } from "@/components/SortableTableHead";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import type { AddonType } from "@/types/unit-wizard.types";

interface AddonTypeManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
  onTypesUpdated?: () => void;
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

export function AddonTypeManager({ open, onOpenChange, residentialId, onTypesUpdated }: AddonTypeManagerProps) {
  // Manual state management for data fetching
  const [addonTypes, setAddonTypes] = useState<AddonType[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Use pagination & sorting hook
  const {
    paginatedData: paginatedAddonTypes,
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
    data: addonTypes,
    defaultSortField: "name" as keyof AddonType,
    itemsPerPage: 10,
  });

  // Form state
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadAddonTypes = useCallback(async () => {
    setIsLoading(true);
    const result = await addonTypeService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setAddonTypes(result.data);
      resetPage(); // Reset to first page when data loads
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId, resetPage]);

  // Load data when sheet opens
  useEffect(() => {
    if (!open) return;
    void loadAddonTypes();
  }, [open, loadAddonTypes]);

  const handleCreate = async () => {
    if (!newName.trim()) return;

    setIsSubmitting(true);

    const result = await addonTypeService.create({
      residential_id: residentialId,
      name: newName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setNewName("");
      toast.success("Addon type created successfully");
      await loadAddonTypes();
      onTypesUpdated?.();
    } else {
      toast.error(result.error?.message || "Failed to create addon type");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    setIsSubmitting(true);

    const result = await addonTypeService.update(id, {
      name: editingName.trim(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setEditingId(null);
      setEditingName("");
      toast.success("Addon type updated successfully");
      await loadAddonTypes();
      onTypesUpdated?.();
    } else {
      toast.error(result.error?.message || "Failed to update addon type");
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
          const result = await addonTypeService.delete(id);
          setIsSubmitting(false);

          if (result.success) {
            toast.success("Addon type deleted successfully");
            await loadAddonTypes();
            onTypesUpdated?.();
          } else {
            toast.error(result.error?.message || "Failed to delete addon type");
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
    const result = await addonTypeService.toggleActive(id, currentStatus);
    if (result.success) {
      await loadAddonTypes();
      onTypesUpdated?.();
    } else {
      toast.error("Failed to toggle addon type status");
    }
  };

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Manage Addon Types</SheetTitle>
          <SheetDescription>
            Create and manage addon type categories (Parking, Storage, etc.)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-6">
          {/* Create Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Addon Type</label>
            <div className="flex gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Parking, Storage, Gym..."
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                disabled={isSubmitting}
              />
              <Button
                onClick={handleCreate}
                disabled={isSubmitting || !newName.trim()}
              >
                {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
              </Button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">
                Existing Addon Types
                {totalItems > 0 && (
                  <span className="ml-2 text-muted-foreground">({totalItems} total)</span>
                )}
              </label>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : addonTypes && addonTypes.length > 0 ? (
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
                          className="w-full"
                        >
                          Name
                        </SortableTableHead>
                        <TableHead className="w-[110px]">Active</TableHead>
                        <TableHead className="w-[140px] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedAddonTypes.map((type) => (
                        <TableRow key={type.id}>
                          <TableCell className="font-medium">
                            {editingId === type.id ? (
                              <Input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") handleUpdate(type.id);
                                  if (e.key === "Escape") cancelEditing();
                                }}
                                className="h-8"
                                autoFocus
                                disabled={isSubmitting}
                              />
                            ) : (
                              <span className="truncate">{type.name}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={type.is_active}
                              onCheckedChange={() => handleToggleActive(type.id, type.is_active)}
                              disabled={isSubmitting || editingId === type.id}
                              aria-label={`Set ${type.name} ${type.is_active ? "inactive" : "active"}`}
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            {editingId === type.id ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => handleUpdate(type.id)}
                                  disabled={isSubmitting || !editingName.trim()}
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
                                  onClick={() => startEditing(type.id, type.name)}
                                  disabled={isSubmitting}
                                >
                                  <EditIcon />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDelete(type.id, type.name)}
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
                No addon types yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
