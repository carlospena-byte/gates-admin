/**
 * Bulletin Attachment Service
 * Hand-written, same shape as incidentAttachmentService.ts: files go to a
 * private bucket under "{residential_id}/{bulletin_id}/…", metadata (kind,
 * original name, size, order) to bulletin_attachments, and reads use
 * short-lived signed URLs.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import { BULLETIN_BUCKET, typed } from "./bulletinService";
import type { BulletinAttachment, BulletinAttachmentKind } from "@/types/bulletin.types";

function upload(params: {
  bulletinId: string;
  residentialId: string;
  file: File;
  kind: BulletinAttachmentKind;
  sortOrder: number;
}): Promise<ApiResult<BulletinAttachment>> {
  const { bulletinId, residentialId, file, kind, sortOrder } = params;
  return wrapResult("Failed to upload attachment", async () => {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const path = `${residentialId}/${bulletinId}/${Date.now()}-${sortOrder}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await client.storage.from(BULLETIN_BUCKET).upload(path, file, {
      contentType: file.type || undefined,
    });
    if (uploadError) throw uploadError;

    return unwrap<BulletinAttachment>(
      typed<BulletinAttachment>(client
        .from("bulletin_attachments")
        .insert({
          bulletin_id: bulletinId,
          residential_id: residentialId,
          kind,
          storage_path: path,
          file_name: file.name,
          file_size: file.size,
          sort_order: sortOrder,
          uploaded_by: userData.user?.id ?? null,
        })
        .select()
        .single()),
    );
  });
}

function getSignedUrl(path: string): Promise<ApiResult<string>> {
  return wrapResult("Failed to load attachment", async () => {
    const { data, error } = await requireSupabase().storage.from(BULLETIN_BUCKET).createSignedUrl(path, 60 * 60);
    if (error) throw error;
    return data.signedUrl;
  });
}

function remove(attachment: Pick<BulletinAttachment, "id" | "storage_path">): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete attachment", async () => {
    const client = requireSupabase();
    await unwrap<void>(client.from("bulletin_attachments").delete().eq("id", attachment.id));
    await client.storage.from(BULLETIN_BUCKET).remove([attachment.storage_path]);
  });
}

export const bulletinAttachmentService = { upload, getSignedUrl, delete: remove };
