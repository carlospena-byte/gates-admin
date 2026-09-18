/**
 * Visitor / gate-access types.
 * Mirrors the plain hand-written style of unit-wizard.types.ts rather than
 * deriving from the generated Database type, matching the rest of the app.
 */

export type VisitorStatus = "scheduled" | "active" | "inside" | "completed" | "cancelled" | "rejected";

// Someone on-site for a bounded window (guest, delivery, contractor...).
// unit_id is nullable — a visitor isn't always tied to a specific unit yet.
export interface Visitor {
  id: string;
  residential_id: string;
  unit_id: string | null;
  invited_by: string | null;
  name: string;
  phone: string | null;
  plate: string | null;
  valid_from: string;
  valid_until: string;
  access_code: string | null;
  status: VisitorStatus;
  notes: string | null;
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
