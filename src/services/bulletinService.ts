/**
 * Bulletin Service
 * Hand-written (not flat CRUD): the list joins attachments, deleting must
 * also remove the storage files, and publishing can trigger the push edge
 * function.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { ApiError, unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { Bulletin, BulletinNotifyResult, BulletinStatus, BulletinWithAttachments } from "@/types/bulletin.types";

export const BULLETIN_BUCKET = "bulletin-attachments";

// The generated Row types model `status`/`kind` as plain strings (they are
// check-constrained text columns); this narrows a query's result to our
// hand-written union types.
export function typed<T>(query: PromiseLike<{ data: unknown; error: unknown }>) {
  return query as unknown as PromiseLike<{ data: T | null; error: unknown }>;
}

const SELECT_WITH_ATTACHMENTS = "*, bulletin_attachments(*), profiles:created_by(email)";

function list(residentialId: string): Promise<ApiResult<BulletinWithAttachments[]>> {
  return wrapResult("Failed to list bulletins", async () => {
    const rows = await unwrap<BulletinWithAttachments[]>(
      typed<BulletinWithAttachments[]>(requireSupabase()
        .from("bulletins")
        .select(SELECT_WITH_ATTACHMENTS)
        .eq("residential_id", residentialId)
        .order("created_at", { ascending: false })),
    );
    return rows ?? [];
  });
}

function create(input: {
  residentialId: string;
  title: string;
  description: string | null;
  createdBy: string | null;
}): Promise<ApiResult<Bulletin>> {
  return wrapResult("Failed to create bulletin", () =>
    unwrap<Bulletin>(
      typed<Bulletin>(
        requireSupabase()
          .from("bulletins")
          .insert({
            residential_id: input.residentialId,
            title: input.title,
            description: input.description,
            created_by: input.createdBy,
          })
          .select()
          .single(),
      ),
    ),
  );
}

function update(id: string, patch: { title?: string; description?: string | null }): Promise<ApiResult<Bulletin>> {
  return wrapResult("Failed to update bulletin", () =>
    unwrap<Bulletin>(typed<Bulletin>(requireSupabase().from("bulletins").update(patch).eq("id", id).select().single())),
  );
}

function setStatus(id: string, status: BulletinStatus): Promise<ApiResult<Bulletin>> {
  return wrapResult("Failed to update bulletin status", () =>
    unwrap<Bulletin>(typed<Bulletin>(requireSupabase().from("bulletins").update({ status }).eq("id", id).select().single())),
  );
}

// Storage objects aren't cascaded by the FK, so remove them explicitly
// (best effort, after the row is gone — an orphaned file is harmless, an
// orphaned row pointing at a missing file is not).
function remove(id: string, storagePaths: string[]): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete bulletin", async () => {
    const client = requireSupabase();
    await unwrap<void>(client.from("bulletins").delete().eq("id", id));
    if (storagePaths.length) await client.storage.from(BULLETIN_BUCKET).remove(storagePaths);
  });
}

// Asks the edge function to push "new bulletin" to the residential's
// residents. Only meaningful for a published bulletin; the function itself
// enforces admin-only and one-shot-per-bulletin.
function notify(id: string): Promise<ApiResult<BulletinNotifyResult>> {
  return wrapResult("Failed to send notification", async () => {
    const { data, error } = await requireSupabase().functions.invoke<BulletinNotifyResult & { error?: string }>(
      "send-bulletin-notification",
      { body: { bulletinId: id } },
    );
    if (error) throw new ApiError(error.message);
    if (!data) throw new ApiError("Empty response from send-bulletin-notification");
    return data;
  });
}

export const bulletinService = { list, create, update, setStatus, delete: remove, notify };
