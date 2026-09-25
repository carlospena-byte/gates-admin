/**
 * Providers Catalog Service
 * Delivery companies / vendors / couriers, shared platform-wide (proveedor,
 * delivery, paqueteria). Hand-written (not createCrudService) because list()
 * needs to union the global catalog (residential_id is null) with a
 * residential's own extras — a generic `.eq(parentColumn, parentId)` filter
 * can't express that OR. Mirrors services.service.ts exactly.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { InsertProvider, Provider, UpdateProvider } from "@/types/provider.types";

// providers.kind is CHECK-constrained to ProviderKind in SQL, but the
// generator only sees `text` — cast the generic query builder response to
// the narrower union we actually get (same as auditLogService.action).
type ProviderQuery = PromiseLike<{ data: Provider[] | null; error: unknown }>;

function list(residentialId: string): Promise<ApiResult<Provider[]>> {
  return wrapResult("Failed to list providers", async () => {
    const query = requireSupabase()
      .from("providers")
      .select("*")
      .or(`residential_id.is.null,residential_id.eq.${residentialId}`)
      .order("name") as unknown as ProviderQuery;
    const rows = await unwrap<Provider[]>(query);
    return rows ?? [];
  });
}

// Platform admin only (enforced by RLS) — the shared catalog every
// residential sees.
function listGlobal(): Promise<ApiResult<Provider[]>> {
  return wrapResult("Failed to list global providers", async () => {
    const query = requireSupabase()
      .from("providers")
      .select("*")
      .is("residential_id", null)
      .order("name") as unknown as ProviderQuery;
    const rows = await unwrap<Provider[]>(query);
    return rows ?? [];
  });
}

function create(dto: InsertProvider): Promise<ApiResult<Provider>> {
  return wrapResult("Failed to create provider", () =>
    unwrap<Provider>(requireSupabase().from("providers").insert([dto]).select().single()),
  );
}

function update(id: string, dto: UpdateProvider): Promise<ApiResult<Provider>> {
  return wrapResult("Failed to update provider", () =>
    unwrap<Provider>(requireSupabase().from("providers").update(dto).eq("id", id).select().single()),
  );
}

function remove(id: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete provider", async () => {
    await unwrap<void>(requireSupabase().from("providers").delete().eq("id", id));
  });
}

function toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<Provider>> {
  return update(id, { is_active: !currentStatus });
}

const LOGO_BUCKET = "provider-logos";

// Path's first segment ("global" or a residential id) is what the storage
// RLS policies check — see 20261015000000_provider_logo.sql.
function uploadLogo(residentialId: string | null, file: File): Promise<ApiResult<string>> {
  return wrapResult("Failed to upload provider logo", async () => {
    const client = requireSupabase();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const path = `${residentialId ?? "global"}/${Date.now()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await client.storage.from(LOGO_BUCKET).upload(path, file);
    if (uploadError) throw uploadError;

    return client.storage.from(LOGO_BUCKET).getPublicUrl(path).data.publicUrl;
  });
}

export const providerService = { list, listGlobal, create, update, delete: remove, toggleActive, uploadLogo };
