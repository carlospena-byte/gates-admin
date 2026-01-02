import { requireSupabase } from "../lib/supabaseClient";
import type {
  Residential,
  ResidentialUser,
  Unit,
  UnitMember,
  Profile,
  InsertResidential,
  InsertUnit,
  InsertUnitMember,
  ResidentialRole,
} from "../types/database.types";
import type { TablesUpdate } from "../types/database.types";
import type { UnitWithWizardData } from "../types/unit-wizard.types";

// ============================================================================
// Error Types
// ============================================================================

export class ApiError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

// ============================================================================
// Result Types
// ============================================================================

export type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; error: ApiError };

// Helper to create success result
function success<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

// Helper to create error result
function failure<T>(error: ApiError): ApiResult<T> {
  return { success: false, error };
}

// Helper to handle Supabase errors
function handleSupabaseError(error: unknown, context: string): ApiError {
  if (error instanceof Error) {
    return new ApiError(`${context}: ${error.message}`, undefined, error);
  }

  if (error && typeof error === "object") {
    const maybe = error as {
      message?: unknown;
      code?: unknown;
      details?: unknown;
      hint?: unknown;
      status?: unknown;
    };

    const message = typeof maybe.message === "string" ? maybe.message : "Unknown error";
    const code = typeof maybe.code === "string" ? maybe.code : undefined;
    const details = {
      details: maybe.details,
      hint: maybe.hint,
      status: maybe.status,
      raw: error,
    };

    return new ApiError(`${context}: ${message}`, code, details);
  }

  return new ApiError(`${context}: Unknown error`, undefined, error);
}

// ============================================================================
// Extended Types for Queries with Joins
// ============================================================================

export type ResidentialWithOwner = Residential & {
  profiles: Pick<Profile, "email"> | null;
};

export type UnitWithOwner = Unit & {
  profiles: Pick<Profile, "email"> | null;
  unit_type: { id: string; name: string } | null;
  location: { id: string; name: string; type: string } | null;
};

export type ResidentialUserWithProfile = ResidentialUser & {
  profiles: Pick<Profile, "email"> | null;
};

export type UnitMemberWithProfile = UnitMember & {
  profiles: Pick<Profile, "email"> | null;
};

// ============================================================================
// Profile Service
// ============================================================================

export const profileService = {
  async getProfile(userId: string): Promise<ApiResult<Profile | null>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to get profile"));
    }
  },

  async updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, "user_id" | "created_at">>,
  ): Promise<ApiResult<Profile>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to update profile"));
    }
  },
};

// ============================================================================
// Platform Admin Service
// ============================================================================

export const platformAdminService = {
  async isPlatformAdmin(userId: string): Promise<ApiResult<boolean>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw error;
      return success(!!data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to check platform admin status"));
    }
  },
};

// ============================================================================
// Residential Service
// ============================================================================

export const residentialService = {
  async list(): Promise<ApiResult<ResidentialWithOwner[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residentials")
        .select("*, profiles(email)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return success(data as ResidentialWithOwner[]);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to list residentials"));
    }
  },

  async getById(id: string): Promise<ApiResult<ResidentialWithOwner | null>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residentials")
        .select("*, profiles(email)")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return success(data as ResidentialWithOwner | null);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to get residential"));
    }
  },

  async create(residential: InsertResidential): Promise<ApiResult<Residential>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residentials")
        .insert(residential)
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to create residential"));
    }
  },

  async update(id: string, updates: TablesUpdate<"residentials">): Promise<ApiResult<Residential>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residentials")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to update residential"));
    }
  },

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("residentials").delete().eq("id", id);

      if (error) throw error;
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to delete residential"));
    }
  },
};

// ============================================================================
// Residential User Service
// ============================================================================

