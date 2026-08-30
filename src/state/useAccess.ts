import { useEffect, useState } from "react";

import { supabase } from "@/lib/supabaseClient";
import type { ResidentialRole } from "@/types/database.types";

export type Access =
  | { kind: "platform_admin" }
  | { kind: "residential_admin"; residentialId: string; role: ResidentialRole };

/** Only owner/admin can create, edit, or delete within a residential — security/member are read-only. */
export function canManageResidential(role: ResidentialRole): boolean {
  return role === "owner" || role === "admin";
}

export function useAccess({
  enabled = true,
  refreshKey,
}: {
  enabled?: boolean;
  refreshKey?: string | number;
} = {}) {
  const [access, setAccess] = useState<Access | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (!enabled) return;
    const client = supabase;
    if (!client) return;

    let isMounted = true;

    async function run(readyClient: NonNullable<typeof supabase>) {
      setIsLoading(true);
      setError("");
      setAccess(null);

      // Get session with debugging
      const { data: sessionData, error: sessionError } = await readyClient.auth.getSession();
      if (sessionError) {
        console.error("❌ useAccess: Session error:", sessionError);
        throw sessionError;
      }

      const userId = sessionData.session?.user.id;
      const userEmail = sessionData.session?.user.email;

      if (import.meta.env.DEV) {
        console.log("🔍 useAccess: Checking access for user:", {
          userId,
          email: userEmail,
          hasSession: !!sessionData.session,
        });
      }

      if (!userId) {
        if (!isMounted) return;
        console.warn("⚠️ useAccess: No userId in session");
        setAccess(null);
        return;
      }

      // Check platform admin
      if (import.meta.env.DEV) console.log("🔍 useAccess: Checking platform_admins...");
      const { data: platformRow, error: platformError } = await readyClient
        .from("platform_admins")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();

      if (platformError) {
        console.error("❌ useAccess: platform_admins query error:", platformError);
        throw platformError;
      }

      if (import.meta.env.DEV) {
        console.log("🔍 useAccess: platform_admins result:", platformRow);
      }

      if (platformRow) {
        if (!isMounted) return;
        if (import.meta.env.DEV) console.log("✅ useAccess: User is platform admin");
        setAccess({ kind: "platform_admin" });
        return;
      }

      // Check residential_users table for any role
      if (import.meta.env.DEV) console.log("🔍 useAccess: Checking residential_users...");
      const { data: residentialUserRow, error: residentialError } = await readyClient
        .from("residential_users")
        .select("residential_id, role")
        .eq("user_id", userId)
        .in("role", ["owner", "admin", "security", "member"])
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (residentialError) {
        console.error("❌ useAccess: residential_users query error:", residentialError);
        throw residentialError;
      }

      if (import.meta.env.DEV) {
        console.log("🔍 useAccess: residential_users result:", residentialUserRow);
      }

      if (!isMounted) return;

      if (!residentialUserRow) {
        console.warn("⚠️ useAccess: No access found for user", userEmail);
        console.warn("⚠️ useAccess: All queries returned null/empty");

        // Log what we have in the database for debugging
        console.group("🔍 Database State Debug");
        console.log("User ID:", userId);
        console.log("User Email:", userEmail);
        console.log("All queries returned empty - this suggests RLS is blocking access");
        console.log("Possible causes:");
        console.log("  1. RLS policies calling auth.uid() which returns null");
        console.log("  2. Session JWT not being sent with requests");
        console.log("  3. User genuinely has no access");
        console.groupEnd();

        setAccess(null);
        return;
      }

      if (import.meta.env.DEV) {
        console.log("✅ useAccess: User has residential access:", {
          residentialId: residentialUserRow.residential_id,
          role: residentialUserRow.role,
        });
      }

      setAccess({
        kind: "residential_admin",
        residentialId: residentialUserRow.residential_id,
        role: residentialUserRow.role as ResidentialRole,
      });
    }

    run(client)
      .catch((e) => {
        if (!isMounted) return;
        console.error("❌ useAccess: Fatal error:", e);
        setError(e instanceof Error ? e.message : "__i18n__:access.resolveFailed");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [enabled, refreshKey]);

  return {
    access: enabled ? access : null,
    isLoading: enabled ? isLoading : false,
    error: enabled ? (error || null) : null,
  };
}
