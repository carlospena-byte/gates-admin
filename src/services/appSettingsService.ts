/**
 * Platform "App Settings": the maintenance switch, per-store app versions
 * (iOS and Android never share rows) and mass push notifications. All of it
 * is platform-admin only; the mobile app reads the same data through the
 * get_app_status RPC.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import type { AppConfig, AppVersion, PushCampaign, TablesInsert, TablesUpdate } from "@/types/database.types";
import { ApiError, unwrap, wrapResult, type ApiResult } from "./apiResult";

export type AppPlatform = "ios" | "android";
export type PushAudience = "all" | "residentials";

export interface MassPushInput {
  title: string;
  body: string;
  audience: PushAudience;
  residentialIds: string[];
}

export interface MassPushResult {
  sent: number;
  failed: number;
  recipients: number;
  invalidTokensRemoved: number;
}

/** "1.2.3" → [1,2,3]; null when it isn't a dotted numeric version. */
export function parseVersion(version: string): number[] | null {
  if (!/^\d+(\.\d+){0,2}$/.test(version.trim())) return null;
  return version.trim().split(".").map(Number);
}

/** Numeric comparison, so "1.10.0" sorts after "1.9.0". */
export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a) ?? [];
  const pb = parseVersion(b) ?? [];
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

export const appSettingsService = {
  getConfig(): Promise<ApiResult<AppConfig>> {
    return wrapResult("Failed to load app config", () =>
      unwrap<AppConfig>(requireSupabase().from("app_config").select("*").limit(1).single()),
    );
  },

  updateMaintenance(
    id: string,
    dto: Pick<TablesUpdate<"app_config">, "maintenance_enabled" | "maintenance_title" | "maintenance_message">,
  ): Promise<ApiResult<AppConfig>> {
    return wrapResult("Failed to update maintenance mode", () =>
      unwrap<AppConfig>(requireSupabase().from("app_config").update(dto).eq("id", id).select().single()),
    );
  },

  listVersions(platform: AppPlatform): Promise<ApiResult<AppVersion[]>> {
    return wrapResult("Failed to list app versions", async () => {
      const rows = await unwrap<AppVersion[]>(
        requireSupabase().from("app_versions").select("*").eq("platform", platform),
      );
      return (rows ?? []).sort((a, b) => compareVersions(b.version, a.version));
    });
  },

  createVersion(dto: TablesInsert<"app_versions">): Promise<ApiResult<AppVersion>> {
    return wrapResult("Failed to create app version", () =>
      unwrap<AppVersion>(requireSupabase().from("app_versions").insert(dto).select().single()),
    );
  },

  updateVersion(id: string, dto: TablesUpdate<"app_versions">): Promise<ApiResult<AppVersion>> {
    return wrapResult("Failed to update app version", () =>
      unwrap<AppVersion>(requireSupabase().from("app_versions").update(dto).eq("id", id).select().single()),
    );
  },

  deleteVersion(id: string): Promise<ApiResult<void>> {
    return wrapResult("Failed to delete app version", () =>
      unwrap<void>(requireSupabase().from("app_versions").delete().eq("id", id)),
    );
  },

  listCampaigns(limit = 20): Promise<ApiResult<PushCampaign[]>> {
    return wrapResult("Failed to list push campaigns", async () => {
      const rows = await unwrap<PushCampaign[]>(
        requireSupabase().from("push_campaigns").select("*").order("created_at", { ascending: false }).limit(limit),
      );
      return rows ?? [];
    });
  },

  sendMassPush(input: MassPushInput): Promise<ApiResult<MassPushResult>> {
    return wrapResult("Failed to send push notification", async () => {
      const { data, error } = await requireSupabase().functions.invoke<MassPushResult & { error?: string }>(
        "send-mass-push",
        { body: input },
      );
      if (error) {
        // functions.invoke hides the function's own message behind a generic
        // error; the JSON body (when present) says what actually went wrong.
        const context = (error as { context?: Response }).context;
        const detail = context ? await context.json().then((j: { error?: string }) => j.error).catch(() => null) : null;
        throw new ApiError(detail ?? error.message);
      }
      if (!data) throw new ApiError("Empty response from send-mass-push");
      return data;
    });
  },
};
