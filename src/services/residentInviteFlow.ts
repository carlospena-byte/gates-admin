/**
 * Invite-or-link a unit_residents contact — shared by the residential-wide
 * Residents page (useResidentsManagerData) and UnitResidentsPanel, so both
 * surfaces send an invitation the moment a resident is created instead of
 * requiring a separate manual "invite" click.
 *
 * If the resident's email already has an app account (found via
 * find_profile_id_by_email), skips the invitation and links straight to
 * unit_members. Otherwise creates a unit_invitations code and emails it via
 * the send-invitation Edge Function.
 */

import { residentialUserService } from "./api.service";
import { unitMemberService } from "./unitMemberService";
import { invitationService } from "./invitationService";
import { wrapResult, type ApiResult } from "./apiResult";
import type { UnitResident } from "@/types/unit-wizard.types";

export type InviteOrLinkOutcome =
  | { kind: "linked_existing" }
  | { kind: "invited"; emailSent: boolean; code: string };

export function inviteOrLinkResident(resident: UnitResident): Promise<ApiResult<InviteOrLinkOutcome>> {
  return wrapResult("Failed to invite resident", async () => {
    const lookup = await residentialUserService.findUserIdByEmail(resident.email);
    if (lookup.success && lookup.data) {
      const linkResult = await unitMemberService.add(resident.unit_id, resident.residential_id, lookup.data);
      if (!linkResult.success) throw linkResult.error;
      return { kind: "linked_existing" };
    }

    const result = await invitationService.sendInvitation({
      unitId: resident.unit_id,
      email: resident.email,
      phone: resident.phone,
      unitResidentId: resident.id,
    });
    if (!result.success) throw result.error;
    return { kind: "invited", emailSent: result.data.emailSent, code: result.data.code };
  });
}
