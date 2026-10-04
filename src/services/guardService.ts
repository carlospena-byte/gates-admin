/**
 * Security-guard accounts (residential code + username + PIN, no email). Creation and PIN
 * reset go through the manage-guard Edge Function (needs the service role);
 * sign-in goes through guard-login, which adds a wrong-PIN lockout in front of
 * Supabase Auth and returns a normal session to install client-side.
 */

import { requireSupabase } from "@/lib/supabaseClient";
import { wrapResult, type ApiResult } from "./apiResult";

export interface CreatedGuard {
  userId: string;
  username: string;
  pin: string;
  /** Residential code the guard types on the login screen. */
  code: string;
}

export type GuardSignInError =
  | { kind: "invalid"; remaining: number | null }
  | { kind: "locked"; retryInMinutes: number }
  | { kind: "inactive" }
  | { kind: "other"; message: string };

type InvokeError = { message: string; context?: unknown };

/** functions.invoke hides the JSON body of non-2xx replies in error.context. */
async function readErrorBody(error: InvokeError): Promise<Record<string, unknown>> {
  const ctx = error.context;
  if (ctx instanceof Response) {
    try {
      return (await ctx.json()) as Record<string, unknown>;
    } catch {
      /* fall through */
    }
  }
  return { error: error.message };
}

async function invokeManage<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await requireSupabase().functions.invoke<T>("manage-guard", { body });
  if (error) {
    const parsed = await readErrorBody(error as InvokeError);
    throw new Error(String(parsed.error ?? error.message));
  }
  if (!data) throw new Error("No response from manage-guard");
  return data;
}

function createGuard(params: {
  residentialId: string;
  firstName: string;
  lastName: string;
  username?: string;
  /** 6 digits chosen by the admin. */
  pin: string;
}): Promise<ApiResult<CreatedGuard>> {
  return wrapResult("Failed to create guard", () => invokeManage<CreatedGuard>({ action: "create", ...params }));
}

/** Without `pin` the server generates a random one. */
function resetPin(residentialId: string, userId: string, pin?: string): Promise<ApiResult<{ pin: string }>> {
  return wrapResult("Failed to reset PIN", () =>
    invokeManage<{ pin: string }>({ action: "reset_pin", residentialId, userId, pin }),
  );
}

async function signIn(
  code: string,
  username: string,
  pin: string,
): Promise<{ ok: true } | { ok: false; error: GuardSignInError }> {
  const client = requireSupabase();
  const { data, error } = await client.functions.invoke<{ access_token: string; refresh_token: string }>(
    "guard-login",
    { body: { code, username, pin } },
  );

  if (error || !data) {
    const parsed = await readErrorBody((error ?? { message: "No response" }) as InvokeError);
    if (parsed.error === "locked") {
      return { ok: false, error: { kind: "locked", retryInMinutes: Number(parsed.retryInMinutes ?? 5) } };
    }
    if (parsed.error === "inactive") return { ok: false, error: { kind: "inactive" } };
    if (parsed.error === "invalid") {
      return {
        ok: false,
        error: { kind: "invalid", remaining: typeof parsed.remaining === "number" ? parsed.remaining : null },
      };
    }
    return { ok: false, error: { kind: "other", message: String(parsed.error ?? "Sign-in failed") } };
  }

  const { error: sessionError } = await client.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (sessionError) return { ok: false, error: { kind: "other", message: sessionError.message } };
  return { ok: true };
}

export const guardService = { createGuard, resetPin, signIn };
