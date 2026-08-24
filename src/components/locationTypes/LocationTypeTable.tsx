import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { EditIcon, TrashIcon } from "@/components/icons";
import type { LocationTypeDefinition } from "@/types/unit-wizard.types";

interface LocationTypeTableProps {
  locationTypes: LocationTypeDefinition[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, name: string, code: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function LocationTypeTable({
  locationTypes,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: LocationTypeTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCode, setEditingCode] = useState("");

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

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingCode.trim()) return;
    const ok = await onUpdate(id, editingName.trim(), editingCode.trim());
    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  return (
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
                      onCheckedChange={() => onToggleActive(type.id, type.is_active)}
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
                        <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => startEditing(type)} disabled={isSubmitting}>
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
  );
}
