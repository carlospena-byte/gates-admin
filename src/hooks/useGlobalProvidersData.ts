/**
 * Data fetching and mutations for the platform-admin Global Providers panel
 * — the shared catalog (residential_id null) every residential sees.
 * Mirrors useGlobalServicesData, scoped to global rows only.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { providerService } from "@/services";
import type { Provider, ProviderKind } from "@/types/provider.types";

export function useGlobalProvidersData() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await providerService.listGlobal();
    setIsLoading(false);

    if (result.success) {
      setProviders(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createProvider = useCallback(
    async (name: string, kind: ProviderKind, logoUrl: string | null): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await providerService.create({ residential_id: null, name, kind, logo_url: logoUrl });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Provider created successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const updateProvider = useCallback(
    async (id: string, name: string, kind: ProviderKind, logoUrl: string | null): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await providerService.update(id, { name, kind, logo_url: logoUrl });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Provider updated successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const deleteProvider = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await providerService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Provider deleted successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await providerService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error("Failed to toggle provider status");
      }
    },
    [reload],
  );

  return { providers, isLoading, isSubmitting, reload, createProvider, updateProvider, deleteProvider, toggleActive };
}
