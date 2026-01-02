/**
 * Location Type Service
 * Handles CRUD operations for location type definitions
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  LocationTypeDefinition,
  CreateLocationTypeDto,
  UpdateLocationTypeDto,
} from "@/types/unit-wizard.types";

class LocationTypeService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all location types for a residential
   */
  async list(residentialId: string): Promise<ApiResult<LocationTypeDefinition[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("location_types")
        .select("*")
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
   * Get a specific location type by ID
   */
  async getById(id: string): Promise<ApiResult<LocationTypeDefinition>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("location_types")
        .select("*")
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
   * Create a new location type
   */
  async create(dto: CreateLocationTypeDto): Promise<ApiResult<LocationTypeDefinition>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("location_types")
        .insert([dto])
        .select()
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
   * Update an existing location type
   */
  async update(id: string, dto: UpdateLocationTypeDto): Promise<ApiResult<LocationTypeDefinition>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("location_types")
        .update(dto)
        .eq("id", id)
        .select()
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
   * Delete a location type
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("location_types").delete().eq("id", id);

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
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<LocationTypeDefinition>> {
    return this.update(id, { is_active: !currentStatus });
  }
}

export const locationTypeService = new LocationTypeService();
