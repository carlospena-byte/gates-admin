/**
 * Unit Addon Service
 * Manages unit_addons join table entries
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";

class UnitAddonService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  async createMany(unitId: string, addonIds: string[]): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();

      if (addonIds.length === 0) {
        return { success: true, data: undefined };
      }

      const { error } = await supabase.from("unit_addons").insert(
        addonIds.map((addonId) => ({
          unit_id: unitId,
          addon_id: addonId,
        })),
      );

      if (error) return this.error(error.message, error);

      return { success: true, data: undefined };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  async deleteByUnitId(unitId: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase
        .from("unit_addons")
        .delete()
        .eq("unit_id", unitId);

      if (error) return this.error(error.message, error);

      return { success: true, data: undefined };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }
}

export const unitAddonService = new UnitAddonService();

