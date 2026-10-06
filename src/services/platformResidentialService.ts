/**
 * Platform admins create residentials (name, plan, code) together with their owner account.
 * Goes through the create-residential Edge Function, which needs the service role.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { wrapResult, type ApiResult } from "./apiResult";

/** 4-10 characters, digits and uppercase letters only. */
export const RESIDENTIAL_CODE_RE = /^[0-9A-Z]{4,10}$/;

export interface CreateResidentialParams {
  name: string;
  address: string;
  lat: number;
  lng: number;
  code: string;
  planId: string;
  ownerEmail: string;
  ownerFirstName?: string;
  ownerLastName?: string;
}

async function createResidential(params: CreateResidentialParams): Promise<ApiResult<{ residentialId: string; code: string }>> {
  return wrapResult("Failed to create residential", async () => {
    const { data, error } = await requireSupabase().functions.invoke<{ residentialId: string; code: string }>(
      "create-residential",
      { body: params },
    );
    if (error) {
      let message = error.message;
      const ctx = (error as { context?: unknown }).context;
      if (ctx instanceof Response) {
        try {
          message = String(((await ctx.json()) as { error?: string }).error ?? message);
        } catch {
          /* keep default */
        }
      }
      throw new Error(message);
    }
    if (!data) throw new Error("No response from create-residential");
    return data;
  });
}

export const platformResidentialService = { create: createResidential };
