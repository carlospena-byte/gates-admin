/**
 * Visitor / gate-access types.
 * Mirrors the plain hand-written style of unit-wizard.types.ts rather than
 * deriving from the generated Database type, matching the rest of the app.
 */

export type VisitorStatus =
  | "pending_registration"
  | "scheduled"
  | "active"
  | "inside"
  | "completed"
  | "cancelled"
  | "rejected";

export type VisitType = "frequent" | "delivery" | "fastlane";
export type VisitorRole = "familiar" | "entrenador" | "empleado" | "proveedor" | "visitante" | "invitado";
export type ProviderKind = "proveedor" | "delivery" | "paqueteria";
export type Recurrence = "mon_fri" | "mon_sat" | "daily" | "custom";
export type ScheduleType = "all_day" | "custom";
export type RecurrenceDay = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type NotificationChannel = "sms" | "whatsapp";

// Someone on-site for a bounded window (guest, delivery, contractor...).
// unit_id is nullable — a visitor isn't always tied to a specific unit yet.
// name is nullable only for visit_type "fastlane" before self-registration.
export interface Visitor {
  id: string;
  residential_id: string;
  unit_id: string | null;
  invited_by: string | null;
  name: string | null;
  phone: string | null;
  plate: string | null;
  valid_from: string;
  valid_until: string;
  access_code: string | null;
  status: VisitorStatus;
  notes: string | null;
  visit_type: VisitType;
  visitor_role: VisitorRole | null;
  provider_kind: ProviderKind | null;
  recurrence: Recurrence | null;
  recurrence_days: RecurrenceDay[] | null;
  schedule_type: ScheduleType;
  schedule_start: string | null;
  schedule_end: string | null;
  registration_channel: NotificationChannel | null;
  id_photo_path: string | null;
  registered_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateVisitorDto {
  residential_id: string;
  unit_id?: string | null;
  invited_by?: string | null;
  name: string;
  phone?: string | null;
  plate?: string | null;
  valid_from: string;
  valid_until: string;
  access_code?: string | null;
  status?: VisitorStatus;
  notes?: string | null;
  visit_type?: VisitType;
  visitor_role?: VisitorRole | null;
  provider_kind?: ProviderKind | null;
  recurrence?: Recurrence | null;
  recurrence_days?: RecurrenceDay[] | null;
  schedule_type?: ScheduleType;
  schedule_start?: string | null;
  schedule_end?: string | null;
}

export interface UpdateVisitorDto {
  unit_id?: string | null;
  name?: string;
  phone?: string | null;
  plate?: string | null;
  valid_from?: string;
  valid_until?: string;
  access_code?: string | null;
  status?: VisitorStatus;
  notes?: string | null;
  visitor_role?: VisitorRole | null;
  provider_kind?: ProviderKind | null;
  recurrence?: Recurrence | null;
  recurrence_days?: RecurrenceDay[] | null;
  schedule_type?: ScheduleType;
  schedule_start?: string | null;
  schedule_end?: string | null;
}

// Visitor joined with the inviting profile's email, for the "Invited By"
// table column — same join-on-select shape as UnitWithOwner.
export type VisitorWithInviter = Visitor & {
  profiles: { email: string | null } | null;
};

// A registered vehicle — optionally tied to a unit and/or a specific
// resident, same "contact info only" spirit as UnitResident.
export interface Vehicle {
  id: string;
  residential_id: string;
  unit_id: string | null;
  resident_id: string | null;
  plate: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateVehicleDto {
  residential_id: string;
  unit_id?: string | null;
  resident_id?: string | null;
  plate: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  is_active?: boolean;
}

export interface UpdateVehicleDto {
  unit_id?: string | null;
  resident_id?: string | null;
  plate?: string;
  brand?: string | null;
  model?: string | null;
  color?: string | null;
  is_active?: boolean;
}

// Physical entry/exit bitácora — separate from Visitor so a visitor can be
// checked in/out more than once without losing history.
export interface AccessLog {
  id: string;
  residential_id: string;
  visitor_id: string;
  gate_name: string | null;
  checked_in_by: string | null;
  checked_in_at: string | null;
  checked_out_by: string | null;
  checked_out_at: string | null;
  created_at: string;
}
