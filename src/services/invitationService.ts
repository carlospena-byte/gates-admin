/**
 * Invite-a-resident flow: sends a unit_invitations code (via the
 * send-invitation Edge Function, which calls create_unit_invitation and
 * emails the code through Resend) and lets an admin revoke a pending one.
 * See supabase/migrations/20261001000000_unit_invitations.sql.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { wrapResult, type ApiResult } from "./apiResult";

export interface SendInvitationParams {
  unitId: string;
  email: string;
  phone?: string | null;
  unitResidentId?: string;
}

export interface SendInvitationResult {
  invitationId: string;
  code: string;
  expiresAt: string;
  emailSent: boolean;
  emailError?: string;
}

function sendInvitation(params: SendInvitationParams): Promise<ApiResult<SendInvitationResult>> {
  return wrapResult("Failed to send invitation", async () => {
    const { data, error } = await requireSupabase().functions.invoke<SendInvitationResult>("send-invitation", {
      body: {
        unitId: params.unitId,
        email: params.email,
        phone: params.phone ?? undefined,
        unitResidentId: params.unitResidentId,
      },
    });
    if (error) throw error;
    if (!data) throw new Error("No response from send-invitation");
    return data;
  });
}

function revokeInvitation(invitationId: string): Promise<ApiResult<null>> {
  return wrapResult("Failed to revoke invitation", async () => {
    const { error } = await requireSupabase().rpc("revoke_unit_invitation", { _id: invitationId });
    if (error) throw error;
    return null;
  });
}

export const invitationService = { sendInvitation, revokeInvitation };
