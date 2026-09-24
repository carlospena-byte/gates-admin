/**
 * Data fetching and mutations for the platform-admin Global Services panel
 * — the shared catalog (residential_id null) every residential sees.
 * Mirrors useServiceManagerData, scoped to global rows only.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { servicesService } from "@/services";
import type { Service } from "@/types/amenities.types";

export function useGlobalServicesData() {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await servicesService.listGlobal();
    setIsLoading(false);

    if (result.success) {
      setServices(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createService = useCallback(
    async (name: string, icon: string | null): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await servicesService.create({ residential_id: null, name, icon });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create service");
        return false;
      }

      toast.success("Service created successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const updateService = useCallback(
    async (id: string, name: string, icon: string | null): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await servicesService.update(id, { name, icon });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to update service");
        return false;
      }

      toast.success("Service updated successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const deleteService = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await servicesService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to delete service");
        return false;
      }

      toast.success("Service deleted successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await servicesService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error("Failed to toggle service status");
      }
    },
    [reload],
  );

  return { services, isLoading, isSubmitting, reload, createService, updateService, deleteService, toggleActive };
}
