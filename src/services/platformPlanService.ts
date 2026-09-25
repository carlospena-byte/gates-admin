/**
 * Platform-wide plan catalog (platform_plans) — no residential_id, every row
 * is global. Platform admins maintain it; residentials just pick one.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import type { InsertPlatformPlan, PlatformPlan, TablesUpdate } from "@/types/database.types";
import { unwrap, wrapResult, type ApiResult } from "./apiResult";

export const platformPlanService = {
  list(): Promise<ApiResult<PlatformPlan[]>> {
    return wrapResult("Failed to list platform plans", async () => {
      const rows = await unwrap<PlatformPlan[]>(
        requireSupabase().from("platform_plans").select("*").order("name"),
      );
      return rows ?? [];
    });
  },

  create(dto: InsertPlatformPlan): Promise<ApiResult<PlatformPlan>> {
    return wrapResult("Failed to create platform plan", () =>
      unwrap<PlatformPlan>(requireSupabase().from("platform_plans").insert(dto).select().single()),
    );
  },

  update(id: string, dto: TablesUpdate<"platform_plans">): Promise<ApiResult<PlatformPlan>> {
    return wrapResult("Failed to update platform plan", () =>
      unwrap<PlatformPlan>(
        requireSupabase().from("platform_plans").update(dto).eq("id", id).select().single(),
      ),
    );
  },

  delete(id: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to delete platform plan", () =>
      unwrap<void>(requireSupabase().from("platform_plans").delete().eq("id", id)),
    );
  },

  toggleActive(id: string, currentStatus: boolean): Promise<ApiResult<PlatformPlan>> {
    return platformPlanService.update(id, { is_active: !currentStatus });
  },
};
