/**
 * Reusable create-sheet + editable table for the providers catalog — used
 * both by ProviderManager (a residential's own extras) and
 * GlobalProvidersPanel (the platform-wide catalog). Mirrors
 * ServiceCatalogEditor, but with a `kind` select and a logo upload instead
 * of an icon picker (this is just for admins to recognize the courier/
 * vendor when logging a visit, not a directory people contact), a kind
 * filter over the table, and "add" as a side sheet instead of an inline row.
 */

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Spinner } from "@/components/LoadingStates";
import { Pagination } from "@/components/Pagination";
import { PlusIcon, DeleteIcon, EditIcon } from "@/components/icons";
import { IconCheck, IconX } from "@tabler/icons-react";
import { confirmDeleteToast } from "@/lib/confirmDeleteToast";
import { ProviderLogoUpload } from "@/components/providers/ProviderLogoUpload";
import { usePaginatedSortedData } from "@/hooks/usePaginatedSortedData";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";
import type { Provider, ProviderKind } from "@/types/provider.types";

const PROVIDER_KINDS: ProviderKind[] = ["proveedor", "delivery", "paqueteria"];
const KIND_FILTER_ALL = "all" as const;
type KindFilter = ProviderKind | typeof KIND_FILTER_ALL;

interface ProviderCatalogEditorProps {
  // null for the platform-wide catalog, a residential's id for its own
  // extras — only used to pick the storage folder a logo upload lands in.
  residentialId: string | null;
  providers: Provider[];
  isLoading: boolean;
  isSubmitting: boolean;
  createProvider: (name: string, kind: ProviderKind, logoUrl: string | null) => Promise<boolean>;
  updateProvider: (id: string, name: string, kind: ProviderKind, logoUrl: string | null) => Promise<boolean>;
  deleteProvider: (id: string) => Promise<boolean>;
  toggleActive: (id: string, currentStatus: boolean) => Promise<void>;
  emptyLabel: string;
}

export function ProviderCatalogEditor({
  residentialId,
  providers,
  isLoading,
  isSubmitting,
  createProvider,
  updateProvider,
  deleteProvider,
  toggleActive,
  emptyLabel,
}: ProviderCatalogEditorProps) {
  const { t } = useI18n();
  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [kind, setKind] = useState<ProviderKind>("delivery");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<KindFilter>(KIND_FILTER_ALL);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editKind, setEditKind] = useState<ProviderKind>("delivery");
  const [editLogoUrl, setEditLogoUrl] = useState<string | null>(null);

  const filteredProviders = useMemo(
    () => (kindFilter === KIND_FILTER_ALL ? providers : providers.filter((p) => p.kind === kindFilter)),
    [providers, kindFilter],
  );

  const {
    paginatedData: paginatedProviders,
    totalItems,
    totalPages,
    startIndex,
    endIndex,
    currentPage,
    setCurrentPage,
    resetPage,
    itemsPerPage,
    setItemsPerPage,
  } = usePaginatedSortedData({
    data: filteredProviders,
    defaultSortField: "name" as keyof Provider,
    itemsPerPage: 10,
  });

  useEffect(() => {
    resetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredProviders]);

  const resetAddForm = () => {
    setName("");
    setLogoUrl(null);
    setKind("delivery");
  };

  const handleCreate = async () => {
    if (!name.trim()) return;
    const ok = await createProvider(name.trim(), kind, logoUrl);
    if (ok) {
      resetAddForm();
      setAddOpen(false);
    }
  };

  const startEdit = (provider: Provider) => {
    setEditingId(provider.id);
    setEditName(provider.name);
    setEditKind(provider.kind);
    setEditLogoUrl(provider.logo_url);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const ok = await updateProvider(editingId, editName.trim(), editKind, editLogoUrl);
    if (ok) setEditingId(null);
  };

  const handleDelete = (id: string, providerName: string) => {
    confirmDeleteToast(providerName, async () => {
      await deleteProvider(id);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as KindFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={KIND_FILTER_ALL}>{t("common.all")}</SelectItem>
            {PROVIDER_KINDS.map((k) => (
              <SelectItem key={k} value={k}>
                {t(`visitors.delivery.type.${k}` as MessageKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => {
            resetAddForm();
            setAddOpen(true);
          }}
        >
          <PlusIcon />
          {t("providers.catalog.addButton")}
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Spinner />
        </div>
      ) : filteredProviders.length > 0 ? (
        <div className="rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[52px]" />
                <TableHead>{t("common.name")}</TableHead>
                <TableHead className="w-[140px]">{t("visitors.delivery.typeLabel")}</TableHead>
                <TableHead className="w-[100px]">{t("common.active")}</TableHead>
                <TableHead className="w-[100px] text-right">{t("common.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProviders.map((provider) => {
                const isEditing = editingId === provider.id;
                return (
                  <TableRow key={provider.id}>
                    <TableCell>
                      {isEditing ? (
                        <ProviderLogoUpload
                          residentialId={residentialId}
                          value={editLogoUrl}
                          onChange={setEditLogoUrl}
                          disabled={isSubmitting}
                        />
                      ) : provider.logo_url ? (
                        <img src={provider.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                      ) : (
                        <div className="h-8 w-8 rounded-md bg-muted" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      {isEditing ? (
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} disabled={isSubmitting} />
                      ) : (
                        provider.name
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Select value={editKind} onValueChange={(v) => setEditKind(v as ProviderKind)} disabled={isSubmitting}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PROVIDER_KINDS.map((k) => (
                              <SelectItem key={k} value={k}>
                                {t(`visitors.delivery.type.${k}` as MessageKey)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm text-muted-foreground">{t(`visitors.delivery.type.${provider.kind}` as MessageKey)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={provider.is_active}
                        onCheckedChange={() => toggleActive(provider.id, provider.is_active)}
                        disabled={isSubmitting || isEditing}
                        aria-label={provider.is_active ? t("common.setInactive") : t("common.setActive")}
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
                          <Button size="sm" variant="ghost" onClick={() => startEdit(provider)} disabled={isSubmitting}>
                            <EditIcon />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(provider.id, provider.name)}
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
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            startIndex={startIndex}
            endIndex={endIndex}
            onPageChange={setCurrentPage}
            itemsPerPage={itemsPerPage}
            onItemsPerPageChange={setItemsPerPage}
          />
        </div>
      ) : (
        <div className="text-center py-8 text-sm text-muted-foreground">{emptyLabel}</div>
      )}

      <Sheet open={addOpen} onOpenChange={setAddOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
          <SheetHeader>
            <SheetTitle>{t("providers.catalog.addButton")}</SheetTitle>
            <SheetDescription>{t("providers.catalog.addDescription")}</SheetDescription>
          </SheetHeader>

          <div className="space-y-4 py-6">
            <div className="flex items-center gap-3">
              <ProviderLogoUpload residentialId={residentialId} value={logoUrl} onChange={setLogoUrl} disabled={isSubmitting} />
              <span className="text-sm text-muted-foreground">{t("providers.catalog.uploadLogo")}</span>
            </div>

            <Select value={kind} onValueChange={(v) => setKind(v as ProviderKind)} disabled={isSubmitting}>
              <SelectTrigger label={t("visitors.delivery.typeLabel")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {t(`visitors.delivery.type.${k}` as MessageKey)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              label={t("common.name")}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("providers.catalog.namePlaceholder")}
              disabled={isSubmitting}
            />
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={isSubmitting}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? <Spinner size="sm" /> : t("common.add")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
