/**
 * Platform-admin panel for the global providers catalog (residential_id
 * null) — delivery companies/vendors/couriers every residential sees, on
 * top of whatever extras they add themselves via ProviderManager.
 */

import { ProviderCatalogEditor } from "@/components/providers/ProviderCatalogEditor";
import { useGlobalProvidersData } from "@/hooks/useGlobalProvidersData";
import { useI18n } from "@/i18n/useI18n";

export function GlobalProvidersPanel() {
  const { t } = useI18n();
  const { providers, isLoading, isSubmitting, createProvider, updateProvider, deleteProvider, toggleActive } =
    useGlobalProvidersData();

  return (
    <ProviderCatalogEditor
      residentialId={null}
      providers={providers}
      isLoading={isLoading}
      isSubmitting={isSubmitting}
      createProvider={createProvider}
      updateProvider={updateProvider}
      deleteProvider={deleteProvider}
      toggleActive={toggleActive}
      emptyLabel={t("providers.catalog.empty")}
    />
  );
}
