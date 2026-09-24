/**
 * Reusable create-form + editable table for a services catalog — used both
 * by ServiceManager (a residential's own extras) and GlobalServicesPanel
 * (the platform-wide catalog). Each row's icon is chosen via IconPicker,
 * with live "as you type the name" suggestions from searchServiceIcons.
 */

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { PlusIcon, DeleteIcon, EditIcon } from "@/components/icons";
import { IconCheck, IconX } from "@tabler/icons-react";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { getServiceIcon, searchServiceIcons } from "@/lib/serviceIcons";
import { IconPicker } from "@/components/amenities/IconPicker";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/useI18n";
import type { Service } from "@/types/amenities.types";

/** Live "as you type the name" icon suggestions (e.g. "sillas" -> chair icons). */
function IconSuggestions({
  query,
  value,
  onPick,
  disabled,
}: {
  query: string;
  value: string | null;
  onPick: (iconName: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  if (!query.trim()) return null;
  const suggestions = searchServiceIcons(query, 6);
  if (suggestions.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground">{t("amenities.serviceCatalog.suggestionsLabel")}</span>
      {suggestions.map((opt) => (
        <button
          key={opt.name}
          type="button"
          title={opt.keywords[0]}
          disabled={disabled}
          onClick={() => onPick(opt.name)}
          className={cn(
            "flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            value === opt.name && "bg-accent text-accent-foreground ring-1 ring-primary",
          )}
        >
          <opt.Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
}

interface ServiceCatalogEditorProps {
  services: Service[];
  isLoading: boolean;
  isSubmitting: boolean;
  createService: (name: string, icon: string | null) => Promise<boolean>;
  updateService: (id: string, name: string, icon: string | null) => Promise<boolean>;
  deleteService: (id: string) => Promise<boolean>;
  toggleActive: (id: string, currentStatus: boolean) => Promise<void>;
  addPlaceholder?: string;
  emptyLabel: string;
}

export function ServiceCatalogEditor({
  services,
  isLoading,
  isSubmitting,
  createService,
  updateService,
  deleteService,
  toggleActive,
  addPlaceholder,
  emptyLabel,
}: ServiceCatalogEditorProps) {
  const { t } = useI18n();
  const resolvedAddPlaceholder = addPlaceholder ?? t("amenities.serviceCatalog.namePlaceholder");
  const [name, setName] = useState("");
  const [icon, setIcon] = useState<string | null>(null);
  const [iconTouched, setIconTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState<string | null>(null);

  // Auto-pick the best-matching icon as the name is typed, e.g. "sillas" ->
  // a chair icon — but stop once the admin has explicitly chosen one.
  useEffect(() => {
    if (iconTouched || !name.trim()) return;
    const [best] = searchServiceIcons(name, 1);
    if (best) setIcon(best.name);
  }, [name, iconTouched]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await createService(name.trim(), icon);
    if (ok) {
      setName("");
      setIcon(null);
      setIconTouched(false);
    }
  };

  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setEditName(service.name);
    setEditIcon(service.icon);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const ok = await updateService(editingId, editName.trim(), editIcon);
    if (ok) setEditingId(null);
  };

  const handleDelete = (id: string, serviceName: string) => {
    confirmDeleteToast(serviceName, async () => {
      await deleteService(id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex gap-2">
          <IconPicker
            value={icon}
            onChange={(next) => {
              setIcon(next);
              setIconTouched(true);
            }}
            disabled={isSubmitting}
          />
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={resolvedAddPlaceholder}
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()}>
            {isSubmitting ? <Spinner size="sm" /> : <PlusIcon />}
          </Button>
        </div>
        <IconSuggestions
          query={name}
          value={icon}
          onPick={(next) => {
            setIcon(next);
            setIconTouched(true);
          }}
          disabled={isSubmitting}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : services.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[52px]" />
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="w-[100px]">{t("common.active")}</TableHead>
                <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => {
                const isEditing = editingId === service.id;
                const Icon = getServiceIcon(service.icon);
                return (
                  <TableRow key={service.id}>
                    <TableCell>
                      {isEditing ? (
                        <IconPicker value={editIcon} onChange={setEditIcon} disabled={isSubmitting} />
                      ) : (
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <div className="space-y-1.5">
                          <Input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isSubmitting} />
                          <IconSuggestions query={editName} value={editIcon} onPick={setEditIcon} disabled={isSubmitting} />
                        </div>
                      ) : (
                        service.name
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={service.is_active}
                        onCheckedChange={() => toggleActive(service.id, service.is_active)}
                        disabled={isSubmitting || isEditing}
                        aria-label={t("amenities.serviceCatalog.toggleLabel", {
                          name: service.name,
                          state: service.is_active ? t("common.inactive") : t("common.active"),
                        })}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={saveEdit} disabled={isSubmitting || !editName.trim()}>
                            <IconCheck className="h-5 w-5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={cancelEdit} disabled={isSubmitting}>
                            <IconX className="h-5 w-5" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => startEdit(service)} disabled={isSubmitting}>
                            <EditIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(service.id, service.name)}
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
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">{emptyLabel}</div>
      )}
    </div>
  );
}
