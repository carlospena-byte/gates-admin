/**
 * Unit Rental Payment Service
 * Base CRUD for the payment installments owed against a unit_rental, plus
 * the proof-of-payment workflow: upload a receipt to the private
 * "payment-proofs" bucket, then approve (-> paid) or reject it.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { createCrudService } from "./createCrudService";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type {
  CreateUnitRentalPaymentDto,
  UnitRentalPayment,
  UpdateUnitRentalPaymentDto,
} from "@/types/unit-wizard.types";

const PROOFS_BUCKET = "payment-proofs";

const baseService = createCrudService<UnitRentalPayment, CreateUnitRentalPaymentDto, UpdateUnitRentalPaymentDto>(
  "unit_rental_payments",
  { orderBy: "due_date", parentColumn: "rental_id" },
);

function uploadProof(
  paymentId: string,
  residentialId: string,
  file: File,
): Promise<ApiResult<UnitRentalPayment>> {
  return wrapResult("Failed to upload payment proof", async () => {
    const client = requireSupabase();
    const extension = file.name.includes(".") ? file.name.split(".").pop() : undefined;
    const path = `${residentialId}/${paymentId}-${Date.now()}${extension ? `.${extension}` : ""}`;

    const { error: uploadError } = await client.storage.from(PROOFS_BUCKET).upload(path, file);
    if (uploadError) throw uploadError;

    return unwrap<UnitRentalPayment>(
      client.from("unit_rental_payments").update({ proof_url: path }).eq("id", paymentId).select().single(),
    );
  });
}

function getSignedProofUrl(path: string): Promise<ApiResult<string>> {
  return wrapResult("Failed to load payment proof", async () => {
    const { data, error } = await requireSupabase().storage.from(PROOFS_BUCKET).createSignedUrl(path, 60);
    if (error) throw error;
    return data.signedUrl;
  });
}

function approve(paymentId: string): Promise<ApiResult<UnitRentalPayment>> {
  return wrapResult("Failed to approve payment", async () => {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();
    const now = new Date().toISOString();

    return unwrap<UnitRentalPayment>(
      client
        .from("unit_rental_payments")
        .update({ status: "paid", paid_at: now, validated_by: userData.user?.id ?? null, validated_at: now })
        .eq("id", paymentId)
        .select()
        .single(),
    );
  });
}

function reject(paymentId: string, reason?: string): Promise<ApiResult<UnitRentalPayment>> {
  return wrapResult("Failed to reject payment", async () => {
    const client = requireSupabase();
    const { data: userData } = await client.auth.getUser();

    return unwrap<UnitRentalPayment>(
      client
        .from("unit_rental_payments")
        .update({
          status: "rejected",
          validated_by: userData.user?.id ?? null,
          validated_at: new Date().toISOString(),
          notes: reason ?? null,
        })
        .eq("id", paymentId)
        .select()
        .single(),
    );
  });
}

export const unitRentalPaymentService = { ...baseService, uploadProof, getSignedProofUrl, approve, reject };
