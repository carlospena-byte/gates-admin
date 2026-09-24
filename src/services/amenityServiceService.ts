/**
 * Amenity Service Service
 * Manages amenity_services join table entries (a service catalog tag
 * attached to an amenity, optionally "featured"). Selections are always
 * replaced wholesale from the form's current draft, same pattern as
 * unitAddonService.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { AmenityServiceSelection } from "@/types/amenities.types";

async function replaceForAmenity(
  amenityId: string,
  selections: AmenityServiceSelection[],
): Promise<ApiResult<void>> {
  return wrapResult("Failed to save amenity services", async () => {
    await unwrap<void>(requireSupabase().from("amenity_services").delete().eq("amenity_id", amenityId));

    if (selections.length === 0) return;

    await unwrap<void>(
      requireSupabase()
        .from("amenity_services")
        .insert(
          selections.map((s) => ({
            amenity_id: amenityId,
            service_id: s.serviceId,
            is_featured: s.isFeatured,
          })),
        ),
    );
  });
}

export const amenityServiceService = { replaceForAmenity };
