/**
 * Incident Type Service
 * Flat CRUD via createCrudService (same composition as unitTypeService.ts),
 * plus setVisibleRoles to manage the incident_type_roles join table — which
 * roles (beyond owner/admin, always fully granted) can see and manage every
 * incident of a given type.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { createCrudService } from "./createCrudService";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type {
  CreateIncidentTypeDto,
  IncidentType,
  IncidentTypeAssignableRole,
  UpdateIncidentTypeDto,
} from "@/types/incidentType.types";

const baseService = createCrudService<IncidentType, CreateIncidentTypeDto, UpdateIncidentTypeDto>(
  "incident_types",
  {
    selectClause: "*, incident_type_roles(role)",
  },
);

function setVisibleRoles(
  incidentTypeId: string,
  roles: IncidentTypeAssignableRole[],
): Promise<ApiResult<void>> {
  return wrapResult("Failed to update incident type roles", async () => {
    const db = requireSupabase();
    await unwrap<null>(db.from("incident_type_roles").delete().eq("incident_type_id", incidentTypeId));
    if (roles.length > 0) {
      await unwrap<null>(
        db
          .from("incident_type_roles")
          .insert(roles.map((role) => ({ incident_type_id: incidentTypeId, role }))),
      );
    }
  });
}

export const incidentTypeService = { ...baseService, setVisibleRoles };
