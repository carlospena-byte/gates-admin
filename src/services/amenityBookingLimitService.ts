/**
 * Amenity Booking Limit Service
 * Manages amenity_booking_limits rows (e.g. "2 per day" and "5 per month"
 * can both apply at once). Rules are always replaced wholesale from the
 * form's current draft, same pattern as unitAddonService.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { AmenityBookingLimitRule } from "@/types/amenities.types";

async function replaceForAmenity(
  amenityId: string,
  rules: AmenityBookingLimitRule[],
): Promise<ApiResult<void>> {
  return wrapResult("Failed to save booking limits", async () => {
    await unwrap<void>(requireSupabase().from("amenity_booking_limits").delete().eq("amenity_id", amenityId));

    if (rules.length === 0) return;

    await unwrap<void>(
      requireSupabase()
        .from("amenity_booking_limits")
        .insert(
          rules.map((r) => ({
            amenity_id: amenityId,
            max_count: r.maxCount,
            period: r.period,
          })),
        ),
    );
  });
}

export const amenityBookingLimitService = { replaceForAmenity };