export const residentialUserService = {
  async listByResidential(
    residentialId: string,
  ): Promise<ApiResult<ResidentialUserWithProfile[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residential_users")
        .select("*, profiles(email)")
        .eq("residential_id", residentialId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return success(data as ResidentialUserWithProfile[]);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to list residential users"));
    }
  },

  async add(
    residentialId: string,
    userId: string,
    role: ResidentialRole,
  ): Promise<ApiResult<ResidentialUser>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residential_users")
        .insert({ residential_id: residentialId, user_id: userId, role })
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to add residential user"));
    }
  },

  async updateRole(
    residentialId: string,
    userId: string,
    role: ResidentialRole,
  ): Promise<ApiResult<ResidentialUser>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("residential_users")
        .update({ role })
        .eq("residential_id", residentialId)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to update residential user role"));
    }
  },

  async remove(residentialId: string, userId: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("residential_users")
        .delete()
        .eq("residential_id", residentialId)
        .eq("user_id", userId);

      if (error) throw error;
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to remove residential user"));
    }
  },
};

// ============================================================================
// Unit Service
// ============================================================================

export const unitService = {
  async listByResidential(residentialId: string): Promise<ApiResult<UnitWithOwner[]>> {
    try {
      const supabase = requireSupabase();

      if (import.meta.env.DEV) {
        console.log('📊 unitService.listByResidential called:', { residentialId });
      }

      const { data: units, error } = await supabase
        .from("units")
        .select(`
          *,
          unit_types(id, name),
          locations(id, name, type)
        `)
        .eq("residential_id", residentialId)
        .order("name", { ascending: true });

      if (import.meta.env.DEV) {
        console.log('📊 unitService.listByResidential result:', {
          unitsCount: units?.length ?? 0,
          error: error?.message,
          units: units?.map(u => ({ id: u.id, name: u.name }))
        });
      }

      if (error) throw error;

      const rows = (units ?? []) as any[];
      const ownerIds = Array.from(
        new Set(rows.map((u) => u.owner_user_id).filter(Boolean) as string[]),
      );

      const profileEmailByUserId = new Map<string, string | null>();
      if (ownerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id,email")
          .in("user_id", ownerIds);
        if (profilesError) throw profilesError;

        for (const profile of profiles ?? []) {
          profileEmailByUserId.set(profile.user_id, profile.email ?? null);
        }
      }

      const result: UnitWithOwner[] = rows.map((unit) => {
        const ownerId = unit.owner_user_id;
        const email = ownerId ? profileEmailByUserId.get(ownerId) ?? null : null;
        return {
          id: unit.id,
          residential_id: unit.residential_id,
          name: unit.name,
          unit_type_id: unit.unit_type_id,
          building_id: unit.building_id,
          floor_id: unit.floor_id,
          location_id: unit.location_id,
          owner_user_id: unit.owner_user_id,
          is_active: unit.is_active,
          created_at: unit.created_at,
          updated_at: unit.updated_at,
          profiles: email ? { email } : null,
          unit_type: unit.unit_types ? { id: unit.unit_types.id, name: unit.unit_types.name } : null,
          location: unit.locations ? { id: unit.locations.id, name: unit.locations.name, type: unit.locations.type } : null,
        };
      });

      return success(result);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to list units"));
    }
  },

  async getById(id: string): Promise<ApiResult<UnitWithOwner | null>> {
    try {
      const supabase = requireSupabase();
      const { data: unit, error } = await supabase
        .from("units")
        .select(`
          *,
          unit_types(id, name),
          locations(id, name, type)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;

      if (!unit) return success(null);

      const ownerId = (unit as any).owner_user_id;
      const unitData = unit as any;

      if (!ownerId) {
        return success({
          id: unitData.id,
          residential_id: unitData.residential_id,
          name: unitData.name,
          unit_type_id: unitData.unit_type_id,
          building_id: unitData.building_id,
          floor_id: unitData.floor_id,
          location_id: unitData.location_id,
          owner_user_id: unitData.owner_user_id,
          is_active: unitData.is_active,
          created_at: unitData.created_at,
          updated_at: unitData.updated_at,
          profiles: null,
          unit_type: unitData.unit_types ? { id: unitData.unit_types.id, name: unitData.unit_types.name } : null,
          location: unitData.locations ? { id: unitData.locations.id, name: unitData.locations.name, type: unitData.locations.type } : null,
        });
      }

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("user_id", ownerId)
        .maybeSingle();
      if (profileError) throw profileError;

      return success({
        id: unitData.id,
        residential_id: unitData.residential_id,
        name: unitData.name,
        unit_type_id: unitData.unit_type_id,
        building_id: unitData.building_id,
        floor_id: unitData.floor_id,
        location_id: unitData.location_id,
        owner_user_id: unitData.owner_user_id,
        is_active: unitData.is_active,
        created_at: unitData.created_at,
        updated_at: unitData.updated_at,
        profiles: profile?.email ? { email: profile.email } : null,
        unit_type: unitData.unit_types ? { id: unitData.unit_types.id, name: unitData.unit_types.name } : null,
        location: unitData.locations ? { id: unitData.locations.id, name: unitData.locations.name, type: unitData.locations.type } : null,
      });
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to get unit"));
    }
  },

  async create(unit: InsertUnit): Promise<ApiResult<Unit>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase.from("units").insert(unit).select().single();

      if (error) return failure(handleSupabaseError(error, "Failed to create unit"));
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to create unit"));
    }
  },

  async update(id: string, updates: TablesUpdate<"units">): Promise<ApiResult<Unit>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("units")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to update unit"));
    }
  },

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("units").delete().eq("id", id);

      if (error) throw error;
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to delete unit"));
    }
  },

  async listWithRelations(residentialId: string): Promise<ApiResult<UnitWithWizardData[]>> {
    try {
      const supabase = requireSupabase();

      // Fetch units first
      const { data: unitsData, error: unitsError} = await supabase
        .from("units")
        .select("*")
        .eq("residential_id", residentialId)
        .order("name", { ascending: true });

      if (unitsError) throw unitsError;

      // If no units, return empty array
      if (!unitsData || unitsData.length === 0) {
        return success([]);
      }

      const unitIds = unitsData.map(u => u.id);
      const unitTypeIds = unitsData.map(u => u.unit_type_id).filter(Boolean) as string[];
      const locationIds = unitsData.map(u => u.location_id).filter(Boolean) as string[];

      // Fetch related data in parallel
      const [unitTypesResult, locationsResult, unitAddonsResult] = await Promise.all([
        unitTypeIds.length > 0
          ? supabase.from("unit_types").select("*").in("id", unitTypeIds)
          : Promise.resolve({ data: [], error: null }),
        locationIds.length > 0
          ? supabase.from("locations").select("*").in("id", locationIds)
          : Promise.resolve({ data: [], error: null }),
        supabase
          .from("unit_addons")
          .select("*, addons(*)")
          .in("unit_id", unitIds)
      ]);

      // Create lookup maps
      const unitTypesMap = new Map((unitTypesResult.data || []).map(ut => [ut.id, ut]));
      const locationsMap = new Map((locationsResult.data || []).map(loc => [loc.id, loc]));

      // Combine all data
      const unitsWithRelations = unitsData.map(unit => ({
        ...unit,
        unit_types: unit.unit_type_id ? unitTypesMap.get(unit.unit_type_id) : undefined,
        locations: unit.location_id ? locationsMap.get(unit.location_id) : undefined,
        unit_addons: (unitAddonsResult.data || []).filter(ua => ua.unit_id === unit.id)
      }));

      return success(unitsWithRelations as unknown as UnitWithWizardData[]);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to list units with relations"));
    }
  },
};

// ============================================================================
// Unit Member Service
// ============================================================================

export const unitMemberService = {
  async listByUnit(unitId: string): Promise<ApiResult<UnitMemberWithProfile[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("unit_members")
        .select("*, profiles(email)")
        .eq("unit_id", unitId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return success(data as UnitMemberWithProfile[]);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to list unit members"));
    }
  },

  async add(member: InsertUnitMember): Promise<ApiResult<UnitMember>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("unit_members")
        .insert(member)
        .select()
        .single();

      if (error) throw error;
      return success(data);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to add unit member"));
    }
  },

  async remove(unitId: string, userId: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("unit_members")
        .delete()
        .eq("unit_id", unitId)
        .eq("user_id", userId);

      if (error) throw error;
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to remove unit member"));
    }
  },
};
