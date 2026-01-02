/**
 * Location Service
 * Handles CRUD operations for hierarchical locations
 * Supports: TOWER, FLOOR, POLYGON, PASAJE, STREET with parent-child relationships
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  Location,
  CreateLocationDto,
  UpdateLocationDto,
} from "@/types/unit-wizard.types";

class LocationService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all locations for a residential with optional parent data
   */
  async list(residentialId: string): Promise<ApiResult<Location[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("locations")
        .select(`
          *,
          parent:parent_id(*)
        `)
        .eq("residential_id", residentialId)
        .order("name");

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data: data || [],
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Get a specific location by ID with parent data
   */
  async getById(id: string): Promise<ApiResult<Location>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("locations")
        .select(`
          *,
          parent:parent_id(*)
        `)
        .eq("id", id)
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Create a new location
   */
  async create(dto: CreateLocationDto): Promise<ApiResult<Location>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("locations")
        .insert([dto])
        .select(`
          *,
          parent:parent_id(*)
        `)
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Update an existing location
   */
  async update(id: string, dto: UpdateLocationDto): Promise<ApiResult<Location>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("locations")
        .update(dto)
        .eq("id", id)
        .select(`
          *,
          parent:parent_id(*)
        `)
        .single();

      if (error) {
        return this.error(error.message, error);
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      return this.error(error instanceof Error ? error.message : "Unknown error occurred", error);
    }
  }

  /**
   * Delete a location
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("locations").delete().eq("id", id);

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
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<Location>> {
    return this.update(id, { is_active: !currentStatus });
  }
}

export const locationService = new LocationService();
