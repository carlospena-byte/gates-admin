import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { EditIcon, DeleteIcon } from "@/components/icons";
import { useI18n } from "@/i18n/useI18n";
import type { LocationTypeDefinition } from "@/types/unit-wizard.types";

interface LocationTypeTableProps {
  locationTypes: LocationTypeDefinition[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, name: string, code: string, level: number) => Promise<boolean>;
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
  const { t } = useI18n();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingCode, setEditingCode] = useState("");
  const [editingLevel, setEditingLevel] = useState("1");

  const startEditing = (type: LocationTypeDefinition) => {
    setEditingId(type.id);
    setEditingName(type.name);
    setEditingCode(type.code);
    setEditingLevel(String(type.level));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
    setEditingCode("");
    setEditingLevel("1");
  };

  const parsedEditingLevel = Number.parseInt(editingLevel, 10);
  const isEditingLevelValid = Number.isInteger(parsedEditingLevel) && parsedEditingLevel >= 1;

  const handleUpdate = async (id: string) => {
    if (!editingName.trim() || !editingCode.trim() || !isEditingLevelValid) return;
    const ok = await onUpdate(id, editingName.trim(), editingCode.trim(), parsedEditingLevel);
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
        {t("locationType.table.title")}
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
                <TableHead className="w-1/4">{t("common.name")}</TableHead>
                <TableHead className="w-1/4">{t("locationType.code")}</TableHead>
                <TableHead className="w-[90px]">{t("locationType.level")}</TableHead>
                <TableHead className="w-[110px]">{t("common.active")}</TableHead>
                <TableHead className="w-[140px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[...locationTypes]
                .sort((a, b) => a.level - b.level || a.name.localeCompare(b.name))
                .map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium">
                    {editingId === type.id ? (
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder={t("common.name")}
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
                        placeholder={t("locationType.table.codePlaceholder")}
                        className="h-8"
                        disabled={isSubmitting}
                      />
                    ) : (
                      <code className="text-sm bg-muted px-2 py-1 rounded">{type.code}</code>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === type.id ? (
                      <Input
                        type="number"
                        min={1}
                        value={editingLevel}
                        onChange={(e) => setEditingLevel(e.target.value)}
                        className="h-8"
                        disabled={isSubmitting}
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">{type.level}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={type.is_active}
                      onCheckedChange={() => onToggleActive(type.id, type.is_active)}
                      disabled={isSubmitting || editingId === type.id}
                      aria-label={t("locationType.table.toggleAriaLabel", { name: type.name })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    {editingId === type.id ? (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(type.id)}
                          disabled={
                            isSubmitting || !editingName.trim() || !editingCode.trim() || !isEditingLevelValid
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
                        <Button size="sm" variant="ghost" onClick={() => startEditing(type)} disabled={isSubmitting}>
                          <EditIcon />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(type.id, type.name)}
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
        <div className="text-center py-8 text-sm text-muted-foreground">
          {t("locationType.table.empty")}
        </div>
      )}
    </div>
  );
}
