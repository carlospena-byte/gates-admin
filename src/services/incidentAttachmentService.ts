/**
 * Incident Attachment Service
 * Hand-written (not flat CRUD) — mirrors the proof-upload methods added to
 * unitRentalPaymentService.ts, but attachments here are their own table
 * (an incident can have several) rather than a single column.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { IncidentAttachment } from "@/types/incident.types";

const BUCKET = "incident-attachments";

function list(incidentId: string): Promise<ApiResult<IncidentAttachment[]>> {
  return wrapResult("Failed to list attachments", async () => {
    const rows = await unwrap<IncidentAttachment[]>(
      requireSupabase()
        .from("incident_attachments")
        .select("*")
        .eq("incident_id", incidentId)
        .order("created_at", { ascending: true }),
    );
    return rows ?? [];
  });
}

function upload(incidentId: string, residentialId: string, file: File): Promise<ApiResult<IncidentAttachment>> {
  return wrapResult("Failed to upload attachment", async () => {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const path = `${residentialId}/${incidentId}-${Date.now()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await client.storage.from(BUCKET).upload(path, file);
    if (uploadError) throw uploadError;

    return unwrap<IncidentAttachment>(
      client
        .from("incident_attachments")
        .insert({
          incident_id: incidentId,
          residential_id: residentialId,
          storage_path: path,
          uploaded_by: userData.user?.id ?? null,
        })
        .select()
        .single(),
    );
  });
}

function getSignedUrl(path: string): Promise<ApiResult<string>> {
  return wrapResult("Failed to load attachment", async () => {
    const { data, error } = await requireSupabase().storage.from(BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  });
}

function remove(id: string): Promise<ApiResult<void>> {
  return wrapResult("Failed to delete attachment", () =>
    unwrap<void>(requireSupabase().from("incident_attachments").delete().eq("id", id)),
  );
}

export const incidentAttachmentService = { list, upload, getSignedUrl, delete: remove };
