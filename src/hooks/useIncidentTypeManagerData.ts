/**
 * Data fetching and mutations for the Incident Types settings panel. Same
 * list/create/update/remove/toggleActive shape as useNamedTypeManagerData,
 * extended to also persist which extra roles (security/member) can see and
 * manage every incident of a type via incidentTypeService.setVisibleRoles.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { incidentTypeService } from "@/services";
import type { IncidentType, IncidentTypeAssignableRole } from "@/types/incidentType.types";

export function useIncidentTypeManagerData(residentialId: string, open: boolean) {
  const [items, setItems] = useState<IncidentType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    const result = await incidentTypeService.list(residentialId);
    setIsLoading(false);

    if (result.success) {
      setItems(result.data);
    } else {
      toast.error(result.error.message);
    }
  }, [residentialId]);

  useEffect(() => {
    if (!open) return;
    void reload();
  }, [open, reload]);

  const create = useCallback(
    async (name: string, roles: IncidentTypeAssignableRole[]): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await incidentTypeService.create({ residential_id: residentialId, name });

      if (!result.success) {
        setIsSubmitting(false);
        toast.error(result.error.message || "Failed to create incident type");
        return false;
      }

      const rolesResult = await incidentTypeService.setVisibleRoles(result.data.id, roles);
      setIsSubmitting(false);

      if (!rolesResult.success) {
        toast.error(rolesResult.error.message);
        await reload();
        return false;
      }

      toast.success("Incident Type created successfully");
      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const update = useCallback(
    async (
      id: string,
      changes: { name?: string; is_active?: boolean; roles?: IncidentTypeAssignableRole[] },
    ): Promise<boolean> => {
      setIsSubmitting(true);

      if (changes.name !== undefined || changes.is_active !== undefined) {
        const result = await incidentTypeService.update(id, {
          name: changes.name,
          is_active: changes.is_active,
        });
        if (!result.success) {
          setIsSubmitting(false);
          toast.error(result.error.message || "Failed to update incident type");
          return false;
        }
      }

      if (changes.roles !== undefined) {
        const rolesResult = await incidentTypeService.setVisibleRoles(id, changes.roles);
        if (!rolesResult.success) {
          setIsSubmitting(false);
          toast.error(rolesResult.error.message);
          return false;
        }
      }

      setIsSubmitting(false);
      toast.success("Incident Type updated successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await incidentTypeService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message || "Failed to delete incident type");
        return false;
      }

      toast.success("Incident Type deleted successfully");
      await reload();
      return true;
    },
    [reload],
  );

  const toggleActive = useCallback(
    async (id: string, currentStatus: boolean) => {
      const result = await incidentTypeService.toggleActive(id, currentStatus);
      if (result.success) {
        await reload();
      } else {
        toast.error("Failed to toggle incident type status");
      }
    },
    [reload],
  );

  return { items, isLoading, isSubmitting, create, update, remove, toggleActive };
}
