/**
 * Service Manager
 * Side sheet, scoped to one residential: shows the shared global catalog
 * (read-only — managed by platform admins in GlobalServicesPanel) plus this
 * residential's own extra service tags (full CRUD via ServiceCatalogEditor).
 * Attaching a service to an amenity happens in AmenityServicesPicker, not
 * here.
 */

import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getServiceIcon } from "@/lib/serviceIcons";
import { ServiceCatalogEditor } from "@/components/amenities/ServiceCatalogEditor";
import { useServiceManagerData } from "@/hooks/useServiceManagerData";
import { useI18n } from "@/i18n/useI18n";

interface ServiceManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  residentialId: string;
}

export function ServiceManager({ open, onOpenChange, residentialId }: ServiceManagerProps) {
  const { t } = useI18n();
  const { services, isLoading, isSubmitting, createService, updateService, deleteService, toggleActive } =
    useServiceManagerData(residentialId, open);

  const globalServices = useMemo(() => services.filter((s) => s.residential_id === null), [services]);
  const ownServices = useMemo(() => services.filter((s) => s.residential_id !== null), [services]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <SheetHeader>
          <SheetTitle>{t("amenities.serviceManager.title")}</SheetTitle>
          <SheetDescription>{t("amenities.serviceManager.description")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("amenities.serviceManager.myServices")}
              {ownServices.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  {t("amenities.serviceManager.totalCount", { count: ownServices.length })}
                </span>
              )}
            </label>
            <ServiceCatalogEditor
              services={ownServices}
              isLoading={isLoading}
              isSubmitting={isSubmitting}
              createService={createService}
              updateService={updateService}
              deleteService={deleteService}
              toggleActive={toggleActive}
              emptyLabel={t("amenities.serviceManager.myServicesEmpty")}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("amenities.serviceManager.globalCatalog")}
              {globalServices.length > 0 && (
                <span className="ml-2 text-muted-foreground">
                  {t("amenities.serviceManager.totalCount", { count: globalServices.length })}
                </span>
              )}
            </label>
            <p className="text-xs text-muted-foreground">{t("amenities.serviceManager.globalHint")}</p>

            {!isLoading && globalServices.length > 0 && (
              <div className="rounded-lg border bg-card">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[52px]" />
                      <TableHead>{t("common.name")}</TableHead>
                      <TableHead className="w-[100px] text-right">{t("common.status")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {globalServices.map((service) => {
                      const Icon = getServiceIcon(service.icon);
                      return (
                        <TableRow key={service.id}>
                          <TableCell>
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </TableCell>
                          <TableCell className="font-medium">{service.name}</TableCell>
                          <TableCell className="text-right">
                            <Badge variant={service.is_active ? "default" : "secondary"}>
                              {service.is_active ? t("common.active") : t("common.inactive")}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
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
