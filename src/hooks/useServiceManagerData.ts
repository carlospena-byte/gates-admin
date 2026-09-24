/**
 * Data fetching and mutations for ServiceManager — the catalog of reusable
 * "featured services" tags (WiFi, sillas, toallas...) attached to
 * amenities. Mirrors useChargeManagerData.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { servicesService } from "@/services";
import type { Service } from "@/types/amenities.types";

export function useServiceManagerData(residentialId: string, open: boolean) {
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await servicesService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setServices(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const createService = useCallback(
    async (name: string, icon: string | null): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await servicesService.create({ residential_id: residentialId, name, icon });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error?.message || "Failed to create service");
        return false;
      }

      toast.success("Service created successfully");
      await reload();
      return true;
    },
    [residentialId, reload],
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
