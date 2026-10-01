/**
 * Amenity Blackout Service
 * Manages amenity_blackouts rows (date ranges an amenity is closed to
 * booking — maintenance, board-only use, etc). Rules are always replaced
 * wholesale from the form's current draft, same pattern as
 * amenityBookingLimitService.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { AmenityBlackoutRule } from "@/types/amenities.types";

async function replaceForAmenity(
  amenityId: string,
  residentialId: string,
  rules: AmenityBlackoutRule[],
): Promise<ApiResult<void>> {
  return wrapResult("Failed to save blackout dates", async () => {
    await unwrap<void>(requireSupabase().from("amenity_blackouts").delete().eq("amenity_id", amenityId));

    if (rules.length === 0) return;

    await unwrap<void>(
      requireSupabase()
        .from("amenity_blackouts")
        .insert(
          rules.map((r) => ({
            amenity_id: amenityId,
            residential_id: residentialId,
            start_date: r.startDate,
            end_date: r.endDate,
            reason: r.reason || null,
          })),
        ),
    );
  });
}

export const amenityBlackoutService = { replaceForAmenity };
