/**
 * Incident-reporting types. Same plain hand-written style as
 * visitor.types.ts rather than deriving from the generated Database type.
 */

export type IncidentPriority = "low" | "medium" | "high" | "urgent";
export type IncidentStatus = "new" | "in_progress" | "resolved" | "closed";

export interface Incident {
  id: string;
  residential_id: string;
  unit_id: string | null;
  reported_by: string | null;
  incident_type_id: string | null;
  title: string;
  description: string | null;
  location: string | null;
  priority: IncidentPriority;
  status: IncidentStatus;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
}

export interface CreateIncidentDto {
  residential_id: string;
  unit_id?: string | null;
  reported_by?: string | null;
  incident_type_id?: string | null;
  title: string;
  description?: string | null;
  location?: string | null;
  priority?: IncidentPriority;
  status?: IncidentStatus;
}

export interface UpdateIncidentDto {
  unit_id?: string | null;
  incident_type_id?: string | null;
  title?: string;
  description?: string | null;
  location?: string | null;
  priority?: IncidentPriority;
  status?: IncidentStatus;
  assigned_to?: string | null;
  resolved_at?: string | null;
}

// Incident joined with reporter/assignee emails, the unit name and the
// incident type's name, same join-on-select shape as VisitorWithInviter/UnitWithOwner.
export type IncidentWithRelations = Incident & {
  reporter: { email: string | null } | null;
  assignee: { email: string | null } | null;
  units: { name: string } | null;
  incident_types: { name: string } | null;
};

export interface IncidentAttachment {
  id: string;
  incident_id: string;
  residential_id: string;
  storage_path: string;
  uploaded_by: string | null;
  created_at: string;
}
