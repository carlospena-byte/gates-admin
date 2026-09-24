/**
 * Visitor Service
 * Flat CRUD via createCrudService, same as unitResidentService/locationService.
 * The full residential-wide list is fetched once and split into
 * Today/Upcoming/Inside/History client-side (see useVisitorManagerData) —
 * same convention as every other "Manager" hook, no separate endpoint per
 * tab. selectClause joins the inviting profile's email for the "Invited By"
 * column, same shape as unitService's owner join.
 */

import { createCrudService } from "./createCrudService";
import { requireSupabase } from "@/lib/supabaseClient";
import { wrapResult, unwrap, type ApiResult } from "./apiResult";
import type {
  CreateVisitorDto,
  NotificationChannel,
  UpdateVisitorDto,
  VisitorWithInviter,
} from "@/types/visitor.types";

const baseService = createCrudService<VisitorWithInviter, CreateVisitorDto, UpdateVisitorDto>("visitors", {
  parentColumn: "residential_id",
  orderBy: "valid_from",
  selectClause: "*, profiles:invited_by(email)",
});

export const visitorService = {
  ...baseService,

  /**
   * FastLane rows are created via a security-definer RPC (not a plain
   * insert) so the access_code is always server-generated — same reasoning
   * as create_unit_invitation. Callable by residential admin/security for
   * any unit, or by a resident for their own unit (see the "members manage
   * own unit" RLS policy).
   */
  async createFastlane(params: {
    residentialId: string;
    unitId: string;
    phone: string;
    visitDate: string; // "YYYY-MM-DD"
    notes?: string | null;
  }): Promise<ApiResult<VisitorWithInviter>> {
    return wrapResult("createFastlaneVisit", async () =>
      unwrap(
        requireSupabase()
          .rpc("create_fastlane_visit", {
            _residential_id: params.residentialId,
            _unit_id: params.unitId,
            _phone: params.phone,
            _visit_date: params.visitDate,
            _notes: params.notes ?? undefined,
          })
          .single(),
      ),
    );
  },

  /**
   * Sends the FastLane self-registration link over SMS/WhatsApp via the
   * send-visit-notification Edge Function. Safe to call again ("reenviar")
   * — the visitors row/code don't change.
   */
  async sendNotification(params: {
    visitId: string;
    channel: NotificationChannel;
  }): Promise<ApiResult<{ notificationSent: boolean; error?: string; link?: string }>> {
    return wrapResult("sendVisitNotification", async () =>
      unwrap(
        requireSupabase().functions.invoke("send-visit-notification", {
          body: { visitId: params.visitId, channel: params.channel },
        }),
      ),
    );
  },
};
