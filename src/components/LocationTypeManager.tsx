/**
 * Location Type Manager
 * Mini CRUD for managing location type definitions
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { locationTypeService } from "@/services";
import type { LocationTypeDefinition } from "@/types/unit-wizard.types";

interface LocationTypeManagerProps {
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

export function LocationTypeManager({ open, onOpenChange, residentialId, onTypesUpdated }: LocationTypeManagerProps) {
  const [locationTypes, setLocationTypes] = useState<LocationTypeDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLocationTypes = useCallback(async () => {
    setIsLoading(true);
    const result = await locationTypeService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setLocationTypes(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void loadLocationTypes();
  }, [open, loadLocationTypes]);

  const handleCreate = async () => {
    if (!newName.trim() || !newCode.trim()) return;

    setIsSubmitting(true);

    const result = await locationTypeService.create({
      residential_id: residentialId,
      name: newName.trim(),
      code: newCode.trim().toUpperCase(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setNewName("");
      setNewCode("");
      toast.success("Location type created successfully");
      await loadLocationTypes();
      onTypesUpdated?.();
    } else {
      toast.error(result.error?.message || "Failed to create location type");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingCode.trim()) return;

    setIsSubmitting(true);

    const result = await locationTypeService.update(id, {
      name: editingName.trim(),
      code: editingCode.trim().toUpperCase(),
    });

    setIsSubmitting(false);

    if (result.success) {
      setEditingId(null);
      setEditingName("");
      setEditingCode("");
      toast.success("Location type updated successfully");
      await loadLocationTypes();
      onTypesUpdated?.();
    } else {
      toast.error(result.error?.message || "Failed to update location type");
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
          const result = await locationTypeService.delete(id);
          setIsSubmitting(false);

          if (result.success) {
            toast.success("Location type deleted successfully");
            await loadLocationTypes();
            onTypesUpdated?.();
          } else {
            toast.error(result.error?.message || "Failed to delete location type");
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
    const result = await locationTypeService.toggleActive(id, currentStatus);
    if (result.success) {
      await loadLocationTypes();
      onTypesUpdated?.();
    } else {
      toast.error("Failed to toggle location type status");
    }
  };

  const startEditing = (type: LocationTypeDefinition) => {
    setEditingId(type.id);
    setEditingName(type.name);
    setEditingCode(type.code);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingCode("");
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>Manage Location Types</SheetTitle>
          <SheetDescription>
            Define the types of locations available (e.g., Tower, Floor, Polygon)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {/* Create Form */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Add New Location Type</label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Display name (e.g., Tower)"
                disabled={isSubmitting}
              />
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                placeholder="Code (e.g., TOWER)"
                disabled={isSubmitting}
              />
            </div>
            <Button
              onClick={handleCreate}
              disabled={isSubmitting || !newName.trim() || !newCode.trim()}
              className="w-full"
            >
              {isSubmitting ? <Spinner size="sm" /> : <><PlusIcon /> <span className="ml-2">Add Type</span></>}
            </Button>
          </div>

          {/* List */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Existing Location Types
              {locationTypes.length > 0 && (
                <span className="ml-2 text-muted-foreground">({locationTypes.length} total)</span>
              )}
            </label>

            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Spinner />
              </div>
            ) : locationTypes.length > 0 ? (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-1/3">Name</TableHead>
                      <TableHead className="w-1/3">Code</TableHead>
                      <TableHead className="w-[110px]">Active</TableHead>
                      <TableHead className="w-[140px] text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locationTypes.map((type) => (
                      <TableRow key={type.id}>
                        <TableCell className="font-medium">
                          {editingId === type.id ? (
                            <Input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              placeholder="Name"
                              className="h-8"
                              autoFocus
                              disabled={isSubmitting}
                            />
                          ) : (
                            <span>{type.name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === type.id ? (
                            <Input
                              value={editingCode}
                              onChange={(e) => setEditingCode(e.target.value.toUpperCase())}
                              placeholder="CODE"
                              className="h-8"
                              disabled={isSubmitting}
                            />
                          ) : (
                            <code className="text-sm bg-muted px-2 py-1 rounded">{type.code}</code>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={type.is_active}
                            onCheckedChange={() => handleToggleActive(type.id, type.is_active)}
                            disabled={isSubmitting || editingId === type.id}
                            aria-label={`Toggle ${type.name} active status`}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === type.id ? (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleUpdate(type.id)}
                                disabled={isSubmitting || !editingName.trim() || !editingCode.trim()}
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
                                onClick={() => startEditing(type)}
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
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No location types yet. Create one above.
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
