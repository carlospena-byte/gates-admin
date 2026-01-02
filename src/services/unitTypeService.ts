/**
 * Unit Type Service
 * Handles CRUD operations for unit types
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, type ApiResult } from "@/services";
import type {
  UnitType,
  CreateUnitTypeDto,
  UpdateUnitTypeDto,
} from "@/types/unit-wizard.types";

class UnitTypeService {
  private error(message: string, cause?: unknown) {
    return { success: false as const, error: new ApiError(message, undefined, cause) };
  }

  /**
   * List all unit types for a residential
   */
  async list(residentialId: string): Promise<ApiResult<UnitType[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("unit_types")
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
   * Get a specific unit type by ID
   */
  async getById(id: string): Promise<ApiResult<UnitType>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("unit_types")
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
   * Create a new unit type
   */
  async create(dto: CreateUnitTypeDto): Promise<ApiResult<UnitType>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("unit_types")
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
   * Update an existing unit type
   */
  async update(id: string, dto: UpdateUnitTypeDto): Promise<ApiResult<UnitType>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("unit_types")
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
   * Delete a unit type
   */
  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("unit_types").delete().eq("id", id);

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
  async toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<UnitType>> {
    return this.update(id, { is_active: !currentStatus });
  }
}

export const unitTypeService = new UnitTypeService();
