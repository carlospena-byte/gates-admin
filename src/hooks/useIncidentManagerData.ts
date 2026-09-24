/**
 * Data fetching and mutations for the Incidents page. Same shape as
 * useVisitorManagerData.ts: one residential-wide fetch, split into
 * New/In Progress/Resolved/Closed buckets client-side by the page.
 */

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import {
  incidentService,
  incidentTypeService,
  residentialUserService,
  unitService,
  type ResidentialUserWithProfile,
  type UnitWithOwner,
} from "@/services";
import type { CreateIncidentDto, IncidentPriority, IncidentStatus, IncidentWithRelations } from "@/types/incident.types";
import type { IncidentType } from "@/types/incidentType.types";

export interface IncidentFormPayload {
  title: string;
  description: string;
  incidentTypeId: string;
  location: string;
  unitId: string;
  reportedBy: string | null;
}

export function useIncidentManagerData(residentialId: string) {
  const [incidents, setIncidents] = useState<IncidentWithRelations[]>([]);
  const [units, setUnits] = useState<UnitWithOwner[]>([]);
  const [incidentTypes, setIncidentTypes] = useState<IncidentType[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<ResidentialUserWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);

    const [incidentsResult, unitsResult, usersResult, incidentTypesResult] = await Promise.all([
      incidentService.list(residentialId),
      unitService.listByResidential(residentialId),
      residentialUserService.listByResidential(residentialId),
      incidentTypeService.list(residentialId),
    ]);

    setIsLoading(false);

    if (incidentsResult.success) {
      setIncidents(incidentsResult.data);
    } else {
      toast.error(incidentsResult.error.message);
    }

    if (unitsResult.success) setUnits(unitsResult.data);
    if (usersResult.success) {
      setAssignableUsers(usersResult.data.filter((u) => u.role === "owner" || u.role === "admin" || u.role === "security"));
    }
    if (incidentTypesResult.success) {
      setIncidentTypes(incidentTypesResult.data.filter((it) => it.is_active));
    }
  }, [residentialId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const createIncident = useCallback(
    async (payload: IncidentFormPayload): Promise<boolean> => {
      setIsSubmitting(true);

      const dto: CreateIncidentDto = {
        residential_id: residentialId,
        unit_id: payload.unitId || null,
        reported_by: payload.reportedBy,
        title: payload.title,
        description: payload.description || null,
        incident_type_id: payload.incidentTypeId || null,
        location: payload.location || null,
      };

      const result = await incidentService.create(dto);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Incident reported");
      await reload();
      return true;
    },
    [residentialId, reload],
  );

  const deleteIncident = useCallback(
    async (id: string): Promise<boolean> => {
      setIsSubmitting(true);
      const result = await incidentService.delete(id);
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return false;
      }

      toast.success("Incident deleted");
      await reload();
      return true;
    },
    [reload],
  );

  const setStatus = useCallback(
    async (id: string, status: IncidentStatus) => {
      setIsSubmitting(true);
      const result = await incidentService.update(id, {
        status,
        resolved_at: status === "resolved" || status === "closed" ? new Date().toISOString() : null,
      });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await reload();
    },
    [reload],
  );

  const setPriority = useCallback(
    async (id: string, priority: IncidentPriority) => {
      setIsSubmitting(true);
      const result = await incidentService.update(id, { priority });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      await reload();
    },
    [reload],
  );

  const assignTo = useCallback(
    async (id: string, userId: string | null) => {
      setIsSubmitting(true);
      const result = await incidentService.update(id, { assigned_to: userId });
      setIsSubmitting(false);

      if (!result.success) {
        toast.error(result.error.message);
        return;
      }
      toast.success(userId ? "Incident assigned" : "Incident unassigned");
      await reload();
    },
    [reload],
  );

  return {
    incidents,
    units,
    incidentTypes,
    assignableUsers,
    isLoading,
    isSubmitting,
    reload,
    createIncident,
    deleteIncident,
    setStatus,
    setPriority,
    assignTo,
  };
}
