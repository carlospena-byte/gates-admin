/**
 * Incident Service
 * Flat CRUD via createCrudService, same composition as visitorService.ts.
 * selectClause joins reporter/assignee emails, the unit name and the
 * incident type's name.
 */

import { createCrudService } from "./createCrudService";
import type { CreateIncidentDto, IncidentWithRelations, UpdateIncidentDto } from "@/types/incident.types";

export const incidentService = createCrudService<IncidentWithRelations, CreateIncidentDto, UpdateIncidentDto>(
  "incidents",
  {
    parentColumn: "residential_id",
    orderBy: "created_at",
    selectClause: "*, reporter:reported_by(email), assignee:assigned_to(email), units(name), incident_types(name)",
  },
);
