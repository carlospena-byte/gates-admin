/**
 * Configurable incident-type catalog (Settings). Same plain hand-written
 * style as unit_types/addon_types — see incident.types.ts.
 */

// Roles that CAN be granted extra visibility on an incident type, beyond
// owner/admin (who always have full access and are never stored here).
export type IncidentTypeAssignableRole = "security" | "member";

export interface IncidentType {
  id: string;
  residential_id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  incident_type_roles: { role: IncidentTypeAssignableRole }[];
}

export interface CreateIncidentTypeDto {
  residential_id: string;
  name: string;
}

export interface UpdateIncidentTypeDto {
  name?: string;
  is_active?: boolean;
}
