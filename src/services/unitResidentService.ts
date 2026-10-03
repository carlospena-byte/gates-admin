/**
 * Unit Resident Service
 * Base CRUD (unit-scoped, used by UnitResidentsPanel) via createCrudService,
 * plus listByResidential for the residential-wide Residents page.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { createCrudService } from "./createCrudService";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type {
  CreateUnitResidentDto,
  ResidentWithStatus,
  UnitResident,
  UpdateUnitResidentDto,
} from "@/types/unit-wizard.types";

const baseService = createCrudService<UnitResident, CreateUnitResidentDto, UpdateUnitResidentDto>(
  "unit_residents",
  { orderBy: "full_name", parentColumn: "unit_id" },
);

// Generated types mark every view column nullable (Postgres/PostgREST can't
// prove a view column is non-null even when it's copied straight from a
// not-null base column), so the query result needs the same escape hatch
// createCrudService uses for its `any`-typed table parameter.
const statusView = () => requireSupabase().from("unit_residents_with_status") as any; // eslint-disable-line @typescript-eslint/no-explicit-any

// Reads from unit_residents_with_status (not the base table) so the
// residential-wide Residents page can show each resident's real
// active/invited/expired/not_invited status — see
// supabase/migrations/20261011000000_fix_invitation_flow.sql.
function listByResidentialWithStatus(residentialId: string): Promise<ApiResult<ResidentWithStatus[]>> {
  return wrapResult("Failed to list residents", async () => {
    const rows = await unwrap<ResidentWithStatus[]>(
      statusView().select("*").eq("residential_id", residentialId).order("full_name", { ascending: true }),
    );
    return rows ?? [];
  });
}

// Same view, scoped to a single unit — used by UnitResidentsPanel so it can
// warn before deleting a resident who already has real access, same as the
// residential-wide Residents page.
function listByUnitWithStatus(unitId: string): Promise<ApiResult<ResidentWithStatus[]>> {
  return wrapResult("Failed to list residents", async () => {
    const rows = await unwrap<ResidentWithStatus[]>(
      statusView().select("*").eq("unit_id", unitId).order("full_name", { ascending: true }),
    );
    return rows ?? [];
  });
}

// Deletes a resident's contact row and revokes whatever access it granted
// (pending invitations, and unit_members if they already registered) —
// unlike the base CRUD delete, which only touches unit_residents. Returns
// whether real access was revoked. See remove_unit_resident() in the same
// migration referenced above.
function removeResident(id: string): Promise<ApiResult<boolean>> {
  return wrapResult("Failed to remove resident", () =>
    unwrap<boolean>(requireSupabase().rpc("remove_unit_resident", { _id: id })),
  );
}

export interface EditResidentFields {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unitId: string;
}

// Admin edit: updates the contact row and, when the resident already has an
// account, pushes name/phone to their profile (and moves their unit
// membership if the property changed). See update_unit_resident() in
// supabase/migrations/20261119000000_resident_edit_and_profile_sync.sql.
function updateResident(id: string, fields: EditResidentFields): Promise<ApiResult<UnitResident>> {
  return wrapResult("Failed to update resident", async () => {
    // Generated types mark the generated full_name column nullable.
    const row = await unwrap(
      requireSupabase().rpc("update_unit_resident", {
        _id: id,
        _first_name: fields.firstName,
        _last_name: fields.lastName,
        _email: fields.email,
        _phone: fields.phone,
        _unit_id: fields.unitId,
      }),
    );
    return row as unknown as UnitResident;
  });
}

export const unitResidentService = {
  ...baseService,
  listByResidentialWithStatus,
  listByUnitWithStatus,
  removeResident,
  updateResident,
};
