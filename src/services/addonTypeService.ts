/**
 * Addon Type Service
 * Handles CRUD operations for addon types
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  AddonType,
  CreateAddonTypeDto,
  UpdateAddonTypeDto,
} from "@/types/unit-wizard.types";

class AddonTypeService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all addon types for a residential
   */
  async list(residentialId: string): Promise<ApiResult<AddonType[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addon_types")
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
   * Get a specific addon type by ID
   */
  async getById(id: string): Promise<ApiResult<AddonType>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addon_types")
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
   * Create a new addon type
   */
  async create(dto: CreateAddonTypeDto): Promise<ApiResult<AddonType>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addon_types")
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
   * Update an existing addon type
   */
  async update(id: string, dto: UpdateAddonTypeDto): Promise<ApiResult<AddonType>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addon_types")
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
   * Delete an addon type
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("addon_types").delete().eq("id", id);

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
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<AddonType>> {
    return this.update(id, { is_active: !currentStatus });
  }
}

export const addonTypeService = new AddonTypeService();
