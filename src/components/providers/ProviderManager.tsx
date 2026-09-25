/**
 * Provider Manager
 * Side sheet, scoped to one residential: shows the shared global catalog
 * (read-only — managed by platform admins in GlobalProvidersPanel) plus
 * this residential's own extra providers (full CRUD via
 * ProviderCatalogEditor). Mirrors ServiceManager.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ProviderCatalogEditor } from "@/components/providers/ProviderCatalogEditor";
import { useProviderManagerData } from "@/hooks/useProviderManagerData";
import { useI18n } from "@/i18n/useI18n";
import type { MessageKey } from "@/i18n/messages";

interface ProviderManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function ProviderManager({ open, onOpenChange, residentialId }: ProviderManagerProps) {
  const { t } = useI18n();
  const { providers, isLoading, isSubmitting, createProvider, updateProvider, deleteProvider, toggleActive } =
    useProviderManagerData(residentialId, open);

  const globalProviders = useMemo(() => providers.filter((p) => p.residential_id === null), [providers]);
  const ownProviders = useMemo(() => providers.filter((p) => p.residential_id !== null), [providers]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t("providers.manager.title")}</SheetTitle>
          <SheetDescription>{t("providers.manager.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("providers.manager.myProviders")}
              {ownProviders.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  {t("amenities.serviceManager.totalCount", { count: ownProviders.length })}
                </span>
              )}
            </label>
            <ProviderCatalogEditor
              residentialId={residentialId}
              providers={ownProviders}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              createProvider={createProvider}
              updateProvider={updateProvider}
              deleteProvider={deleteProvider}
              toggleActive={toggleActive}
              emptyLabel={t("providers.manager.myProvidersEmpty")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("providers.manager.globalCatalog")}
              {globalProviders.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  {t("amenities.serviceManager.totalCount", { count: globalProviders.length })}
                </span>
              )}
            </label>
            <p className="text-xs text-muted-foreground">{t("providers.manager.globalHint")}</p>

            {!isLoading && globalProviders.length > 0 && (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[52px]" />
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead>{t("visitors.delivery.typeLabel")}</TableHead>
                      <TableHead className="text-right">{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalProviders.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell>
                          {provider.logo_url ? (
                            <img src={provider.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-md bg-muted" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{provider.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {t(`visitors.delivery.type.${provider.kind}` as MessageKey)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge variant={provider.is_active ? "default" : "secondary"}>
                            {provider.is_active ? t("common.active") : t("common.inactive")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
