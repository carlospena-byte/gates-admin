/**
 * Floor Service
 * Handles CRUD operations for floors within buildings
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  Floor,
  CreateFloorDto,
  UpdateFloorDto,
} from "@/types/unit-wizard.types";

class FloorService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all floors for a building
   */
  async listByBuilding(buildingId: string): Promise<ApiResult<Floor[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("floors")
        .select("*, buildings(*)")
        .eq("building_id", buildingId)
        .order("name");

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: (data || []) as unknown as Floor[],
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * List all floors for a residential (across all buildings)
   */
  async listByResidential(residentialId: string): Promise<ApiResult<Floor[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("floors")
        .select("*, buildings!inner(*)")
        .eq("buildings.residential_id", residentialId)
        .order("buildings(name)")
        .order("name");

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: (data || []) as unknown as Floor[],
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Get a specific floor by ID
   */
  async getById(id: string): Promise<ApiResult<Floor>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("floors")
        .select("*, buildings(*)")
        .eq("id", id)
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data as unknown as Floor,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Create a new floor
   */
  async create(dto: CreateFloorDto): Promise<ApiResult<Floor>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("floors")
        .insert([dto])
        .select("*, buildings(*)")
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data as unknown as Floor,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Update an existing floor
   */
  async update(id: string, dto: UpdateFloorDto): Promise<ApiResult<Floor>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("floors")
        .update(dto)
        .eq("id", id)
        .select("*, buildings(*)")
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data as unknown as Floor,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Delete a floor
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("floors").delete().eq("id", id);

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Toggle active status
   */
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<Floor>> {
    return this.update(id, { is_active: !currentStatus });
  }
}

export const floorService = new FloorService();
