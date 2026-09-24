/**
 * Platform-admin panel for the global services catalog (residential_id
 * null) — the shared list every residential sees in AmenityServicesPicker,
 * on top of whatever extras they add themselves via ServiceManager.
 */

import { ServiceCatalogEditor } from "@/components/amenities/ServiceCatalogEditor";
import { useGlobalServicesData } from "@/hooks/useGlobalServicesData";
import { useI18n } from "@/i18n/useI18n";

export function GlobalServicesPanel() {
  const { t } = useI18n();
  const { services, isLoading, isSubmitting, createService, updateService, deleteService, toggleActive } =
    useGlobalServicesData();

  return (
    <ServiceCatalogEditor
      services={services}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      createService={createService}
      updateService={updateService}
      deleteService={deleteService}
      toggleActive={toggleActive}
      emptyLabel={t("admin.globalServices.empty")}
    />
  );
}
