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
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

export * from "./apiResult";

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
  getProfile(userId: string): Promise<ApiResult<Profile | null>> {
    return wrapResult("Failed to get profile", () =>
      unwrap<Profile | null>(
        requireSupabase().from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      ),
    );
  },

  updateProfile(
    userId: string,
    updates: Partial<Omit<Profile, "user_id" | "created_at">>,
  ): Promise<ApiResult<Profile>> {
    return wrapResult("Failed to update profile", () =>
      unwrap<Profile>(
        requireSupabase()
          .from("profiles")
          .update(updates)
          .eq("user_id", userId)
          .select()
          .single(),
      ),
    );
  },
};

// ============================================================================
// Platform Admin Service
// ============================================================================

export const platformAdminService = {
  isPlatformAdmin(userId: string): Promise<ApiResult<boolean>> {
    return wrapResult("Failed to check platform admin status", async () => {
      const row = await unwrap<{ user_id: string } | null>(
        requireSupabase().from("platform_admins").select("user_id").eq("user_id", userId).maybeSingle(),
      );
      return !!row;
    });
  },
};

// ============================================================================
// Residential Service
// ============================================================================

export const residentialService = {
  list(): Promise<ApiResult<ResidentialWithOwner[]>> {
    return wrapResult("Failed to list residentials", async () => {
      const rows = await unwrap<ResidentialWithOwner[]>(
        requireSupabase()
          .from("residentials")
          .select("*, profiles!residentials_owner_user_id_fkey(email)")
          .order("created_at", { ascending: false }),
      );
      return rows ?? [];
    });
  },

  getById(id: string): Promise<ApiResult<ResidentialWithOwner | null>> {
    return wrapResult("Failed to get residential", () =>
      unwrap<ResidentialWithOwner | null>(
        requireSupabase()
          .from("residentials")
          .select("*, profiles!residentials_owner_user_id_fkey(email)")
          .eq("id", id)
          .maybeSingle(),
      ),
    );
  },

  create(residential: InsertResidential): Promise<ApiResult<Residential>> {
    return wrapResult("Failed to create residential", () =>
      unwrap<Residential>(requireSupabase().from("residentials").insert(residential).select().single()),
    );
  },

  update(id: string, updates: TablesUpdate<"residentials">): Promise<ApiResult<Residential>> {
    return wrapResult("Failed to update residential", () =>
      unwrap<Residential>(
        requireSupabase().from("residentials").update(updates).eq("id", id).select().single(),
      ),
    );
  },

  delete(id: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to delete residential", () =>
      unwrap<void>(requireSupabase().from("residentials").delete().eq("id", id)),
    );
  },
};

// ============================================================================
// Residential User Service
// ============================================================================

export const residentialUserService = {
  listByResidential(residentialId: string): Promise<ApiResult<ResidentialUserWithProfile[]>> {
    return wrapResult("Failed to list residential users", async () => {
      const rows = await unwrap<ResidentialUserWithProfile[]>(
        requireSupabase()
          .from("residential_users")
          .select("*, profiles(email)")
          .eq("residential_id", residentialId)
          .order("created_at", { ascending: false }),
      );
      return rows ?? [];
    });
  },

  add(
    residentialId: string,
    userId: string,
    role: ResidentialRole,
  ): Promise<ApiResult<ResidentialUser>> {
    return wrapResult("Failed to add residential user", () =>
      unwrap<ResidentialUser>(
        requireSupabase()
          .from("residential_users")
          .insert({ residential_id: residentialId, user_id: userId, role })
          .select()
          .single(),
      ),
    );
  },

  updateRole(
    residentialId: string,
    userId: string,
    role: ResidentialRole,
  ): Promise<ApiResult<ResidentialUser>> {
    return wrapResult("Failed to update residential user role", () =>
      unwrap<ResidentialUser>(
        requireSupabase()
          .from("residential_users")
          .update({ role })
          .eq("residential_id", residentialId)
          .eq("user_id", userId)
          .select()
          .single(),
      ),
    );
  },

  remove(residentialId: string, userId: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to remove residential user", () =>
      unwrap<void>(
        requireSupabase()
          .from("residential_users")
          .delete()
          .eq("residential_id", residentialId)
          .eq("user_id", userId),
      ),
    );
  },
};

// ============================================================================
// Unit Service
// ============================================================================

function toUnitWithOwner(
  unit: Record<string, any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  email: string | null,
): UnitWithOwner {
  return {
    id: unit.id,
    residential_id: unit.residential_id,
    name: unit.name,
    unit_type_id: unit.unit_type_id,
    location_id: unit.location_id,
    owner_user_id: unit.owner_user_id,
    price: unit.price,
    is_active: unit.is_active,
    created_at: unit.created_at,
    updated_at: unit.updated_at,
    profiles: email ? { email } : null,
    unit_type: unit.unit_types ? { id: unit.unit_types.id, name: unit.unit_types.name } : null,
    location: unit.locations
      ? { id: unit.locations.id, name: unit.locations.name, type: unit.locations.type }
      : null,
  };
}

