import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { useI18n } from "@/i18n/useI18n";

interface NamedTypeEntity {
  id: string;
  name: string;
  is_active: boolean;
}

interface NamedTypeTableProps<T extends NamedTypeEntity> {
  entityLabel: string;
  items: T[];
  isLoading: boolean;
  isSubmitting: boolean;
  onUpdate: (id: string, name: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
  onToggleActive: (id: string, currentStatus: boolean) => Promise<void>;
}

export function NamedTypeTable<T extends NamedTypeEntity>({
  entityLabel,
  items,
  isLoading,
  isSubmitting,
  onUpdate,
  onDelete,
  onToggleActive,
}: NamedTypeTableProps<T>) {
  const { t } = useI18n();
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
  } = usePaginatedSortedData<T, "name">({
    data: items,
    defaultSortField: "name",
    itemsPerPage: 10,
  });

  // Reset to page 1 whenever the list is reloaded (including after a
  // create/update/delete), matching the original managers' behavior.
  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  const startEditing = (id: string, name: string) => {
    setEditingId(id);
    setEditingName(name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    const ok = await onUpdate(id, editingName.trim());
    if (ok) cancelEditing();
  };

  const handleDelete = (id: string, name: string) => {
    confirmDeleteToast(name, async () => {
      await onDelete(id);
    });
  };

  const lowerLabel = entityLabel.toLowerCase();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Spinner />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-gates-text-secondary">
        {t("namedType.table.empty", { entityLabel: lowerLabel })}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold text-gates-text-primary">
        {t("namedType.table.count", { count: totalItems, entityLabel: lowerLabel })}
      </p>

      <div className="flex items-center gap-4 rounded-xl bg-gates-canvas p-4 text-xs font-medium text-gates-text-secondary">
        <button
          type="button"
          className="flex flex-1 cursor-pointer items-center gap-1 text-left"
          onClick={() => handleSort("name")}
        >
          {t("common.name")}
          {sortField === "name" && <span>{sortOrder === "asc" ? "↑" : "↓"}</span>}
        </button>
        <span className="w-20">{t("common.active")}</span>
        <span className="w-16 text-right">{t("common.actions")}</span>
      </div>

      {paginatedItems.map((item) => (
        <div key={item.id} className="flex items-center gap-4 px-4 py-2">
          {editingId === item.id ? (
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleUpdate(item.id);
                if (e.key === "Escape") cancelEditing();
              }}
              className="h-9 flex-1"
              autoFocus
              disabled={isSubmitting}
            />
          ) : (
            <span className="flex-1 truncate text-sm text-gates-text-primary">{item.name}</span>
          )}

          {editingId === item.id ? (
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => handleUpdate(item.id)} disabled={isSubmitting || !editingName.trim()}>
                {isSubmitting ? <Spinner size="sm" /> : t("common.save")}
              </Button>
              <Button size="sm" variant="outline" onClick={cancelEditing} disabled={isSubmitting}>
                {t("common.cancel")}
              </Button>
            </div>
          ) : (
            <>
              <div className="w-20">
                <Badge
                  className={
                    item.is_active
                      ? "bg-gates-success-bg text-gates-success hover:bg-gates-success-bg"
                      : "bg-gates-subtle text-gates-text-secondary hover:bg-gates-subtle"
                  }
                >
                  {item.is_active ? t("common.active") : t("common.inactive")}
                </Badge>
              </div>
              <div className="w-16 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="rounded-full text-gates-text-brand"
                      disabled={isSubmitting}
                    >
                      ···
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => startEditing(item.id, item.name)}>
                      {t("common.edit")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleActive(item.id, item.is_active)}>
                      {item.is_active
                        ? t("namedType.table.setInactive", { name: item.name })
                        : t("namedType.table.setActive", { name: item.name })}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          )}
        </div>
      ))}

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
