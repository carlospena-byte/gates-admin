/**
 * Amenity Image Service
 * Hand-written (not flat CRUD) — mirrors incidentAttachmentService.ts:
 * images live in their own table (an amenity can have several) in a
 * private bucket, read back through short-lived signed URLs.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { AmenityImage } from "@/types/amenities.types";

const BUCKET = "amenity-images";

function list(amenityId: string): Promise<ApiResult<AmenityImage[]>> {
  return wrapResult("Failed to list amenity images", async () => {
    const rows = await unwrap<AmenityImage[]>(
      requireSupabase()
        .from("amenity_images")
        .select("*")
        .eq("amenity_id", amenityId)
        .order("sort_order", { ascending: true }),
    );
    return rows ?? [];
  });
}

// One row per amenity that has a primary image — used to build a thumbnail
// column across a whole amenities list without an N+1 query per row.
function listPrimaryByResidential(residentialId: string): Promise<ApiResult<AmenityImage[]>> {
  return wrapResult("Failed to list amenity images", async () => {
    const rows = await unwrap<AmenityImage[]>(
      requireSupabase()
        .from("amenity_images")
        .select("*")
        .eq("residential_id", residentialId)
        .eq("is_primary", true),
    );
    return rows ?? [];
  });
}

function upload(
  amenityId: string,
  residentialId: string,
  file: File,
  sortOrder: number,
): Promise<ApiResult<AmenityImage>> {
  return wrapResult("Failed to upload image", async () => {
    const client = requireSupabase();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const path = `${residentialId}/${amenityId}/${Date.now()}-${sortOrder}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file);
    if (uploadError) throw uploadError;

    return unwrap<AmenityImage>(
      client
        .from("amenity_images")
        .insert({
          amenity_id: amenityId,
          residential_id: residentialId,
          storage_path: path,
          sort_order: sortOrder,
        })
        .select()
        .single(),
    );
  });
}

function getSignedUrl(path: string): Promise<ApiResult<string>> {
  return wrapResult("Failed to load image", async () => {
    const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  });
}

// Unsets any other primary image for the amenity, then marks this one —
// two updates rather than a transaction, matching this codebase's
// straightforward Supabase-client style elsewhere (e.g. toggleActive).
function setPrimary(id: string, amenityId: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to set primary image", async () => {
    const client = requireSupabase();
    await unwrap<void>(
      client.from("amenity_images").update({ is_primary: false }).eq("amenity_id", amenityId).neq("id", id),
    );
    await unwrap<void>(client.from("amenity_images").update({ is_primary: true }).eq("id", id));
  });
}

function remove(id: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete image", () =>
    unwrap<void>(requireSupabase().from("amenity_images").delete().eq("id", id)),
  );
}

export const amenityImageService = {
  list,
  listPrimaryByResidential,
  upload,
  getSignedUrl,
  setPrimary,
  delete: remove,
};
