/**
 * Links an already-registered resident (a profiles/auth.users account) to
 * a unit via unit_members — the other half of the invite flow, for when
 * find_profile_id_by_email finds an existing account so no invitation
 * code is needed. RLS ("unit_members: owner admin manage") already lets a
 * residential admin insert here directly, no RPC required.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";
import type { UnitMember } from "@/types/database.types";

function add(unitId: string, residentialId: string, userId: string): Promise<ApiResult<UnitMember>> {
  return wrapResult("Failed to link resident", async () => {
    const supabase = requireSupabase();

    const { data: existing } = await supabase
      .from("unit_members")
      .select()
      .eq("unit_id", unitId)
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return existing;

    return unwrap<UnitMember>(
      supabase
        .from("unit_members")
        .insert({ unit_id: unitId, residential_id: residentialId, user_id: userId })
        .select()
        .single(),
    );
  });
}

export const unitMemberService = { add };
