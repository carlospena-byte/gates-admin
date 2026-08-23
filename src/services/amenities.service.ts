import { requireSupabase } from "../lib/supabaseClient";
import type { Amenity, InsertAmenity, UpdateAmenity } from "../types/amenities.types";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

// ============================================================================
// Amenities Service
// ============================================================================

export const amenitiesService = {
  listByResidential(residentialId: string): Promise<ApiResult<Amenity[]>> {
    return wrapResult("Failed to list amenities", async () => {
      const rows = await unwrap<Amenity[]>(
        requireSupabase()
          .from("amenities")
          .select("*")
          .eq("residential_id", residentialId)
          .order("name", { ascending: true }),
      );
      return rows ?? [];
    });
  },

  getById(id: string): Promise<ApiResult<Amenity | null>> {
    return wrapResult("Failed to get amenity", () =>
      unwrap<Amenity | null>(
        requireSupabase().from("amenities").select("*").eq("id", id).maybeSingle(),
      ),
    );
  },

  create(amenity: InsertAmenity): Promise<ApiResult<Amenity>> {
    return wrapResult("Failed to create amenity", () =>
      unwrap<Amenity>(requireSupabase().from("amenities").insert(amenity).select().single()),
    );
  },

  update(id: string, updates: UpdateAmenity): Promise<ApiResult<Amenity>> {
    return wrapResult("Failed to update amenity", () =>
      unwrap<Amenity>(
        requireSupabase().from("amenities").update(updates).eq("id", id).select().single(),
      ),
    );
  },

  delete(id: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to delete amenity", () =>
      unwrap<void>(requireSupabase().from("amenities").delete().eq("id", id)),
    );
  },
};
