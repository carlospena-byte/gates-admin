/**
 * Building Service
 * Handles CRUD operations for buildings
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  Building,
  CreateBuildingDto,
  UpdateBuildingDto,
} from "@/types/unit-wizard.types";

class BuildingService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all buildings for a residential
   */
  async list(residentialId: string): Promise<ApiResult<Building[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("residential_id", residentialId)
        .order("name");

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: (data || []) as unknown as Building[],
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Get a specific building by ID
   */
  async getById(id: string): Promise<ApiResult<Building>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data as unknown as Building,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Create a new building
   */
  async create(dto: CreateBuildingDto): Promise<ApiResult<Building>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("buildings")
        .insert([dto])
        .select()
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data as unknown as Building,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Update an existing building
   */
  async update(id: string, dto: UpdateBuildingDto): Promise<ApiResult<Building>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("buildings")
        .update(dto)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data as unknown as Building,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Delete a building
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("buildings").delete().eq("id", id);

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
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<Building>> {
    return this.update(id, { is_active: !currentStatus });
  }
}

export const buildingService = new BuildingService();
