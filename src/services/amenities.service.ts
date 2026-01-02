import { requireSupabase } from "../lib/supabaseClient";
import type { Amenity, InsertAmenity, UpdateAmenity } from "../types/amenities.types";
import { ApiError, type ApiResult } from "./api.service";

// Helper functions
function success<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

function failure<T>(error: ApiError): ApiResult<T> {
  return { success: false, error };
}

function handleSupabaseError(error: unknown, context: string): ApiError {
  if (error instanceof Error) {
    return new ApiError(`${context}: ${error.message}`, undefined, error);
  }
  return new ApiError(`${context}: Unknown error`, undefined, error);
}

// ============================================================================
// Amenities Service
// ============================================================================

export const amenitiesService = {
  async listByResidential(residentialId: string): Promise<ApiResult<Amenity[]>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("amenities")
        .select("*")
        .eq("residential_id", residentialId)
        .order("name", { ascending: true });

      if (error) throw error;
      return success(data as Amenity[]);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to list amenities"));
    }
  },

  async getById(id: string): Promise<ApiResult<Amenity | null>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("amenities")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return success(data as Amenity | null);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to get amenity"));
    }
  },

  async create(amenity: InsertAmenity): Promise<ApiResult<Amenity>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("amenities")
        .insert(amenity)
        .select()
        .single();

      if (error) throw error;
      return success(data as Amenity);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to create amenity"));
    }
  },

  async update(id: string, updates: UpdateAmenity): Promise<ApiResult<Amenity>> {
    try {
      const supabase = requireSupabase();
      const { data, error } = await supabase
        .from("amenities")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return success(data as Amenity);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to update amenity"));
    }
  },

  async delete(id: string): Promise<ApiResult<void>> {
    try {
      const supabase = requireSupabase();
      const { error } = await supabase.from("amenities").delete().eq("id", id);

      if (error) throw error;
      return success(undefined);
    } catch (error) {
      return failure(handleSupabaseError(error, "Failed to delete amenity"));
    }
  },
};