export const unitService = {
  listByResidential(residentialId: string): Promise<ApiResult<UnitWithOwner[]>> {
    return wrapResult("Failed to list units", async () => {
      const units = await unwrap<Record<string, any>[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
        requireSupabase()
          .from("units")
          .select(
            `
          *,
          unit_types(id, name),
          locations(id, name, type)
        `,
          )
          .eq("residential_id", residentialId)
          .order("name", { ascending: true }),
      );

      const rows = units ?? [];
      const ownerIds = Array.from(
        new Set(rows.map((u) => u.owner_user_id).filter(Boolean) as string[]),
      );

      const profileEmailByUserId = new Map<string, string | null>();
      if (ownerIds.length > 0) {
        const profiles = await unwrap<{ user_id: string; email: string | null }[]>(
          requireSupabase().from("profiles").select("user_id,email").in("user_id", ownerIds),
        );
        for (const profile of profiles ?? []) {
          profileEmailByUserId.set(profile.user_id, profile.email ?? null);
        }
      }

      return rows.map((unit) => {
        const ownerId = unit.owner_user_id;
        const email = ownerId ? profileEmailByUserId.get(ownerId) ?? null : null;
        return toUnitWithOwner(unit, email);
      });
    });
  },

  getById(id: string): Promise<ApiResult<UnitWithOwner | null>> {
    return wrapResult("Failed to get unit", async () => {
      const unit = await unwrap<Record<string, any> | null>( // eslint-disable-line @typescript-eslint/no-explicit-any
        requireSupabase()
          .from("units")
          .select(
            `
          *,
          unit_types(id, name),
          locations(id, name, type)
        `,
          )
          .eq("id", id)
          .maybeSingle(),
      );

      if (!unit) return null;

      const ownerId = unit.owner_user_id;
      if (!ownerId) return toUnitWithOwner(unit, null);

      const profile = await unwrap<{ email: string | null } | null>(
        requireSupabase().from("profiles").select("email").eq("user_id", ownerId).maybeSingle(),
      );

      return toUnitWithOwner(unit, profile?.email ?? null);
    });
  },

  create(unit: InsertUnit): Promise<ApiResult<Unit>> {
    return wrapResult("Failed to create unit", () =>
      unwrap<Unit>(requireSupabase().from("units").insert(unit).select().single()),
    );
  },

  update(id: string, updates: TablesUpdate<"units">): Promise<ApiResult<Unit>> {
    return wrapResult("Failed to update unit", () =>
      unwrap<Unit>(requireSupabase().from("units").update(updates).eq("id", id).select().single()),
    );
  },

  delete(id: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to delete unit", () =>
      unwrap<void>(requireSupabase().from("units").delete().eq("id", id)),
    );
  },

  listWithRelations(residentialId: string): Promise<ApiResult<UnitWithWizardData[]>> {
    return wrapResult("Failed to list units with relations", async () => {
      const supabase = requireSupabase();

      const unitsData = await unwrap<any[]>( // eslint-disable-line @typescript-eslint/no-explicit-any
        supabase
          .from("units")
          .select("*")
          .eq("residential_id", residentialId)
          .order("name", { ascending: true }),
      );

      if (!unitsData || unitsData.length === 0) {
        return [];
      }

      const unitIds = unitsData.map((u) => u.id);
      const unitTypeIds = unitsData.map((u) => u.unit_type_id).filter(Boolean) as string[];
      const locationIds = unitsData.map((u) => u.location_id).filter(Boolean) as string[];
      const ownerIds = Array.from(
        new Set(unitsData.map((u) => u.owner_user_id).filter(Boolean) as string[]),
      );

      const [unitTypesResult, locationsResult, unitAddonsResult, profilesResult] = await Promise.all([
        unitTypeIds.length > 0
          ? supabase.from("unit_types").select("*").in("id", unitTypeIds)
          : Promise.resolve({ data: [], error: null }),
        locationIds.length > 0
          ? supabase.from("locations").select("*").in("id", locationIds)
          : Promise.resolve({ data: [], error: null }),
        supabase.from("unit_addons").select("*, addon_items(*, addons(*))").in("unit_id", unitIds),
        ownerIds.length > 0
          ? supabase.from("profiles").select("user_id,email").in("user_id", ownerIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (unitTypesResult.error) throw unitTypesResult.error;
      if (locationsResult.error) throw locationsResult.error;
      if (unitAddonsResult.error) throw unitAddonsResult.error;
      if (profilesResult.error) throw profilesResult.error;

      const unitTypesMap = new Map((unitTypesResult.data || []).map((ut) => [ut.id, ut]));
      const locationsMap = new Map((locationsResult.data || []).map((loc) => [loc.id, loc]));
      const profileEmailByUserId = new Map(
        (profilesResult.data || []).map((p) => [p.user_id, p.email]),
      );

      const unitsWithRelations = unitsData.map((unit) => ({
        ...unit,
        unit_types: unit.unit_type_id ? unitTypesMap.get(unit.unit_type_id) : undefined,
        locations: unit.location_id ? locationsMap.get(unit.location_id) : undefined,
        unit_addons: (unitAddonsResult.data || []).filter((ua) => ua.unit_id === unit.id),
        profiles: unit.owner_user_id
          ? { email: profileEmailByUserId.get(unit.owner_user_id) ?? "" }
          : undefined,
      }));

      return unitsWithRelations as unknown as UnitWithWizardData[];
    });
  },
};

// ============================================================================
// Unit Member Service
// ============================================================================

export const unitMemberService = {
  listByUnit(unitId: string): Promise<ApiResult<UnitMemberWithProfile[]>> {
    return wrapResult("Failed to list unit members", async () => {
      const rows = await unwrap<UnitMemberWithProfile[]>(
        requireSupabase()
          .from("unit_members")
          .select("*, profiles(email)")
          .eq("unit_id", unitId)
          .order("created_at", { ascending: false }),
      );
      return rows ?? [];
    });
  },

  add(member: InsertUnitMember): Promise<ApiResult<UnitMember>> {
    return wrapResult("Failed to add unit member", () =>
      unwrap<UnitMember>(requireSupabase().from("unit_members").insert(member).select().single()),
    );
  },

  remove(unitId: string, userId: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to remove unit member", () =>
      unwrap<void>(
        requireSupabase().from("unit_members").delete().eq("unit_id", unitId).eq("user_id", userId),
      ),
    );
  },
};
