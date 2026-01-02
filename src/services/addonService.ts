/**
 * Addon Service
 * Handles CRUD operations for addons
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  Addon,
  CreateAddonDto,
  UpdateAddonDto,
} from "@/types/unit-wizard.types";

class AddonService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all addons for a residential (with addon type info)
   */
  async list(residentialId: string): Promise<ApiResult<Addon[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addons")
        .select(`
          *,
          addon_types (*)
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
   * Get a specific addon by ID
   */
  async getById(id: string): Promise<ApiResult<Addon>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addons")
        .select(`
          *,
          addon_types (*)
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
   * Create a new addon
   */
  async create(dto: CreateAddonDto): Promise<ApiResult<Addon>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addons")
        .insert([dto])
        .select(`
          *,
          addon_types (*)
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
   * Update an existing addon
   */
  async update(id: string, dto: UpdateAddonDto): Promise<ApiResult<Addon>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addons")
        .update(dto)
        .eq("id", id)
        .select(`
          *,
          addon_types (*)
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
   * Delete an addon
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("addons").delete().eq("id", id);

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
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<Addon>> {
    return this.update(id, { is_active: !currentStatus });
  }

  /**
   * List all addons by addon type
   */
  async listByType(addonTypeId: string): Promise<ApiResult<Addon[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("addons")
        .select(`
          *,
          addon_types (*)
        `)
        .eq("addon_type_id", addonTypeId)
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
}

export const addonService = new AddonService();
