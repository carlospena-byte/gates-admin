/**
 * Services Catalog Service
 * Handles the "featured services" catalog tags (WiFi, sillas, toallas...)
 * attached to amenities. Hand-written (not createCrudService) because
 * list() needs to union the global catalog (residential_id is null) with
 * a residential's own extras — a generic `.eq(parentColumn, parentId)`
 * filter can't express that OR.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { InsertService, Service, UpdateService } from "@/types/amenities.types";

function list(residentialId: string): Promise<ApiResult<Service[]>> {
  return wrapResult("Failed to list services", async () => {
    const rows = await unwrap<Service[]>(
      requireSupabase()
        .from("services")
        .select("*")
        .or(`residential_id.is.null,residential_id.eq.${residentialId}`)
        .order("name"),
    );
    return rows ?? [];
  });
}

// Platform admin only (enforced by RLS) — the shared catalog every
// residential sees.
function listGlobal(): Promise<ApiResult<Service[]>> {
  return wrapResult("Failed to list global services", async () => {
    const rows = await unwrap<Service[]>(
      requireSupabase().from("services").select("*").is("residential_id", null).order("name"),
    );
    return rows ?? [];
  });
}

function create(dto: InsertService): Promise<ApiResult<Service>> {
  return wrapResult("Failed to create service", () =>
    unwrap<Service>(requireSupabase().from("services").insert([dto]).select().single()),
  );
}

function update(id: string, dto: UpdateService): Promise<ApiResult<Service>> {
  return wrapResult("Failed to update service", () =>
    unwrap<Service>(requireSupabase().from("services").update(dto).eq("id", id).select().single()),
  );
}

function remove(id: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete service", async () => {
    await unwrap<void>(requireSupabase().from("services").delete().eq("id", id));
  });
}

function toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<Service>> {
  return update(id, { is_active: !currentStatus });
}

export const servicesService = { list, listGlobal, create, update, delete: remove, toggleActive };
